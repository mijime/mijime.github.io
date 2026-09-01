import type { ShearLayerFlags } from "../../draw/draw-shear-check";
import { CheckRow, PanelSection } from "./primitives";

const LAYER_OPTIONS: { key: keyof ShearLayerFlags; label: string }[] = [
  { key: "runs", label: "耐力壁ラン" },
  { key: "columns", label: "通し柱" },
  { key: "quadrant", label: "四分割" },
  { key: "breaks", label: "通りズレ" },
  { key: "rigid", label: "剛心/重心" },
  { key: "support", label: "床支持" },
];

interface Props {
  layers: ShearLayerFlags;
  onToggleLayer: (key: keyof ShearLayerFlags) => void;
  exportShear: boolean;
  onToggleExportShear: () => void;
}

export function LayerToggles({ layers, onToggleLayer, exportShear, onToggleExportShear }: Props) {
  return (
    <PanelSection gap={3} padTop={6}>
      {LAYER_OPTIONS.map(({ key, label }) => (
        <CheckRow
          key={key}
          checked={layers[key]}
          onChange={() => onToggleLayer(key)}
          label={label}
        />
      ))}
      <CheckRow
        checked={exportShear}
        onChange={onToggleExportShear}
        label="出力に反映"
        accent
        divider
      />
    </PanelSection>
  );
}
