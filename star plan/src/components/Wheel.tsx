import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { PLANET_ITEMS_BY_NAME } from "../data/planets";
import { getAspectReading, getAspectsList, getEmptyHouseReading, getHouseReading,
  getPlanetReading, hasPlanetReading, HOUSE_TITLE, SIGN_SHORT } from "../lib/interpretation";
import { placementText } from "../lib/placement";
import { CX, CY, P, mod, eclipticToWheel, wheelToEcliptic } from "../lib/chartMath";
import type { ComputedChart } from "../lib/swissephService";
import CenterSignAvatar, { SignThumb } from "./CenterSignAvatar";
import type { ReadingData } from "../lib/readingTypes";
import { shade } from "../lib/color";

type Props = {
  generated: boolean;
  chart: ComputedChart | null;
  visible: Set<string>;
  showAspects: boolean;
  showAll: boolean;
  /** 选中项变化时把解读数据交给右侧面板渲染（Wheel 自身决不再渲染卡片） */
  onReading: (data: ReadingData | null) => void;
  /** 外部（右侧解读卡关闭按钮）要求清空选中时递增此计数 */
  clearToken: number;
};

type Sel = { kind: "planet" | "house" | "aspect"; i: number };

const R_DISK = 318;
const R_WEDGE_IN = 96;
const R_PLANET = 196;
const R_ARC = 286; // 宫位弧形文字基线半径
const R_DECO = 244; // 星月 / 四角星装饰带（宫位文字下方、星体轨道上方）
const ORBIT_GAP = 26; // 星轨与星体轨道的间距

/** 宫位短名（1 宫 = 上升，7 宫 = 下降） */
const HOUSE_SHORT = ["上升", "财帛", "兄弟", "田宅", "子女", "奴仆", "下降", "疾厄", "迁移", "官禄", "福德", "玄秘"];

/** 内环装饰：极简星月与四角星（细线、无填充、路径以 0,0 为中心） */
const D_MOON = "M5 -9C-4 -6-4 6 5 9C1 5 1-5 5-9Z";
const D_STAR = "M0 -9C1 -2.6 2.6-1 9 0C2.6 1 1 2.6 0 9C-1 2.6-2.6 1-9 0C-2.6-1-1-2.6 0-9Z";
/** 16 枚等距装饰：月 / 四角星交替，尺寸与半径轻微错落 */
const DECOS = Array.from({ length: 16 }, (_, i) => ({
  deg: (360 / 16) * i + 11,
  moon: i % 2 === 0,
  r: R_DECO + (i % 4 === 1 ? 9 : i % 4 === 3 ? -9 : 0),
  s: i % 2 === 0 ? 0.92 : 0.78 + ((i * 7) % 5) * 0.06,
  rot: ((i * 37) % 24) - 12,
}));

const MINOR_ASPECTS = [
  { deg: 30, full: "半六分相" },
  { deg: 45, full: "半四分相" },
  { deg: 135, full: "补八分相" },
  { deg: 150, full: "梅花相" },
];

/** 主相位表（与 interpretation.ts 保持一致）：合/六分/四分/三分/对分，各带容许度 orb。 */
const ASPECT_MAJORS: Array<{ short: string; deg: number; orb: number }> = [
  { short: "合相", deg: 0, orb: 8 },
  { short: "六分", deg: 60, orb: 4 },
  { short: "四分", deg: 90, orb: 6 },
  { short: "三分", deg: 120, orb: 6 },
  { short: "对分", deg: 180, orb: 7 },
];
const ASPECT_ALIAS: Record<string, string> = {
  合相: "合相", 六分: "六分相", 四分: "四分相", 三分: "三分相", 对分: "对分相",
};

type WAspect = {
  aIdx: number;
  bIdx: number;
  a: string;
  b: string;
  short: string;
  full: string;
  /** 实际夹角（用于文案显示） */
  deg: number;
  /** 命中的理论角度 0/60/90/120/180（用于分色，实际夹角带容许度偏差不能直接拿来匹配） */
  kind: number;
  minor: boolean;
};

/** 环形扇形：自 start 起顺时针张开 span 度（屏幕顺时针 = SVG sweep 1），内径 r1、外径 r2。
 *  配合「1 宫在左、逆时针排布」的坐标，第 i 宫 = 自 cusps[i+1] 顺时针到 cusps[i]。 */
