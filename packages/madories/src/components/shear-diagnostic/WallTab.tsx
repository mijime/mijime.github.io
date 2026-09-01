import type { StructuralReport } from "../../floor/structural-report";
import { Gauge, MiniRow, PanelSection } from "./primitives";

/** 壁量タブ: 必要量に対する横/縦の壁量ゲージと、方向の偏り。 */
export function WallTab({ report }: { report: StructuralReport }) {
  const qty = report.wallQuantity;
  return (
    <>
      <PanelSection gap={4}>
        <Gauge label="横" have={qty.haveHm} need={qty.needM} />
        <Gauge label="縦" have={qty.haveVm} need={qty.needM} />
      </PanelSection>
      <PanelSection>
        <MiniRow
          label="縦/横比"
          ok={report.balanceRatio.ok}
          value={
            report.balanceRatio.h > 0 && report.balanceRatio.v > 0
              ? `${Math.round(report.balanceRatio.ratio * 100)}%`
              : "片方向のみ"
          }
        />
      </PanelSection>
    </>
  );
}
