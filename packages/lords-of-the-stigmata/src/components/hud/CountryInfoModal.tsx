import { useTranslation } from "react-i18next";
import { useEngine } from "../../hooks/useEngine.ts";
import { send } from "../../store.ts";
import { cdef, country, cap } from "../../engine/helpers.ts";
import { PCOLCSS } from "../../data/players.ts";
import type { CountryKey } from "../../types.ts";

function CountryInfoModal({
  countryKey,
  onClose,
}: {
  countryKey: CountryKey;
  onClose: () => void;
}): React.JSX.Element {
  const { t } = useTranslation();
  const e = useEngine();
  const S = e.S;
  cdef(countryKey); // for potential future use
  const c = country(S, countryKey);
  const pawnsStr: React.ReactNode = c.pawns.length
    ? c.pawns
        .map((pw) => (
          <span key={pw.uid} style={{ color: PCOLCSS[pw.owner] }}>
            {pw.type === "ap" ? t("ui.apostle") : t("ui.acolyte")}
          </span>
        ))
        .reduce<React.ReactNode[]>((acc, elem) => {
          if (acc.length === 0) return [elem];
          acc.push("、", elem);
          return acc;
        }, [])
    : t("ui.none");
  const capVal = cap(S, countryKey);

  return (
    <div id="modalwrap" style={{ display: "flex" }} onClick={onClose}>
      <div id="modal" onClick={(ev) => ev.stopPropagation()}>
        <header>
          <h2>{t(`countries.${countryKey}.name`)}</h2>
          <p>
            {t(`countries.${countryKey}.tag`)}
            {t("ui.capLabel", { cap: capVal })}
          </p>
        </header>
        <div
          id="mbody"
          style={{
            lineHeight: "1.9",
            fontSize: "13px",
          }}
        >
          <p>
            <b style={{ color: "var(--gold)" }}>{t("ui.effectLabel")}</b>
            {t(`countries.${countryKey}.eff`)}
          </p>
          <p>
            <b style={{ color: "var(--gold)" }}>{t("ui.adjLabel")}</b>
            {S.adj[countryKey].map((k) => t(`countries.${k}.name`)).join("、")}
          </p>
          <p style={{ marginTop: "8px", color: "var(--txt-dim)" }}>
            {t("ui.currentPlacement")}
            {pawnsStr}
          </p>
        </div>
        <div id="mfoot">
          <button onClick={onClose}>{t("ui.close")}</button>
          {e.pending?.kind === "pickCountry" && e.pending.valid.includes(countryKey) && (
            <button
              onClick={() => {
                send({ type: "pickCountry", key: countryKey });
                onClose();
              }}
            >
              {t("ui.select")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export { CountryInfoModal };
