import { useState } from "react";
import type { EdgeRef, FloorPlan } from "../types";
import { computeQuadrantBalance } from "../floor/quadrant-balance";
import {
  computeInterFloorWallBalance,
  computeWallQuantity,
  suggestWallRun,
} from "../floor/wall-quantity";
import { detectLoadPathBreaks } from "../floor/shear-walls";
import {
  computeBalanceRatio,
  computeEccentricity,
  computePerimeterContinuity,
} from "../floor/structure-metrics";
import { dotColor, type ShearLayerFlags } from "../draw/draw-shear-check";
import { computeFloorSupport, SUPPORT_SPAN_MAX_M } from "../floor/floor-support";

interface Props {
  floor: FloorPlan;
  /** All floors in bottom-up story order (building.floors) */
  floors: FloorPlan[];
  activeFloorId: string;
  layers: ShearLayerFlags;
  onToggleLayer: (key: keyof ShearLayerFlags) => void;
  exportShear: boolean;
  onToggleExportShear: () => void;
  onAddWalls: (edges: EdgeRef[]) => void;
  onClose: () => void;
}

const mono = { fontFamily: "IBM Plex Mono, monospace" };

const LAYER_OPTIONS: { key: keyof ShearLayerFlags; label: string }[] = [
  { key: "runs", label: "耐力壁ラン" },
  { key: "columns", label: "通し柱" },
  { key: "quadrant", label: "四分割" },
  { key: "breaks", label: "通りズレ" },
  { key: "rigid", label: "剛心/重心" },
  { key: "support", label: "床支持" },
];

