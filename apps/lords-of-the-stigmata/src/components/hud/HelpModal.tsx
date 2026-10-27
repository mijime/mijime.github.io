import { Trans, useTranslation } from "react-i18next";

interface HelpModalProps {
  open: boolean;
  onClose: () => void;
}

export function HelpModal({ open, onClose }: HelpModalProps): React.JSX.Element | null {
  const { t } = useTranslation();

  if (!open) return null;

  return (
    <div id="modalwrap" style={{ display: "flex" }} onClick={onClose}>
      <div id="modal" onClick={(ev) => ev.stopPropagation()}>
        <header>
          <h2>{t("ui.helpTitle")}</h2>
          <p>{t("ui.helpSubtitle")}</p>
        </header>
        <div
          id="mbody"
          style={{
            lineHeight: "1.95",
            fontSize: "12.5px",
            color: "var(--txt)",
          }}
        >
          <p>
            <b style={{ color: "var(--gold)" }}>{t("ui.helpGoalLabel")}</b>
            {t("ui.helpGoal")}
          </p>
          <p>
            <b style={{ color: "var(--gold)" }}>{t("ui.helpFlowLabel")}</b>
            <br />① <Trans i18nKey="ui.helpFlow1" components={{ b: <b /> }} />
            <br />② <Trans i18nKey="ui.helpFlow2" components={{ b: <b /> }} />
            <br />③ <Trans i18nKey="ui.helpFlow3" components={{ b: <b /> }} />
          </p>
          <p>
            <b style={{ color: "var(--gold)" }}>{t("ui.helpActionLabel")}</b>
            <br />・<Trans i18nKey="ui.helpAction1" components={{ b: <b /> }} />
            <br />・<Trans i18nKey="ui.helpAction2" components={{ b: <b /> }} />
            <br />・<Trans i18nKey="ui.helpAction3" components={{ b: <b /> }} />
            <br />・<Trans i18nKey="ui.helpAction4" components={{ b: <b /> }} />
          </p>
          <p>
            <b style={{ color: "var(--gold)" }}>{t("ui.helpRelicLabel")}</b>
            {t("ui.helpRelic")}
          </p>
          <p>
            <b style={{ color: "var(--gold)" }}>{t("ui.helpControlLabel")}</b>
            {t("ui.helpControl")}
          </p>
          <p style={{ color: "var(--txt-dim)" }}>{t("ui.helpSimplify")}</p>
        </div>
        <div id="mfoot">
          <button onClick={onClose}>{t("ui.close")}</button>
        </div>
      </div>
    </div>
  );
}
