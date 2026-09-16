// 星盘 2D 几何：极坐标换算与 SVG 路径生成。
// 坐标系约定：0° 为 12 点方向，顺时针递增；十二宫以 270°(ASC，左侧) 起逆时针分布。

export const CX = 380;
export const CY = 380;

export const R_OUT = 316; // 星盘外半径
export const R_ZB = 252; // 星座铭带内半径
export const R_PT = 202; // 行星轨道半径
export const R_LBL = 228; // 行星标签半径
export const R_ROM = 130; // 罗马宫号半径
export const R_IN = 96; // 内环半径

export type Pt = { x: number; y: number };

export function P(deg: number, r: number): Pt {
  const rad = (deg * Math.PI) / 180;
  return { x: CX + r * Math.sin(rad), y: CY - r * Math.cos(rad) };
}

export function mod(n: number, m: number): number {
  return ((n % m) + m) % m;
}

/** 黄道经度 → 星盘坐标（ASC 固定在左侧 270°=9 点钟，宫位逆时针排布，MC 在正上方 0°）
 *  取负号即「水平镜像」：星座沿逆时针推进，1 宫自左侧起向下展开。 */
export function eclipticToWheel(lon: number, ascendant: number): number {
  return mod(270 - (lon - ascendant), 360);
}

/** 星盘坐标 → 黄道经度（eclipticToWheel 的逆运算） */
export function wheelToEcliptic(deg: number, ascendant: number): number {
  return mod(ascendant + 270 - deg, 360);
}

/** 第 i 宫的起始刻度（0..11，第 1 宫 = ASC）— 等宫制演示用 */
export function cuspOf(houseIndex: number): number {
  return mod(270 - 30 * houseIndex, 360);
}

/** 星座起始刻度（ASC 旋转后的真实位置） */
export function signCuspOf(signIndex: number, ascendant: number): number {
  return eclipticToWheel(signIndex * 30, ascendant);
}

/** 角度 deg 是否落在自 cusp 起逆时针的 30° 内 */
export function degWithin(deg: number, cusp: number): boolean {
  return mod(deg - cusp, 360) < 30;
}

/** 求某角度所属宫位（0..11）— 等宫制 */
export function houseOf(deg: number): number {
  for (let i = 0; i < 12; i++) {
    if (degWithin(deg, cuspOf(i))) return i;
  }
  return 0;
}

/** 求某角度所属宫位（0..11）— 真实宫头 */
export function houseOfCusps(deg: number, cuspsWheel: number[]): number {
  for (let i = 0; i < 12; i++) {
    const start = cuspsWheel[i];
    const end = cuspsWheel[(i + 1) % 12];
    const span = mod(start - end, 360);
    const diff = mod(start - deg, 360);
    if (diff < span) return i;
  }
  return 0;
}

/** 求某角度所属星座（0..11，与宫位同刻） */
export function signOf(deg: number): number {
  return Math.floor(mod(deg - 270, 360) / 30);
}

/** 由黄道经度求星座（0..11） */
export function signOfEcliptic(lon: number): number {
  return Math.floor(mod(lon, 360) / 30);
}

/** 扇形路径：从圆心出发、沿弧到另一边界（逆时针） */
export function wedgePath(aDeg: number, bDeg: number, r: number): string {
  const p1 = P(aDeg, r);
  const p2 = P(bDeg, r);
  return (
    "M" + CX + "," + CY +
    "L" + p1.x.toFixed(2) + "," + p1.y.toFixed(2) +
    "A" + r + "," + r + " 0 0 0 " + p2.x.toFixed(2) + "," + p2.y.toFixed(2) + "Z"
  );
}

/** 环形扇形（用于星座铭带），内径 r1、外径 r2 */
export function ringArc(aDeg: number, bDeg: number, r1: number, r2: number): string {
  const pA1 = P(aDeg, r1);
  const pB1 = P(bDeg, r1);
  const pA2 = P(aDeg, r2);
  const pB2 = P(bDeg, r2);
  return (
    "M" + pA1.x.toFixed(2) + "," + pA1.y.toFixed(2) +
    "A" + r1 + "," + r1 + " 0 0 0 " + pB1.x.toFixed(2) + "," + pB1.y.toFixed(2) +
    "L" + pB2.x.toFixed(2) + "," + pB2.y.toFixed(2) +
    "A" + r2 + "," + r2 + " 0 0 1 " + pA2.x.toFixed(2) + "," + pA2.y.toFixed(2) + "Z"
  );
}
