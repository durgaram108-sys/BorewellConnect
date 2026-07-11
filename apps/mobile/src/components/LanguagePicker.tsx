import React from "react";
import { Pressable, Text, View, ViewStyle } from "react-native";
import { c, font } from "../theme";
import { useTranslation, type Language } from "../i18n/LanguageContext";

const LANGUAGES: { code: Language; labelKey: "en" | "hi" | "te" }[] = [
  { code: "en", labelKey: "en" },
  { code: "hi", labelKey: "hi" },
  { code: "te", labelKey: "te" },
];

export function LanguagePicker({ dark, style }: { dark?: boolean; style?: ViewStyle }) {
  const { t, language, setLanguage } = useTranslation();

  return (
    <View style={[{ flexDirection: "row", gap: 8 }, style]}>
      {LANGUAGES.map(({ code, labelKey }) => {
        const active = language === code;
        return (
          <Pressable
            key={code}
            onPress={() => setLanguage(code)}
            style={{
              paddingVertical: 8,
              paddingHorizontal: 14,
              borderRadius: 999,
              backgroundColor: active ? (dark ? "#fff" : c.navy) : dark ? "rgba(255,255,255,0.12)" : "#fff",
              borderWidth: active ? 0 : 1,
              borderColor: dark ? "rgba(255,255,255,0.5)" : c.border,
            }}
          >
            <Text
              style={{
                fontSize: 13,
                fontFamily: font.semibold,
                color: active ? (dark ? c.navy : "#fff") : dark ? "#fff" : "#333",
              }}
            >
              {t(`language.${labelKey}`)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
