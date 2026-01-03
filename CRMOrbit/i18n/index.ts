import en from "./en.json";

const translations = {
  en,
};

type Locale = keyof typeof translations;

let currentLocale: Locale = "en";

export const setLocale = (locale: Locale) => {
  currentLocale = locale;
};

export const t = (
  key: string,
  params?: Record<string, string | number>,
): string => {
  const table = translations[currentLocale] as Record<string, string>;
  const template = table[key] ?? key;

  if (!params) {
    return template;
  }

  return Object.entries(params).reduce((current, [paramKey, value]) => {
    const matcher = new RegExp(`\\{${paramKey}\\}`, "g");
    return current.replace(matcher, String(value));
  }, template);
};
