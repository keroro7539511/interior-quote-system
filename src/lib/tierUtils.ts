/**
 * 產生等差級距陣列 @see 規格 3.1
 */
export function generateArithmeticTiers(start: number, step: number, end: number): number[] {
  const tiers: number[] = [];
  for (let v = start; v <= end; v += step) {
    tiers.push(v);
  }
  return tiers;
}

/**
 * 找出 ceiling tier 與超尺寸比例 @see 規格 4.1
 */
export function findCeilingTier(
  value: number,
  tiers: number[]
): { tier: number; ratio: number; exceeded: boolean } {
  const sorted = [...tiers].sort((a, b) => a - b);
  const maxTier = sorted[sorted.length - 1];

  if (value > maxTier) {
    return { tier: maxTier, ratio: value / maxTier, exceeded: true };
  }

  const tier = sorted.find(t => t >= value)!;
  return { tier, ratio: 1, exceeded: false };
}
