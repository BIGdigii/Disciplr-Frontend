/**
 * Token loader utilities
 */

import { DesignTokens } from '../types/tokens';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Invariants enforced by this module:
 *
 * 1. `loadTokens` only reads files whose basename matches `^[^/\\]+\.json$`
 *    and whose resolved path stays inside `<cwd>/tokens`. Any other input
 *    (absolute paths, traversal segments, non-`.json` extensions, empty
 *    strings, non-string values) is rejected with a deterministic error.
 * 2. `loadTokens` never returns a partially-parsed or non-object payload.
 *    Malformed JSON, non-object roots (arrays, primitives, null), and
 *    unreadable files all throw so callers cannot silently consume
 *    inconsistent state.
 * 3. `getAllTokens` is best-effort across the known token file set: a
 *    failure for one file is logged and does not abort the merge, but the
 *    returned object is always a fresh, fully-owned plain object (no
 *    prototype pollution, no shared references between calls).
 * 4. `getTokenValue` is pure with respect to the merged token tree and
 *    returns `undefined` for empty, non-string, or unresolvable paths. It
 *    never throws on malformed input.
 */

const TOKEN_FILE_PATTERN = /^[^/\\]+\.json$/;

const KNOWN_TOKEN_FILES = [
  'colors.json',
  'typography.json',
  'spacing.json',
  'shadows.json',
  'motion.json',
  'borders.json',
  'z-index.json',
  'opacity.json',
  'breakpoints.json',
  'toast.json',
] as const;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value)
  );
}

export function loadTokens(tokenFile: string): DesignTokens {
  // Reject anything that isn't a plain basename with a .json extension
  if (typeof tokenFile !== 'string' || !TOKEN_FILE_PATTERN.test(tokenFile)) {
    throw new Error(`Invalid token file name: "${tokenFile}"`);
  }

  const tokensDir = path.resolve(process.cwd(), 'tokens');
  const tokenPath = path.resolve(tokensDir, tokenFile);

  // Ensure resolved path stays within the tokens directory
  if (!tokenPath.startsWith(tokensDir + path.sep) && tokenPath !== tokensDir) {
    throw new Error(`Path traversal detected for token file: "${tokenFile}"`);
  }

  let tokenData: string;
  try {
    tokenData = fs.readFileSync(tokenPath, 'utf-8');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to read token file "${tokenFile}": ${message}`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(tokenData);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Malformed JSON in token file "${tokenFile}": ${message}`);
  }

  if (!isPlainObject(parsed)) {
    throw new Error(
      `Token file "${tokenFile}" must contain a JSON object at the root`,
    );
  }

  return parsed as DesignTokens;
}

export function getAllTokens(): DesignTokens {
  const allTokens: DesignTokens = Object.create(null) as DesignTokens;
  
  KNOWN_TOKEN_FILES.forEach(file => {
    try {
      const tokens = loadTokens(file);
      if (isPlainObject(tokens)) {
        Object.assign(allTokens, tokens);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to load required token file "${file}": ${message}`);
    }
  });

  return allTokens;
}

/**
 * Resolves a design token by dotted path from the merged DTCG token tree.
 *
 * Path segments map directly to JSON object keys, e.g.:
 *   "color.primary.light.$value"  → traverses color → primary → light → $value
 *   "color.primary"               → if the resolved node contains mode sub-keys
 *                                   ('light'/'dark'), resolves via `mode`
 *                                   and returns `$value`; otherwise returns
 *                                   the raw node.
 *
 * @param path - Dot-separated key path into the token tree.
 * @param mode - Preferred mode for tokens that have 'light'/'dark' variants.
 *               Defaults to 'light'.
 * @returns The resolved `$value` (or raw node) for the path, or `undefined`
 *          when any segment is missing.
 */
export function getTokenValue(
  path: string,
  mode: 'light' | 'dark' = 'light',
): unknown {
  if (typeof path !== 'string' || path.length === 0) return undefined;

  let node: unknown = getAllTokens();

  for (const segment of path.split('.')) {
    if (node === null || typeof node !== 'object') return undefined;
    node = (node as Record<string, unknown>)[segment];
    if (node === undefined) return undefined;
  }

  // If the resolved node is a plain object with both mode keys, resolve by mode.
  if (isPlainObject(node)) {
    const record = node as Record<string, unknown>;

    // Mode-aware resolution: node has 'light' or 'dark' sub-objects that are
    // DTCG token nodes (i.e. contain a '$value' key).
    const modeNode = record[mode] as Record<string, unknown> | undefined;
    if (
      modeNode !== undefined &&
      modeNode !== null &&
      typeof modeNode === 'object' &&
      '$value' in modeNode
    ) {
      return modeNode['$value'];
    }

    // Already a DTCG leaf node — return its $value directly.
    if ('$value' in record) {
      return record['$value'];
    }
  }

  return node;
}
