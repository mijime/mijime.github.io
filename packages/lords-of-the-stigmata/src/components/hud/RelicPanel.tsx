import { useTranslation } from "react-i18next";
import { useEngine } from "../../hooks/useEngine.ts";
import { RELICS } from "../../data/relics.ts";
import { PCOLCSS } from "../../data/players.ts";

export function RelicPanel(): React.JSX.Element {
  const e = useEngine();
  const S = e.S;
  const { t } = useTranslation();

  return (
    <div id="prelics" className="panel">
      <h3 style={{ margin: "0 0 8px 0", fontSize: "13px" }}>{t("ui.relicsHeading")}</h3>
      {S.relicPool.map((rk, i) => {
        const relic = RELICS[rk as keyof typeof RELICS];
        const takenBy = S.relicsTaken[rk];
        const cur = i + 1 === S.round && takenBy === undefined;
        return (
          <div
            key={i}
            style={{
              opacity: takenBy !== undefined ? 0.6 : 1,
              fontSize: "11.5px",
              padding: "3px 6px",
              border: cur ? "1px solid var(--gold)" : "1px solid transparent",
              borderRadius: 3,
            }}
          >
            <div style={{ color: "#b9a0e8", fontWeight: "bold" }}>✦{t(`relics.${rk}.name`)}</div>
            {takenBy !== undefined ? (
              <div style={{ fontSize: "10px", color: PCOLCSS[takenBy] }}>
                {t("ui.relicTakenBy")}
                {S.players[takenBy].name}
              </div>
            ) : cur ? (
              <div style={{ fontSize: "10px", color: "var(--gold)", fontWeight: "bold" }}>
                {t("ui.relicThisRound")}
              </div>
            ) : null}
            <div style={{ fontSize: "10px", color: "var(--txt-dim)" }}>
              {t(`relics.${rk}.desc`)} +{relic.vp} VP
            </div>
          </div>
        );
      })}
    </div>
  );
}
