// 右下角昼夜浮动球体（替代原右侧固定面板）。
// · 默认只显示球体；点击弹出毛玻璃对话窗。
// · 支持鼠标 / 触屏拖拽移动（pointer events + setPointerCapture），位置存 localStorage，松开停留。
// · 图标按主题极简化重绘：白天=发光太阳(#FFD93D 主体 + #FFE566 圆润短光芒)，
//   夜晚=发光月牙(#C5B7FF 本体 + #E0D6FF 柔光)。两者沿用 || 竖线眼 + 爱心腮红，保持治愈统一。
// · 每次提问都基于当前星盘重新 buildChartContext 注入 chart_json（等价全局快照，禁止写死）。
import { useEffect, useRef, useState } from "react";
import type { ComputedChart } from "../lib/swissephService";
import { buildChartContext, chatComplete, type ChatMsg } from "../lib/aiChat";

type Props = {
  chart: ComputedChart | null;
  visible: Set<string>;
  theme: "day" | "night";
};

const SP = 84; // 球体直径（80~90px 区间）
const SUGGESTIONS = ["我的财运如何？", "事业运怎样？", "最近感情运势？", "我的性格特点？"];

const GREETING =
  "我是悠悠，你的星盘小助手 ✨ 生成星盘后，我会结合你的太阳 / 月亮 / 上升星座、星体落宫与相位来解读。\n" +
  "试试问我：「我的财运如何」「事业运怎样」「最近感情运势」「我的性格特点」。";

const HEART =
  "M12 21C7 17 2 13 2 8.5 2 6 4 4 6.3 4 8 4 9.5 5 12 7.5 14.5 5 16 4 17.7 4 20 6 20 8.5 20 13 15 17 12 21Z";

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

function initialPos(): { x: number; y: number } {
  if (typeof window === "undefined") return { x: 40, y: 40 };
  try {
    const s = localStorage.getItem("fab-pos");
    if (s) {
      const p = JSON.parse(s);
      if (p && typeof p.x === "number" && typeof p.y === "number") return p;
    }
  } catch {
    /* ignore */
  }
  return { x: Math.max(8, window.innerWidth - SP - 30), y: Math.max(8, window.innerHeight - SP - 30) };
}

