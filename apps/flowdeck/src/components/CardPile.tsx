import { Archive, CircleHelp, Layers } from "lucide-react";

type PileTone = "deck" | "discard" | "risk";

const DEFAULT_LABEL: Record<PileTone, string> = {
  deck: "山札",
  discard: "捨て札",
  risk: "リスクカード",
};

const ICON = {
  deck: Layers,
  discard: Archive,
  risk: CircleHelp,
} as const;

export function CardPile({
  tone,
  count,
  label,
}: {
  tone: PileTone;
  count: number;
  label?: string;
}) {
  const Icon = ICON[tone];
  return (
    <span
      className="inline-flex items-center gap-1"
      title={`${label ?? DEFAULT_LABEL[tone]} ${count}`}
    >
      <Icon
        size={14}
        className={tone === "risk" ? "text-(--accent)" : "text-(--mid)"}
        aria-hidden="true"
      />
      <span className="text-[10px] font-semibold tabular-nums text-(--ink)">{count}</span>
    </span>
  );
}
