import { useEffect, useRef } from "react";
import type { Planet } from "../data/chartData";
import { getPlanetReading, SIGN_SHORT } from "../lib/interpretation";
import { signDegree } from "../lib/placement";
import { mod } from "../lib/chartMath";

type Props = {
  planet: Planet;
  houseCuspsWheel: number[]; // 十二宫起始刻度（星盘坐标）
  onClose: () => void;
};

function houseOfWheel(deg: number, cw: number[]): number {
  for (let i = 0; i < 12; i++) {
    const span = mod(cw[(i + 1) % 12] - cw[i], 360);
    if (mod(deg - cw[i], 360) < span) return i;
  }
  return 0;
}

export default function PlanetModal({ planet, houseCuspsWheel, onClose }: Props) {
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const prevFocus = useRef<Element | null>(null);

  const signIdx = Math.floor(mod(planet.eclipticLon ?? 0, 360) / 30);
  const houseIdx = houseOfWheel(planet.deg, houseCuspsWheel);
  const r = getPlanetReading(planet.name, signIdx, houseIdx + 1);

  useEffect(() => {
    prevFocus.current = document.activeElement;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      if (prevFocus.current instanceof HTMLElement) prevFocus.current.focus();
    };
  }, [onClose]);

  return (
    <div
      className="modal on"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modalTitle"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-card">
        <button ref={closeRef} className="modal-close" aria-label="关闭" onClick={onClose}>
          ×
        </button>
        <p className="modal-eyebrow">LUMINARY · {planet.en.toUpperCase()}</p>
        <h3 id="modalTitle">{planet.name}</h3>
        <p className="modal-place">
          {SIGN_SHORT[signIdx]}座 · 第{houseIdx + 1}宫
        </p>
        <p className="modal-place sub">
          {planet.name}位于第 {houseIdx + 1} 宫 · {signDegree(planet.eclipticLon ?? 0)}
        </p>
        <hr className="modal-rule" />
        <p className="reading">
          <b>原型：</b>
          {r.原型}
        </p>
        <p className="reading">
          <b>落座解读：</b>
          {r.落座解读}
        </p>
        <p className="reading">
          <b>落宫解读：</b>
          {r.落宫解读}
        </p>
        <p className="reading last">
          <b>综合解读：</b>
          {r.综合解读}
        </p>
        <p className="modal-flag">行星位置由 Swiss Ephemeris 计算；解读文案仅供娱乐，不构成任何建议。</p>
      </div>
    </div>
  );
}
