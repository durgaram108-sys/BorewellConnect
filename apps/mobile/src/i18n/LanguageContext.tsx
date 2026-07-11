import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { en } from "./translations/en";
import { hi } from "./translations/hi";
import { te } from "./translations/te";
import { setThemeLanguage } from "../theme";

export type Language = "en" | "hi" | "te";

const DICTIONARIES = { en, hi, te };

const LanguageContext = createContext<{
  language: Language;
  setLanguage: (lang: Language) => void;
}>({ language: "en", setLanguage: () => {} });

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>("en");

  useEffect(() => {
    AsyncStorage.getItem("language").then((saved) => {
      if (saved === "en" || saved === "hi" || saved === "te") {
        setLanguageState(saved);
        setThemeLanguage(saved);
      }
    });
  }, []);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    setThemeLanguage(lang);
    AsyncStorage.setItem("language", lang);
  }, []);

  return <LanguageContext.Provider value={{ language, setLanguage }}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  return useContext(LanguageContext);
}

function getPath(obj: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object" && key in acc) return (acc as Record<string, unknown>)[key];
    return undefined;
  }, obj);
}

export function useTranslation() {
  const { language, setLanguage } = useLanguage();
  const dict = DICTIONARIES[language];

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => {
      const raw = getPath(dict, key);
      let str = typeof raw === "string" ? raw : key;
      if (vars) {
        for (const [k, v] of Object.entries(vars)) {
          str = str.replace(new RegExp(`{{${k}}}`, "g"), String(v));
        }
      }
      return str;
    },
    [dict]
  );

  return { t, language, setLanguage };
}
