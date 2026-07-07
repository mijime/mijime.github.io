import type { Engine, Frame } from "../types.ts";
import { stepRunGame } from "./frames/runGame.ts";
import { stepIncome } from "./frames/revelation.ts";
import { stepAction, stepExecAction } from "./frames/action.ts";
import { stepJudgment } from "./frames/judgment.ts";
import { stepFinal } from "./frames/final.ts";
import { stepAskYesNo, stepPickCountry, stepShowModal, stepChooseAction } from "./frames/leaf.ts";

type StepFn = (e: Engine, f: Frame) => void;

const TABLE: Record<string, StepFn> = {
  runGame: stepRunGame,
  income: stepIncome,
  action: stepAction,
  execAction: stepExecAction,
  judgment: stepJudgment,
  final: stepFinal,
  askYesNo: stepAskYesNo,
  pickCountry: stepPickCountry,
  showModal: stepShowModal,
  chooseAction: stepChooseAction,
};

/**
 * pending が無く wait 中でない限り、最上位フレームを進め続ける純粋ドライバ。
 * 1度の呼び出しで「次に人間入力 or wait or 完了」に達するまで回す。
 */
export function run(e: Engine): void {
  let guard = 0;
  while (e.pending === null && e.stack.length > 0 && e.waitTicks === 0) {
    if (++guard > 100000) throw new Error("engine step overflow");
    const f = e.stack[e.stack.length - 1];
    const fn = TABLE[f.kind];
    if (!fn) throw new Error(`未知のフレーム: ${f.kind}`);
    fn(e, f);
  }
}
