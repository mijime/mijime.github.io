// Shared reward feedback across all toy screens.

import { celebrate, confetti } from "./fx";

/** One correct action: ring + particle spray + light haptic tap. */
export function answerCorrect(x: number, y: number, colors?: string | readonly string[]): void {
  celebrate(x, y, colors);
  navigator.vibrate?.(35);
}

/** A finished round: full-screen confetti & gems + celebratory haptic. */
export function roundFinished(big = false): void {
  confetti(big ? 90 : 55);
  navigator.vibrate?.(big ? [50, 30, 70] : 60);
}
