import React, { useEffect } from "react";
import { I18nextProvider } from "react-i18next";

import { defaultLocale, resolveSupportedLocale } from "../../core/i18n/locale";
import { appI18n } from "./react-i18n";

export const AppI18nProvider = ({ children }: React.PropsWithChildren) => {
  useEffect(() => {
    let isMounted = true;

    const syncLocale = async () => {
      const locale = await window.skillsManager?.getLocale?.();
      const resolvedLocale = resolveSupportedLocale(locale ?? defaultLocale);

      if (isMounted) {
        await appI18n.changeLanguage(resolvedLocale);
      }
    };

    void syncLocale();

    return () => {
      isMounted = false;
    };
  }, []);

  return <I18nextProvider i18n={appI18n}>{children}</I18nextProvider>;
};
