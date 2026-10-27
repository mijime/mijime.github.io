import type { Engine, Frame } from "../types.ts";

/* ============================================================
   継続スタックのランタイム基盤
============================================================ */

/** 新しいフレームを生成 */
export function frame(kind: string, locals: Record<string, unknown> = {}): Frame {
  return { kind, pc: 0, locals };
}

/** 子フレームを呼び出す。親は resumePc で再開し、子の戻り値は親 frame.ret に入る */
export function call(e: Engine, parent: Frame, child: Frame, resumePc: number): void {
  parent.pc = resumePc;
  parent.ret = undefined;
  e.stack.push(child);
}

/** 現フレームを完了して pop し、戻り値を親の ret へ */
export function ret(e: Engine, value?: unknown): void {
  e.stack.pop();
  const parent = e.stack[e.stack.length - 1];
  if (parent) parent.ret = value;
}

/** 現フレームの pc を進める（同フレーム内継続） */
export function goto(f: Frame, pc: number): void {
  f.pc = pc;
}
