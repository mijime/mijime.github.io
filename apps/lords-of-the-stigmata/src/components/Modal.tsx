import { useTranslation } from "react-i18next";
import { useEngine } from "../hooks/useEngine.ts";
import { send } from "../store.ts";

const handleOptClick = (index: number): void => {
  send({ type: "modal", index });
};

const handleCancel = (): void => {
  send({ type: "modal", index: null });
};

export function Modal(): React.JSX.Element {
  const e = useEngine();
  const { t } = useTranslation();

  if (!e.pending || e.pending.kind !== "modal") {
    return <div />;
  }

  const pending = e.pending;

  const resolveParams = (
    params?: Record<string, string | number>,
  ): Record<string, string | number> => {
    if (!params) return {};
    const resolved: Record<string, string | number> = { ...params };
    if (params.doctrine) {
      resolved.doctrineName = t(`doctrines.${params.doctrine}.name`);
    }
    return resolved;
  };

  return (
    <div id="modalwrap" style={{ display: "flex" }} onClick={handleCancel}>
      <div id="modal" onClick={(ev) => ev.stopPropagation()}>
        <header>
          <h2>{t(pending.titleKey, pending.titleParams)}</h2>
          {pending.subKey && <p>{t(pending.subKey, pending.subParams)}</p>}
        </header>
        <div id="mbody">
          {pending.opts.map((opt, i) => (
            <button
              key={i}
              className="opt"
              disabled={opt.disabled}
              onClick={() => handleOptClick(i)}
            >
              <span className="ol">{t(opt.labelKey, resolveParams(opt.labelParams))}</span>
              {opt.descKey && <span className="od">{t(opt.descKey, opt.descParams)}</span>}
              {opt.costKey && <span className="oc">{t(opt.costKey, opt.costParams)}</span>}
            </button>
          ))}
        </div>
        <div id="mfoot">
          {pending.cancelKey && <button onClick={handleCancel}>{t(pending.cancelKey)}</button>}
        </div>
      </div>
    </div>
  );
}
