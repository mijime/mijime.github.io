import { useTranslation } from "react-i18next";
import { useEngine } from "../../hooks/useEngine.ts";
import { ROUND_TILES } from "../../engine/round-tiles.ts";

export function TilePanel(): React.JSX.Element {
  const e = useEngine();
  const { t } = useTranslation();
  return (
    <div id="ptiles" className="panel">
      <h3 style={{ margin: "0 0 8px 0", fontSize: "13px" }}>{t("ui.tilesHeading")}</h3>
      {e.S.roundTiles.map((k, i) => {
        const short = k.replace("tile.", "");
        const cur = i + 1 === e.S.round && !e.S.over;
        return (
          <div
            key={i}
            style={{
              opacity: i + 1 < e.S.round ? 0.4 : 1,
              fontSize: "11.5px",
              padding: "3px 6px",
              border: cur ? "1px solid var(--gold)" : "1px solid transparent",
              borderRadius: 3,
            }}
          >
            R{i + 1}: <b>{t(`tiles.${short}.name`)}</b>{" "}
            {t("ui.tileVpPer", { n: ROUND_TILES[k].vpPer })}
            <div style={{ color: "var(--txt-dim)", fontSize: "10px" }}>
              {t(`tiles.${short}.desc`)}
            </div>
          </div>
        );
      })}
    </div>
  );
}
