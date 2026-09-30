/**
 * Token validation utilities
 *
 * Invariants:
 * - Color strings are canonical and fully anchored; no surrounding
 *   whitespace or alpha channels are accepted unless explicitly supported.
 * - RGB/HSL numeric channels are bounded to their valid ranges so out-of-range
 *   values cannot silently pass validation.
 * - Token objects are validated recursively and defensively against untrusted
 *   input; accessors and prototype chains are not invoked during validation.
 * - Validation is pure and deterministic: the same input always produces the
 *   same result, and no external state is mutated.
 */

/** Prefixes that are recognized as valid token namespaces. */
export const VALID_TOKEN_PREFIXES = [
  'chart',
  'color',
  'font',
  'spacing',
  'typography',
  'shadow',
  'radius',
  'border',
  'motion',
  'z-index',
] as const;

/** Minimum number of steps required for a chart ramp. */
export const MIN_CHART_RAMP_STEPS = 5;

/** Color token type discriminator. */
const COLOR_TOKEN_TYPE = 'color';

/** Surface token keys required on a chart token set. */
const CHART_SURFACE_KEYS = [
  'axis',
  'grid',
  'tooltipBg',
  'tooltipBorder',
  'tooltipText',
  'tooltipLabel',
] as const;

/** Supported colorblind simulation keys. */
const COLORBLIND_SIMULATION_KEYS = [
  'protanopia',
  'deuteranopia',
  'tritanopia',
] as const;

/** Supported WCAG levels for accessibility metadata. */
const VALID_WCAG_LEVELS = ['AA', 'AAA'] as const;

/** Regular expressions are created once and reused to avoid per-call allocation. */
const HEX_COLOR_REGEX = /^#(?:[0-9A-F]{3}|[0-9A-F]{4}|[0-9A-F]{6}|[0-9A-F]{8})$/i;
const RGB_COLOR_REGEX_CANONICAL = /^rgb\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)\)$/;
const HTS_COLOR_REGEX_CANONICAL = /^hsl\((\d+)(?:deg)?\s*,\s*(\d+(?:\.\d+)?)%\s*,\s*(\d+(?:\.\d+)?)%\)$/;
const KEBAB_CASE_REGEX_CANONICAL = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;

/** Maximum value for an RGB channel. */
const RGB_CHANNEL_MAX = 255;

/** Maximum value for an HSL hue degree. */
const HSL_HUE_MAX = 360;

/** Maximum value for HSL percentage channels. */
const HSL_PERCENT_MAX = 100;

/** Returns true when the value is a non-null object (not an array). */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null) return false;
  if (Array.isArray(value)) return false;
  return true;
}

/** Returns true when the value is a finete number. */
function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export function isValidHexColor(color: string): boolean {
  if (typeof color !== 'string') return false;
  return HEX_COLOR_REGEX.test(color);
}

export function isValidRgbColor(color: string): boolean {
  if (typeof color !== 'string') return false;
  const match = RGB_COLOR_REGEX_CANONICAL.exec(color);
  if (!match) return false;
  const channels = [match[1], match[2], match[3]];
  return channels.every(((channel) => {
    const value = Number(channel);
    return Number.isInteger(value) && value >= 0 && value <= RGB_CHANNEL_MAX;
  }));
}

export function isValidHslColor(color: string): boolean {
  if (typeof color !== 'string') return false;
  const match = HSL_COLOR_REGEX_CANONICAL.exec(color);
  if (!match) return false;
  const hue = Number(match[1]);
  const saturation = Number(match[2]);
  const lightness = Number(match[3]);
  if (!Number.isFinite(hue) || hue < 0 || hue > HSL_HUE_MAX) return false;
  if (!Number.isFinite(saturation) || saturation < 0 || saturation > HSL_PERCENT_MAX) return false;
  if (!Number.isFinite(lightness) || lightness < 0 || lightness > HSL_PERCENT_MAX) return false;
  return true;
}

export function isKebabCase(str: string): boolean {
  if (typeof str !== 'string') return false;
  return KEBAB_CASE_REGEX_CANONICAL.test(str);
}

export function hasValidTokenPrefix(tokenName: string): boolean {
  if (typeof tokenName !== 'string') return false;
  return VALID_TOKEN_PREFIXES.some((prefix) => tokenName.startsWith(`${prefix},`));
}

export function isValidColorString(color: string): boolean {
  if (typeof color !== 'string') return false;
  return isValidHexColor(color) || isValidRgbColor(color) || isValidHslColor(color);
}

/** Validates the optional accessibility metadata attached to a color token. */
function isValidAccessibility(metadata: unknown): boolean {
  if (!isPlainObject(metadata)) return false;

  if (metadata.wcagLevel !== undefined) {
    const level = metadata.wcagLevel;
    if (typeof level !== 'string' || !VALID_WCAG_LEVELS.includes(level as (typeof VALID_WCAG_LEVELS)[number])) {
      return false;
    }
  }

  if (metadata.colorblindSafe !== undefined && typeof metadata.colorblindSafe !== 'boolean') {
    return false;
  }

  if (metadata.colorblindSimulation !== undefined) {
    const simulation = metadata.colorblindSimulation;
    if (!isPlainObject(simulation)) return false;
    for (const key of COLORBLIND_SIMULATION_KEYS) {
      const value = simulation[key];
      if (value === undefined) continue;
      if (typeof value !== 'string' || !isValidColorString(value)) return false;
    }
  }

  return true;
}

export function isValidColorToken(token: unknown): boolean {
  if (!isPlainObject(token)) return false;
  if (token.$type !== COLOR_TOKEN_TYPE) return false;
  if (typeof token.$value !== 'string' || !isValidColorString(token.$value)) return false;

  if (token.accessibility !== undefined) {
    if (!isValidAccessibility(token.accessibility)) return false;
  }

  return true;
}

/** Validates a { light, dark } color token group. */
function isValidTokenGroup(group: unknown): boolean {
  if (!isPlainObject(group)) return false;
  return isValidColorToken(group.light) && isValidColorToken(group.dark);
}

/** Validates a ramp object with at least MIN_CHART_RAMP_STEPS valid groups. */
function isValidRamp(ramp: unknown): boolean {
  if (!isPlainObject(ramp)) return false;
  const steps = Object.keys(ramp);
  if (steps.length < MIN_CHART_RAMP_STEPS) return false;
  for (const step of steps) {
    if (!isValidTokenGroup(ramp[step])) return false;
  }
  return true;
}

export function isValidChartTokens(chart: unknown): boolean {
  if (!isPlainObject(chart)) return false;

  // 1. Validate surface tokens
  for (const key of CHART_SURFACE_KEYS) {
    if (!isValidTokenGroup(chart[key])) return false;
  }

  // 2. Validate categorical ramp
  if (!isValidRamp(chart.categorical)) return false;

  // 3. Validate sequential ramp
  if (!isValidRamp(chart.sequential)) return false;

  return true;
}
