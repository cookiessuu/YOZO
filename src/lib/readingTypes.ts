/** 解读数据的传输结构：由 Wheel 计算后 emit 给右侧 ReadingPanel 渲染。
 *  这样解读内容不再渲染在星盘中列内，彻底避免挤压/位移星盘。 */
export type ReadingLine = {
  /** 可选加粗小标题，如「原型」「落座解读」 */
  label?: string;
  text: string;
};

export type ReadingData = {
  key: string;
  kind: "house" | "planet" | "aspect";
  /** 主标题 */
  title: string;
  /** 副标题（落座落宫 / 落入行星） */
  sub?: string;
  /** 落位信息条（位于第 N 宫 · 星座 X°Y′） */
  place?: string;
  lines: ReadingLine[];
  /** 数据待补时的提示 */
  empty?: string;
  /** 宫位解读：宫头星座序号，用于渲染星座小图 */
  headSign?: number;
  /** 星体解读：字符与颜色，用于渲染迷你星体球 */
  planetChar?: string;
  planetColor?: string;
};
