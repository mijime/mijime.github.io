import { useTranslation } from "react-i18next";
import { useEngine } from "../../hooks/useEngine.ts";
import { DKEYS, DOCTRINES } from "../../data/doctrines.ts";

function DoctrineModal({
  mode,
  onClose,
  onSelect,
}: {
  mode: "acquire" | "deepen";
  onClose: () => void;
  onSelect: (doc: string) => void;
}): React.JSX.Element {
  const { t } = useTranslation();
  const e = useEngine();
  const S = e.S;
  const p = S.players[0];

  const sub =
    mode === "acquire"
      ? t("ui.acquireCost", { slots: 3 - p.doctrines.length })
      : t("ui.deepenCost", {
          cost: t(p.faction === "shinpika" ? "ui.deepenCostLight" : "ui.deepenCostNormal"),
        });

  const docs =
    mode === "acquire"
      ? DKEYS.filter((k) => !p.doctrines.find((d) => d.key === k))
      : p.doctrines.filter((d) => d.lv === 1).map((d) => d.key);

  return (
    <div id="modalwrap" style={{ display: "flex" }} onClick={onClose}>
      <div id="modal" onClick={(ev) => ev.stopPropagation()}>
        <header>
          <h2>{mode === "acquire" ? t("ui.acquireTitle") : t("ui.deepenTitle")}</h2>
          <p>{sub}</p>
        </header>
        <div id="mbody">
          {docs.map((k, i) => (
            <button key={i} className="opt" onClick={() => onSelect(k)}>
              <span className="ol">{t(`doctrines.${k}.name`)}</span>
              {mode === "acquire" && (
                <span className="od">{`${t(`tracks.${DOCTRINES[k].track}`)} / Lv1:${t(`doctrines.${k}.l1`)} / Lv2:${t(`doctrines.${k}.l2`)} / ${t(`doctrines.${k}.end`)}`}</span>
              )}
              {mode === "deepen" && <span className="od">{t(`doctrines.${k}.l2`)}</span>}
            </button>
          ))}
        </div>
        <div id="mfoot">
          <button onClick={onClose}>{t("ui.cancel2")}</button>
        </div>
      </div>
    </div>
  );
}

export { DoctrineModal };
