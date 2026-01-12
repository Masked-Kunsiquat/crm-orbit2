/**
 * Parses a score input string and returns a normalized number.
 * Handles percentage signs and validates format.
 *
 * @param value - The input string (e.g., "95", "95%", "95.5")
 * @returns The parsed number or undefined if invalid
 */
export const parseScore = (value: string): number | undefined => {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }
  const normalized = trimmed.endsWith("%")
    ? trimmed.slice(0, -1).trim()
    : trimmed;
  if (!/^-?\d+(\.\d{0,3})?$/.test(normalized)) {
    return undefined;
  }
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) {
    return undefined;
  }
  return Math.round(parsed * 100) / 100;
};

/**
 * Parses a comma-separated list of floor numbers.
 *
 * @param value - The input string (e.g., "1, 2, 3")
 * @returns Array of floor numbers or undefined if invalid
 */
export const parseFloorsVisited = (value: string): number[] | undefined => {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }
  const numbers = trimmed
    .split(",")
    .map((item) => Number(item.trim()))
    .filter((entry) => Number.isFinite(entry));
  if (numbers.length === 0) {
    return undefined;
  }
  return numbers;
};

/**
 * Compares two floor arrays for equality.
 *
 * @param left - First array of floor numbers
 * @param right - Second array of floor numbers
 * @returns true if arrays contain the same values in the same order
 */
export const areFloorsEqual = (left?: number[], right?: number[]): boolean => {
  const leftValue = left ?? [];
  const rightValue = right ?? [];
  if (leftValue.length !== rightValue.length) {
    return false;
  }
  return leftValue.every((value, index) => value === rightValue[index]);
};
