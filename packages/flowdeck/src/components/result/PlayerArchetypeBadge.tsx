import { archetypeById, type ArchetypeGroup } from "../../engine/analytics/playerTypes";

const GROUP_STYLE: Record<ArchetypeGroup, string> = {
  ace: "border-(--terra)/50 bg-(--terra)/10 text-(--terra)",
  support: "border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  starter: "border-violet-500/40 bg-violet-500/10 text-violet-700 dark:text-violet-300",
  utility: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
};

export function PlayerArchetypeBadge({ id }: { id: string | undefined }) {
  const type = archetypeById(id);
  return (
    <span
      title={type.description}
      data-testid="player-archetype"
      className={`rounded-sm border px-1 py-0.5 text-[7.5px] font-medium ${GROUP_STYLE[type.group]}`}
    >
      {type.label}
    </span>
  );
}
