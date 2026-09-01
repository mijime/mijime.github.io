import { useState } from "react";
import type { EdgeRef, FloorPlan } from "../../types";
import { computeStructuralReport } from "../../floor/structural-report";
import { Gauge, mono, Panel, PanelSection } from "./primitives";
import { LayerToggles } from "./LayerToggles";
import { QuadrantRows } from "./QuadrantRows";
import { MetricGroup } from "./MetricGroup";
import type { ShearLayerFlags } from "../../draw/draw-shear-check";

interface Props {
  floor: FloorPlan;
  /** All floors in bottom-up story order (building.floors) */
  floors: FloorPlan[];
  layers: ShearLayerFlags;
  onToggleLayer: (key: keyof ShearLayerFlags) => void;
  exportShear: boolean;
  onToggleExportShear: () => void;
  onAddWalls: (edges: EdgeRef[]) => void;
  onClose: () => void;
}

export function ShearDiagnostic({
  floor,
  floors,
  layers,
  onToggleLayer,
  exportShear,
  onToggleExportShear,
  onAddWalls,
  onClose,
}: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const report = computeStructuralReport(floor, floors);
  const { wallQuantity } = report;

  return (
    <Panel>
      <div style={{ alignItems: "center", display: "flex", justifyContent: "space-between" }}>
        <div
          style={{
            ...mono,
            color: "var(--mid)",
            fontSize: "9px",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
          }}
        >
          耐震診断（簡易）
        </div>
        <div style={{ alignItems: "center", display: "flex", gap: "16px" }}>
          <button
            onClick={() => setCollapsed((c) => !c)}
            title={collapsed ? "展開" : "最小化"}
            style={iconButton(16)}
          >
            {collapsed ? "▸" : "▾"}
          </button>
          <button onClick={onClose} style={iconButton(17)}>
            ✕
          </button>
        </div>
      </div>

      {!collapsed && (
        <>
          <LayerToggles
            layers={layers}
            onToggleLayer={onToggleLayer}
            exportShear={exportShear}
            onToggleExportShear={onToggleExportShear}
          />
          <PanelSection gap={4}>
            <Gauge label="横" have={wallQuantity.haveHm} need={wallQuantity.needM} />
            <Gauge label="縦" have={wallQuantity.haveVm} need={wallQuantity.needM} />
          </PanelSection>
          <QuadrantRows floor={floor} balance={report.quadrant} onAddWalls={onAddWalls} />
          <MetricGroup report={report} />
          {floors.length >= 2 &&
            (report.breaksHere.length > 0 || report.breaksBelow.length > 0) && (
              <div
                style={{
                  ...mono,
                  borderTop: "1px solid var(--border)",
                  color: "var(--mid)",
                  display: "flex",
                  flexDirection: "column",
                  fontSize: "10px",
                  gap: "2px",
                  paddingTop: "6px",
                }}
              >
                {report.breaksHere.length > 0 && (
                  <span>▹ 通りズレ:上階壁 ×{report.breaksHere.length}</span>
                )}
                {report.breaksBelow.length > 0 && (
                  <span>▹ 通りズレ:下階壁 ×{report.breaksBelow.length}</span>
                )}
              </div>
            )}
          <div style={{ ...mono, color: "var(--mid)", fontSize: "9px", lineHeight: 1.5 }}>
            簡易目安です。実際の構造・耐震計算は建築士/構造設計者に相談してください。
          </div>
        </>
      )}
    </Panel>
  );
}

function iconButton(fontSize: number) {
  return {
    background: "transparent",
    border: "none",
    color: "var(--mid)",
    cursor: "pointer",
    fontFamily: "IBM Plex Mono, monospace",
    fontSize: `${fontSize}px`,
    minWidth: "32px",
    minHeight: "32px",
    padding: "0",
  };
}
