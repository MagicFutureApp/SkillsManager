export const supportedLocales = ["zh-CN", "en-US"] as const;

export type SupportedLocale = (typeof supportedLocales)[number];

export const defaultLocale: SupportedLocale = "zh-CN";

export const resolveSupportedLocale = (locale: string): SupportedLocale => {
  const normalizedLocale = locale.trim().replaceAll("_", "-").toLowerCase();

  if (normalizedLocale === "zh-cn" || normalizedLocale.startsWith("zh")) {
    return "zh-CN";
  }

  if (normalizedLocale === "en-us" || normalizedLocale.startsWith("en")) {
    return "en-US";
  }

  return defaultLocale;
};
