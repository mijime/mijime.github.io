import { useEffect, useRef } from "react";
import { Trans, useTranslation } from "react-i18next";
import { useEngine } from "../../hooks/useEngine.ts";
import { PlayerName } from "../PlayerName.tsx";
import type { LogEntry } from "../../types.ts";
import type { TFunction } from "i18next";

function logValues(entry: LogEntry, t: TFunction): Record<string, string | number> {
  const p = entry.params ?? {};
  const out: Record<string, string | number> = { ...p };
  if (p.country != null) out.countryName = t(`countries.${p.country}.name`);
  if (p.doctrine != null) out.doctrineName = t(`doctrines.${p.doctrine}.name`);
  if (p.relic != null) out.relicName = t(`relics.${p.relic}.name`);
  if (p.pawn != null) out.pawnText = t(`log.pawn.${p.pawn}`);
  if (p.track != null) out.trackName = t(`tracks.${p.track}`);
  if (p.src != null) out.srcText = t(p.src as string);
  return out;
}

export function LogPanel(): React.JSX.Element {
  const e = useEngine();
  const { t } = useTranslation();
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [e.log.length]);

  return (
    <div id="plog" className="panel" ref={logRef}>
      {e.log.map((entry) => {
        const values = logValues(entry, t);
        return (
          <div key={entry.id} className={entry.cls ? `log ${entry.cls}` : "log"}>
            <Trans
              i18nKey={entry.key}
              values={values}
              components={{ p: <PlayerName pi={(entry.params?.player as number) ?? 0} /> }}
            />
          </div>
        );
      })}
    </div>
  );
}