export function ShearDiagnostic({
  floor,
  floors,
  activeFloorId,
  layers,
  onToggleLayer,
  exportShear,
  onToggleExportShear,
  onAddWalls,
  onClose,
}: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const balance = computeQuadrantBalance(floor);
  const qty = computeWallQuantity(floor);
  const activeIndex = floors.findIndex((f) => f.id === activeFloorId);
  const breaks = detectLoadPathBreaks(floors);
  const breaksHere =
    activeIndex === -1 ? [] : breaks.filter((b) => b.floorIndex === activeIndex + 1);
  const breaksBelow = activeIndex === -1 ? [] : breaks.filter((b) => b.floorIndex === activeIndex);
  const balanceRatio = computeBalanceRatio(floor);
  const ecc = computeEccentricity(floor);
  const perim = computePerimeterContinuity(floor);
  const interFloor = computeInterFloorWallBalance(floors).find((b) => b.lowerIndex === activeIndex);
  const support = computeFloorSupport(floors).find((s) => s.floorIndex === activeIndex);

  function MiniRow({
    label,
    ok,
    value,
  }: {
    label: string;
    ok: boolean | undefined;
    value: string;
  }) {
    return (
      <div style={{ alignItems: "center", display: "flex", gap: "6px" }}>
        <span style={{ ...mono, color: "var(--mid)", fontSize: "10px", width: "58px" }}>
          {label}
        </span>
        <span
          style={{
            ...mono,
            color: ok ? "var(--ink)" : "var(--terra)",
            fontSize: "10px",
            flex: 1,
            textAlign: "right",
          }}
        >
          {value}
        </span>
        <span style={{ ...mono, color: ok ? "rgb(46,160,90)" : "var(--terra)", fontSize: "10px" }}>
          {ok === undefined ? "—" : ok ? "OK" : "NG"}
        </span>
      </div>
    );
  }

  function Gauge({ label, have, need }: { label: string; have: number; need: number }) {
    const ok = have >= need;
    const pct = Math.min(100, need > 0 ? (have / need) * 100 : 100);
    return (
      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
        <span style={{ ...mono, color: "var(--mid)", fontSize: "10px", width: "24px" }}>
          {label}
        </span>
        <div
          style={{
            background: "var(--paper)",
            border: "1px solid var(--border)",
            borderRadius: "3px",
            flex: 1,
            height: "10px",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              background: ok ? "rgb(46,160,90)" : "rgb(168,85,247)",
              height: "100%",
              width: `${pct}%`,
            }}
          />
        </div>
        <span style={{ ...mono, color: ok ? "var(--ink)" : "var(--terra)", fontSize: "10px" }}>
          {have.toFixed(1)}/{need.toFixed(1)}m
        </span>
      </div>
    );
  }

  return (
    <div
      style={{
        background: "var(--toolbar)",
        border: "1px solid var(--border)",
        borderRadius: "10px",
        boxShadow: "0 4px 24px rgba(0,0,0,0.2)",
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        padding: "10px",
        width: "230px",
      }}
    >
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
        <div
          style={{
            alignItems: "center",
            display: "flex",
            gap: "16px",
          }}
        >
          <button
            onClick={() => setCollapsed((c) => !c)}
            title={collapsed ? "展開" : "最小化"}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--mid)",
              cursor: "pointer",
              fontFamily: "IBM Plex Mono, monospace",
              fontSize: "16px",
              minWidth: "32px",
              minHeight: "32px",
              padding: "0",
            }}
          >
            {collapsed ? "▸" : "▾"}
          </button>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--mid)",
              cursor: "pointer",
              fontFamily: "IBM Plex Mono, monospace",
              fontSize: "17px",
              minWidth: "32px",
              minHeight: "32px",
              padding: "0",
            }}
          >
            ✕
          </button>
        </div>
      </div>

      {!collapsed && (
        <>
          <div
            style={{
              borderTop: "1px solid var(--border)",
              display: "flex",
              flexDirection: "column",
              gap: "3px",
              paddingTop: "6px",
            }}
          >
            {LAYER_OPTIONS.map(({ key, label }) => (
              <label
                key={key}
                style={{ alignItems: "center", cursor: "pointer", display: "flex", gap: "6px" }}
              >
                <input
                  type="checkbox"
                  checked={layers[key]}
                  onChange={() => onToggleLayer(key)}
                  style={{ accentColor: "var(--terra)" }}
                />
                <span style={{ ...mono, color: "var(--ink)", fontSize: "10px" }}>{label}</span>
              </label>
            ))}
            <label
              style={{
                alignItems: "center",
                borderTop: "1px solid var(--border)",
                cursor: "pointer",
                display: "flex",
                gap: "6px",
                marginTop: "2px",
                paddingTop: "4px",
              }}
            >
              <input
                type="checkbox"
                checked={exportShear}
                onChange={onToggleExportShear}
                style={{ accentColor: "var(--terra)" }}
              />
              <span style={{ ...mono, color: "var(--terra)", fontSize: "10px" }}>出力に反映</span>
            </label>
          </div>

          <div
            style={{
              borderTop: "1px solid var(--border)",
              display: "flex",
              flexDirection: "column",
              gap: "4px",
              paddingTop: "8px",
            }}
          >
            <Gauge label="横" have={qty.haveHm} need={qty.needM} />
            <Gauge label="縦" have={qty.haveVm} need={qty.needM} />
          </div>

          <div
            style={{
              borderTop: "1px solid var(--border)",
              display: "flex",
              flexDirection: "column",
              gap: "6px",
              paddingTop: "8px",
            }}
          >
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
          </div>

          <div
            style={{
              borderTop: "1px solid var(--border)",
              display: "flex",
              flexDirection: "column",
              gap: "6px",
              paddingTop: "8px",
            }}
          >
            <MiniRow
              label="縦/横比"
              ok={balanceRatio.ok}
              value={
                balanceRatio.h > 0 && balanceRatio.v > 0
                  ? `${Math.round(balanceRatio.ratio * 100)}%`
                  : "片方向のみ"
              }
            />
            <MiniRow
              label="偏心率"
              ok={ecc?.ok}
              value={ecc ? `eX${ecc.ex.toFixed(2)} eY${ecc.ey.toFixed(2)}` : "—"}
            />
            <MiniRow
              label="外周耐力"
              ok={perim?.ok}
              value={perim ? `${Math.round(perim.ratio * 100)}%` : "—"}
            />
            {interFloor === undefined ? (
              <MiniRow label="上下壁量" ok={undefined} value="—" />
            ) : interFloor.ok ? (
              <MiniRow label="上下壁量" ok={true} value="OK" />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                <div style={{ ...mono, color: "var(--terra)", fontSize: "10px" }}>
                  上下壁量 NG（この階 &lt; 上階）
                </div>
                {interFloor.hDeficit > 0 && (
                  <div style={{ ...mono, color: "var(--mid)", fontSize: "10px" }}>
                    横: この階 {interFloor.hLower.toFixed(1)}m &lt; 上階{" "}
                    {interFloor.hUpper.toFixed(1)}m（不足 {interFloor.hDeficit.toFixed(1)}m）
                  </div>
                )}
                {interFloor.vDeficit > 0 && (
                  <div style={{ ...mono, color: "var(--mid)", fontSize: "10px" }}>
                    縦: この階 {interFloor.vLower.toFixed(1)}m &lt; 上階{" "}
                    {interFloor.vUpper.toFixed(1)}m（不足 {interFloor.vDeficit.toFixed(1)}m）
                  </div>
                )}
              </div>
            )}
          </div>

          <MiniRow
            label="床支持"
            ok={support ? support.overCount === 0 : undefined}
            value={
              support
                ? support.overCount > 0
                  ? `>${SUPPORT_SPAN_MAX_M}m ×${support.overCount}（max ${support.maxSpanM.toFixed(1)}m）`
                  : "OK"
                : "—"
            }
          />

          {floors.length >= 2 && (breaksHere.length > 0 || breaksBelow.length > 0) && (
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
              {breaksHere.length > 0 && <span>▹ 通りズレ:上階壁 ×{breaksHere.length}</span>}
              {breaksBelow.length > 0 && <span>▹ 通りズレ:下階壁 ×{breaksBelow.length}</span>}
            </div>
          )}

          <div style={{ ...mono, color: "var(--mid)", fontSize: "9px", lineHeight: 1.5 }}>
            簡易目安です。実際の構造・耐震計算は建築士/構造設計者に相談してください。
          </div>
        </>
      )}
    </div>
  );
}
