import type { EdgeRef, FloorPlan } from "../../types";
import { MM_PER_CELL } from "../../units";
import type { FloorStress } from "../../floor/structural-report";
import { suggestWallRun, type WallSuggestion } from "../../floor/wall-quantity";
import { Gauge, MiniRow, mono, PanelSection } from "./primitives";

/** 壁量タブ: 必要壁量に対する X/Y の保有壁量と、不足分の改善提案。 */
export function WallTab({
  floor,
  stress,
  onAddWalls,
}: {
  floor: FloorPlan;
  stress: FloorStress;
  onAddWalls: (edges: EdgeRef[]) => void;
}) {
  const required = stress.requiredMultiplierLengthM;
  const haveH = stress.strength.hMultiplierLengthM;
  const haveV = stress.strength.vMultiplierLengthM;
  const shortH = Math.max(0, required - haveH);
  const shortV = Math.max(0, required - haveV);
  const addedPerCell = stress.strength.multiplier * (MM_PER_CELL / 1000);

  return (
    <>
      <PanelSection gap={4}>
        <Gauge label="X" have={haveH} need={required} />
        <Gauge label="Y" have={haveV} need={required} />
      </PanelSection>
      <PanelSection>
        <MiniRow
          label="地震力"
          ok={undefined}
          value={`${(stress.seismic.shearN / 1000).toFixed(1)} kN`}
        />
        <MiniRow
          label="Wi"
          ok={undefined}
          value={`${(stress.weight.weightAboveN / 1000).toFixed(1)} kN`}
        />
        <MiniRow
          label="積雪"
          ok={undefined}
          value={`${(stress.weight.snowLoadN / 1000).toFixed(1)} kN`}
        />
        <div style={{ ...mono, color: "var(--mid)", fontSize: "9px", lineHeight: 1.4 }}>
          壁量 = 壁の長さ × 壁倍率（m）。必要 = 地震力 ÷ 1.96。
        </div>
      </PanelSection>

      {shortH > 0 && (
        <Improvement
          direction="X"
          shortfall={shortH}
          addedPerCell={addedPerCell}
          suggestions={suggestionsFor(floor, "h")}
          onAddWalls={onAddWalls}
        />
      )}
      {shortV > 0 && (
        <Improvement
          direction="Y"
          shortfall={shortV}
          addedPerCell={addedPerCell}
          suggestions={suggestionsFor(floor, "v")}
          onAddWalls={onAddWalls}
        />
      )}
    </>
  );
}

/** Best open runs for a direction across the four quadrants (longest first). */
function suggestionsFor(floor: FloorPlan, kind: "h" | "v"): WallSuggestion[] {
  const all: WallSuggestion[] = [];
  for (const q of ["NW", "NE", "SW", "SE"] as const) {
    const s = suggestWallRun(floor, q, kind);
    if (s) {
      all.push(s);
    }
  }
  // Longest two without mutating/sorting (avoids toSorted target issues).
  let first: WallSuggestion | null = null;
  let second: WallSuggestion | null = null;
  for (const s of all) {
    if (!first || s.cells > first.cells) {
      second = first;
      first = s;
    } else if (!second || s.cells > second.cells) {
      second = s;
    }
  }
  return [first, second].filter((s): s is WallSuggestion => s !== null);
}

function Improvement({
  direction,
  shortfall,
  addedPerCell,
  suggestions,
  onAddWalls,
}: {
  direction: "X" | "Y";
  shortfall: number;
  addedPerCell: number;
  suggestions: WallSuggestion[];
  onAddWalls: (edges: EdgeRef[]) => void;
}) {
  const cellsNeeded = addedPerCell > 0 ? Math.ceil(shortfall / addedPerCell) : 0;
  return (
    <PanelSection>
      <div style={{ ...mono, color: "var(--terra)", fontSize: "10px" }}>
        {direction}方向 あと {shortfall.toFixed(1)}m 不足
      </div>
      <div style={{ ...mono, color: "var(--mid)", fontSize: "9px" }}>
        耐力壁を約 {cellsNeeded} マス足すと目安を満たします。
      </div>
      {suggestions.length === 0 ? (
        <div style={{ ...mono, color: "var(--mid)", fontSize: "9px" }}>
          追加できる空き壁ラインが見つかりません。壁の位置を整理してください。
        </div>
      ) : (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
          {suggestions.map((s) => (
            <button
              key={`${s.kind}-${s.x}-${s.y}-${s.cells}`}
              onClick={() => onAddWalls(s.edges)}
              style={{
                background: "var(--ink)",
                border: "none",
                borderRadius: "4px",
                color: "var(--paper)",
                cursor: "pointer",
                fontFamily: "IBM Plex Mono, monospace",
                fontSize: "9px",
                padding: "3px 6px",
              }}
            >
              ＋ ここに追加（+{(s.cells * addedPerCell).toFixed(1)}m）
            </button>
          ))}
        </div>
      )}
    </PanelSection>
  );
}
