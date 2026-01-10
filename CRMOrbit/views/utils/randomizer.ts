export type RandomizerOrder = "asc" | "desc";

export type RandomizerParsedInputs = {
  min: number;
  max: number;
  count: number;
  excluded: number[];
};

export type RandomizerValidationError =
  | "minInvalid"
  | "maxInvalid"
  | "rangeInvalid"
  | "countInvalid"
  | "excludedInvalid"
  | "noAvailable"
  | "countTooHigh";

export type RandomizerValidationResult =
  | { ok: true; value: RandomizerParsedInputs }
  | { ok: false; error: RandomizerValidationError };

export type RandomizerSelectionResult =
  | { ok: true; value: number[] }
  | { ok: false; error: RandomizerValidationError };

export const RANDOMIZER_ERROR_KEYS: Record<RandomizerValidationError, string> =
  {
    minInvalid: "randomizer.validation.minInvalid",
    maxInvalid: "randomizer.validation.maxInvalid",
    rangeInvalid: "randomizer.validation.rangeInvalid",
    countInvalid: "randomizer.validation.countInvalid",
    excludedInvalid: "randomizer.validation.excludedInvalid",
    noAvailable: "randomizer.validation.noAvailable",
    countTooHigh: "randomizer.validation.countTooHigh",
  };

const parseInteger = (value: string): number | null => {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed)) {
    return null;
  }
  return parsed;
};

const parseExcludedFloors = (
  value: string,
  min: number,
  max: number,
): number[] | null => {
  const trimmed = value.trim();
  if (!trimmed) return [];
  const parts = trimmed
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length === 0) return [];

  const values: number[] = [];
  for (const part of parts) {
    const parsed = parseInteger(part);
    if (parsed === null) {
      return null;
    }
    if (parsed < min || parsed > max) {
      return null;
    }
    values.push(parsed);
  }

  return Array.from(new Set(values));
};

export const validateRandomizerInputs = (
  minInput: string,
  maxInput: string,
  excludedInput: string,
  countInput: string,
): RandomizerValidationResult => {
  const min = parseInteger(minInput);
  if (min === null) {
    return { ok: false, error: "minInvalid" };
  }

  const max = parseInteger(maxInput);
  if (max === null) {
    return { ok: false, error: "maxInvalid" };
  }

  if (min > max) {
    return { ok: false, error: "rangeInvalid" };
  }

  const count = parseInteger(countInput);
  if (count === null || count <= 0) {
    return { ok: false, error: "countInvalid" };
  }

  const excluded = parseExcludedFloors(excludedInput, min, max);
  if (excluded === null) {
    return { ok: false, error: "excludedInvalid" };
  }

  return { ok: true, value: { min, max, count, excluded } };
};

export const buildAvailableFloors = (
  min: number,
  max: number,
  excluded: number[],
): number[] => {
  const excludedSet = new Set(excluded);
  const result: number[] = [];
  for (let floor = min; floor <= max; floor += 1) {
    if (!excludedSet.has(floor)) {
      result.push(floor);
    }
  }
  return result;
};

const shuffle = (values: number[]): number[] => {
  const result = [...values];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

export const sortValues = (
  values: number[],
  order: RandomizerOrder,
): number[] => {
  const sorted = [...values];
  sorted.sort((a, b) => (order === "asc" ? a - b : b - a));
  return sorted;
};

export const generateRandomSelection = (
  inputs: RandomizerParsedInputs,
  order: RandomizerOrder,
): RandomizerSelectionResult => {
  const available = buildAvailableFloors(
    inputs.min,
    inputs.max,
    inputs.excluded,
  );
  if (available.length === 0) {
    return { ok: false, error: "noAvailable" };
  }
  if (inputs.count > available.length) {
    return { ok: false, error: "countTooHigh" };
  }

  const shuffled = shuffle(available);
  const selection = shuffled.slice(0, inputs.count);
  return { ok: true, value: sortValues(selection, order) };
};
