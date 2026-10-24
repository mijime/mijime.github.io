import { PLAYER_ARCHETYPES } from "../../engine/analytics/playerTypes";

export function ArchetypeGuide() {
  return (
    <details className="mt-2 rounded-sm border border-(--border) bg-(--paper) p-3">
      <summary className="serif cursor-pointer text-[13px] font-semibold">ポジション一覧</summary>
      <div className="mt-2 grid gap-1 sm:grid-cols-2">
        {PLAYER_ARCHETYPES.map((type) => (
          <div key={type.id} className="rounded-sm border border-(--border) px-2 py-1">
            <span className="block text-[9px] font-medium text-(--ink)">{type.label}</span>
            <span className="block text-[8px] text-(--mid)">{type.description}</span>
          </div>
        ))}
      </div>
      <p className="mt-2 text-[8px] text-(--mid)">
        作業量・完了数・報酬・支援・Pull・廃棄・トークン・フェーズ・WIPなどの組み合わせで判定する。突出した軸がなければオールラウンダー。
      </p>
    </details>
  );
}
