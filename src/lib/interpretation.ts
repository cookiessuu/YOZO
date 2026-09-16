// 占星解读服务：读 src/data/astrology-data.json，把「位置 → 人话」的解读组装出来。
// TS 采用宽松写法，类型以够用为度，不做过度约束。

import astroData from "../data/astrology-data.json";
import {
  EMPTY_HOUSE_NOTE,
  HOUSE_FOCUS,
  HOUSE_VERB,
  SIGN_GIFT,
  SIGN_KEYWORD,
} from "../data/houseSignCopy";

const CN_PLANETS = ["太阳", "月亮", "水星", "金星", "火星", "木星", "土星", "天王星", "海王星", "冥王星"];
export const SIGN_SHORT = ["白羊", "金牛", "双子", "巨蟹", "狮子", "处女", "天秤", "天蝎", "射手", "摩羯", "水瓶", "双鱼"];
export const HOUSE_TITLE = ["命宫", "财帛宫", "兄弟宫", "田宅宫", "子女宫", "奴仆宫", "夫妻宫", "疾厄宫", "迁移宫", "官禄宫", "福德宫", "玄秘宫"];

const ASPECT_ALIAS: Record<string, string> = {
  合相: "合相", 六分: "六分相", 四分: "四分相", 三分: "三分相", 对分: "对分相",
  六分相: "六分", 四分相: "四分", 三分相: "三分", 对分相: "对分",
};
const ASPECT_DEG: Record<string, number> = { 合相: 0, 六分: 60, 四分: 90, 三分: 120, 对分: 180 };
const ASPECT_MAJORS = [
  { short: "合相", deg: 0, orb: 8 },
  { short: "六分", deg: 60, orb: 4 },
  { short: "四分", deg: 90, orb: 6 },
  { short: "三分", deg: 120, orb: 6 },
  { short: "对分", deg: 180, orb: 7 },
];
const ANGULAR_HOUSES = [1, 4, 7, 10];

/** 上升星座 → 古典守护行星 */
const SIGN_RULER: Record<string, string> = {
  白羊: "火星", 金牛: "金星", 双子: "水星", 巨蟹: "月亮", 狮子: "太阳", 处女: "水星",
  天秤: "金星", 天蝎: "火星", 射手: "木星", 摩羯: "土星", 水瓶: "土星", 双鱼: "木星",
};

/** 十二守护小兽候选（中心占位，日后替换为插画） */
const GUARDIANS: Record<string, { icon: string; name: string; setup: string }> = {
  白羊: { icon: "🐏", name: "赤焰羚羊", setup: "生来就想第一个冲出去" },
  金牛: { icon: "🐂", name: "磐石牛灵", setup: "守住的，都会长长久久" },
  双子: { icon: "🦋", name: "风语蝶", setup: "能跟万物聊上几句" },
  巨蟹: { icon: "🦀", name: "潮汐蟹", setup: "把「家」背在自己的壳上" },
  狮子: { icon: "🦁", name: "日冕狮", setup: "聚光即燃，天生要被看见" },
  处女: { icon: "🌾", name: "麦芒精灵", setup: "再乱的麻线也能理成束" },
  天秤: { icon: "⚖️", name: "星秤使", setup: "总在两端之间找那个平衡点" },
  天蝎: { icon: "🦂", name: "渊底蝎", setup: "蛰伏很安静，出手很精准" },
  射手: { icon: "🏹", name: "远行鹿", setup: "永远追着地平线往更远跑" },
  摩羯: { icon: "🐐", name: "岩巅羊", setup: "一步一个台阶，从不高估捷径" },
  水瓶: { icon: "🌀", name: "电气狐", setup: "站在人群之外，替未来发一点光" },
  双鱼: { icon: "🐬", name: "幻海豚", setup: "爱潜进梦境最深的那一湾" },
};

