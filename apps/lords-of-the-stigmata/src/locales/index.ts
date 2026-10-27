import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { ja } from "./ja.ts";
import { en } from "./en.ts";

const stored = localStorage.getItem("lang");
const browser = navigator.language.startsWith("ja") ? "ja" : "en";

i18n.use(initReactI18next).init({
  resources: { ja: { translation: ja }, en: { translation: en } },
  lng: stored ?? browser,
  fallbackLng: "ja",
  interpolation: { escapeValue: false },
  returnObjects: true,
});

export default i18n;
