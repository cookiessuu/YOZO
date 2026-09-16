// ===== AI 对话内核：本地解读生成 + 真实大模型接口预留 =====
//
// 设计目标：
//  - 无密钥也能用——根据当前星盘数据（宫位 / 星座 / 星体 / 相位）本地生成人话解读；
//  - 一键接远程——把 LLM_CONFIG.enabled 置 true 并填入 apiKey，自动改走 DeepSeek / 豆包等；
//  - 远程失败自动兜底本地，永不白屏。

import { SIGN_SHORT, HOUSE_TITLE, getPlanetReading, getAspectsList } from "./interpretation";
import { HOUSE_FOCUS, SIGN_GIFT, SIGN_KEYWORD } from "../data/houseSignCopy";
import type { ComputedChart } from "./swissephService";

export type ChatRole = "user" | "ai";
export type ChatMsg = { role: ChatRole; text: string };

/** 传给模型的结构化星盘上下文（与「真实数据接口」一一对应） */
export interface ChartCtx {
  hasChart: boolean;
  sun: string; // 太阳星座
  moon: string; // 月亮星座
  asc: string; // 上升星座
  bodies: { name: string; sign: string; house: number; deg: number }[];
  aspects: { a: string; b: string; nature: string; full: string }[];
  /** 十二宫宫头星座（空宫解读用，索引 0 = 第 1 宫） */
  houseSigns: string[];
}

const mod360 = (n: number) => ((n % 360) + 360) % 360;
const signShortOf = (idx: number) => SIGN_SHORT[Math.floor(mod360(idx) / 30) % 12] ?? "未知";

/** 抽取当前星盘的结构化上下文（仅取可见且成功计算的星体） */
export function buildChartContext(
  chart: ComputedChart | null,
  visible: Set<string>
): ChartCtx {
  if (!chart) {
    return { hasChart: false, sun: "", moon: "", asc: "", bodies: [], aspects: [], houseSigns: [] };
  }
  const oks = chart.planets.filter((p) => p.ok && visible.has(p.key));
  const bodies = oks.map((p) => ({
    name: p.name,
    // p.sign 已是 0-11 的星座序号，直接映射到中文名；
    // 切勿再用 signShortOf(序号)（其内部会再 ÷30，导致永远落到白羊）
    sign: SIGN_SHORT[p.sign],
    house: p.house,
    deg: Math.round(p.eclipticLon % 30 === 0 ? 0 : p.eclipticLon % 30),
  }));
  const sun = oks.find((p) => p.key === "sun");
  const moon = oks.find((p) => p.key === "moon");
  const natureOf: Record<string, string> = {
    合相: "融合于",
    六分: "和谐于",
    三分: "和谐于",
    四分: "张力于",
    对分: "对立于",
  };
  const aspects = getAspectsList({ planets: oks })
    .map((a) => ({
      a: a.a,
      b: a.b,
      nature: natureOf[a.short] ?? "相位",
      full: a.full,
    }));

  const houseSigns =
    chart.houseCuspsEcliptic?.length === 12
      ? chart.houseCuspsEcliptic.map((lon) => signShortOf(lon))
      : [];

  return {
    hasChart: true,
    sun: sun ? SIGN_SHORT[sun.sign] : "未知",
    moon: moon ? SIGN_SHORT[moon.sign] : "未知",
    asc: signShortOf(chart.ascendant),
    bodies,
    aspects,
    houseSigns,
  };
}

/* ---------- 主题映射：关键词 → 关注的宫位 ---------- */
type Topic = { houses: number[]; self?: boolean; label: string };
const TOPICS: { test: RegExp; topic: Topic }[] = [
  { test: /财|钱|富|收入|薪资|工资|理财|投资/, topic: { houses: [2], label: "财运" } },
  { test: /事业|工作|职业|官|升职|职场|创业/, topic: { houses: [10], label: "事业" } },
  { test: /感情|爱情|婚姻|桃花|恋爱|对象|伴侣|夫妻/, topic: { houses: [7], label: "感情" } },
  { test: /学业|考试|学习|读书|升学|留学/, topic: { houses: [9, 3], label: "学业" } },
  { test: /健康|身体|疾病|养生/, topic: { houses: [6], label: "健康" } },
  { test: /家庭|家人|父母|房产|家宅|搬迁/, topic: { houses: [4], label: "家庭" } },
  { test: /子女|孩子|怀孕|育儿/, topic: { houses: [5], label: "子女" } },
  { test: /朋友|人际|社交|圈子|贵人/, topic: { houses: [11], label: "人际" } },
  { test: /性格|自我|我是谁|怎样的人|脾气|特质|整体|综合|本命|运势/, topic: { houses: [1], self: true, label: "整体性格" } },
];

