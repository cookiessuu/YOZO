/** 颜色明暗调整：pct > 0 变亮，< 0 变暗（用于星体球高光/阴影）。
 *  抽到此处是为了让 Wheel（盘面渐变球）与 ReadingPanel（解读卡迷你球）共用同一套算法。 */
export function shade(hex: string, pct: number): string {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v: number) =>
    Math.max(0, Math.min(255, Math.round(pct > 0 ? v + (255 - v) * (pct / 100) : v * (1 + pct / 100))));
  const r = ch((n >> 16) & 255);
  const g = ch((n >> 8) & 255);
  const b = ch(n & 255);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}
