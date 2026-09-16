// 守护兽图鉴：太阳星座 → 中间守护兽形象。
// 透明 PNG 位于 src/assets/friends/，新增动物：放图 + 加一行即可。
import aries from "../assets/friends/aries.png";
import taurus from "../assets/friends/taurus.png";
import gemini from "../assets/friends/gemini.png";
import cancer from "../assets/friends/cancer.png";
import leo from "../assets/friends/leo.png";
import virgo from "../assets/friends/virgo.png";
import libra from "../assets/friends/libra.png";
import scorpio from "../assets/friends/scorpio.png";
import sagittarius from "../assets/friends/sagittarius.png";
import capricorn from "../assets/friends/capricorn.png";
import aquarius from "../assets/friends/aquarius.png";
import pisces from "../assets/friends/pisces.png";

export type Friend = {
  name: string; // 守护兽名
  tagline: string; // 一句话性格
  src: string; // 透明立绘图
};

/** 索引 = 星座序号 0-11（0=白羊），与 chart.planets[].sign 对齐 */
export const FRIENDS_BY_SIGN: Friend[] = [
  { name: "赤焰羚羊", tagline: "性子又冲又暖，爱抢第一个", src: aries },
  { name: "苔原小牛", tagline: "慢慢来，草要一口一口吃", src: taurus },
  { name: "面具浣熊", tagline: "一只顶俩，话匣子关不上", src: gemini },
  { name: "围裙仓鼠", tagline: "窝里囤满了分给大家的点心", src: cancer },
  { name: "披风小狮", tagline: "台灯一开，全场都是舞台", src: leo },
  { name: "眼镜河狸", tagline: "图纸要对齐，木头不将就", src: virgo },
  { name: "丝巾天鹅", tagline: "优雅是本能，选杯子要十分钟", src: libra },
  { name: "斗篷小蛇", tagline: "安静盘着，什么都看在眼里", src: scorpio },
  { name: "背包柴犬", tagline: "地图还没画完，先出发再说", src: sagittarius },
  { name: "登山山羊", tagline: "山顶不远，一步一个蹄印", src: capricorn },
  { name: "护目小鸮", tagline: "灵感来的时候，别挡着电流", src: aquarius },
  { name: "贝雷水獭", tagline: "梦泡进水里，也能画出颜色", src: pisces },
];
