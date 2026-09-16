import { type CSSProperties } from "react";
import { PLANET_ITEMS, type PlanetItem } from "../data/planets";

type Props = {
  visible: Set<string>;
  onToggleBody: (key: string, on: boolean) => void;
  showAspects: boolean;
  onShowAspects: (on: boolean) => void;
  showAll: boolean;
  onShowAll: (on: boolean) => void;
};

const GROUPS: Array<{ key: PlanetItem["group"]; label: string }> = [
  { key: "main", label: "七曜 · 主星" },
  { key: "outer", label: "外行星" },
  { key: "extra", label: "小行星 · 交点 · 莉莉丝" },
];


function Switch({
  on,
  label,
  onToggle,
}: {
  on: boolean;
  label: string;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      className={"switch" + (on ? " on" : "")}
      onClick={onToggle}
    >
      <span className="knob" />
    </button>
  );
}

export default function ControlPanel({
  visible,
  onToggleBody,
  showAspects,
  onShowAspects,
  showAll,
  onShowAll,
}: Props) {
  return (
    <aside className="control-panel" aria-label="星体与相位开关">
      <h2>星盘控制</h2>

      <div className="cp-block">
        <div className="cp-row">
          <span className="cp-label">相位连线</span>
          <Switch
            on={showAspects}
            label="相位连线"
            onToggle={() => onShowAspects(!showAspects)}
          />
        </div>
        <div className="cp-row">
          <span className="cp-label">显示所有相位</span>
          <Switch
            on={showAll}
            label="显示所有相位（含次要相位）"
            onToggle={() => onShowAll(!showAll)}
          />
        </div>
        <p className="cp-hint">
          {showAll ? "当前显示：主相位 + 次要相位" : "当前显示：仅主相位（合/六分/四分/三分/对分）"}
        </p>
      </div>

      {GROUPS.map((g) => {
        const items = PLANET_ITEMS.filter((p) => p.group === g.key);
        return (
          <div className="cp-group" key={g.key}>
            <h3>{g.label}</h3>
            {items.map((p) => {
              const on = visible.has(p.key);
              return (
                <div className="cp-row" key={p.key}>
                  <span className="dot orb" style={{ "--pg": p.color } as CSSProperties}>
                    {p.char}
                  </span>
                  <span className="cp-name">{p.name}</span>
                  <Switch
                    on={on}
                    label={`${p.name}显示开关`}
                    onToggle={() => onToggleBody(p.key, !on)}
                  />
                </div>
              );
            })}
          </div>
        );
      })}
    </aside>
  );
}
