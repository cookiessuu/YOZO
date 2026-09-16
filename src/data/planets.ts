// 全量行星/虚点清单：决定星盘点与配色。加一行，盘面就自动多一个点。
// 星体球体上只显示 1 个汉字（char），emoji 仅用于右侧面板列表。
import { Asteroid, LunarPoint, Planet } from "@swisseph/browser";

export type PlanetItem = {
  key: string;
  name: string; // 中文名，作为解读查表的键
  char: string; // 星体球体上的单汉字标注
  emoji: string; // 仅面板列表用
  color: string; // 低饱和球体色（莫兰迪色系）
  body: Planet | LunarPoint | Asteroid | null; // null 表示由其它体虚拟（南交点）
  virtualOf?: string; // 虚拟点：取某体 longitude +180°
  group: "main" | "outer" | "extra"; // 面板分组：主星 / 外行星 / 小行星·虚点
  defaultOn: boolean; // 面板默认是否开启
};

export const PLANET_ITEMS: PlanetItem[] = [
  { key: "sun", name: "太阳", char: "日", emoji: "🌞", color: "#C9A76B", body: Planet.Sun, group: "main", defaultOn: true },
  { key: "moon", name: "月亮", char: "月", emoji: "🌙", color: "#D6D9E0", body: Planet.Moon, group: "main", defaultOn: true },
  { key: "mercury", name: "水星", char: "水", emoji: "☿", color: "#8FA3B8", body: Planet.Mercury, group: "main", defaultOn: true },
  { key: "venus", name: "金星", char: "金", emoji: "♀", color: "#D3A296", body: Planet.Venus, group: "main", defaultOn: true },
  { key: "mars", name: "火星", char: "火", emoji: "♂", color: "#B06A5A", body: Planet.Mars, group: "main", defaultOn: true },
  { key: "jupiter", name: "木星", char: "木", emoji: "♃", color: "#8FAB8E", body: Planet.Jupiter, group: "main", defaultOn: true },
  { key: "saturn", name: "土星", char: "土", emoji: "♄", color: "#A08A6A", body: Planet.Saturn, group: "main", defaultOn: true },
  { key: "uranus", name: "天王星", char: "天", emoji: "♅", color: "#7F97A8", body: Planet.Uranus, group: "outer", defaultOn: false },
  { key: "neptune", name: "海王星", char: "海", emoji: "♆", color: "#86A8A3", body: Planet.Neptune, group: "outer", defaultOn: false },
  { key: "pluto", name: "冥王星", char: "冥", emoji: "♇", color: "#7A6A8F", body: Planet.Pluto, group: "outer", defaultOn: false },
  { key: "juno", name: "婚神星", char: "婚", emoji: "🤝", color: "#C9A0B0", body: Asteroid.Juno, group: "extra", defaultOn: false },
  { key: "pallas", name: "智神星", char: "智", emoji: "🦉", color: "#9FB09A", body: Asteroid.Pallas, group: "extra", defaultOn: false },
  { key: "vesta", name: "灶神星", char: "灶", emoji: "🔥", color: "#C2A683", body: Asteroid.Vesta, group: "extra", defaultOn: false },
  { key: "ceres", name: "谷神星", char: "谷", emoji: "🌾", color: "#B5B59A", body: Asteroid.Ceres, group: "extra", defaultOn: false },
  { key: "north", name: "北交点", char: "北", emoji: "☊", color: "#B99F8C", body: LunarPoint.TrueNode, group: "extra", defaultOn: false },
  { key: "south", name: "南交点", char: "南", emoji: "☋", color: "#8F9C9A", body: null, virtualOf: "north", group: "extra", defaultOn: false },
  { key: "lilith", name: "莉莉丝", char: "莉", emoji: "🌑", color: "#9C8FA8", body: LunarPoint.MeanApogee, group: "extra", defaultOn: false },
];

export const PLANET_ITEMS_BY_NAME: Record<string, PlanetItem> = Object.fromEntries(
  PLANET_ITEMS.map((p) => [p.name, p])
);
