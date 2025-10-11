import { getLocales } from 'expo-localization';

// Determine primary locale (BCP 47) from device
export function getPrimaryLocale() {
  try {
    const locales = getLocales?.();
    return (locales && locales[0] && (locales[0].languageTag || locales[0].locale)) || 'en-US';
  } catch (_) {
    // Fallback for older expo-localization API
    try {
      // eslint-disable-next-line global-require
      const Localization = require('expo-localization');
      return Localization.locale || 'en-US';
    } catch (_) {
      return 'en-US';
    }
  }
}

// Format a JS Date or date-like input into a localized relative string
export function formatRelativeDateTime(input, opts = {}) {
  if (!input) return 'No date';
  const date = input instanceof Date ? input : new Date(input);
  if (isNaN(date.getTime())) return 'No date';

  const now = opts.now instanceof Date ? opts.now : new Date();
  const locale = opts.locale || getPrimaryLocale();

  const diffMs = date.getTime() - now.getTime();
  const absMs = Math.abs(diffMs);
  const sign = diffMs >= 0 ? 1 : -1; // future: +, past: -

  const sec = 1000;
  const min = 60 * sec;
  const hour = 60 * min;
  const day = 24 * hour;
  const week = 7 * day;
  const month = 30 * day; // approximation
  const year = 365 * day; // approximation

  let value;
  let unit;

  if (absMs < min) {
    value = Math.round(absMs / sec) * sign;
    unit = 'second';
  } else if (absMs < hour) {
    value = Math.round(absMs / min) * sign;
    unit = 'minute';
  } else if (absMs < day) {
    value = Math.round(absMs / hour) * sign;
    unit = 'hour';
  } else if (absMs < week) {
    value = Math.round(absMs / day) * sign;
    unit = 'day';
  } else if (absMs < month) {
    value = Math.round(absMs / week) * sign;
    unit = 'week';
  } else if (absMs < year) {
    value = Math.round(absMs / month) * sign;
    unit = 'month';
  } else {
    value = Math.round(absMs / year) * sign;
    unit = 'year';
  }

  try {
    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
    return rtf.format(value, unit);
  } catch (_) {
    // Fallback to a simple English-ish string if Intl not available
    const n = Math.abs(value);
    const plural = n === 1 ? '' : 's';
    const base = `${n} ${unit}${plural}`;
    return value < 0 ? `${base} ago` : `in ${base}`;
  }
}

