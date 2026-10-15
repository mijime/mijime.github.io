import { useState } from "react";
import type { Building, EdgeRef, StructuralConditions } from "../../types";
import type { ShearLayerFlags } from "../../draw/draw-shear-check";
import { computeStructuralReport } from "../../floor/structural-report";
import { mono, Panel, TabBar, type TabDef } from "./primitives";
import { SummaryBar } from "./SummaryBar";
import { OverviewTab } from "./OverviewTab";
import { WallTab } from "./WallTab";
import { BalanceTab } from "./BalanceTab";
import { RigidityTab } from "./RigidityTab";
import { BasisTab } from "./BasisTab";
import { DisplayTab } from "./DisplayTab";

const TABS: TabDef[] = [
  { id: "overview", label: "全体" },
  { id: "floor", label: "この階" },
  { id: "basis", label: "根拠" },
];

interface Props {
  building: Building;
  activeFloorId: string;
  layers: ShearLayerFlags;
  onToggleLayer: (key: keyof ShearLayerFlags) => void;
  exportShear: boolean;
  onToggleExportShear: () => void;
  onAddWalls: (edges: EdgeRef[]) => void;
  onConditionsChange: (conditions: Partial<StructuralConditions>) => void;
  onSelectFloor: (floorId: string) => void;
  onClose: () => void;
}

export function ShearDiagnostic({
  building,
  activeFloorId,
  layers,
  onToggleLayer,
  exportShear,
  onToggleExportShear,
  onAddWalls,
  onConditionsChange,
  onSelectFloor,
  onClose,
}: Props) {
  const report = computeStructuralReport(building);
  const activeIndex = building.floors.findIndex((f) => f.id === activeFloorId);
  const floor = building.floors[activeIndex] ?? building.floors[0];
  const stress = report.floors[activeIndex] ?? report.floors[0];
  const [collapsed, setCollapsed] = useState(false);
  const [tab, setTab] = useState<string>("overview");
  const [displayOpen, setDisplayOpen] = useState(false);

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
          許容応力度計算（簡易）
        </div>
        <div style={{ alignItems: "center", display: "flex", gap: "8px" }}>
          <button
            onClick={() => setDisplayOpen((o) => !o)}
            title="表示設定"
            style={{
              background: displayOpen ? "var(--ink)" : "transparent",
              border: "1px solid var(--border)",
              borderRadius: "4px",
              color: displayOpen ? "var(--paper)" : "var(--mid)",
              cursor: "pointer",
              fontFamily: "IBM Plex Mono, monospace",
              fontSize: "9px",
              padding: "2px 6px",
            }}
          >
            表示
          </button>
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
          {!displayOpen && tab === "floor" && <SummaryBar stress={stress} />}
          {!displayOpen && <TabBar tabs={TABS} active={tab} onSelect={setTab} />}

          {displayOpen ? (
            <DisplayTab
              layers={layers}
              onToggleLayer={onToggleLayer}
              exportShear={exportShear}
              onToggleExportShear={onToggleExportShear}
            />
          ) : (
            <>
              {tab === "overview" && (
                <OverviewTab
                  report={report}
                  floors={building.floors}
                  activeFloorIndex={activeIndex}
                  onSelectFloor={onSelectFloor}
                  onConditionsChange={onConditionsChange}
                />
              )}
              {tab === "floor" && (
                <>
                  <WallTab floor={floor} stress={stress} onAddWalls={onAddWalls} />
                  <BalanceTab floor={floor} stress={stress} onAddWalls={onAddWalls} />
                  <RigidityTab stress={stress} />
                </>
              )}
              {tab === "basis" && (
                <BasisTab stress={stress} region={report.region} conditions={report.conditions} />
              )}
            </>
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
