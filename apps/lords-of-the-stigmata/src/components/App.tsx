import { useState } from "react";
import "../locales/index.ts";
import { useEngine } from "../hooks/useEngine.ts";
import { send } from "../store.ts";
import type { CountryKey, PawnType } from "../types.ts";
import { Setup } from "./Setup.tsx";
import { Hud } from "./Hud.tsx";
import { Modal } from "./Modal.tsx";
import { EndScreen } from "./EndScreen.tsx";
import Scene from "./Scene.tsx";

/** 人間の国選択フロー（アクションバー起点） */
export type Pick = null | { purpose: "dispatch"; pawn: PawnType } | { purpose: "upgrade" };

export function App(): React.JSX.Element {
  const e = useEngine();
  const [pick, setPick] = useState<Pick>(null);

  /** 国がクリックされた（3D mesh / 国カード 共通） */
  const onCountryClick = (k: CountryKey): void => {
    // 1) エンジンが国選択を要求中（無償派遣など）
    if (e.pending?.kind === "pickCountry") {
      if (e.pending.valid.includes(k)) send({ type: "pickCountry", key: k });
      return;
    }
    // 2) アクションバー起点の派遣
    if (pick?.purpose === "dispatch") {
      send({
        type: "chooseAction",
        action: { type: "dispatch", pawn: pick.pawn, country: k },
      });
      setPick(null);
      return;
    }
    // 3) アクションバー起点の昇格
    if (pick?.purpose === "upgrade") {
      send({
        type: "chooseAction",
        action: { type: "upgrade", country: k },
      });
      setPick(null);
      return;
    }
  };

  // ハイライトすべき国
  let validKeys: CountryKey[] | undefined;
  if (e.pending?.kind === "pickCountry") validKeys = e.pending.valid;
  else if (pick?.purpose === "dispatch") validKeys = e.S.sel;
  else if (pick?.purpose === "upgrade") {
    validKeys = e.S.sel.filter((k) =>
      e.S.board.find((b) => b.key === k)?.pawns.some((pw) => pw.owner === 0 && pw.type === "ac"),
    );
  }

  if (!e.S.started) return <Setup />;

  return (
    <>
      <Scene onCountryClick={onCountryClick} validKeys={validKeys} pick={pick} />
      <Hud pick={pick} setPick={setPick} onCountryClick={onCountryClick} validKeys={validKeys} />
      <Modal />
      <EndScreen />
    </>
  );
}

export default App;
