/** 出生地 → 经纬度与时区（用于宫位计算） */

export type GeoLocation = {
  lat: number;
  lon: number;
  tz: number; // UTC 偏移（小时）
  label: string;
};

const DEFAULT: GeoLocation = {
  lat: 39.9042,
  lon: 116.4074,
  tz: 8,
  label: "北京（默认）",
};

/** 常用中国城市，支持简繁与别名 */
const CITY_TABLE: Record<string, GeoLocation> = {
  北京: { lat: 39.9042, lon: 116.4074, tz: 8, label: "北京" },
  上海: { lat: 31.2304, lon: 121.4737, tz: 8, label: "上海" },
  广州: { lat: 23.1291, lon: 113.2644, tz: 8, label: "广州" },
  深圳: { lat: 22.5431, lon: 114.0579, tz: 8, label: "深圳" },
  杭州: { lat: 30.2741, lon: 120.1551, tz: 8, label: "杭州" },
  成都: { lat: 30.5728, lon: 104.0668, tz: 8, label: "成都" },
  重庆: { lat: 29.563, lon: 106.5516, tz: 8, label: "重庆" },
  武汉: { lat: 30.5928, lon: 114.3055, tz: 8, label: "武汉" },
  西安: { lat: 34.3416, lon: 108.9398, tz: 8, label: "西安" },
  南京: { lat: 32.0603, lon: 118.7969, tz: 8, label: "南京" },
  天津: { lat: 39.3434, lon: 117.3616, tz: 8, label: "天津" },
  苏州: { lat: 31.2989, lon: 120.5853, tz: 8, label: "苏州" },
  香港: { lat: 22.3193, lon: 114.1694, tz: 8, label: "香港" },
  台北: { lat: 25.033, lon: 121.5654, tz: 8, label: "台北" },
  哈尔滨: { lat: 45.8038, lon: 126.535, tz: 8, label: "哈尔滨" },
  乌鲁木齐: { lat: 43.8256, lon: 87.6168, tz: 6, label: "乌鲁木齐" },
  拉萨: { lat: 29.652, lon: 91.172, tz: 6, label: "拉萨" },
  beijing: { lat: 39.9042, lon: 116.4074, tz: 8, label: "北京" },
  shanghai: { lat: 31.2304, lon: 121.4737, tz: 8, label: "上海" },
  hangzhou: { lat: 30.2741, lon: 120.1551, tz: 8, label: "杭州" },
  "new york": { lat: 40.7128, lon: -74.006, tz: -5, label: "New York" },
  london: { lat: 51.5074, lon: -0.1278, tz: 0, label: "London" },
  tokyo: { lat: 35.6762, lon: 139.6503, tz: 9, label: "Tokyo" },
};

function normalizeKey(city: string): string {
  return city.trim().toLowerCase().replace(/\s+/g, " ");
}

function lookupCity(city: string): GeoLocation | null {
  const raw = city.trim();
  if (!raw) return null;
  if (CITY_TABLE[raw]) return CITY_TABLE[raw];
  const key = normalizeKey(raw);
  for (const [name, loc] of Object.entries(CITY_TABLE)) {
    if (normalizeKey(name) === key) return loc;
  }
  return null;
}

/** 将本地出生时间转为 UTC Date */
export function localBirthToUtc(date: string, time: string, tz: number): Date {
  const [y, m, d] = date.split("-").map(Number);
  const parts = (time || "12:00").split(":");
  const hh = Number(parts[0] ?? 12);
  const mm = Number(parts[1] ?? 0);
  return new Date(Date.UTC(y, m - 1, d, hh - tz, mm, 0));
}

/** 解析城市；未知城市尝试 OpenStreetMap，失败则用默认坐标 */
export async function resolveLocation(city: string): Promise<GeoLocation> {
  const hit = lookupCity(city);
  if (hit) return hit;
  if (!city.trim()) return DEFAULT;

  try {
    const q = encodeURIComponent(city.trim());
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1`,
      { headers: { Accept: "application/json" } }
    );
    if (res.ok) {
      const data = (await res.json()) as Array<{ lat: string; lon: string; display_name: string }>;
      if (data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lon = parseFloat(data[0].lon);
        // 粗略估算时区（精确时区需专门 API，此处按经度近似）
        const tz = Math.round(lon / 15);
        return { lat, lon, tz, label: city.trim() };
      }
    }
  } catch {
    /* 离线或网络失败时回落默认 */
  }

  return { ...DEFAULT, label: `${city.trim()}（未识别，暂用北京坐标）` };
}
