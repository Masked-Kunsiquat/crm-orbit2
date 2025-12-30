import en from "./en.json";

const translations = {
  en,
};

type Locale = keyof typeof translations;

let currentLocale: Locale = "en";

export const setLocale = (locale: Locale) => {
  currentLocale = locale;
};

export const t = (key: string): string => {
  const table = translations[currentLocale] as Record<string, string>;
  return table[key] ?? key;
};
