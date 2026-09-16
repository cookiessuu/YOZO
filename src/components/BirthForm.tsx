import { useState, type FormEvent } from "react";
import type { BirthInfo } from "../data/chartData";

type Props = {
  loading: boolean;
  error: string;
  onGenerate: (info: BirthInfo) => void;
};

export default function BirthForm({ loading, error, onGenerate }: Props) {
  const [date, setDate] = useState("1990-07-05");
  const [time, setTime] = useState("14:30");
  const [city, setCity] = useState("");
  const [msg, setMsg] = useState("");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!date) {
      setMsg("请先选择你的出生日期。");
      return;
    }
    setMsg("");
    onGenerate({ date, time, city: city.trim() });
  }

  return (
    <section className="form-panel" aria-label="出生信息">
      <h2>出生信息</h2>
      <p className="panel-note">
        填写日期与时间；城市用于计算宫位（支持常见中国城市，未知城市将尝试在线查询）。
      </p>
      <form onSubmit={handleSubmit} noValidate>
        <div className="field">
          <label htmlFor="fDate">出生日期</label>
          <input
            id="fDate"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            autoFocus
            disabled={loading}
          />
        </div>
        <div className="field">
          <label htmlFor="fTime">出生时间</label>
          <input
            id="fTime"
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            disabled={loading}
          />
        </div>
        <div className="field">
          <label htmlFor="fCity">出生城市</label>
          <input
            id="fCity"
            type="text"
            value={city}
            placeholder="例如：杭州"
            autoComplete="off"
            onChange={(e) => setCity(e.target.value)}
            disabled={loading}
          />
        </div>
        <button className="cta" type="submit" disabled={loading}>
          {loading ? "计算中…" : "生成星盘"}
        </button>
      </form>
      <p
        className="form-msg"
        role="status"
        aria-hidden={msg || error ? "false" : "true"}
      >
        {msg || error}
      </p>
    </section>
  );
}
