import { Button, EmptyState as ThemeEmptyState } from "@mijime/theme/ui";
import { useMindStore } from "../hooks/use-mind-store";

export function EmptyStateScreen() {
  const { dispatch } = useMindStore();
  const onCreate = () =>
    dispatch({ modal: { kind: "board-name", mode: "create" }, type: "OPEN_MODAL" });

  return (
    <div
      className="absolute inset-0 flex items-center justify-center"
      style={{ background: "var(--bg)" }}
    >
      <ThemeEmptyState
        icon="🌱"
        title="最初のボードを作成"
        description={
          <>
            プロジェクト、アイデア、ToDo...
            <br />
            ボードを作成してマインドマップを始めましょう
          </>
        }
        action={
          <Button variant="primary" size="md" onClick={onCreate}>
            + 新規ボード作成
          </Button>
        }
      />
    </div>
  );
}

export { EmptyStateScreen as EmptyState };
