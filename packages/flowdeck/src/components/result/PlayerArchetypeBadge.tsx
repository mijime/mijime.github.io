import { archetypeById, type ArchetypeGroup } from "../../engine/analytics/playerTypes";

const GROUP_STYLE: Record<ArchetypeGroup, string> = {
  ace: "border-(--accent)/50 bg-(--accent)/10 text-(--accent)",
  support: "border-(--info)/40 bg-(--info)/10 text-(--info)",
  starter: "border-(--tone-violet)/40 bg-(--tone-violet)/10 text-(--tone-violet)",
  utility: "border-(--success)/40 bg-(--success)/10 text-(--success)",
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
