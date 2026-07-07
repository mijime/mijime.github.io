import { useTranslation } from "react-i18next";

export function LangToggle(): React.JSX.Element {
  const { i18n, t } = useTranslation();
  const next = i18n.language === "ja" ? "en" : "ja";

  return (
    <button
      className="langtoggle"
      onClick={() => {
        i18n.changeLanguage(next);
        localStorage.setItem("lang", next);
      }}
      title={t("ui.langSwitch")}
    >
      {t("ui.langToggle")}
    </button>
  );
}
