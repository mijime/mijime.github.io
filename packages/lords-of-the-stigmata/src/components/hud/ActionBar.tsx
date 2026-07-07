import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useEngine } from "../../hooks/useEngine.ts";
import { send } from "../../store.ts";
import type { Pick } from "../App.tsx";
import { DoctrineModal } from "./DoctrineModal";

function ActionBar({
  pick,
  setPick,
}: {
  pick: Pick;
  setPick: (p: Pick) => void;
}): React.JSX.Element {
  const e = useEngine();
  const S = e.S;
  const { t } = useTranslation();
  const [chooseDocOpen, setChooseDocOpen] = useState<"acquire" | "deepen" | null>(null);

  // Task 1: pickCountry banner for player 0
  if (e.pending?.kind === "pickCountry" && e.pending.pi === 0) {
    return (
      <div style={{ color: "var(--txt-dim)", fontSize: "12.5px", padding: "2px 6px" }}>
        {t(e.pending.labelKey, e.pending.labelParams)}
        {e.pending.allowSkip && (
          <button
            onClick={() => send({ type: "pickCountry", key: null })}
            style={{ marginLeft: "10px", padding: "2px 10px", fontSize: "12px" }}
          >
            {t(e.pending.skipKey ?? "ui.cancel")}
          </button>
        )}
      </div>
    );
  }

  if (!e.pending || e.pending.kind !== "action") {
    const status = e.over
      ? t("ui.gameOver")
      : S.cur >= 0
        ? t("ui.turnOf", { name: S.players[S.cur].name })
        : t("ui.phaseInProgress", { phase: t(`phase.${S.phase}`) });
    return (
      <span style={{ color: "var(--txt-dim)", fontSize: "12.5px", padding: "2px 6px" }}>
        {status}
      </span>
    );
  }

  const p = S.players[0];
  const l1Docs = p.doctrines.filter((d) => d.lv === 1);
  const deepenLight = p.faction === "shinpika";
  const canDeepen =
    l1Docs.length > 0 && (deepenLight ? p.act.ac >= 2 : p.act.ac >= 1 && p.act.ap >= 1);

  // Task 2: Check if upgrade targets exist
  const hasUpgradeTarget = S.sel.some((k) =>
    S.board.find((b) => b.key === k)?.pawns.some((pw) => pw.owner === 0 && pw.type === "ac"),
  );

  // If in dispatch mode, show banner
  if (pick?.purpose === "dispatch") {
    return (
      <div style={{ color: "var(--txt-dim)", fontSize: "12.5px", padding: "2px 6px" }}>
        {pick.pawn === "ap" ? t("ui.apostle") : t("ui.activeStats")}
        {t("ui.dispatchHint")} <span style={{ fontSize: "11px" }}>{t("ui.feeNote")}</span>
        <button
          onClick={() => setPick(null)}
          style={{ marginLeft: "10px", padding: "2px 10px", fontSize: "12px" }}
        >
          {t("ui.cancel")}
        </button>
      </div>
    );
  }

  // Task 2: If in upgrade mode, show banner
  if (pick?.purpose === "upgrade") {
    return (
      <div style={{ color: "var(--txt-dim)", fontSize: "12.5px", padding: "2px 6px" }}>
        {t("ui.upgradeHint")}
        <button
          onClick={() => setPick(null)}
          style={{ marginLeft: "10px", padding: "2px 10px", fontSize: "12px" }}
        >
          {t("ui.cancel")}
        </button>
      </div>
    );
  }

  return (
    <>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
        <button
          disabled={p.act.ac < 1}
          onClick={() => setPick({ purpose: "dispatch", pawn: "ac" })}
          title={p.act.ac < 1 ? t("ui.needAc", { n: 1 }) : ""}
        >
          {t("ui.dispatchAc", { n: p.act.ac })}
        </button>
        <button
          disabled={p.act.ap < 1}
          onClick={() => setPick({ purpose: "dispatch", pawn: "ap" })}
          title={p.act.ap < 1 ? t("ui.needAc", { n: 1 }) : ""}
        >
          {t("ui.dispatchAp", { n: p.act.ap })}
        </button>
        <button
          disabled={p.doctrines.length >= 3 || p.act.ac < 2}
          onClick={() => setChooseDocOpen("acquire")}
          title={
            p.doctrines.length >= 3
              ? t("ui.slotsFull")
              : p.act.ac < 2
                ? t("ui.needAc", { n: 2 })
                : ""
          }
        >
          {t("ui.acquireBtn")}
        </button>
        <button
          disabled={p.act.ac < 2}
          onClick={() => send({ type: "chooseAction", action: { type: "promote" } })}
        >
          {t("ui.promoteBtn")}
        </button>
        <button
          disabled={p.act.ac < 1 || !hasUpgradeTarget}
          onClick={() => setPick({ purpose: "upgrade" })}
          title={
            p.act.ac < 1
              ? t("ui.needAc", { n: 1 })
              : !hasUpgradeTarget
                ? t("ui.noUpgradeTarget")
                : ""
          }
        >
          {t("ui.upgradeBtn")}
        </button>
        <button
          disabled={!canDeepen}
          onClick={() => setChooseDocOpen("deepen")}
          title={!l1Docs.length ? t("ui.noLv1") : !canDeepen ? t("ui.needDeepen") : ""}
        >
          {t("ui.deepenBtn", {
            cost: t(deepenLight ? "ui.deepenCostLight" : "ui.deepenCostNormal"),
          })}
        </button>
        <button onClick={() => send({ type: "chooseAction", action: { type: "pass" } })}>
          {t("ui.pass")}
        </button>
      </div>

      {/* Doctrine Modal */}
      {chooseDocOpen && (
        <DoctrineModal
          mode={chooseDocOpen}
          onClose={() => setChooseDocOpen(null)}
          onSelect={(doc) => {
            send({
              type: "chooseAction",
              action:
                chooseDocOpen === "acquire" ? { type: "acquire", doc } : { type: "deepen", doc },
            });
            setChooseDocOpen(null);
          }}
        />
      )}
    </>
  );
}

export { ActionBar };
