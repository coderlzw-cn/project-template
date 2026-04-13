// 百分比
export function formatPercentage(num: number, precision: number = 2) {
  return (num * 100).toFixed(precision) + '%';
}