function ringSeg(start: number, span: number, r1: number, r2: number): string {
  const end = start + span;
  const large = span > 180 ? 1 : 0;
  const s1 = P(start, r1);
  const e1 = P(end, r1);
  const e2 = P(end, r2);
  const s2 = P(start, r2);
  return (
    `M${s1.x.toFixed(2)},${s1.y.toFixed(2)}` +
    `A${r1},${r1} 0 ${large} 1 ${e1.x.toFixed(2)},${e1.y.toFixed(2)}` +
    `L${e2.x.toFixed(2)},${e2.y.toFixed(2)}` +
    `A${r2},${r2} 0 ${large} 0 ${s2.x.toFixed(2)},${s2.y.toFixed(2)}Z`
  );
}

/** 同上，但不闭合（弧线路径，供 textPath 使用） */
function arcPath(start: number, span: number, r: number): string {
  const end = start + span;
  const large = span > 180 ? 1 : 0;
  const s = P(start, r);
  const e = P(end, r);
  return `M${s.x.toFixed(2)},${s.y.toFixed(2)}A${r},${r} 0 ${large} 1 ${e.x.toFixed(2)},${e.y.toFixed(2)}`;
}

function angDiff(a: number, b: number): number {
  const d = Math.abs(mod(a - b, 360));
  return d > 180 ? 360 - d : d;
}

/** 球色亮度 → 汉字用白字还是深字（亮球深字、暗球白字） */
function inkFor(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const l = 0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255);
  return l > 165 ? "#4a4136" : "#fffdf5";
}

/** 相位类型 → CSS 类（按实际夹角分色，颜色由主题变量提供）。
 *  合相 0° 暖金 · 六分 60° 柔绿 · 四分 90° 陶橙 · 三分 120° 天蓝 · 对分 180° 朱红。
 *  角度分几类就给几条颜色的线，互不串色。 */
function aspectClass(as: WAspect): string {
  if (as.minor) return "asp-minor";
  // 用命中的理论角度（kind）分色，而不是实际夹角——
  // 实际夹角带 ±4~8° 容许度偏差，精确匹配 case 会全部落空到次要相位色（连线"消失"的根因）
  switch (as.kind) {
    case 0: return "asp-conj"; // 合相
    case 60: return "asp-sex"; // 六分相
    case 90: return "asp-sqr"; // 四分相
    case 120: return "asp-tri"; // 三分相
    case 180: return "asp-opp"; // 对分相
    default: return "asp-minor";
  }
}

function buildModel(
  chart: ComputedChart | null,
  visible: Set<string>,
  showAspects: boolean,
  showAll: boolean
) {
  if (!chart) return null;
  const oks = chart.planets.filter((p) => p.ok && visible.has(p.key));
  const houseMembers: number[][] = Array.from({ length: 12 }, () => []);
  oks.forEach((p, i) => {
    const h = Math.max(1, Math.min(12, p.house));
    houseMembers[h - 1].push(i);
  });

  // 主相位：直接在 oks 上两两计算，用循环下标 i/j 直接作为 aIdx/bIdx。
  // 彻底不依赖「名字 / 黄道经度」反查，从根上消灭索引 -1 与连线坐标 NaN 导致的「一条都不画」。
  const majors: WAspect[] = [];
  if (showAspects) {
    for (let i = 0; i < oks.length; i++) {
      for (let j = i + 1; j < oks.length; j++) {
        const lonA = oks[i].eclipticLon;
        const lonB = oks[j].eclipticLon;
        let diff = Math.abs(mod(lonA - lonB, 360));
        if (diff > 180) diff = 360 - diff;
        const hit = ASPECT_MAJORS.find((m) => Math.abs(diff - m.deg) <= m.orb);
        if (!hit) continue;
        majors.push({
          aIdx: i,
          bIdx: j,
          a: oks[i].name,
          b: oks[j].name,
          short: hit.short,
          full: ASPECT_ALIAS[hit.short] ?? `${hit.short}相`,
          deg: Math.round(diff),
          kind: hit.deg,
          minor: false,
        });
      }
    }
  }

  // 次要相位（仅当 showAll 开启）
  const minors: WAspect[] = [];
  if (showAll) {
    const majorKeys = new Set(majors.map((m) => m.aIdx + "|" + m.bIdx));
    for (let i = 0; i < oks.length; i++) {
      for (let j = i + 1; j < oks.length; j++) {
        if (majorKeys.has(i + "|" + j)) continue;
        const diff = angDiff(oks[i].eclipticLon, oks[j].eclipticLon);
        const hit = MINOR_ASPECTS.find((m) => Math.abs(diff - m.deg) <= 2);
        if (hit) {
          minors.push({
            aIdx: i,
            bIdx: j,
            a: oks[i].name,
            b: oks[j].name,
            short: String(hit.deg),
            full: hit.full,
            deg: diff,
            kind: hit.deg,
            minor: true,
          });
        }
      }
    }
  }

  return { oks, houseMembers, aspects: majors.concat(minors), chart };
}

