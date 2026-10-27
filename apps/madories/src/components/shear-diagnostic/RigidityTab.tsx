import type { ReactNode } from "react";
import { SUPPORT_SPAN_MAX_M } from "../../floor/floor-support";
import { formatDriftRatio } from "../../floor/stiffness";
import type { FloorStress } from "../../floor/structural-report";
import { MiniRow, mono, PanelSection } from "./primitives";

/** 剛性: 剛性率・層間変形角（令82条の6）と、階をまたぐ参考指標（床支持・通りズレ）。 */
export function RigidityTab({ stress }: { stress: FloorStress }) {
  const { rigidity, drift, support, breaksHere, breaksBelow, strength } = stress;
  const required = stress.requiredMultiplierLengthM;

  // 1/200 を満たすのに必要な壁量（倍率換算 m）。δ/h = 必要壁量/(120·保有壁量) より
  // 保有 ≥ 必要 × 200/120 で 1/200 になる。
  const driftNeed = required * (200 / 120);
  // 剛性率 0.6 を満たすのに必要なこの階の壁量: 0.6 × 全階平均 = 0.6 × 保有/Rs。
  const rsNeedH =
    rigidity && rigidity.rsH > 0 ? (0.6 * strength.hMultiplierLengthM) / rigidity.rsH : 0;
  const rsNeedV =
    rigidity && rigidity.rsV > 0 ? (0.6 * strength.vMultiplierLengthM) / rigidity.rsV : 0;

  return (
    <>
      <PanelSection>
        <MiniRow
          label="剛性率X"
          ok={rigidity?.okH}
          value={rigidity ? rigidity.rsH.toFixed(2) : "—"}
        />
        <MiniRow
          label="剛性率Y"
          ok={rigidity?.okV}
          value={rigidity ? rigidity.rsV.toFixed(2) : "—"}
        />
        <MiniRow
          label="変形角X"
          ok={drift?.okH}
          value={drift ? formatDriftRatio(drift.driftH) : "—"}
        />
        <MiniRow
          label="変形角Y"
          ok={drift?.okV}
          value={drift ? formatDriftRatio(drift.driftV) : "—"}
        />
        <div style={{ ...mono, color: "var(--mid)", fontSize: "9px", lineHeight: 1.4 }}>
          剛性率 ≥ 0.6、層間変形角 ≤ 1/200。
        </div>
      </PanelSection>

      {rigidity && (!rigidity.okH || !rigidity.okV) && (
        <PanelSection>
          <NgReason>
            剛性率NG: この階の壁が全階平均より少ない（弱い階）です。0.6 には
            {!rigidity.okH && ` 横 約${rsNeedH.toFixed(1)}m`}
            {!rigidity.okH && !rigidity.okV && " ／"}
            {!rigidity.okV && ` 縦 約${rsNeedV.toFixed(1)}m`} の壁量が必要（いま 横
            {strength.hMultiplierLengthM.toFixed(1)} / 縦{strength.vMultiplierLengthM.toFixed(1)}
            m）。
          </NgReason>
        </PanelSection>
      )}

      {drift && (!drift.okH || !drift.okV) && (
        <PanelSection>
          <NgReason>
            変形角NG: 1/200 には壁量（倍率換算）を約 {driftNeed.toFixed(1)}m 以上（＝必要壁量
            {required.toFixed(1)}m の約1.7倍）必要。いま 横{strength.hMultiplierLengthM.toFixed(1)}{" "}
            / 縦{strength.vMultiplierLengthM.toFixed(1)}m。
          </NgReason>
          <div style={{ ...mono, color: "var(--mid)", fontSize: "9px", lineHeight: 1.4 }}>
            変形角は壁倍率の定義（1/120で基準耐力）から剛性を仮定した参考値。壁量はOKでもここは
            NGになりやすいです。
          </div>
        </PanelSection>
      )}

      <PanelSection>
        <MiniRow
          label="床支持"
          ok={support ? support.overCount === 0 : undefined}
          value={
            support
              ? support.overCount > 0
                ? `>${SUPPORT_SPAN_MAX_M}m ×${support.overCount}`
                : "OK"
              : "—"
          }
        />
      </PanelSection>
      {(breaksHere.length > 0 || breaksBelow.length > 0) && (
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
    </>
  );
}

function NgReason({ children }: { children: ReactNode }) {
  return (
    <div style={{ ...mono, color: "var(--terra)", fontSize: "9px", lineHeight: 1.5 }}>
      {children}
    </div>
  );
}
