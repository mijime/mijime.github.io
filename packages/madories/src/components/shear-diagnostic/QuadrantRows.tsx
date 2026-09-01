import type { EdgeRef, FloorPlan } from "../../types";
import type { FloorBalance } from "../../floor/quadrant-balance";
import { suggestWallRun } from "../../floor/wall-quantity";
import { dotColor } from "../../draw/draw-shear-check";
import { mono, PanelSection } from "./primitives";

interface Props {
  floor: FloorPlan;
  balance: FloorBalance;
  onAddWalls: (edges: EdgeRef[]) => void;
}

export function QuadrantRows({ floor, balance, onAddWalls }: Props) {
  if (balance.quadrants.length === 0) {
    return null;
  }
  return (
    <PanelSection>
      {balance.quadrants.map((q) => {
        const missing = q.h === 0 ? "横壁なし" : q.v === 0 ? "縦壁なし" : null;
        const suggestion =
          missing === "横壁なし"
            ? suggestWallRun(floor, q.name, "h")
            : missing === "縦壁なし"
              ? suggestWallRun(floor, q.name, "v")
              : null;
        return (
          <div key={q.name} style={{ alignItems: "center", display: "flex", gap: "6px" }}>
            <span
              style={{
                background: dotColor(q.ratio),
                borderRadius: "50%",
                border: "1px solid var(--border)",
                flexShrink: 0,
                height: "12px",
                width: "12px",
              }}
            />
            <span style={{ ...mono, color: "var(--ink)", fontSize: "11px", width: "26px" }}>
              {q.name}
            </span>
            <span
              style={{
                ...mono,
                color: missing ? "var(--terra)" : "var(--mid)",
                fontSize: "10px",
                flex: 1,
              }}
            >
              {missing ?? `横${(q.h / 1000).toFixed(1)}m 縦${(q.v / 1000).toFixed(1)}m`}
            </span>
            {suggestion && (
              <button
                onClick={() => onAddWalls(suggestion.edges)}
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
                追加
              </button>
            )}
          </div>
        );
      })}
    </PanelSection>
  );
}
