import type { ReactNode } from "react";
import { BASE_STRENGTH_PER_MULTIPLIER } from "../../floor/structural-conditions";
import { STANDARD_SHEAR_COEFFICIENT } from "../../floor/loads";
import { formatDriftRatio } from "../../floor/stiffness";
import type { RegionConditions } from "../../floor/structural-conditions";
import type { StructuralConditions } from "../../types";
import type { FloorStress } from "../../floor/structural-report";
import type { WallDemand } from "../../floor/wall-demand";
import { mono, PanelSection } from "./primitives";

// 「根拠」タブ: 各チェックが何と何を比べているかを、実際の数値と式で示す。
// 専門用語はやさしい言い換えを併記し、出典（令・告示）を小さく添える。

export function BasisTab({
  stress,
  region,
  conditions,
}: {
  stress: FloorStress;
  region: RegionConditions;
  conditions: StructuralConditions;
}) {
  const { weight, seismic, strength, geometry, eccentricity, rigidity, drift } = stress;
  const z = region.z;
  const c0 = STANDARD_SHEAR_COEFFICIENT;
  const required = stress.requiredMultiplierLengthM;
  const driftNeed = required * (200 / 120);
  const qiKn = seismic.shearN / 1000;
  const wiKn = weight.weightAboveN / 1000;

  return (
    <>
      <Explainer title="この階の計算条件">
        <Line label="地域" value={`${conditions.region}（Z=${z.toFixed(2)}）`} />
        <Line label="階高" value={`${(conditions.storyHeightMm / 1000).toFixed(2)} m`} />
      </Explainer>

      <Explainer title="この計算の確からしさ">
        <Detail>
          壁量・偏心率・剛性率は令88条や「比」ベースで比較的安定。層間変形角は剛性の仮定に
          依存する参考値。共通の割り切り: 地域は代表値・Ai=1・壁倍率は代表値・剛床仮定。
        </Detail>
      </Explainer>

      <Basis title="壁量（地震に耐える壁の量）" ok={stress.wallOkH && stress.wallOkV}>
        <Line label="Wi この階より上の重さ" value={`${wiKn.toFixed(1)} kN`} />
        <Detail>
          床 {(weight.floorLoadN / 1000).toFixed(1)} ＋ 外壁 {(weight.wallLoadN / 1000).toFixed(1)}{" "}
          ＋ 内壁 {(weight.interiorWallLoadN / 1000).toFixed(1)} ＋ 屋根{" "}
          {(weight.roofLoadN / 1000).toFixed(1)} ＋ 積雪 {(weight.snowLoadN / 1000).toFixed(1)}
        </Detail>
        <Formula>
          {`Qi = Wi × Z × C0 = ${wiKn.toFixed(1)} × ${z.toFixed(2)} × ${c0} = ${qiKn.toFixed(1)} kN`}
        </Formula>
        <Formula>
          {`必要な壁 = Qi ÷ 1.96 = ${qiKn.toFixed(1)} ÷ ${BASE_STRENGTH_PER_MULTIPLIER} = ${required.toFixed(1)} m`}
        </Formula>
        <Line
          label="いまの壁の強さ"
          value={`X ${strength.hMultiplierLengthM.toFixed(1)} / Y ${strength.vMultiplierLengthM.toFixed(1)} m`}
          ok={stress.wallOkH && stress.wallOkV}
        />
        <Source>令84条（固定荷重）・令85条（積載）・令88条（地震力）・告示の壁倍率</Source>
      </Basis>

      <Basis
        title="壁の負担（検定比の大きい順）"
        ok={stress.wallDemands.length > 0 && stress.wallDemands.every((d) => d.utilization <= 1)}
      >
        {stress.wallDemands.length === 0 ? (
          <Detail>耐力壁がありません。</Detail>
        ) : (
          <>
            {topByUtilization(stress.wallDemands, 3).map((d) => (
              <Line
                key={`${d.kind}-${d.x}-${d.y}-${d.cells}`}
                label={`${d.kind === "h" ? "横" : "縦"}壁 ${d.kind === "h" ? `y=${d.y}` : `x=${d.x}`}`}
                value={`${Math.abs(d.shearKn).toFixed(1)}kN / 耐力${d.capacityKn.toFixed(1)}kN（${Math.round(d.utilization * 100)}%）`}
                ok={d.utilization <= 1}
              />
            ))}
            <Source>剛床＋ねじれ分配。色と太さはキャンバス表示に対応（緑=余裕/赤=超過）</Source>
          </>
        )}
      </Basis>

      <Basis title="偏心率（重さの中心と壁の中心のズレ）" ok={eccentricity?.ok}>
        {eccentricity ? (
          <>
            <Line
              label="重心（重さの中心）"
              value={`X ${(eccentricity.gxMm / 1000).toFixed(2)} / Y ${(eccentricity.gyMm / 1000).toFixed(2)} m`}
            />
            <Line
              label="剛心（壁の中心）"
              value={`X ${(eccentricity.cxMm / 1000).toFixed(2)} / Y ${(eccentricity.cyMm / 1000).toFixed(2)} m`}
            />
            <Formula>
              {`ズレ X ${(Math.abs(eccentricity.gxMm - eccentricity.cxMm) / 1000).toFixed(2)} m ÷ 弾力半径 ${(eccentricity.radiusXmm / 1000).toFixed(2)} m = eX ${eccentricity.ex.toFixed(2)}`}
            </Formula>
            <Formula>
              {`ズレ Y ${(Math.abs(eccentricity.gyMm - eccentricity.cyMm) / 1000).toFixed(2)} m ÷ 弾力半径 ${(eccentricity.radiusYmm / 1000).toFixed(2)} m = eY ${eccentricity.ey.toFixed(2)}`}
            </Formula>
            <Source>令82条の6（偏心率 0.3 以下が目安）</Source>
          </>
        ) : (
          <Line label="判定" value="片方向に壁がなく計算できません" ok={false} />
        )}
      </Basis>

      <Basis
        title="剛性率（階ごとの強さの均一さ）"
        ok={rigidity ? rigidity.okH && rigidity.okV : undefined}
      >
        {rigidity ? (
          <>
            <Line
              label="この階の剛性"
              value={`X ${stress.stiffness.kxKnPerM.toFixed(0)} / Y ${stress.stiffness.kyKnPerM.toFixed(0)} kN/m`}
            />
            <Formula>{`RsX = この階 ÷ 全階平均 = ${rigidity.rsH.toFixed(2)}（0.6 以上）`}</Formula>
            <Formula>{`RsY = この階 ÷ 全階平均 = ${rigidity.rsV.toFixed(2)}（0.6 以上）`}</Formula>
            <Source>令82条の6（剛性率 0.6 以上）</Source>
          </>
        ) : (
          <Detail>階が1つ、または壁がないため計算できません。</Detail>
        )}
      </Basis>

      <Basis title="層間変形角（地震での傾き）" ok={drift ? drift.okH && drift.okV : undefined}>
        {drift && stress.stiffness.kxKnPerM > 0 ? (
          <>
            <Formula>
              {`δ/h = Qi ÷ 剛性 ÷ 階高 = ${qiKn.toFixed(1)} ÷ ${stress.stiffness.kxKnPerM.toFixed(0)} ÷ ${geometry.storyHeightM.toFixed(2)} = ${formatDriftRatio(drift.driftH)}`}
            </Formula>
            <Detail>
              1/200 を満たすには壁量（倍率換算）を約 {driftNeed.toFixed(1)}m
              以上（＝必要壁量の約1.7倍）必要。
            </Detail>
            <Source>令82条の6（1/200 以下）。剛性は壁倍率定義による参考値</Source>
          </>
        ) : (
          <Detail>横方向の壁がないため計算できません。</Detail>
        )}
      </Basis>
    </>
  );
}

