export const buildTimestampFromDate = (dateString?: string): string => {
  const now = new Date();
  if (!dateString) {
    return now.toISOString();
  }

  const [year, month, day] = dateString.split("-").map(Number);
  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day) ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  ) {
    return now.toISOString();
  }

  const resolved = new Date(
    year,
    month - 1,
    day,
    now.getHours(),
    now.getMinutes(),
    now.getSeconds(),
    now.getMilliseconds(),
  );

  return resolved.toISOString();
};
