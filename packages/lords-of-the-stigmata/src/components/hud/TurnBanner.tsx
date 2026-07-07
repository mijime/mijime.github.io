import { useTranslation } from "react-i18next";
import { useEngine } from "../../hooks/useEngine.ts";
import { getCurrentFx } from "../../store.ts";
import { PCOLCSS } from "../../data/players.ts";
import type { FxEvent } from "../../types.ts";

function fxPi(fx: FxEvent): number | null {
  return "pi" in fx ? fx.pi : null;
}

export function TurnBanner(): React.JSX.Element | null {
  const e = useEngine();
  const { t } = useTranslation();
  const fx = getCurrentFx();
  if (!fx || fx.kind === "phase" || fx.kind === "vp") return null;

  const pi = fxPi(fx);
  const player = pi !== null ? e.S.players[pi].name : "";
  const params: Record<string, string | number> = { player };
  if ("country" in fx) params.country = t(`countries.${fx.country}.name`);
  if ("pawn" in fx) params.pawn = t(fx.pawn === "ap" ? "fx.pawnAp" : "fx.pawnAc");
  if ("doc" in fx) params.doc = t(`doctrines.${fx.doc}.name`);
  if ("relic" in fx) params.relic = t(`relics.${fx.relic}.name`);
  if (fx.kind === "income") {
    params.ac = fx.ac;
    params.ap = fx.ap;
  }

  return (
    <div key={fx.id} className="turn-banner">
      {pi !== null && <span className="dot" style={{ background: PCOLCSS[pi] }} />}
      {t(`fx.${fx.kind}`, params)}
    </div>
  );
}
