// ===== 全站唯一配色来源（治愈系星空 · 夜幕 + 暖光）=====
// 页面背景 / 卡片 / 星盘 / 相位线颜色都从这里取，禁止在组件里散落硬编码。

/* —— 夜空背景（页面渐变）—— */
export const SKY_TOP = "#1a1a3e";
export const SKY_BOTTOM = "#2d2b55";

/* —— 强调色 —— */
export const GOLD = "#e8c77e"; // 暖金香槟（主强调）
export const GOLD_SOFT = "#f0d49b"; // 浅金
export const CREAM = "#f5f0e6"; // 米白（文字）

/* —— 星盘盘面 —— */
export const DISK_FILL = "#221f4d"; // 盘面底色（深夜紫）
export const DISK_STROKE = "rgba(232,199,125,0.5)"; // 外圈柔金细描边
export const HOUSE_A = "rgba(232,199,125,0.07)"; // 宫位两色 A（暖金雾）
export const HOUSE_B = "rgba(167,191,216,0.07)"; // 宫位两色 B（月光蓝雾）
export const HOUSE_STROKE = "rgba(245,240,230,0.14)"; // 宫位扇形描边
export const CUSP_LINE = "rgba(245,240,230,0.22)"; // 宫位分隔线
export const ZODIAC_COLOR = "rgba(207,196,232,0.5)"; // 星座符号
export const HOUSE_NUM_COLOR = "rgba(245,240,230,0.55)"; // 宫位数字

/* —— 相位线（半透明莫兰迪，按相位类型区分）—— */
export const ASPECT_HARMONY = "rgba(143,184,154,0.6)"; // 三分/六分 · 柔绿
export const ASPECT_TENSION = "rgba(217,154,140,0.6)"; // 四分/对分 · 陶红
export const ASPECT_CONJ = "rgba(212,184,106,0.65)"; // 合相 · 暖金
export const ASPECT_MINOR = "rgba(200,188,160,0.38)"; // 次要相位 · 淡沙
