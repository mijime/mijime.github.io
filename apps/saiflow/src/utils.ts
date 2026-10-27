export function fmt(n: number): string {
  return n.toLocaleString("ja-JP");
}

/**
 * Indices for x-axis labels. Keeps roughly `maxTicks` labels and avoids the
 * last regular tick colliding with the final year.
 */
export function xTickIndices(length: number, maxTicks = 10): number[] {
  if (length <= 1) return [0];
  const interval = Math.max(1, Math.floor((length - 1) / maxTicks));
  const ticks: number[] = [];
  for (let i = 0; i < length; i += interval) ticks.push(i);
  const last = length - 1;
  const tail = ticks[ticks.length - 1];
  if (tail !== last) {
    if (last - tail < interval / 2) ticks[ticks.length - 1] = last;
    else ticks.push(last);
  }
  return ticks;
}
