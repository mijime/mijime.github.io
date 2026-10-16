import type { CSSProperties } from "react";
import {
  CONSTRUCTION_PRESETS,
  isHeavySnowRegion,
  REGION_NAMES,
  regionConditions,
} from "../../floor/structural-conditions";
import type { ConstructionPreset, StructuralConditions } from "../../types";
import { mono, PanelSection } from "./primitives";

const fieldStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "6px",
  justifyContent: "space-between",
};

const controlStyle: CSSProperties = {
  ...mono,
  background: "var(--paper)",
  border: "1px solid var(--border)",
  borderRadius: "4px",
  color: "var(--ink)",
  fontSize: "10px",
  padding: "2px 4px",
};

/** 条件タブ: 都道府県・構法（素材）・階高を選び、地域の設計値を確認する。 */
export function ConditionsTab({
  conditions,
  onChange,
}: {
  conditions: StructuralConditions;
  onChange: (conditions: Partial<StructuralConditions>) => void;
}) {
  const region = regionConditions(conditions.region);
  const heavy = isHeavySnowRegion(conditions.region);
  return (
    <>
      <PanelSection>
        <label style={fieldStyle}>
          <span style={{ ...mono, color: "var(--mid)", fontSize: "10px" }}>都道府県</span>
          <select
            value={conditions.region}
            onChange={(e) => onChange({ region: e.target.value })}
            style={{ ...controlStyle, maxWidth: "130px" }}
          >
            {REGION_NAMES.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <label style={fieldStyle}>
          <span style={{ ...mono, color: "var(--mid)", fontSize: "10px" }}>構法</span>
          <select
            value={conditions.construction}
            onChange={(e) => onChange({ construction: e.target.value as ConstructionPreset })}
            style={{ ...controlStyle, maxWidth: "130px" }}
          >
            {Object.entries(CONSTRUCTION_PRESETS).map(([id, preset]) => (
              <option key={id} value={id}>
                {preset.label}
              </option>
            ))}
          </select>
        </label>
        <label style={fieldStyle}>
          <span style={{ ...mono, color: "var(--mid)", fontSize: "10px" }}>階高</span>
          <span style={{ ...mono, color: "var(--ink)", fontSize: "10px" }}>
            <input
              type="number"
              min={2000}
              max={4500}
              step={50}
              value={conditions.storyHeightMm}
              onChange={(e) => {
                const value = Number(e.target.value);
                if (Number.isFinite(value) && value > 0) {
                  onChange({ storyHeightMm: value });
                }
              }}
              style={{ ...controlStyle, width: "58px", textAlign: "right" }}
            />
            mm
          </span>
        </label>
      </PanelSection>
      <PanelSection>
        <ReadRow label="Z" value={region.z.toFixed(2)} />
        <ReadRow label="積雪" value={`${region.groundSnowCm}cm${heavy ? "（多雪）" : ""}`} />
        <ReadRow label="基準風速" value={`${region.referenceWindSpeed}m/s`} />
        <div style={{ ...mono, color: "var(--mid)", fontSize: "9px", lineHeight: 1.4 }}>
          地域値は都道府県代表値。実設計では市町村の施行細則・告示で要確認。
        </div>
      </PanelSection>
    </>
  );
}

function ReadRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={fieldStyle}>
      <span style={{ ...mono, color: "var(--mid)", fontSize: "10px" }}>{label}</span>
      <span style={{ ...mono, color: "var(--ink)", fontSize: "10px" }}>{value}</span>
    </div>
  );
}
