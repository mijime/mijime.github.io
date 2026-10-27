import type { FloorPlan, StructuralConditions } from "../../types";
import type { StructuralReport, FloorStress } from "../../floor/structural-report";
import { formatDriftRatio } from "../../floor/stiffness";
import { ConditionsTab } from "./ConditionsTab";
import { mono, PanelSection } from "./primitives";

/** 全体タブ: 建物全体の判定と、全階の指標一覧（＋建物条件）。 */
export function OverviewTab({
  report,
  floors,
  activeFloorIndex,
  onSelectFloor,
  onConditionsChange,
}: {
  report: StructuralReport;
  floors: FloorPlan[];
  activeFloorIndex: number;
  onSelectFloor: (floorId: string) => void;
  onConditionsChange: (conditions: Partial<StructuralConditions>) => void;
}) {
  const ngFloors = report.floors.filter((f) => !floorOk(f));

  return (
    <>
      <PanelSection>
        <div style={{ ...mono, color: "var(--ink)", fontSize: "10px" }}>
          建物全体: {report.floors.length}階 ／{" "}
          <span style={{ color: ngFloors.length === 0 ? "rgb(46,160,90)" : "rgb(217,58,45)" }}>
            {ngFloors.length === 0 ? "NGなし" : `NG ${ngFloors.length}階`}
          </span>
        </div>
        {ngFloors.length > 0 && (
          <div style={{ ...mono, color: "var(--terra)", fontSize: "9px" }}>
            {ngFloors.map((f) => floors[f.floorIndex]?.name ?? `${f.floorIndex + 1}F`).join("・")}
          </div>
        )}
        <div style={{ ...mono, color: "var(--mid)", fontSize: "9px", lineHeight: 1.4 }}>
          ※層間変形角は剛性の仮定による参考値のため、総合判定には含めていません。
        </div>
      </PanelSection>

      {report.floors.map((f) => {
        const name = floors[f.floorIndex]?.name ?? `${f.floorIndex + 1}F`;
        const id = floors[f.floorIndex]?.id;
        const active = f.floorIndex === activeFloorIndex;
        return (
          <button
            key={f.floorIndex}
            onClick={() => id && onSelectFloor(id)}
            style={{
              background: active ? "var(--paper)" : "transparent",
              border: "1px solid var(--border)",
              borderRadius: "6px",
              cursor: id ? "pointer" : "default",
              display: "flex",
              flexDirection: "column",
              gap: "2px",
              padding: "4px 6px",
              textAlign: "left",
            }}
          >
            <span
              style={{
                ...mono,
                color: "var(--ink)",
                display: "flex",
                fontSize: "10px",
                gap: "6px",
              }}
            >
              <span style={{ flex: 1 }}>{name}</span>
              <span
                style={{ color: floorOk(f) ? "rgb(46,160,90)" : "rgb(217,58,45)", fontSize: "9px" }}
              >
                {floorOk(f) ? "OK" : "NG"}
              </span>
            </span>
            <span style={{ ...mono, color: "var(--mid)", fontSize: "9px", lineHeight: 1.5 }}>
              壁 X{mark(f.wallOkH)} Y{mark(f.wallOkV)}
              　偏心 {f.eccentricity ? f.eccentricity.ex.toFixed(2) : "—"}
              {mark(f.eccentricity?.ok)}
              　剛性 {f.rigidity ? f.rigidity.rsH.toFixed(2) : "—"}
              {mark(f.rigidity ? f.rigidity.okH && f.rigidity.okV : undefined)}
              　変形 {formatDriftRatio(f.drift?.driftH ?? 0)}
              {mark(f.drift ? f.drift.okH && f.drift.okV : undefined)}
            </span>
          </button>
        );
      })}

      <ConditionsTab conditions={report.conditions} onChange={onConditionsChange} />
    </>
  );
}

function floorOk(f: FloorStress): boolean {
  // 層間変形角は剛性の仮定に依存する参考値のため、総合判定には含めない。
  return (
    f.wallOkH &&
    f.wallOkV &&
    (f.eccentricity?.ok ?? true) &&
    (f.rigidity ? f.rigidity.okH && f.rigidity.okV : true)
  );
}

function mark(ok: boolean | undefined): string {
  return ok === undefined ? "–" : ok ? "✓" : "✗";
}