/* ---------- 小型归一化工具 ---------- */
const mod360 = (n: number) => ((n % 360) + 360) % 360;
const signIndexFromLon = (lon: number) => Math.floor(mod360(lon) / 30);
const planetCn = (p: unknown): string => {
  if (typeof p === "string") return p;
  const obj = p as { name?: string };
  return obj?.name ?? "太阳";
};
const signShortOf = (s: unknown): string => {
  if (typeof s === "number") return SIGN_SHORT[mod360(Math.floor(s)) % 12];
  const str = String(s ?? "").replace(/座$/, "");
  if (SIGN_SHORT.includes(str)) return str;
  const idx = SIGN_SHORT.findIndex((x) => x === str);
  return SIGN_SHORT[((idx % 12) + 12) % 12] ?? "太阳";
};
/** 把「三分相 / 三分 /  三分 」等写法统一成短名（三分）。 */
function normalizeAspectShort(a: unknown): string {
  let k = String(a ?? "").trim();
  if (ASPECT_ALIAS[k]) {
    // 长名（六分相/四分相/三分相/对分相）去掉「相」；合相的短名就是「合相」
    return k.endsWith("相") && k !== "合相" ? k.slice(0, -1) : k;
  }
  if (k.endsWith("相")) {
    const s = k.slice(0, -1);
    if (ASPECT_ALIAS[s]) return s;
  }
  return k;
}

/* ---------- 主要导出 ---------- */

export type PlanetReading = {
  原型: string;
  落座解读: string;
  落宫解读: string;
  综合解读: string;
};

/**
 * 落座解读：行星在某星座的延伸含义。
 * 参数 planet 用行星名（太阳…冥王星，或 { name } 对象），sign 为 0-11 或星座名。
 */
export function getPlanetInSignReading(planet: unknown, sign: unknown): string {
  const cn = planetCn(planet);
  const ss = signShortOf(sign);
  const key = `${cn}_${ss}`;
  const direct = (astroData.planet_in_sign as Record<string, string>)[key];
  if (direct) return direct;
  const head = astroData.planets[cn as keyof typeof astroData.planets] ?? `${cn}的星力`;
  const sigText = astroData.signs[ss as keyof typeof astroData.signs] ?? `${ss}座`;
  return `${cn}落在${ss}座。${head}；${ss}座的性子是${sigText}。顺着这股劲用就好，也留意它的反面。`;
}

/** 落宫解读：行星落在第 houseNumber 宫（1-12）。 */
export function getPlanetInHouseReading(planet: unknown, houseNumber: number): string {
  const cn = planetCn(planet);
  const n = Math.max(1, Math.min(12, Math.round(houseNumber) || 1));
  const key = `${cn}_${n}`;
  const direct = (astroData.planet_in_house as Record<string, string>)[key];
  if (direct) return direct;
  const head = astroData.planets[cn as keyof typeof astroData.planets] ?? `${cn}的星力`;
  const houseText = astroData.houses[String(n) as keyof typeof astroData.houses] ?? "";
  return `${cn}落在第${n}宫·${HOUSE_TITLE[n - 1]}。${head}。${houseText}。`;
}

/** 该行星是否在知识库中有解读条目（只有十大主星有；小行星/交点等返回 false） */
export function hasPlanetReading(planet: unknown): boolean {
  const cn = planetCn(planet);
  return !!astroData.planets[cn as keyof typeof astroData.planets];
}

/** 完整行星解读（四段式，供弹窗与 hover 使用）。 */
export function getPlanetReading(
  planet: unknown,
  sign: unknown,
  house: number
): PlanetReading {
  const cn = planetCn(planet);
  const ss = signShortOf(sign);
  const n = Math.max(1, Math.min(12, Math.round(house) || 1));
  const prototype = astroData.planets[cn as keyof typeof astroData.planets] ?? `${cn}是这张盘里的一枚重要星体。`;
  const inSign = getPlanetInSignReading(cn, ss);
  const inHouse = getPlanetInHouseReading(cn, n);
  const summary =
    `${cn}落在${ss}座第${n}宫（${HOUSE_TITLE[n - 1]}）：` +
    `落座决定了它「怎么表达」——${inSign.split("。").slice(0, 2).join("。")}；` +
    `落宫决定了它「在哪个舞台表达」——${inHouse.split("。").slice(1, 3).join("。")}。` +
    `两股线索合看，你真正要留意的，是${ss}座自带的那面镜子与第${n}宫题目之间的呼应与落差。`;
  return { 原型: prototype, 落座解读: inSign, 落宫解读: inHouse, 综合解读: summary };
}

