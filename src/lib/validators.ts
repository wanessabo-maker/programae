/**
 * Safe numeric parsing utilities to prevent NaN, Infinity, 
 * and out-of-range values from being inserted into the database.
 */

export function safeParseInt(
  value: string | undefined | null,
  options?: { min?: number; max?: number; allowNull?: boolean }
): number | null {
  if (!value?.trim()) {
    return options?.allowNull !== false ? null : 0;
  }

  const parsed = parseInt(value, 10);

  if (isNaN(parsed) || !isFinite(parsed)) {
    return null;
  }

  if (options?.min !== undefined && parsed < options.min) {
    return null;
  }

  if (options?.max !== undefined && parsed > options.max) {
    return null;
  }

  return parsed;
}

export function safeParseFloat(
  value: string | undefined | null,
  options?: { min?: number; max?: number; allowNull?: boolean }
): number | null {
  if (!value?.trim()) {
    return options?.allowNull !== false ? null : 0;
  }

  const parsed = parseFloat(value);

  if (isNaN(parsed) || !isFinite(parsed)) {
    return null;
  }

  if (options?.min !== undefined && parsed < options.min) {
    return null;
  }

  if (options?.max !== undefined && parsed > options.max) {
    return null;
  }

  return parsed;
}

/**
 * Safe Number() replacement - returns null instead of NaN/Infinity
 */
export function safeNumber(
  value: string | undefined | null,
  options?: { min?: number; max?: number }
): number | null {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const parsed = Number(value);

  if (isNaN(parsed) || !isFinite(parsed)) {
    return null;
  }

  if (options?.min !== undefined && parsed < options.min) {
    return null;
  }

  if (options?.max !== undefined && parsed > options.max) {
    return null;
  }

  return parsed;
}
