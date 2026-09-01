import type { ShearLayerFlags } from "../../draw/draw-shear-check";
import { LayerToggles } from "./LayerToggles";

/** 表示タブ: キャンバスに描くレイヤーと、出力への反映設定。 */
export function DisplayTab({
  layers,
  onToggleLayer,
  exportShear,
  onToggleExportShear,
}: {
  layers: ShearLayerFlags;
  onToggleLayer: (key: keyof ShearLayerFlags) => void;
  exportShear: boolean;
  onToggleExportShear: () => void;
}) {
  return (
    <LayerToggles
      layers={layers}
      onToggleLayer={onToggleLayer}
      exportShear={exportShear}
      onToggleExportShear={onToggleExportShear}
    />
  );
}
