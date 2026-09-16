// 星体落位文案：把黄道经度换算成「第 N 宫 · 星座 X°Y′」。

import { mod } from "./chartMath";
import { SIGN_SHORT } from "./interpretation";

/** 黄道经度 → 「巨蟹座 12°34′」 */
export function signDegree(lon: number): string {
  const l = mod(lon, 360);
  const sign = Math.floor(l / 30) % 12;
  const rest = l - sign * 30;
  let d = Math.floor(rest);
  let m = Math.round((rest - d) * 60);
  if (m === 60) {
    m = 0;
    d += 1;
  }
  if (d === 30) d = 29;
  return `${SIGN_SHORT[sign]}座 ${d}°${String(m).padStart(2, "0")}′`;
}

/** 星体落位一句话，如「月亮位于第 2 宫 · 巨蟹座 12°34′」 */
export function placementText(name: string, lon: number, house: number): string {
  return `${name}位于第 ${house} 宫 · ${signDegree(lon)}`;
}
