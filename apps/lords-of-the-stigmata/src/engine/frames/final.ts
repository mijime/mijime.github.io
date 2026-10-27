import type { Engine, Frame, FinalResult } from "../../types.ts";
import { ret } from "../runtime.ts";
import { inflOf, onBoard, logEvent } from "../helpers.ts";
import { finalBreakdown } from "../scoring.ts";

export function stepFinal(e: Engine, _f: Frame): void {
  e.S.finalizing = true;
  e.S.over = true;
  e.S.phase = "final";
  e.S.cur = -1;
  e.bannerKey = "";

  const bd = finalBreakdown({
    players: e.S.players,
    board: e.S.board,
    adj: e.S.adj,
  });

  const results: FinalResult[] = e.S.players.map((_p, pi) => {
    const onBoardList = onBoard(e.S, pi);
    const boardInfl = onBoardList.reduce((s, x) => s + inflOf(x.pw), 0);
    const apCnt = onBoardList.filter((x) => x.pw.type === "ap").length;
    const pawnsCount = onBoardList.length;
    return {
      pi,
      total: bd[pi].total,
      lines: bd[pi].lines,
      boardInfl,
      apCnt,
      pawnsCount,
    };
  });

  results.sort((a, b) => b.total - a.total || b.apCnt - a.apCnt || b.pawnsCount - a.pawnsCount);
  e.finalResults = results;
  e.over = true;
  logEvent(e, "log.gameEnd", undefined, "sys");
  ret(e);
}
