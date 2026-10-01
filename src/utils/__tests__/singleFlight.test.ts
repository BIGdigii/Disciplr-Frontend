/**
 * singleFlight.test.ts
 *
 * Unit tests for the single-flight replay guard that protects sensitive
 * vault actions from double submission.
 */

import { describe, expect, it, vi } from "vitest";
import { createSingleFlightRunner } from "../singleFlight";

describe("createSingleFlightRunner", () => {
  it("coalesces overlapping calls into a single execution", async () => {
    const runner = vi.fn(async (x: number) => x * 2);
    const { run } = createSingleFlightRunner(runner);

    const first = run(2);
    const second = run(2);

    expect(second).toBe(first);
    await expect(first).resolves.toBe(4);
    expect(runner).toHaveBeenCalledTimes(1);
  });

  it("reports pending state while an invocation is in flight", async () => {
    const deferred: { resolve: (value: unknown) => void } = { resolve: () => undefined };
    const promise = new Promise<unknown>((res) => {
      deferred.resolve = res;
    });
    const { run, isPending } = createSingleFlightRunner(() => promise);

    expect(isPending()).toBe(false);
    const pending = run();
    expect(isPending()).toBe(true);
    deferred.resolve(null);
    await pending;
    expect(isPending()).toBe(false);
  });

  it("starts a fresh execution after the previous one settles", async () => {
    const runner = vi.fn(async () => undefined);
    const { run } = createSingleFlightRunner(runner);

    await run();
    await run();
    expect(runner).toHaveBeenCalledTimes(2);
  });

  it("releases the in-flight slot even when the run rejects", async () => {
    const runner = vi.fn(async () => {
      throw new Error("boom");
    });
    const { run, isPending } = createSingleFlightRunner(runner);

    await expect(run()).rejects.toThrow("boom");
    expect(isPending()).toBe(false);

    // A later call is allowed and runs again.
    await expect(run()).rejects.toThrow("boom");
    expect(runner).toHaveBeenCalledTimes(2);
  });

  it("propagates the result of the coalesced run", async () => {
    const { run } = createSingleFlightRunner(async (a: string, b: number) => `${a}-${b}`);

    const first = run("vault", 7);
    const second = run("vault", 7);
    await expect(first).resolves.toBe("vault-7");
    await expect(second).resolves.toBe("vault-7");
  });
});