function detectTopic(text: string): Topic {
  for (const t of TOPICS) if (t.test.test(text)) return t.topic;
  return { houses: [1], self: true, label: "整体" };
}

/**
 * 提炼要点：优先取解读原文里「」标记的高亮结论（数据自带的结构化摘要），
 * 没有再退化为「首句截断」，始终保证是完整可读的短短语。
 */
function keywordOf(s: string, max = 26): string {
  const src = (s || "").replace(/\s+/g, "");
  const hit = src.match(/「([^」]+)」/);
  if (hit) return hit[1];
  const first = (src.split("。").filter(Boolean)[0] || src).replace(/。$/, "");
  if (first.length <= max) return first;
  const cut = first.slice(0, max);
  const p = Math.max(cut.lastIndexOf("，"), cut.lastIndexOf("、"));
  const tail = p > max * 0.5 ? cut.slice(0, p) : cut;
  return tail.replace(/[的了是在和与及、，]+$/, "") + "…";
}

/**
 * 本地生成解读（无远程时的默认实现，也是远程失败时的兜底）。
 * 风格：结论先行 + 要点化，不复述宫位/星体的整段释义——那是弹窗的职责，
 * 对话里只给「这张盘这句话意味着什么」的归纳。
 */
export function localReply(text: string, ctx: ChartCtx): string {
  if (!ctx.hasChart) {
    return "还没生成星盘哦～先在上方填好出生时间和地点，点「生成星盘」，我就能结合你的真实星盘为你解读啦。";
  }
  const topic = detectTopic(text);
  const houses = topic.houses;
  const main = houses[0];
  const mainTitle = HOUSE_TITLE[main - 1];
  const focus = HOUSE_FOCUS[main - 1] ?? mainTitle;
  const bodies = ctx.bodies.filter((b) => houses.includes(b.house));
  const out: string[] = [];

  // ① 结论：一句话给出主导宫位与整体判断
  if (bodies.length) {
    const names = bodies.slice(0, 3).map((b) => b.name).join("、");
    const pronoun = bodies.length > 1 ? "它们" : "它";
    out.push(
      `${topic.label}主要看第${houses.join("、")}宫（${mainTitle}）。这里落着${names}，你的${focus}会被${pronoun}直接带动。`
    );
  } else {
    const sign = ctx.houseSigns[main - 1] ?? "";
    const kw = sign ? SIGN_KEYWORD[SIGN_SHORT.indexOf(sign)] ?? "" : "";
    out.push(
      `${topic.label}主要看第${main}宫（${mainTitle}），目前是空宫——宫头${sign}座，关键词是「${kw}」。空宫不等于没有，只是这块不靠行星推着走，更多是${sign}座的底色在慢慢起作用。`
    );
  }

  // ② 要点：每颗星一行，只给「」里的高亮结论，不复述整段释义
  bodies.slice(0, 3).forEach((b) => {
    const pr = getPlanetReading(b.name, b.sign, b.house);
    out.push(`· ${b.name}落${b.sign}座：${keywordOf(pr.落座解读)}`);
  });

  // ③ 整体性格：日月升压成一行
  if (topic.self) {
    out.push(`· 底色：日${ctx.sun} · 月${ctx.moon} · 升${ctx.asc}——对外样子、内在情绪、本能反应三层。`);
  }

  // ④ 关键相位：只留最相关的两条
  const focusNames = new Set(bodies.map((b) => b.name));
  if (topic.self) {
    focusNames.add("太阳");
    focusNames.add("月亮");
  }
  const rel = ctx.aspects.filter((a) => focusNames.has(a.a) || focusNames.has(a.b)).slice(0, 2);
  if (rel.length) {
    out.push(`· 关键相位：${rel.map((a) => `${a.a}${a.nature}${a.b}`).join("、")}`);
  }

  // ⑤ 一句落地建议（取主导星座的正向用法）
  const dominant = bodies[0]?.sign || ctx.houseSigns[main - 1] || ctx.sun;
  const di = Math.max(0, SIGN_SHORT.indexOf(dominant));
  out.push(`小建议：${SIGN_GIFT[di]}。`);
  out.push("（星盘说的是倾向，怎么走还是你说了算✨）");

  return out.join("\n");
}

