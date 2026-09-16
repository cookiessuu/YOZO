import dayBg from "../assets/bg/day-bg.jpg";
import nightBg from "../assets/bg/night-bg.jpg";

/** 昼夜双主题动态背景：参考图本体打底（水彩天空 / 深空星云），
 *  动态元素只有白天的白鸽与夜晚的流星，位于星盘图层之下（z-index 0），数量克制 */
export default function Backdrop() {
  return (
    <div className="backdrop" aria-hidden="true">
      {/* 两个背景层，透明度交叉淡入淡出实现昼夜平滑过渡 */}
      <div className="bg-day" style={{ backgroundImage: `url(${dayBg})` }} />
      <div className="bg-night" style={{ backgroundImage: `url(${nightBg})` }} />

      {/* 白天专属：小白鸽群（7 只，剪影放大 1.2~1.5 倍、高低错落、缓慢滑翔） */}
      <div className="day-sky">
        {[
          { top: "12%", dur: "52s", delay: "0s", size: 44, op: 0.92 },
          { top: "26%", dur: "60s", delay: "6s", size: 34, op: 0.8 },
          { top: "8%", dur: "56s", delay: "13s", size: 40, op: 0.86 },
          { top: "37%", dur: "66s", delay: "20s", size: 30, op: 0.68 },
          { top: "19%", dur: "58s", delay: "27s", size: 37, op: 0.78 },
          { top: "32%", dur: "70s", delay: "34s", size: 27, op: 0.62 },
          { top: "45%", dur: "62s", delay: "41s", size: 32, op: 0.72 },
        ].map((d, i) => (
          <span
            key={"dove" + i}
            className="dove"
            style={{ top: d.top, opacity: d.op, animationDuration: d.dur, animationDelay: d.delay }}
          >
            <svg width={d.size} height={d.size * 0.6} viewBox="0 0 24 14">
              <path
                d="M1 9 Q6 1 12 7 Q18 1 23 9 Q16 7 12 11 Q8 7 1 9Z"
                fill="#ffffff"
                stroke="rgba(140,150,170,0.35)"
                strokeWidth="0.6"
              />
            </svg>
          </span>
        ))}
      </div>

      {/* 夜晚专属：流星（8 颗，更长光尾 + 渐变透明、错峰划落） */}
      <div className="night-sky">
        <span className="meteor m-1" />
        <span className="meteor m-2" />
        <span className="meteor m-3" />
        <span className="meteor m-4" />
        <span className="meteor m-5" />
        <span className="meteor m-6" />
        <span className="meteor m-7" />
        <span className="meteor m-8" />
      </div>
    </div>
  );
}
