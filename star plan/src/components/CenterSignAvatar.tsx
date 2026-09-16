// 星盘中心拟人形象：HTML <img> 绝对定位叠在 SVG 星盘中心上方。
// 用户提供的已是透明底 PNG —— 直接渲染，绝不包圆角/边框容器、不设任何实色背景。
// 尺寸由 CSS 百分比驱动（width:20% of stage ≈ 152 viewBox 单位 = 内圈半径 318 的 47.8%），
// 落在 45%~52% 区间内，且随窗口等比缩放；不遮挡相位连线、宫位弧线文字与刻度。
// 边缘处理：仅用 mask-image: radial-gradient 做极淡羽化，与星盘自然融合。
import { useState } from "react";
import { ZODIAC_SIGN_IMG, ZODIAC_SIGNS } from "../data/zodiacSignMap";

export default function CenterSignAvatar({ sign }: { sign: number }) {
  const safeSign = Math.max(0, Math.min(11, sign));
  const src = ZODIAC_SIGN_IMG[safeSign] ?? "";
  const signInfo = ZODIAC_SIGNS[safeSign];
  const [error, setError] = useState(false);
  const showFallback = !src || error;

  return (
    <div className="center-avatar-wrap" aria-label={`${signInfo.cn}座拟人`}>
      {showFallback ? (
        <span className="center-avatar-fallback">{signInfo.cn}</span>
      ) : (
        <img
          className="center-avatar-img"
          src={src}
          alt={signInfo.cn}
          draggable={false}
          onError={() => setError(true)}
        />
      )}
    </div>
  );
}

/** 弹窗头部的迷你落座小图 */
export function SignThumb({ sign, className }: { sign: number; className?: string }) {
  const safeSign = Math.max(0, Math.min(11, sign));
  const src = ZODIAC_SIGN_IMG[safeSign] ?? "";
  return <img className={className || "rc-sign-img"} src={src} alt="" />;
}
