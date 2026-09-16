// 12 星座拟人图映射：用 Vite 的 import.meta.glob 预加载 hamster 目录所有 png。
// 严禁用 new URL() 动态拼路径（Vite 无法静态分析、dev/prod 都可能解析失败）。
// 图片使用 hamster 根目录下已抠好的透明 PNG，直接叠在星盘上；仅按框统一裁切尺寸，绝不重生成 / 不圆形挖空遮挡星盘。

const mods = import.meta.glob("../assets/hamster/*.png", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;

/** 英文 key → 星座序号（0=白羊 … 11=双鱼），与 chart.planets[].sign / 宫头序号对齐 */
const SIGN_KEYS = [
  "aries", "taurus", "gemini", "cancer", "leo", "virgo",
  "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces",
];

export type Element = "火" | "土" | "风" | "水";

export type ZodiacSignInfo = {
  key: string;
  cn: string;
  element: Element;
  /** 元素代表色（莫兰迪柔和调），用于小圆点描边/光环 */
  color: string;
};

export const ZODIAC_SIGNS: ZodiacSignInfo[] = [
  { key: "aries", cn: "白羊", element: "火", color: "#e0a08c" },
  { key: "taurus", cn: "金牛", element: "土", color: "#b9c39a" },
  { key: "gemini", cn: "双子", element: "风", color: "#a9c2cf" },
  { key: "cancer", cn: "巨蟹", element: "水", color: "#a8bcd0" },
  { key: "leo", cn: "狮子", element: "火", color: "#e3b483" },
  { key: "virgo", cn: "处女", element: "土", color: "#c2c7a0" },
  { key: "libra", cn: "天秤", element: "风", color: "#b6c6cf" },
  { key: "scorpio", cn: "天蝎", element: "水", color: "#a99cc4" },
  { key: "sagittarius", cn: "射手", element: "火", color: "#dcab8a" },
  { key: "capricorn", cn: "摩羯", element: "土", color: "#b3b39a" },
  { key: "aquarius", cn: "水瓶", element: "风", color: "#a6c3c9" },
  { key: "pisces", cn: "双鱼", element: "水", color: "#9fb6cf" },
];

/** 序号 0-11 → 拟人图 URL（与 ZODIAC_SIGNS 顺序一致）；缺图则为 "" */
export const ZODIAC_SIGN_IMG: string[] = SIGN_KEYS.map((k) => {
  // 只匹配 hamster 根目录下的标准文件名，排除备份子目录
  const hit = Object.entries(mods).find(([p]) => {
    const lower = p.toLowerCase().replace(/\\/g, "/");
    return lower.endsWith(`/hamster/${k}.png`) || lower.endsWith(`/hamster/${k}.png?url`);
  });
  if (!hit) {
    // eslint-disable-next-line no-console
    console.warn(`[zodiacSignMap] missing image for ${k}.png`);
  }
  return hit ? hit[1] : "";
});

/** 黄道经度 → 星座序号（0-11） */
export const signIndexFromLon = (lon: number): number =>
  Math.floor((((lon % 360) + 360) % 360) / 30) % 12;
