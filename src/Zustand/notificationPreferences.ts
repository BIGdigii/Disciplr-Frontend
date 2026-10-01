import { create } from "zustand";
import { persist } from "zustand/middleware";
import { BoundaryError } from "./boundaryErrors";
import {
  getSession,
  sessionKey,
  type SessionSnapshot,
} from "./sessionBoundary";
import { parseServerPayload, validate } from "./validateMiddleware";
import { isValidQuietTime } from "../utils/quietHours";

export const VALID_FREQUENCIES = ["1", "2", "3", "4"] as const;
export type NotificationFrequency = (typeof VALID_FREQUENCIES)[number];

export const PREFERENCE_DEFAULTS = {
  email: true,
  push: false,
  frequency: "1" as NotificationFrequency,
  quietHours: "12:00",
};

export type PreferenceFields = {
  email: boolean;
  push: boolean;
  frequency: string;
  quietHours: string;
};

export type NotificationPreferencesState = PreferenceFields & {
  ownerKey: string | null;
  lastNonce: string | null;
  setEmail: (value: boolean) => void;
  setPush: (value: boolean) => void;
  setFrequency: (value: string) => void;
  setQuietHours: (value: string) => void;
  reset: () => void;
  applyFromServer: (payload: unknown, nonce: string) => void;
};

const ALLOWED_PARTIAL_KEYS = new Set([
  "email",
  "push",
  "frequency",
  "quietHours",
  "ownerKey",
  "lastNonce",
]);

function isFrequency(value: unknown): value is NotificationFrequency {
  return (
    typeof value === "string" &&
    (VALID_FREQUENCIES as readonly string[]).includes(value)
  );
}

export function sanitizePreferenceFields(
  input: unknown,
): PreferenceFields | null {
  if (!input || typeof input !== "object") return null;
  const rec = input as Record<string, unknown>;
  if (typeof rec.email !== "boolean") return null;
  if (typeof rec.push !== "boolean") return null;
  if (!isFrequency(rec.frequency)) return null;
  if (typeof rec.quietHours !== "string" || !isValidQuietTime(rec.quietHours)) {
    return null;
  }
  return {
    email: rec.email,
    push: rec.push,
    frequency: rec.frequency,
    quietHours: rec.quietHours,
  };
}

function assertOwnerMatches(session: SessionSnapshot, ownerKey: string | null) {
  if (!session.address) return;
  const live = sessionKey(session);
  if (ownerKey && ownerKey !== live) {
    throw new BoundaryError(
      "UNAUTHORIZED",
      "Preference state is owned by a different wallet session.",
      { ownerKey, live },
    );
  }
}

function validatePrefsPartial({
  current,
  next,
  session,
}: {
  current: NotificationPreferencesState;
  next: NotificationPreferencesState | Partial<NotificationPreferencesState>;
  session: SessionSnapshot;
}): Partial<NotificationPreferencesState> {
  const partial = next as Partial<NotificationPreferencesState>;
  for (const key of Object.keys(partial)) {
    if (!ALLOWED_PARTIAL_KEYS.has(key)) {
      throw new BoundaryError(
        "TAMPERED_INPUT",
        `Unexpected preference field "${key}".`,
      );
    }
  }

  if ("email" in partial && typeof partial.email !== "boolean") {
    throw new BoundaryError("TAMPERED_INPUT", "email must be a boolean.");
  }
  if ("push" in partial && typeof partial.push !== "boolean") {
    throw new BoundaryError("TAMPERED_INPUT", "push must be a boolean.");
  }
  if ("frequency" in partial && !isFrequency(partial.frequency)) {
    throw new BoundaryError(
      "TAMPERED_INPUT",
      "frequency must be one of 1, 2, 3, 4.",
    );
  }
  if (
    "quietHours" in partial &&
    (typeof partial.quietHours !== "string" ||
      !isValidQuietTime(partial.quietHours))
  ) {
    throw new BoundaryError(
      "TAMPERED_INPUT",
      "quietHours must be a valid HH:MM time.",
    );
  }

  assertOwnerMatches(session, current.ownerKey);

  const liveKey = session.address ? sessionKey(session) : current.ownerKey;
  return {
    ...partial,
    ownerKey: liveKey ?? current.ownerKey,
  };
}

export const useNotificationPreferences = create<NotificationPreferencesState>()(
  persist(
    validate(
      (set, get) => ({
        ...PREFERENCE_DEFAULTS,
        ownerKey: null,
        lastNonce: null,
        setEmail: (value) => set({ email: value }),
        setPush: (value) => set({ push: value }),
        setFrequency: (value) => set({ frequency: value }),
        setQuietHours: (value) => set({ quietHours: value }),
        reset: () =>
          set({
            ...PREFERENCE_DEFAULTS,
            ownerKey: getSession().address ? sessionKey() : get().ownerKey,
            lastNonce: null,
          }),
        applyFromServer: (payload, nonce) => {
          if (typeof nonce !== "string" || nonce.length === 0) {
            throw new BoundaryError(
              "TAMPERED_INPUT",
              "Server apply requires a nonce.",
            );
          }
          if (get().lastNonce === nonce) {
            throw new BoundaryError(
              "REPLAY",
              "Preference payload nonce was already applied.",
            );
          }
          const parsed = parseServerPayload(
            payload,
            sanitizePreferenceFields,
            "notification-preferences",
          );
          const session = getSession();
          if (!session.address || !session.network) {
            throw new BoundaryError(
              "DISCONNECTED_WALLET",
              "Cannot apply server preferences without a connected wallet.",
            );
          }
          set({
            ...parsed,
            ownerKey: sessionKey(session),
            lastNonce: nonce,
          });
        },
      }),
      {
        name: "notification-preferences",
        validate: validatePrefsPartial,
      },
    ),
    {
      name: "notification-preferences",
      partialize: (state) => ({
        email: state.email,
        push: state.push,
        frequency: state.frequency,
        quietHours: state.quietHours,
        ownerKey: state.ownerKey,
        lastNonce: state.lastNonce,
      }),
      merge: (persisted, current) => {
        if (!persisted || typeof persisted !== "object") return current;
        const rec = persisted as Record<string, unknown>;
        const fields = sanitizePreferenceFields(rec);
        if (!fields) return current;

        const persistedOwner =
          typeof rec.ownerKey === "string" ? rec.ownerKey : null;
        const session = getSession();
        if (session.address) {
          const live = sessionKey(session);
          if (persistedOwner && persistedOwner !== live) {
            return current;
          }
        }

        return {
          ...current,
          ...fields,
          ownerKey: persistedOwner ?? current.ownerKey,
          lastNonce:
            typeof rec.lastNonce === "string"
              ? rec.lastNonce
              : current.lastNonce,
        };
      },
    },
  ),
);
