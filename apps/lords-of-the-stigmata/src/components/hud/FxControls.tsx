import { useTranslation } from "react-i18next";
import { useEngine } from "../../hooks/useEngine.ts";
import { getCurrentFx, getSpeed, setSpeed, skipAll } from "../../store.ts";

export function FxControls(): React.JSX.Element | null {
  const { t } = useTranslation();
  useEngine(); // 再生状態の変化(notify)で再描画させる
  const speed = getSpeed();
  if (!getCurrentFx()) return null;

  return (
    <div id="fxcontrols" className="panel">
      <button className={speed === 1 ? "on" : ""} onClick={() => setSpeed(1)}>
        {t("fx.speed1")}
      </button>
      <button className={speed === 2 ? "on" : ""} onClick={() => setSpeed(2)}>
        {t("fx.speed2")}
      </button>
      <button onClick={() => skipAll()}>{t("fx.skip")}</button>
    </div>
  );
}