/** 宫位含义 + 该宫落入的行星（hover 宫位弧）。planetsInHouse 传行星中文名数组即可。 */
export function getHouseReading(houseNumber: number, planetsInHouse: unknown[] = []): {
  宫位含义: string;
  落入行星列表: string;
} {
  const n = Math.max(1, Math.min(12, Math.round(houseNumber) || 1));
  const text = astroData.houses[String(n) as keyof typeof astroData.houses] ?? "";
  const list = planetsInHouse.map(planetCn);
  return {
    宫位含义: text,
    落入行星列表: list.length ? list.join("、") : "（空宫，无行星落入）",
  };
}

export type EmptyHouseReading = {
  星座: string;
  宫位名: string;
  宫位含义: string; // a 宫位基础意义
  星座特质: string; // b 宫头星座特质
  综合体现: string; // c 空宫状态下的综合体现
  建议: string; // c 成长建议
  第一段: string; // 宫位 + 星座（弹窗第一段）
  第二段: string; // 综合影响 + 建议（弹窗第二段）
};

/**
 * 空宫解读：宫位基础意义 + 宫头星座特质 + 空宫状态下的综合体现与建议。
 * 全部由 astrology-data.json（宫位/星座）与 houseSignCopy（词表）动态拼接，无整段硬编码。
 * sign 可传星座序号（0-11）或「天蝎 / 天蝎座」。
 */
export function getEmptyHouseReading(houseNumber: number, sign: unknown): EmptyHouseReading {
  const n = Math.max(1, Math.min(12, Math.round(houseNumber) || 1));
  const ss = signShortOf(sign);
  const si = Math.max(0, SIGN_SHORT.indexOf(ss));
  const title = HOUSE_TITLE[n - 1];

  // a 宫位基础意义：取 houses 的第一句（后半句讲「行星落于此」，空宫不适用），
  //    并去掉开头的宫位名与「之一，」之类冗余前缀，避免与标题重复
  const houseFull = astroData.houses[String(n) as keyof typeof astroData.houses] ?? "";
  const firstSentence = houseFull.split("。")[0] || houseFull;
  const houseBase =
    firstSentence.replace(new RegExp(`^${title}，`), "").replace(/^之一，/, "") + "。";

  // b 宫头星座特质（原数据以「…的星座，…」句式描述，用「它是」承接最自然）
  const trait = (astroData.signs[ss as keyof typeof astroData.signs] ?? "").replace(/。$/, "");

  const focus = HOUSE_FOCUS[n - 1];
  const verb = HOUSE_VERB[n - 1];
  const keyword = SIGN_KEYWORD[si];
  const gift = SIGN_GIFT[si];

  const 宫位含义 = `${title}落${ss}座，当前为空宫。${title}${houseBase}`;
  const 星座特质 = `宫头星座是${ss}座——它是${trait}。`;
  const 综合体现 = `在空宫状态下，${focus}会带上${ss}座的底色：当你${verb}时，多半是以${keyword}的方式去经历它。${EMPTY_HOUSE_NOTE}`;
  const 建议 = `成长建议：空宫的领域最容易被忽略，也最值得主动经营。把${ss}座的这份特质用在${focus}上——${gift}。`;

  return {
    星座: ss,
    宫位名: title,
    宫位含义,
    星座特质,
    综合体现,
    建议,
    第一段: `${宫位含义}${星座特质}`,
    第二段: `${综合体现}${建议}`,
  };
}