/* ===== 真实大模型接入点（DeepSeek / 豆包 等 OpenAI 兼容接口）=====
 * 使用方式：
 *   1. 把 enabled 改为 true；
 *   2. 在 LLM_CONFIG.apiKey 填入你的密钥（建议改为从 import.meta.env.VITE_LLM_API_KEY 读取，别写死在前端）；
 *   3. endpoint / model 按你选用的服务商调整（豆包用兼容 endpoint 即可）。
 * 不填密钥或接口异常时，会自动回退到上面的本地解读，界面始终有回应。 */
const LLM_CONFIG = {
  enabled: false,
  // 优先读环境变量 VITE_LLM_ENDPOINT；未设置则用 DeepSeek 默认地址
  endpoint:
    (typeof import.meta !== "undefined" && import.meta.env?.VITE_LLM_ENDPOINT) ||
    "https://api.deepseek.com/v1/chat/completions",
  // 优先读环境变量 VITE_LLM_API_KEY；也可直接在此粘贴（生产环境建议用环境变量，避免泄露）
  apiKey:
    (typeof import.meta !== "undefined" && import.meta.env?.VITE_LLM_API_KEY) || "",
  model: "deepseek-chat",
};

const SYSTEM_PROMPT =
  "你是一位温柔、懂占星的 AI 助手，结合用户提供的本命星盘数据（太阳/月亮/上升星座、星体落座落宫、宫头星座、相位）" +
  "用口语化、治愈的中文回答用户关于财运、事业、感情、学业、健康等方面的提问。" +
  "风格要求：先给一句结论，再用 2-4 条短要点展开，最后一句落地建议；" +
  "不要逐条复述宫位含义或星体资料原文（那是星盘弹窗的职责），要给出面向这个人的归纳与判断。" +
  "总长度控制在 200 字以内，只依据给定数据，不瞎编宫位；结尾加一句轻松的免责小注。\n" +
  "【强制约束】你必须严格依据下方 chart_json 字段解读，一切以数据为准：\n" +
  "· 若 chart_json 里某宫落「天蝎」，就必须回答天蝎，绝不允许凭空改成白羊或其他星座；\n" +
  "· 太阳/月亮/上升星座、各宫落座、星体落宫、相位，全部以 chart_json 的数值为准，禁止编造、禁止套用通用模板；\n" +
  "· 若 chart_json 为空（hasChart=false），如实告知用户先生成星盘，不要硬编。";

/**
 * 统一的对话入口：兜底本地、可切换远程。
 * @param history 完整对话历史（含刚加入的用户消息）
 * @param ctx     当前星盘结构化上下文
 */
export async function chatComplete(history: ChatMsg[], ctx: ChartCtx): Promise<string> {
  const lastUser = [...history].reverse().find((m) => m.role === "user")?.text ?? "";

  if (LLM_CONFIG.enabled && LLM_CONFIG.apiKey) {
    try {
      const sys =
        SYSTEM_PROMPT +
        "\n\nchart_json（必须严格据此解读，禁止捏造）：\n" +
        JSON.stringify(ctx, null, 2);
      const res = await fetch(LLM_CONFIG.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${LLM_CONFIG.apiKey}`,
        },
        body: JSON.stringify({
          model: LLM_CONFIG.model,
          messages: [
            { role: "system", content: sys },
            ...history.map((m) => ({ role: m.role, content: m.text })),
          ],
          temperature: 0.8,
        }),
      });
      const data = await res.json();
      const text: string =
        data?.choices?.[0]?.message?.content ?? data?.output ?? data?.reply ?? "";
      if (text) return text.trim();
    } catch {
      // 远程失败 → 兜底本地解读
    }
  }
  return localReply(lastUser, ctx);
}
