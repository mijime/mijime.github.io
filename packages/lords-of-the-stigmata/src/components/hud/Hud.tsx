import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useEngine } from "../../hooks/useEngine.ts";
import { cdef, country, cap, inflIn, topOf } from "../../engine/helpers.ts";
import { PCOLCSS } from "../../data/players.ts";
import type { CountryKey } from "../../types.ts";
import type { Pick } from "../App.tsx";
import { ActionBar } from "./ActionBar";
import { CountryInfoModal } from "./CountryInfoModal";
import { LangToggle } from "../LangToggle";
import { HelpModal } from "./HelpModal";
import { RelicPanel } from "./RelicPanel";
import { TilePanel } from "./TilePanel";
import { LogPanel } from "./LogPanel";
import { TurnBanner } from "./TurnBanner";
import { FxControls } from "./FxControls";
import { getCurrentFx } from "../../store.ts";

let floatSeq = 0;

interface HudProps {
  pick: Pick;
  setPick: (p: Pick) => void;
  onCountryClick: (k: CountryKey) => void;
  validKeys?: CountryKey[];
}

export function Hud({ pick, setPick, onCountryClick, validKeys }: HudProps): React.JSX.Element {
  const e = useEngine();
  const S = e.S;
  const { t } = useTranslation();
  const [helpOpen, setHelpOpen] = useState(false);
  const [countryInfoOpen, setCountryInfoOpen] = useState<CountryKey | null>(null);

  const [phaseBanner, setPhaseBanner] = useState<string | null>(null);
  const fx = getCurrentFx();
  const lastPhaseFx = useRef(0);
  useEffect(() => {
    if (fx?.kind === "phase" && fx.id !== lastPhaseFx.current) {
      lastPhaseFx.current = fx.id;
      setPhaseBanner(t(`phase.${fx.phase}`));
    }
  }, [fx, t]);

  const [vpFloats, setVpFloats] = useState<Array<{ id: number; pi: number; n: number }>>([]);
  const prevVp = useRef<number[] | null>(null);
  useEffect(() => {
    const cur = S.players.map((p) => p.vp);
    const prev = prevVp.current;
    prevVp.current = cur;
    if (!prev || prev.length !== cur.length) return;
    const gains = cur
      .map((vp, pi) => ({ pi, n: vp - (prev[pi] ?? 0) }))
      .filter((g) => g.n > 0)
      .map((g) => ({ id: ++floatSeq, pi: g.pi, n: g.n }));
    if (gains.length) setVpFloats((f) => [...f, ...gains]);
  });

  const handleCountryCardClick = (k: CountryKey): void => {
    // If pick is active (dispatch/upgrade), delegate to App
    if (pick) {
      onCountryClick(k);
      return;
    }
    // Otherwise show country info
    setCountryInfoOpen(k);
  };

  if (!S.started) {
    return <div />;
  }

  const roundStr = S.round > 6 ? "6" : String(S.round);
  const validKeysSet = validKeys ? new Set(validKeys) : undefined;

  return (
    <>
      {/* Top Bar */}
      <div id="topbar" className="panel">
        <h1>{t("ui.appTitle")}</h1>
        <span className="ti">
          {t("ui.roundCounter")} <b id="tRound">{roundStr}</b>／6
        </span>
        <span className="ti">
          {t("ui.phaseLabel")}
          <b id="tPhase">{t(`phase.${S.phase}`)}</b>
        </span>
        <span className="ti">
          {t("ui.firstPlayer")}
          <b id="tFirstPlayer" style={{ color: PCOLCSS[S.order[0]] }}>
            {S.players[S.order[0]].name}
          </b>
        </span>
        <span className="spacer" />
        <button id="btnHelp" style={{ padding: "4px 12px" }} onClick={() => setHelpOpen(true)}>
          {t("ui.howToPlay")}
        </button>
        <LangToggle />
      </div>

      {/* Player Panel */}
      <div id="pplayers" className="panel">
        {S.players.map((p, i) => {
          const docs = p.doctrines
            .map((d) => (
              <span
                key={d.key}
                className={`tag ${d.lv === 2 ? "lv2" : ""}`}
                title={d.lv === 2 ? t(`doctrines.${d.key}.l2`) : t(`doctrines.${d.key}.l1`)}
              >
                {t(`doctrines.${d.key}.name`)}
                {d.lv === 2 ? "Ⅱ" : ""}
              </span>
            ))
            .concat(
              p.faction
                ? [
                    <span key="faction" className="tag lv2" title={t(`factions.${p.faction}.desc`)}>
                      {t(`factions.${p.faction}.name`)}
                    </span>,
                  ]
                : [],
            )
            .concat(
              p.passed
                ? [
                    <span key="passed" className="tag">
                      {t("ui.passed")}
                    </span>,
                  ]
                : [],
            )
            .concat(
              p.relics.map((r) => (
                <span
                  key={`relic-${r}`}
                  className="tag"
                  style={{
                    borderColor: "#b9a0e8",
                    color: "#b9a0e8",
                  }}
                  title={t(`relics.${r}.desc`)}
                >
                  ✦{t(`relics.${r}.name`)}
                </span>
              )),
            );

          return (
            <div key={i} className={`pcard ${S.cur === i ? "turn" : ""}`}>
              <div className="pname">
                <span className="dot" style={{ background: PCOLCSS[i] }} />
                {p.name}
                {S.order[0] === i && (
                  <span className="crown" title={t("ui.topPopeTitle")}>
                    ♛
                  </span>
                )}
                <span className="ip">{p.vp} VP</span>
              </div>
              <div className="row">
                {t("ui.activeStats")} <b>{p.act.ac}</b>／{t("ui.apostle")} <b>{p.act.ap}</b>
              </div>
              <div className="row" style={{ display: "flex", gap: "8px", fontSize: "11px" }}>
                {(["mission", "sacrament", "sacrifice", "wisdom"] as const).map((k) => (
                  <span key={k}>
                    {t(`tracks.${k}`)} <b>{p.tracks[k]}</b>
                  </span>
                ))}
              </div>
              <div className="row">{docs}</div>
              {vpFloats
                .filter((fl) => fl.pi === i)
                .map((fl) => (
                  <span
                    key={fl.id}
                    className="ip-float"
                    onAnimationEnd={() => setVpFloats((arr) => arr.filter((x) => x.id !== fl.id))}
                  >
                    +{fl.n} VP
                  </span>
                ))}
            </div>
          );
        })}
      </div>

      {/* Relic Pool Panel */}
      <RelicPanel />

      {/* Tile Panel */}
      <TilePanel />

      {/* Country Panel */}
      <div id="pcountries" className="panel">
        {S.sel.map((k) => {
          const c = country(S, k);
          cdef(k); // for potential future use
          const capVal = cap(S, k);
          const tops = topOf(S, c);
          const infl = S.players.map((_p, i) => {
            const v = inflIn(c, i);
            return (
              <span key={i}>
                <span
                  className="d"
                  style={{
                    background: PCOLCSS[i],
                    opacity: v > 0 ? 1 : 0.25,
                  }}
                />
                {v}
              </span>
            );
          });

          const isPickValid =
            validKeysSet && validKeysSet.has(k) ? "valid" : validKeysSet ? "invalid" : "";

          return (
            <div
              key={k}
              className={`ccard ${isPickValid}`}
              data-ck={k}
              onClick={() => {
                handleCountryCardClick(k);
              }}
            >
              <div className="cname">
                {t(`countries.${k}.name`)}
                <small>{t(`countries.${k}.tag`)}</small>
              </div>
              <div className="slots">
                {t("ui.slotCount", { cur: c.pawns.length, cap: capVal })}
                {"　"}
                {tops.length ? (
                  <>
                    {t("ui.dominationLabel")}
                    {tops.map((pi) => (
                      <span key={pi} style={{ color: PCOLCSS[pi] }}>
                        ●
                      </span>
                    ))}
                  </>
                ) : (
                  t("ui.noRuler")
                )}
              </div>
              <div className="infl">{infl}</div>
              {c.pawns.length > 0 && (
                <div className="order" title={t("ui.placeOrderTitle")}>
                  {c.pawns.map((pw) => (
                    <span key={pw.uid} style={{ color: PCOLCSS[pw.owner] }}>
                      {pw.type === "ap" ? "◉" : "o"}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Action Bar */}
      <div id="pactions" className="panel">
        <ActionBar pick={pick} setPick={setPick} />
      </div>

      {/* Log Panel */}
      <LogPanel />

      {/* Turn Banner */}
      <TurnBanner />

      {/* FX Controls */}
      <FxControls />

      {phaseBanner && (
        <div
          key={`${S.round}-${phaseBanner}`}
          className="phase-banner"
          onAnimationEnd={() => setPhaseBanner(null)}
        >
          {phaseBanner}
        </div>
      )}

      {/* Banner */}
      {e.bannerKey && <div id="banner">{t(e.bannerKey)}</div>}

      {/* Help Modal */}
      <HelpModal open={helpOpen} onClose={() => setHelpOpen(false)} />

      {/* Country Info Modal */}
      {countryInfoOpen && (
        <CountryInfoModal countryKey={countryInfoOpen} onClose={() => setCountryInfoOpen(null)} />
      )}
    </>
  );
}
