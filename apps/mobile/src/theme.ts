export const c = {
  navy: "#0B2A4A",
  green: "#1FA463",
  greenLight: "#5EE39B",
  orange: "#F2994A",
  bg: "#F2F2F7",
  border: "#E6E3DD",
  muted: "#6B7280",
  mutedLight: "#9CA3AF",
  text: "#16181C",
  danger: "#C0392B",
  successBg: "#DCF3E7",
  successText: "#17824E",
  chipBg: "#F2F2F0",
  trackBg: "#EEECE7",
  disabledDot: "#E5E7EB",
  greenSoft: "#CFEBDD",
} as const;

type ThemeLang = "en" | "hi" | "te";

let currentLang: ThemeLang = "en";

/** Called by LanguageContext on startup/change — updates font.* and locale-aware helpers below. */
export function setThemeLanguage(lang: ThemeLang) {
  currentLang = lang;
}

const FONT_FAMILIES: Record<ThemeLang, { regular: string; semibold: string; bold: string; extrabold: string }> = {
  en: {
    regular: "Manrope_500Medium",
    semibold: "Manrope_600SemiBold",
    bold: "Manrope_700Bold",
    extrabold: "Manrope_800ExtraBold",
  },
  hi: {
    regular: "NotoSansDevanagari_500Medium",
    semibold: "NotoSansDevanagari_600SemiBold",
    bold: "NotoSansDevanagari_700Bold",
    extrabold: "NotoSansDevanagari_800ExtraBold",
  },
  te: {
    regular: "NotoSansTelugu_500Medium",
    semibold: "NotoSansTelugu_600SemiBold",
    bold: "NotoSansTelugu_700Bold",
    extrabold: "NotoSansTelugu_800ExtraBold",
  },
};

// Getters (not a plain object) so every existing `font.regular`/`font.bold`/etc. call site
// picks up the active language automatically — no need to touch ~200+ call sites.
export const font = {
  get regular() {
    return FONT_FAMILIES[currentLang].regular;
  },
  get semibold() {
    return FONT_FAMILIES[currentLang].semibold;
  },
  get bold() {
    return FONT_FAMILIES[currentLang].bold;
  },
  get extrabold() {
    return FONT_FAMILIES[currentLang].extrabold;
  },
};

// `-u-nu-latn` forces Western digits — ICU defaults Hindi/Telugu to native-script numerals,
// which would look unfamiliar/broken to Indian users who expect Latin digits even in Hindi/Telugu apps.
const LOCALES: Record<ThemeLang, string> = {
  en: "en-IN",
  hi: "hi-IN-u-nu-latn",
  te: "te-IN-u-nu-latn",
};

export const localeFor = (lang: ThemeLang = currentLang) => LOCALES[lang];

export const inr = (n: number) => `₹${n.toLocaleString(localeFor())}`;

export const statusColor = (status: string) =>
  status === "COMPLETED" || status === "PAID"
    ? c.green
    : status === "CANCELLED"
      ? c.danger
      : c.orange;

const STATUS_LABELS: Record<ThemeLang, Record<string, string>> = {
  en: {
    CONFIRMED: "Awaiting Payment",
    PAID: "Paid",
    IN_PROGRESS: "In Progress",
    COMPLETED: "Completed",
    CANCELLED: "Cancelled",
  },
  hi: {
    CONFIRMED: "भुगतान लंबित",
    PAID: "भुगतान हो गया",
    IN_PROGRESS: "प्रगति पर",
    COMPLETED: "पूर्ण",
    CANCELLED: "रद्द",
  },
  te: {
    CONFIRMED: "చెల్లింపు పెండింగ్‌లో ఉంది",
    PAID: "చెల్లించారు",
    IN_PROGRESS: "పురోగతిలో ఉంది",
    COMPLETED: "పూర్తయింది",
    CANCELLED: "రద్దయింది",
  },
};

export const statusLabel = (status: string) => STATUS_LABELS[currentLang][status] ?? status;