/** 相位解读（planet1 / aspectType / planet2，aspectType 可为「三分相」或「三分」）。 */
export function getAspectReading(planet1: unknown, aspectType: unknown, planet2: unknown): string {
  const a = planetCn(planet1);
  const c = planetCn(planet2);
  const short = normalizeAspectShort(aspectType);
  const full = ASPECT_ALIAS[short] ?? (short.endsWith("相") ? short : `${short}相`);

  const tryKeys = [`${a}_${short}_${c}`, `${c}_${short}_${a}`];
  const map = astroData.aspect_interpretations as Record<string, string>;
  for (const k of tryKeys) {
    if (map[k]) return map[k];
  }
  const base = astroData.aspects[full as keyof typeof astroData.aspects] ?? "";
  return `${a}与${c}构成${full}。${base}相处时，留意让「${a}」和「${c}」互相成全，而不是互相较劲。`;
}

export type AspectHit = {
  a: string; // 行星中文名
  b: string;
  lonA: number;
  lonB: number;
  short: string; // 三分 / 四分 …
  full: string; // 三分相
  deg: number; // 实际夹角
};

/** 计算盘内主要相位（供画相位连线与 hover）。chart.planets 需含 eclipticLon。 */
export function getAspectsList(chart: { planets: Array<{ name?: string; eclipticLon?: number }> }): AspectHit[] {
  const out: AspectHit[] = [];
  const planets = chart.planets.filter((p) => typeof p.eclipticLon === "number");
  for (let i = 0; i < planets.length; i++) {
    for (let j = i + 1; j < planets.length; j++) {
      const lonA = planets[i].eclipticLon as number;
      const lonB = planets[j].eclipticLon as number;
      let diff = Math.abs(mod360(lonA - lonB));
      if (diff > 180) diff = 360 - diff;
      const hit = ASPECT_MAJORS.find((m) => Math.abs(diff - m.deg) <= m.orb);
      if (!hit) continue;
      out.push({
        a: planetCn(planets[i].name),
        b: planetCn(planets[j].name),
        lonA,
        lonB,
        short: hit.short,
        full: ASPECT_ALIAS[hit.short],
        deg: Math.round(diff),
      });
    }
  }
  return out;
}

export type Guardian = { icon: string; name: string; setup: string; sign: string };

/** 依据上升星座挑选守护小兽（日后以真实插画替换）。 */
export function getGuardian(chart?: {
  planets?: Array<{ name?: string; eclipticLon?: number }>;
  ascendant?: number;
}): Guardian {
  const ascSign = chart?.ascendant != null ? SIGN_SHORT[signIndexFromLon(chart.ascendant)] : "狮子";
  const g = GUARDIANS[ascSign] ?? GUARDIANS["狮子"];
  return { ...g, sign: ascSign };
}

const ELE = { 白羊: "火", 狮子: "火", 射手: "火", 金牛: "土", 处女: "土", 摩羯: "土", 双子: "风", 天秤: "风", 水瓶: "风", 巨蟹: "水", 天蝎: "水", 双鱼: "水" };

/** 命主星定位：由上升星座返回（星座索引, 行星名）。 */
function chartRulerInfo(ascLon: number): { signIndex: number; sign: string; planet: string } {
  const idx = signIndexFromLon(ascLon);
  const sign = SIGN_SHORT[idx];
  return { signIndex: idx, sign, planet: SIGN_RULER[sign] ?? "太阳" };
}

/**
 * 综合人格画像（按 chart_synthesis_rules 的专业权重逐层叠加）。
 * 返回对象含文本 summary 与所选守护小兽 guardian，便于 UI 直接展示。
 */
