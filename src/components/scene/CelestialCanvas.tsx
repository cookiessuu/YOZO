/**
 * three.js 3D 天球画布 —— 预留挂载位。
 *
 * 依赖已就绪：three / @react-three/fiber / @react-three/drei / @react-three/postprocessing。
 * 下一步把本组件挂到 App（比如与 2D 星盘做 2D/3D 切换），在 <Canvas> 内搭建 3D 星盘，
 * 复用 src/data/chartData.ts 的 PLANETS 经纬度即可。
 * 注意：three 是命令式场景，初始化/销毁务必放进 useEffect / Canvas 生命周期内。
 */
export default function CelestialCanvas() {
  return (
    <div className="scene-placeholder">
      3D 天球画布（待接入）——
      已安装 three / fiber / drei / postprocessing
    </div>
  );
}
