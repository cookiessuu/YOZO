import { useCallback, useEffect, useMemo, useState } from "react";
import type { BirthInfo } from "./data/chartData";
import { PLANET_ITEMS } from "./data/planets";
import type { ComputedChart } from "./lib/swissephService";
import { computeChart, initSwisseph } from "./lib/swissephService";
import Backdrop from "./components/Backdrop";
import BirthForm from "./components/BirthForm";
import ControlPanel from "./components/ControlPanel";
import ChatFab from "./components/ChatFab";
import Wheel from "./components/Wheel";
import ReadingPanel from "./components/ReadingPanel";
import type { ReadingData } from "./lib/readingTypes";

// 预加载 WASM（+ 尽力加载完整星历以支持小行星）
initSwisseph().catch(() => {});

type Theme = "day" | "night";

export default function App() {
  const [theme, setTheme] = useState<Theme>("day");
  const [generated, setGenerated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState<BirthInfo | null>(null);
  const [chart, setChart] = useState<ComputedChart | null>(null);

  // 主题挂到根节点，全局 CSS 变量随 class 切换
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  // 可见星体（默认只开七曜主星）
  const [visible, setVisible] = useState<Set<string>>(
    () => new Set(PLANET_ITEMS.filter((p) => p.defaultOn).map((p) => p.key))
  );
  const [showAspects, setShowAspects] = useState(true);
  const [showAll, setShowAll] = useState(false);

  // 右侧解读面板的数据：由 Wheel 计算后 emit 上来，星盘中列本身不再渲染任何卡片。
  const [reading, setReading] = useState<ReadingData | null>(null);
  const [clearToken, setClearToken] = useState(0);
  // 必须稳定引用：Wheel 内部 useEffect 依赖 onReading，引用变动会导致无限循环。
  const handleReading = useCallback((data: ReadingData | null) => setReading(data), []);
  const handleCloseReading = useCallback(() => {
    setReading(null);
    setClearToken((t) => t + 1);
  }, []);

  const defaultKeys = useMemo(
    () => new Set(PLANET_ITEMS.filter((p) => p.defaultOn).map((p) => p.key)),
    []
  );

  function toggleBody(key: string, on: boolean) {
    setVisible((prev) => {
      const next = new Set(prev);
      if (on) next.add(key);
      else next.delete(key);
      return next;
    });
  }

  async function handleGenerate(next: BirthInfo) {
    setLoading(true);
    setError("");
    try {
      const result = await computeChart(next);
      setInfo(next);
      setChart(result);
      setGenerated(true);
      // 新盘默认回到「只开主星」，避免一下子太多星点
      setVisible(new Set(defaultKeys));
    } catch (err) {
      setError(err instanceof Error ? err.message : "星盘计算失败，请稍后重试。");
    } finally {
      setLoading(false);
    }
  }

  const parts = info
    ? [info.date.replace(/-/g, "."), info.time, info.city || chart?.location.label].filter(Boolean)
    : [];

  return (
    <>
      <Backdrop />

      <button
        type="button"
        className="theme-toggle"
        onClick={() => setTheme((t) => (t === "day" ? "night" : "day"))}
        aria-label="切换昼夜皮肤"
      >
        {/* 对当前模式吐槽：白天太亮想睡，夜晚被拉回白天才吐槽 */}
        {theme === "day" ? "好刺眼，我要睡觉" : "睡什么睡，太阳晒屁股了"}
      </button>

      {/* 顶部：品牌 + 出生信息表单，紧凑不遮挡下方三栏 */}
      <div className="birth-bar container">
        <div className="brandmark">
          <span className="brandmark-name">悠星盘</span>
          <span className="brandmark-en">YOZO</span>
        </div>
        <BirthForm loading={loading} error={error} onGenerate={handleGenerate} />
      </div>

      <main className="workspace container">
        <ControlPanel
          visible={visible}
          onToggleBody={toggleBody}
          showAspects={showAspects}
          onShowAspects={setShowAspects}
          showAll={showAll}
          onShowAll={setShowAll}
        />

        <section className="chart-zone" aria-label="星盘">
          <Wheel
            generated={generated}
            chart={chart}
            visible={visible}
            showAspects={showAspects}
            showAll={showAll}
            onReading={handleReading}
            clearToken={clearToken}
          />
          <p className="birthline" aria-live="polite">
            {info && chart && (
              <>
                出生 <b>{parts.length ? parts.join(" · ") : "（时间未知）"}</b>
                {" · "}
                Placidus · 显示 {chart.planets.filter((p) => p.ok && visible.has(p.key)).length}/
                {chart.planets.filter((p) => p.ok).length} 颗
              </>
            )}
          </p>
        </section>

        {/* 右侧常驻解读区：独立 Flex 子项，星盘中列宽度锁定，永不被挤压 */}
        <ReadingPanel
          reading={reading}
          generated={generated}
          onClose={handleCloseReading}
        />
      </main>

      <ChatFab chart={chart} visible={visible} theme={theme} />

      <footer className="foot container">
        <span>悠星盘 YOZO · 行星位置由 Swiss Ephemeris 计算；解读文案仅供娱乐</span>
      </footer>
    </>
  );
}
