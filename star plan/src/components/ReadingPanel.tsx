// 右侧常驻解读面板：workspace 的第三个 Flex 子项。
// 解读内容渲染在这里，星盘中列内部不再产生任何 DOM 内容
// → 星盘宽度恒定、位置永不被挤压位移（这是修复「星盘跑路」的核心）。
import type { ReadingData } from "../lib/readingTypes";
import { shade } from "../lib/color";
import { SignThumb } from "./CenterSignAvatar";

type Props = {
  reading: ReadingData | null;
  generated: boolean;
  onClose: () => void;
};

export default function ReadingPanel({ reading, generated, onClose }: Props) {
  return (
    <section className="reading-zone" aria-label="详细解读">
      {reading ? (
        <article className="reading-card" key={reading.key}>
          <button type="button" className="card-close" onClick={onClose} aria-label="关闭解读">
            ✕
          </button>
          <h3>
            {reading.headSign !== undefined && (
              <SignThumb sign={reading.headSign} className="rc-sign-img" />
            )}
            {reading.planetChar && (
              <span
                className="head-dot"
                style={{
                  background: `radial-gradient(circle at 35% 30%, ${shade(
                    reading.planetColor ?? "#c4b89e",
                    45
                  )}, ${reading.planetColor ?? "#c4b89e"} 60%, ${shade(
                    reading.planetColor ?? "#c4b89e",
                    -30
                  )})`,
                }}
              >
                {reading.planetChar}
              </span>
            )}
            {reading.title}
          </h3>
          {reading.sub && <p className="rc-sub">{reading.sub}</p>}
          {reading.place && <p className="rc-place">{reading.place}</p>}
          {reading.lines.map((l, i) => (
            <p className="rc-text" key={`${reading.key}-l-${i}`}>
              {l.label ? <b>{l.label}：</b> : null}
              {l.text}
            </p>
          ))}
          {reading.empty && <p className="rc-empty">{reading.empty}</p>}
        </article>
      ) : (
        <div className="reading-empty">
          <span className="reading-empty-icon" aria-hidden="true">
            ✧
          </span>
          <p>
            {generated
              ? "点击盘面上的宫位、星体或相位连线，这里会显示详细解读"
              : "填写出生信息生成星盘后，点击宫位即可查看解读"}
          </p>
        </div>
      )}
    </section>
  );
}
