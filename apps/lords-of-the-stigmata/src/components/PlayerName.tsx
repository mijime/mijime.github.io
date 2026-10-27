import { PCOLCSS } from "../data/players.ts";
import { useEngine } from "../hooks/useEngine.ts";

export function PlayerName({ pi }: { pi: number }): React.JSX.Element {
  const e = useEngine();
  return <span style={{ color: PCOLCSS[pi] }}>{e.S.players[pi].name}</span>;
}
