import { useTranslation } from "react-i18next";
import { useEngine } from "../hooks/useEngine.ts";
import { PCOLCSS } from "../data/players.ts";

const handleNewGame = (): void => {
  location.reload();
};

export function EndScreen(): React.JSX.Element {
  const e = useEngine();
  const { t } = useTranslation();

  if (!e.finalResults) {
    return <div />;
  }

  const results = e.finalResults;
  const winner = results[0];

  return (
    <div id="endwrap" style={{ display: "flex" }}>
      <div id="endbox">
        <h2>{t("ui.finalJudgment")}</h2>
        <div className="winner" id="endwinner">
          {t("ui.winner")}
          <b style={{ color: PCOLCSS[winner.pi] }}>{e.S.players[winner.pi].name}</b> —{" "}
          {winner.total} VP
        </div>
        <div id="endlist">
          {results.map((r, rank) => (
            <div key={rank} className="fs">
              <h3>
                <span style={{ color: "var(--gold)" }}>
                  {[t("ui.rank1"), t("ui.rank2"), t("ui.rank3"), t("ui.rank4")][rank]}
                </span>
                <span
                  className="dot"
                  style={{
                    display: "inline-block",
                    width: "10px",
                    height: "10px",
                    borderRadius: "50%",
                    background: PCOLCSS[r.pi],
                  }}
                />
                {e.S.players[r.pi].name}
                <span className="tot">{r.total} VP</span>
              </h3>
              <ul>
                {r.lines.map((line, i) => {
                  const vals: Record<string, string | number> = { n: line.n };
                  if (line.params?.track) vals.trackName = t(`tracks.${line.params.track}`);
                  return <li key={i}>{t(line.key, vals)}</li>;
                })}
              </ul>
            </div>
          ))}
        </div>
        <div style={{ textAlign: "center", marginTop: "14px" }}>
          <button id="endNewBtn" onClick={handleNewGame}>
            {t("ui.newOrder")}
          </button>
        </div>
      </div>
    </div>
  );
}