export default function ChatFab({ chart, visible, theme }: Props) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([{ role: "ai", text: GREETING }]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [pos, setPos] = useState<{ x: number; y: number }>(initialPos);
  const [dragging, setDragging] = useState(false);
  const drag = useRef<{ sx: number; sy: number; px: number; py: number; moved: boolean } | null>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = bodyRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  async function send(text: string) {
    const q = text.trim();
    if (!q || busy) return;
    const next: ChatMsg[] = [...messages, { role: "user", text: q }];
    setMessages(next);
    setInput("");
    if (taRef.current) taRef.current.style.height = "auto";
    setBusy(true);
    try {
      // 每次请求都基于当前星盘重新抓取快照注入 prompt（等价全局状态，禁止写死）
      const ctx = buildChartContext(chart, visible);
      const reply = await chatComplete(next, ctx);
      setMessages([...next, { role: "ai", text: reply }]);
    } catch {
      setMessages([...next, { role: "ai", text: "（我刚才开小差了，再问一次试试～）" }]);
    } finally {
      setBusy(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  }

  function autoGrow(e: React.FormEvent<HTMLTextAreaElement>) {
    const el = e.currentTarget;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 96) + "px";
  }

  /* ---------- 拖拽（pointer events 统一鼠标 + 触屏）---------- */
  function onPointerDown(e: React.PointerEvent<HTMLButtonElement>) {
    drag.current = { sx: e.clientX, sy: e.clientY, px: pos.x, py: pos.y, moved: false };
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
  }
  function onPointerMove(e: React.PointerEvent<HTMLButtonElement>) {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.sx;
    const dy = e.clientY - d.sy;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) d.moved = true;
    setPos({
      x: clamp(d.px + dx, 4, window.innerWidth - SP - 4),
      y: clamp(d.py + dy, 4, window.innerHeight - SP - 4),
    });
  }
  function onPointerUp() {
    const d = drag.current;
    drag.current = null;
    setDragging(false);
    if (!d) return;
    if (!d.moved) setOpen((o) => !o); // 未移动 = 点击，切换展开/收起
    try {
      localStorage.setItem("fab-pos", JSON.stringify(pos));
    } catch {
      /* ignore */
    }
  }

  // 对话窗锚定在球体上方（拖拽时跟随球体）
  const winLeft = clamp(pos.x - 150, 8, Math.max(8, window.innerWidth - 348));
  const winBottom = clamp(window.innerHeight - pos.y + 18, 8, window.innerHeight - 120);

  return (
    <>
      {open && <div className="fab-overlay" onClick={() => setOpen(false)} aria-hidden="true" />}

      <div
        className={"fab-window" + (open ? " open" : "")}
        role="dialog"
        aria-label="AI 星盘对话"
        aria-hidden={!open}
        style={{ left: winLeft, bottom: winBottom }}
      >
        <div className="fab-head">
          <h2>悠悠小助手</h2>
          <span className="fab-status">{busy ? "解读中…" : "已就绪"}</span>
          <button type="button" className="fab-close" onClick={() => setOpen(false)} aria-label="收起">
            ✕
          </button>
        </div>

        <div className="fab-body" ref={bodyRef}>
          {messages.length === 0 && (
            <p className="fab-empty">生成星盘后，问问你的财运、事业、感情或性格吧～</p>
          )}
          {messages.map((m, i) => (
            <div key={i} className={"msg " + (m.role === "user" ? "msg-user" : "msg-ai")}>
              {m.text}
            </div>
          ))}
        </div>

        <div className="fab-suggest">
          {SUGGESTIONS.map((s) => (
            <button key={s} type="button" className="fab-chip" onClick={() => send(s)} disabled={busy}>
              {s}
            </button>
          ))}
        </div>

        <div className="fab-input">
          <textarea
            ref={taRef}
            rows={1}
            value={input}
            placeholder="问我点什么，比如「我的财运如何」"
            onChange={(e) => setInput(e.target.value)}
            onInput={autoGrow}
            onKeyDown={onKeyDown}
          />
          <button
            type="button"
            className="fab-send"
            onClick={() => send(input)}
            disabled={busy || !input.trim()}
            aria-label="发送"
          >
            ↑
          </button>
        </div>
      </div>

      <button
        type="button"
        className={"fab-sphere " + theme + (dragging ? " dragging" : "")}
        style={{ left: pos.x, top: pos.y }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        aria-label="打开星盘小助手"
      >
        <svg viewBox="0 0 100 100" className="fab-face" aria-hidden="true">
          <defs>
            {/* 月牙挖法：先整体显示，再挖掉右上角一个偏移圆 → 得到圆润的 C 形月牙 */}
            <mask id="fab-moon-cut" maskUnits="userSpaceOnUse" x="0" y="0" width="100" height="100">
              <rect x="0" y="0" width="100" height="100" fill="#fff" />
              <circle cx="86" cy="30" r="34" fill="#000" />
            </mask>
          </defs>

          {/* 白天：暖黄发光太阳（圆润主体 + 12 条圆润短光芒 + || 眼 + 粉心腮红） */}
          <g className="fab-day-group">
            {Array.from({ length: 12 }, (_, i) => {
              const a = (Math.PI * 2 * i) / 12;
              const r1 = 33;
              const r2 = 44;
              return (
                <line
                  key={"ray" + i}
                  className="fab-sun-ray"
                  x1={50 + r1 * Math.cos(a)}
                  y1={50 + r1 * Math.sin(a)}
                  x2={50 + r2 * Math.cos(a)}
                  y2={50 + r2 * Math.sin(a)}
                />
              );
            })}
            <circle className="fab-sun-core" cx="50" cy="50" r="30" />
            <line className="fab-eye" x1="41" y1="44" x2="41" y2="52" />
            <line className="fab-eye" x1="59" y1="44" x2="59" y2="52" />
            <path className="fab-blush" transform="translate(27.5 50) scale(0.5)" d={HEART} />
            <path className="fab-blush" transform="translate(61.5 50) scale(0.5)" d={HEART} />
          </g>

          {/* 夜晚：淡紫发光月牙（C 形）+ || 眼 + 粉心腮红 */}
          <g className="fab-night-group">
            <circle className="fab-moon-glow" cx="50" cy="50" r="45" />
            <circle
              className="fab-moon-core"
              cx="50"
              cy="50"
              r="40"
              mask="url(#fab-moon-cut)"
            />
            <line className="fab-eye" x1="34" y1="44" x2="34" y2="52" />
            <line className="fab-eye" x1="51" y1="44" x2="51" y2="52" />
            <path className="fab-blush" transform="translate(21.5 51) scale(0.5)" d={HEART} />
            <path className="fab-blush" transform="translate(52.5 51) scale(0.5)" d={HEART} />
          </g>
        </svg>
      </button>
    </>
  );
}
