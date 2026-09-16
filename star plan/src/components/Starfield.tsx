import { useMemo } from "react";

type Star = { cx: string; cy: string; r: number; o: number };
type Twinkle = Star & { halo: number; anim: string };

/** 整页深空星野：静谧星点 + 少量闪烁亮星 */
export default function Starfield() {
  const { stars, twinkles } = useMemo<{ stars: Star[]; twinkles: Twinkle[] }>(() => {
    const stars: Star[] = [];
    for (let i = 0; i < 170; i++) {
      stars.push({
        cx: Math.random() * 100 + "%",
        cy: Math.random() * 100 + "%",
        r: Math.random() * 1.1 + 0.25,
        o: Math.random() * 0.5 + 0.12,
      });
    }
    const twinkles: Twinkle[] = [];
    for (let j = 0; j < 14; j++) {
      const dur = (6 + Math.random() * 6).toFixed(1);
      const delay = (Math.random() * 8).toFixed(1);
      twinkles.push({
        cx: Math.random() * 100 + "%",
        cy: Math.random() * 100 + "%",
        r: Math.random() * 1.6 + 0.8,
        o: 0.85,
        halo: (Math.random() * 1.6 + 0.8) * 2.4,
        anim: `tw ${dur}s ease-in-out ${delay}s infinite`,
      });
    }
    return { stars, twinkles };
  }, []);

  return (
    <svg className="sky" aria-hidden="true">
      {stars.map((s, i) => (
        <circle key={"s" + i} cx={s.cx} cy={s.cy} r={s.r} opacity={s.o} />
      ))}
      {twinkles.map((t, i) => (
        <g key={"t" + i} style={{ animation: t.anim }}>
          <circle cx={t.cx} cy={t.cy} r={t.r} opacity={t.o} />
          <circle cx={t.cx} cy={t.cy} r={t.halo} opacity={0.18} />
        </g>
      ))}
    </svg>
  );
}
