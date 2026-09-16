import { useEffect, useRef, useState } from "react";
import type { ComputedChart } from "../lib/swissephService";
import { buildChartContext, chatComplete, type ChatMsg } from "../lib/aiChat";

type Props = {
  chart: ComputedChart | null;
  visible: Set<string>;
};

const SUGGESTIONS = ["我的财运如何？", "事业运怎样？", "最近感情运势？", "我的性格特点？"];

const GREETING =
  "我是悠悠，你的星盘小助手 ✨ 生成星盘后，我会结合你的太阳 / 月亮 / 上升星座、星体落宫与相位来解读。\n" +
  "试试问我：「我的财运如何」「事业运怎样」「最近感情运势」「我的性格特点」。";

export default function ChatPanel({ chart, visible }: Props) {
  const [messages, setMessages] = useState<ChatMsg[]>([{ role: "ai", text: GREETING }]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  // 新消息自动滚到底
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

  return (
    <aside className="chat-panel" aria-label="AI 星盘对话">
      <div className="chat-head">
        <svg className="chat-avatar" viewBox="0 0 24 24" aria-hidden="true">
          <defs>
            <linearGradient id="chatAv" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#f0d49b" />
              <stop offset="1" stopColor="#e8c77e" />
            </linearGradient>
          </defs>
          <circle cx="12" cy="12" r="11" fill="url(#chatAv)" opacity="0.18" />
          <path
            d="M12 4c.7 3.4 1.6 4.3 5 5-3.4.7-4.3 1.6-5 5-.7-3.4-1.6-4.3-5-5 3.4-.7 4.3-1.6 5-5z"
            fill="url(#chatAv)"
          />
        </svg>
        <h2>悠悠小助手</h2>
        <span className="chat-status">{busy ? "解读中…" : "已就绪"}</span>
      </div>

      <div className="chat-body" ref={bodyRef}>
        {messages.length === 0 && (
          <p className="chat-empty">生成星盘后，问问你的财运、事业、感情或性格吧～</p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={"msg " + (m.role === "user" ? "msg-user" : "msg-ai")}>
            {m.text}
          </div>
        ))}
      </div>

      <div className="chat-suggest">
        {SUGGESTIONS.map((s) => (
          <button key={s} type="button" className="chat-chip" onClick={() => send(s)} disabled={busy}>
            {s}
          </button>
        ))}
      </div>

      <div className="chat-input">
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
          className="chat-send"
          onClick={() => send(input)}
          disabled={busy || !input.trim()}
          aria-label="发送"
        >
          ↑
        </button>
      </div>
    </aside>
  );
}