function fmtOk(ok: boolean | undefined): string {
  return ok === undefined ? "var(--mid)" : ok ? "rgb(46,160,90)" : "rgb(217,58,45)";
}

/** 検定比の大きい上位 n 件（sort を使わずに選択）。 */
function topByUtilization(demands: WallDemand[], n: number): WallDemand[] {
  const picked: WallDemand[] = [];
  for (const d of demands) {
    if (picked.length < n) {
      picked.push(d);
      continue;
    }
    let minIdx = 0;
    for (let i = 1; i < picked.length; i++) {
      if (picked[i].utilization < picked[minIdx].utilization) {
        minIdx = i;
      }
    }
    if (d.utilization > picked[minIdx].utilization) {
      picked[minIdx] = d;
    }
  }
  const ordered: WallDemand[] = [];
  while (picked.length > 0) {
    let maxIdx = 0;
    for (let i = 1; i < picked.length; i++) {
      if (picked[i].utilization > picked[maxIdx].utilization) {
        maxIdx = i;
      }
    }
    ordered.push(picked[maxIdx]);
    picked.splice(maxIdx, 1);
  }
  return ordered;
}

function Basis({
  title,
  ok,
  children,
}: {
  title: string;
  ok: boolean | undefined;
  children: ReactNode;
}) {
  return (
    <PanelSection>
      <div
        style={{
          ...mono,
          alignItems: "center",
          color: "var(--ink)",
          display: "flex",
          fontSize: "10px",
          gap: "6px",
        }}
      >
        <span style={{ flex: 1 }}>{title}</span>
        <span style={{ color: fmtOk(ok), fontSize: "9px" }}>
          {ok === undefined ? "—" : ok ? "OK" : "NG"}
        </span>
      </div>
      {children}
    </PanelSection>
  );
}

function Explainer({ title, children }: { title: string; children: ReactNode }) {
  return (
    <PanelSection>
      <div style={{ ...mono, color: "var(--mid)", fontSize: "9px" }}>{title}</div>
      {children}
    </PanelSection>
  );
}

function Line({ label, value, ok }: { label: string; value: string; ok?: boolean }) {
  return (
    <div style={{ ...mono, display: "flex", fontSize: "10px", gap: "6px" }}>
      <span style={{ color: "var(--mid)", flex: 1 }}>{label}</span>
      <span style={{ color: ok === undefined ? "var(--ink)" : fmtOk(ok), textAlign: "right" }}>
        {value}
      </span>
    </div>
  );
}

function Detail({ children }: { children: ReactNode }) {
  return (
    <div style={{ ...mono, color: "var(--mid)", fontSize: "9px", lineHeight: 1.4 }}>{children}</div>
  );
}

function Formula({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        ...mono,
        background: "var(--paper)",
        border: "1px solid var(--border)",
        borderRadius: "4px",
        color: "var(--ink)",
        fontSize: "9px",
        lineHeight: 1.5,
        padding: "3px 5px",
      }}
    >
      {children}
    </div>
  );
}

function Source({ children }: { children: ReactNode }) {
  return <Detail>出典: {children}</Detail>;
}