export default function Wheel({ generated, chart, visible, showAspects, showAll, onReading, clearToken }: Props) {
  const [sel, setSel] = useState<Sel | null>(null);
  // 中心主图 = 出生日期对应的太阳星座（出生日期定太阳星座），不可手动切换
  // 12 张拟人图已全部就绪：按出生日期对应的太阳星座自动切换
  const sunSign = chart?.planets.find((p) => p.key === "sun")?.sign ?? 0;
  const model = useMemo(
    () => buildModel(chart, visible, showAspects, showAll),
    [chart, visible, showAspects, showAll]
  );

  // 过滤器变化时清空选中，避免索引错位
  useEffect(() => setSel(null), [visible, showAspects, showAll, chart]);
  // 右侧解读卡被外部关闭时，同步清空自身选中（保持盘面状态与面板一致）
  useEffect(() => {
    if (clearToken > 0) setSel(null);
  }, [clearToken]);

  const asc = chart?.ascendant ?? 0;
  // 宫位几何：第 i 宫 = 自 cusps[i+1] 顺时针到 cusps[i]（1 宫紧贴 ASC 左缘，逆时针编号）
  const cusps = chart?.houseCuspsWheel ?? [];
  const hStart = (i: number) => (cusps.length === 12 ? cusps[(i + 1) % 12] : 0);
  const hSpan = (i: number) =>
    cusps.length === 12 ? mod(cusps[i] - cusps[(i + 1) % 12], 360) : 30;
  // 宫头黄道经度 → 宫头星座（空宫解读要用）。缺省时用星盘坐标逆运算兜底，保证仍是数据驱动
  const cuspEcl = chart?.houseCuspsEcliptic ?? [];
  const cuspSignOf = (i: number): number => {
    if (cuspEcl.length === 12) return Math.floor(mod(cuspEcl[i], 360) / 30);
    if (cusps.length === 12) return Math.floor(mod(wheelToEcliptic(cusps[i], asc), 360) / 30);
    return 0;
  };
  const show = (s: Sel) => (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    setSel(s);
  };
  const closeOnBlank = () => setSel(null);

  /* ---------- 解读数据：只计算结果 emit 给右侧面板，Wheel 自身不再渲染任何卡片 ---------- */
  const reading = useMemo<ReadingData | null>(() => {
    if (!sel || !model) return null;

    if (sel.kind === "house") {
      const n = sel.i + 1;
      const names = model.houseMembers[sel.i].map((pi) => model.oks[pi].name);
      const headSign = cuspSignOf(sel.i);
      if (names.length === 0) {
        // 空宫：宫位基础意义 + 宫头星座特质 + 综合体现与建议（数据动态拼接）
        const er = getEmptyHouseReading(n, headSign);
        const hidden = (chart?.planets ?? [])
          .filter((p) => p.ok && p.house === n && !visible.has(p.key))
          .map((p) => p.name);
        return {
          key: `house-${n}`,
          kind: "house" as const,
          headSign,
          title: `第${n}宫 · ${HOUSE_TITLE[sel.i]}`,
          sub: hidden.length
            ? `落入行星：当前显示为空宫（已隐藏 ${hidden.join("、")}，落${er.星座}座）`
            : `落入行星：空宫，无行星落入（落${er.星座}座）`,
          lines: [{ text: er.第一段 }, { text: er.第二段 }],
        };
      }
      const r = getHouseReading(n, names);
      return {
        key: `house-${n}`,
        kind: "house" as const,
        headSign,
        title: `第${n}宫 · ${HOUSE_TITLE[sel.i]}`,
        sub: `落入行星：${r.落入行星列表}`,
        lines: [{ text: r.宫位含义 }],
      };
    }

    if (sel.kind === "planet") {
      const pl = model.oks[sel.i];
      const meta = PLANET_ITEMS_BY_NAME[pl.name];
      const base: ReadingData = {
        key: `planet-${pl.key}`,
        kind: "planet",
        planetChar: meta?.char,
        planetColor: meta?.color,
        title: pl.name,
        sub: `${SIGN_SHORT[pl.sign]}座 · 第${pl.house}宫`,
        place: placementText(pl.name, pl.eclipticLon, pl.house),
        lines: [],
      };
      if (hasPlanetReading(pl.name)) {
        const r = getPlanetReading(pl.name, pl.sign, pl.house);
        return {
          ...base,
          lines: [
            { label: "原型", text: r.原型 },
            { label: "落座解读", text: r.落座解读 },
            { label: "落宫解读", text: r.落宫解读 },
          ],
        };
      }
      return { ...base, empty: `数据待补：${pl.name}的完整解读尚未收录，稍后会补上。` };
    }

    const as = model.aspects[sel.i];
    return {
      key: `aspect-${sel.i}`,
      kind: "aspect",
      title: `${as.a} · ${as.full} · ${as.b}`,
      lines: [
        {
          text: as.minor
            ? `${as.a} 与 ${as.b} 构成次要相位「${as.full}」（实际夹角 ${as.deg}°）。`
            : getAspectReading(as.a, as.short, as.b),
        },
      ],
    };
  }, [sel, model, chart, visible]);

  // emit 给父组件渲染到右侧面板：星盘中列内部不产生任何内容，布局永不被挤压
  useEffect(() => {
    onReading(reading);
  }, [reading, onReading]);

  return (
    <div className="wheel-block">
      <div className={"stage" + (generated ? " showing" : "")}>
        {!generated && (
          <div className="empty-cute">
            <span className="egg">🌟</span>
            <p>填好出生信息，点下「生成星盘」就好了～</p>
          </div>
        )}

        <svg className="wheel" viewBox="0 0 760 760" onClick={closeOnBlank}>
          {generated && model && (
            <g className="ring-in">
              {/* 星体球体渐变 + 十二宫水彩底纹 pattern 定义 */}
              <defs>
                {model.oks.map((pl) => {
                  const c = PLANET_ITEMS_BY_NAME[pl.name]?.color ?? "#C4B89E";
                  return (
                    <radialGradient key={"pg" + pl.key} id={"pg-" + pl.key} cx="35%" cy="30%" r="80%">
                      <stop offset="0%" stopColor={shade(c, 58)} />
                      <stop offset="45%" stopColor={c} />
                      <stop offset="100%" stopColor={shade(c, -34)} />
                    </radialGradient>
                  );
                })}
                {/* 每宫一条顺时针弧线：文字沿弧排列且统一朝外（与宫位扇形同起止、同跨度） */}
                {Array.from({ length: 12 }, (_, i) => (
                  <path
                    key={"arc" + i}
                    id={"arc-h-" + i}
                    fill="none"
                    d={arcPath(hStart(i), hSpan(i), R_ARC)}
                  />
                ))}
              </defs>

              {/* 盘面（颜色随昼夜主题） */}
              <circle cx={CX} cy={CY} r={R_DISK} className="disk" />

              {/* 外圈必要刻度：仅保留 12 条星座分界主刻度（删除杂乱小刻度） */}
              {Array.from({ length: 12 }, (_, i) => {
                const deg = eclipticToWheel(i * 30, asc);
                const p1 = P(deg, R_DISK - 3);
                const p2 = P(deg, R_DISK - 11);
                return <line key={"tk" + i} className="tick major" x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} />;
              })}
              <circle cx={CX} cy={CY} r={R_DISK - 11} className="engrave-circle" />

              {/* 宫位：极淡暖白交替底色（悬停微亮），附宫名 tooltip
                  第 i 宫自 cusps[i+1] 顺时针到 cusps[i]，1 宫紧贴 ASC（9 点钟）向下展开 */}
              {Array.from({ length: 12 }, (_, i) => (
                <path
                  key={"house" + i}
                  className={"house-pastel " + (i % 2 === 0 ? "house-a" : "house-b")}
                  d={ringSeg(hStart(i), hSpan(i), R_WEDGE_IN, R_DISK)}
                  onClick={show({ kind: "house", i })}
                >
                  <title>{`第${i + 1}宫 · ${HOUSE_TITLE[i]}`}</title>
                </path>
              ))}

              {/* 星轨：星体轨道内外各一条细线，淡暖金 / 淡银，1px，极淡发光 */}
              <circle cx={CX} cy={CY} r={R_PLANET - ORBIT_GAP} className="orbit-track" />
              <circle cx={CX} cy={CY} r={R_PLANET + ORBIT_GAP} className="orbit-track" />

              {/* 内环装饰：星月与四角星（细线无填充、极弱发光、透明度 0.26，纯点缀） */}
              <g className="deco-band">
                {DECOS.map((d, i) => {
                  const pos = P(d.deg, d.r);
                  return (
                    <path
                      key={"dc" + i}
                      className={"deco " + (d.moon ? "deco-moon" : "deco-star")}
                      d={d.moon ? D_MOON : D_STAR}
                      transform={`translate(${pos.x.toFixed(2)} ${pos.y.toFixed(2)}) rotate(${d.deg + d.rot}) scale(${d.s.toFixed(2)})`}
                    />
                  );
                })}
              </g>

              {/* 宫位分隔柔光细线 */}
              {model.chart.houseCuspsWheel.map((a, i) => {
                const p1 = P(a, R_WEDGE_IN);
                const p2 = P(a, R_DISK);
                return (
                  <line key={"dl" + i} className="cusp-line" x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} />
                );
              })}

              {/* 宫位名称：沿外圈弧线排列（SVG textPath），统一朝外，字号随宫宽自适应 */}
              {Array.from({ length: 12 }, (_, i) => {
                const start = hStart(i);
                const span = hSpan(i);
                const arcLen = (2 * Math.PI * R_ARC * span) / 360;
                const fs = span >= 26 ? 13 : span >= 19 ? 12 : 11;
                // 宫头星座：与弹窗解读、AI 对话共用 houseCuspsEcliptic（宫头起始经度）。
                // 禁止用弧线中点反推星座——宫位跨星座边界时中点会落进隔壁星座，
                // 造成标签显示与解读/AI 不一致（如 2 宫宫头巨蟹被标成狮子）。
                const signIdx = cuspSignOf(i);
                const full = `${i + 1}宫 ${HOUSE_SHORT[i]}·${SIGN_SHORT[signIdx]}`;
                const brief = `${i + 1}宫 ${HOUSE_SHORT[i]}`;
                const est = (s: string) => s.length * fs * 0.92;
                let txt = full;
                if (est(full) > arcLen * 0.86) txt = brief;
                const squeeze = est(txt) > arcLen * 0.86;
                return (
                  <text key={"harct" + i} className="house-arc-label" style={{ fontSize: fs }}>
                    <textPath
                      href={"#arc-h-" + i}
                      startOffset="50%"
                      textAnchor="middle"
                      textLength={squeeze ? Math.max(arcLen * 0.84, fs * 2.4) : undefined}
                      lengthAdjust="spacingAndGlyphs"
                    >
                      {txt}
                    </textPath>
                  </text>
                );
              })}

              {/* 相位连线：细线、默认不发光、hover 发光 */}
              {model.aspects.map((as, i) => {
                const pa = P(model.oks[as.aIdx]?.deg ?? 0, R_PLANET);
                const pb = P(model.oks[as.bIdx]?.deg ?? 0, R_PLANET);
                return (
                  <g key={"asp" + i} className="aspect" onClick={show({ kind: "aspect", i })}>
                    <line className={"aspect-vis " + aspectClass(as)} x1={pa.x} y1={pa.y} x2={pb.x} y2={pb.y} />
                    <line className="aspect-hit" x1={pa.x} y1={pa.y} x2={pb.x} y2={pb.y} />
                  </g>
                );
              })}

              {/* 行星节点：放大版发光立体球体 + 单汉字标注（大小随 viewBox 等比缩放） */}
              {model.oks.map((pl, p) => {
                const pos = P(pl.deg, R_PLANET);
                const meta = PLANET_ITEMS_BY_NAME[pl.name];
                const color = meta?.color ?? "#C4B89E";
                const big = pl.key === "sun" || pl.key === "moon";
                const r = big ? 20 : 16;
                return (
                  <g key={"pt" + pl.key} className="planet" onClick={show({ kind: "planet", i: p })}>
                    <circle
                      cx={pos.x}
                      cy={pos.y}
                      r={r}
                      className="pt-dot"
                      fill={`url(#pg-${pl.key})`}
                      style={{ "--pg": color } as CSSProperties}
                    />
                    <text
                      x={pos.x}
                      y={pos.y}
                      textAnchor="middle"
                      className="pt-symbol"
                      style={{ fontSize: r * 1.02, fill: inkFor(color) }}
                    >
                      {meta?.char ?? "?"}
                    </text>
                  </g>
                );
              })}

              {/* 相位连线：细线、默认不发光、hover 发光 */}
            </g>
          )}
        </svg>

        {/* 中心拟人形象：HTML <img> 绝对定位叠在 SVG 中心上方（必须在 svg 外部，HTML 元素无法在 SVG 内渲染） */}
        {generated && <CenterSignAvatar sign={sunSign} />}
      </div>
    </div>
  );
}
