import {
  CalculationFlag,
  HouseSystem,
  SwissEphemeris,
} from "@swisseph/browser";
import type { BirthInfo } from "../data/chartData";
import { PLANET_ITEMS } from "../data/planets";
import { eclipticToWheel, mod } from "./chartMath";
import { localBirthToUtc, resolveLocation, type GeoLocation } from "./geo";

// 显式拿到 wasm 的最终 URL（dev 下由 Vite 正确伺服；prod 下为构建后的哈希资产）。
// 若不传入，包的默认实现 new URL("./swisseph.wasm", import.meta.url) 在 Vite dev
// 依赖预打包目录下会解析不到真实文件，导致拿到 index.html 而报 wasm 魔数错误。
import swissephWasmUrl from "@swisseph/browser/dist/swisseph.wasm?url";

/** 计算后的一颗星体（longitude 黄道经度；sign 0-11；house 1-12） */
export type ComputedPlanet = {
  key: string;
  name: string;
  emoji: string;
  color: string;
  longitude: number; // 黄道经度
  eclipticLon: number;
  deg: number; // 星盘坐标（ASC 在左）
  sign: number; // 0-11
  house: number; // 1-12
  ok: boolean; // 是否成功算出（小行星依赖完整星历，可能失败）
};

export type ComputedChart = {
  planets: ComputedPlanet[];
  houseCuspsWheel: number[]; // 十二宫起始刻度（星盘坐标）
  houseCuspsEcliptic: number[]; // 十二宫起始黄道经度（用于宫头星座 / 空宫解读）
  ascendant: number; // 黄道升点度数
  mc: number;
  location: GeoLocation;
};

let sweInstance: SwissEphemeris | null = null;
let initPromise: Promise<SwissEphemeris> | null = null;
let hasFullEphemeris = false;

/** 懒加载并复用 WASM 实例；尽力加载完整星历（用于小行星），失败不阻塞主流程 */
export function initSwisseph(): Promise<SwissEphemeris> {
  if (sweInstance) return Promise.resolve(sweInstance);
  if (!initPromise) {
    initPromise = (async () => {
      const swe = new SwissEphemeris();
      await swe.init(swissephWasmUrl);
      try {
        await swe.loadStandardEphemeris();
        hasFullEphemeris = true;
        console.log("Swiss Ephemeris：完整星历已加载（支持小行星）");
      } catch (err) {
        console.warn("完整星历加载失败，小行星将不可用：", err);
      }
      sweInstance = swe;
      return swe;
    })();
  }
  return initPromise;
}

const ASTEROID_KEYS = ["juno", "pallas", "vesta", "ceres"];

/**
 * 计算整张盘：行星/虚点全部走 PLANET_ITEMS（加数据即自动多点），
 * 每颗返回 {name, longitude, sign, house} + 展示用的 emoji/color。
 */
export async function computeChart(birth: BirthInfo): Promise<ComputedChart> {
  const swe = await initSwisseph();
  const location = await resolveLocation(birth.city);
  const utc = localBirthToUtc(birth.date, birth.time, location.tz);
  const jd = swe.dateToJulianDay(utc);

  const houses = swe.calculateHouses(jd, location.lat, location.lon, HouseSystem.Placidus);
  const asc = mod(houses.ascendant, 360);
  const houseCuspsWheel = Array.from({ length: 12 }, (_, i) =>
    eclipticToWheel(houses.cusps[i + 1], asc)
  );
  // 宫头黄道经度，用于判宫（直接取原始值，避免二次换算误差）
  const cuspEcl = Array.from({ length: 12 }, (_, i) => mod(houses.cusps[i + 1], 360));
  const houseIndexOf = (lon: number): number => {
    for (let i = 0; i < 12; i++) {
      const span = mod(cuspEcl[(i + 1) % 12] - cuspEcl[i], 360);
      if (mod(lon - cuspEcl[i], 360) < span) return i + 1;
    }
    return 1;
  };

  const byKey: Record<string, number> = {};
  const planets: ComputedPlanet[] = [];

  for (const item of PLANET_ITEMS) {
    let lon: number | null = null;
    if (item.virtualOf) {
      const base = byKey[item.virtualOf];
      if (base != null) lon = mod(base + 180, 360);
    } else if (item.body != null) {
      const isAsteroid = ASTEROID_KEYS.includes(item.key);
      const flag =
        isAsteroid && hasFullEphemeris ? CalculationFlag.SwissEphemeris : undefined;
      try {
        const pos = swe.calculatePosition(jd, item.body, flag);
        lon = mod(pos.longitude, 360);
      } catch {
        lon = null;
      }
    }

    const ok = lon != null;
    if (ok) byKey[item.key] = lon;
    planets.push({
      key: item.key,
      name: item.name,
      emoji: item.emoji,
      color: item.color,
      longitude: ok ? lon : 0,
      eclipticLon: ok ? lon : 0,
      deg: ok ? eclipticToWheel(lon, asc) : 0,
      sign: ok ? Math.floor(lon / 30) : 0,
      house: ok ? houseIndexOf(lon) : 1,
      ok,
    });
  }

  return {
    planets,
    houseCuspsWheel,
    houseCuspsEcliptic: cuspEcl,
    ascendant: asc,
    mc: mod(houses.mc, 360),
    location,
  };
}
