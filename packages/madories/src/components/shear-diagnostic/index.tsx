import { useState } from "react";
import type { EdgeRef, FloorPlan } from "../../types";
import type { ShearLayerFlags } from "../../draw/draw-shear-check";
import { computeStructuralReport, type StructuralReport } from "../../floor/structural-report";
import { mono, Panel, TabBar, type TabDef } from "./primitives";
import { SummaryBar } from "./SummaryBar";
import { WallTab } from "./WallTab";
import { BalanceTab } from "./BalanceTab";
import { VerticalTab } from "./VerticalTab";
import { DisplayTab } from "./DisplayTab";

const TABS: TabDef[] = [
  { id: "wall", label: "壁量" },
  { id: "balance", label: "分布" },
  { id: "vertical", label: "上下" },
  { id: "display", label: "表示" },
];

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
  const report = computeStructuralReport(floor, floors);
  const [collapsed, setCollapsed] = useState(false);
  const [tab, setTab] = useState<string>(initialTab(report));

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
          <SummaryBar report={report} />
          <TabBar tabs={TABS} active={tab} onSelect={setTab} />
          {tab === "wall" && <WallTab report={report} />}
          {tab === "balance" && (
            <BalanceTab floor={floor} report={report} onAddWalls={onAddWalls} />
          )}
          {tab === "vertical" && <VerticalTab report={report} />}
          {tab === "display" && (
            <DisplayTab
              layers={layers}
              onToggleLayer={onToggleLayer}
              exportShear={exportShear}
              onToggleExportShear={onToggleExportShear}
            />
          )}
          <div style={{ ...mono, color: "var(--mid)", fontSize: "9px", lineHeight: 1.5 }}>
            簡易目安です。実際の構造・耐震計算は建築士/構造設計者に相談してください。
          </div>
        </>
      )}
    </Panel>
  );
}

/** NG がある最初のタブを初期表示（問題を拾いやすい） */
function initialTab(report: StructuralReport): string {
  const wallNg = !report.wallQuantity.okH || !report.wallQuantity.okV || !report.balanceRatio.ok;
  const balanceNg =
    report.quadrant.quadrants.some((q) => !q.ok) ||
    report.eccentricity?.ok === false ||
    report.perimeter?.ok === false;
  const verticalNg =
    (report.interFloor ? !report.interFloor.ok : false) ||
    (report.support ? report.support.overCount > 0 : false) ||
    report.breaksHere.length > 0 ||
    report.breaksBelow.length > 0;
  if (wallNg) {
    return "wall";
  }
  if (balanceNg) {
    return "balance";
  }
  if (verticalNg) {
    return "vertical";
  }
  return "wall";
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