export function getChartSummary(chart: {
  planets?: Array<{ name?: string; eclipticLon?: number }>;
  houseCuspsWheel?: number[];
  ascendant?: number;
  mc?: number;
}): { summary: string; guardian: Guardian } {
  const planets = (chart.planets ?? []).filter((p) => typeof p.eclipticLon === "number");
  const ascLon = chart.ascendant ?? 0;
  const ruler = chartRulerInfo(ascLon);
  const rulerPlanet = planets.find((p) => planetCn(p.name) === ruler.planet);
  const sun = planets.find((p) => planetCn(p.name) === "太阳");
  const moon = planets.find((p) => planetCn(p.name) === "月亮");

  // 宫位归属（等宫近似：用黄道经度在宫头之间的排布）
  const cuspsEcl: number[] = [];
  const cw = chart.houseCuspsWheel;
  if (cw && cw.length === 12) {
    for (let i = 0; i < 12; i++) {
      // 宫头为星盘坐标；换算回黄道：lon = asc + (wheel - 270)，随后 mod 360
      cuspsEcl.push(mod360(ascLon + (cw[i] - 270)));
    }
  }
  const houseOfLon = (lon: number): number => {
    if (cuspsEcl.length !== 12) return Math.floor(mod360(lon - ascLon) / 30) + 1; // 等宫近似
    for (let i = 0; i < 12; i++) {
      const start = cuspsEcl[i];
      const end = cuspsEcl[(i + 1) % 12];
      const span = mod360(end - start);
      const diff = mod360(lon - start);
      if (diff < span) return i + 1;
    }
    return 1;
  };

  // 元素平衡
  const counts = { 火: 0, 土: 0, 风: 0, 水: 0 };
  for (const p of planets) counts[ELE[SIGN_SHORT[signIndexFromLon(p.eclipticLon as number)]] as keyof typeof counts]++;
  const eleOrder = (["火", "土", "风", "水"] as const).slice().sort((x, y) => counts[y] - counts[x]);
  const domEle = eleOrder[0];

  // 角宫行星
  const angular = planets.filter((p) => ANGULAR_HOUSES.includes(houseOfLon(p.eclipticLon as number)));

  // 相位格局
  const aspects = getAspectsList(chart as never);
  const hard = aspects.filter((a) => a.short === "四分" || a.short === "对分");
  const soft = aspects.filter((a) => a.short === "三分" || a.short === "六分");

  const rulerSnippet = rulerPlanet
    ? getPlanetInHouseReading(rulerPlanet.name, houseOfLon(rulerPlanet.eclipticLon as number))
    : `命主星${ruler.planet}未纳入本次计算（当前取太阳系内七曜）`;

  const sunStr = sun ? `${sun.name}在第${houseOfLon(sun.eclipticLon as number)}宫（${SIGN_SHORT[signIndexFromLon(sun.eclipticLon as number)]}座）` : "";
  const moonStr = moon ? `${moon.name}在第${houseOfLon(moon.eclipticLon as number)}宫（${SIGN_SHORT[signIndexFromLon(moon.eclipticLon as number)]}座）` : "";

  const guardian = getGuardian(chart as never);
  const lines = [
    `上升${ruler.sign}座——命主星为${ruler.planet}：${rulerSnippet}`,
    sunStr && moonStr ? `日月作为人格双轴：${sunStr}，${moonStr}。` : "",
    angular.length ? `角宫行星（${angular.map((p) => planetCn(p.name)).join("、")}）会把对应生活领域推到台前。` : "角宫暂无行星聚集，个人重心更偏向由命主星与相位揭示。",
    `相位格局：${aspects.length ? aspects.map((a) => `${a.a}·${a.full}·${a.b}`).join("，") : "无明显主要相位"}。${hard.length ? `其中紧张相位 ${hard.length} 组是人格成长的引擎。` : ""}${soft.length ? `和谐相位 ${soft.length} 组是你可以顺手借用的天赋。` : ""}`,
    `元素分布：${eleOrder.map((k) => `${k}${counts[k]}`).join(" / ")}，${domEle}元素最旺——你的底色是${domEle === "火" ? "行动与热情" : domEle === "土" ? "踏实与现实" : domEle === "风" ? "理性与联结" : "感受与直觉"}。`,
    `守护小兽候选：${guardian.icon} ${guardian.name}（${guardian.setup}）——随上升气质择定，之后可换成真插画。`,
  ];
  return { summary: lines.filter(Boolean).join("\n"), guardian };
}
