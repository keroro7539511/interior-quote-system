import type { CategoryConfig, ComponentCalcResult, ComponentSpec } from '../types';
import { findCeilingTier } from './tierUtils';

export interface ComponentCalcInput {
  W: number;
  H: number;
  D: number;
  quantity: number;
  multiplier: number;
}

/**
 * 計算單一元件的報價
 * @see 規格 4.1 ~ 4.4
 * @throws Error 若 flat 元件未設 flatPrice，或矩陣元件矩陣完全為空
 */
export function calculateComponent(
  input: ComponentCalcInput,
  component: ComponentSpec,
  category: CategoryConfig
): ComponentCalcResult {
  const { W, H, D, quantity, multiplier } = input;
  const dimW = category.dimensions.find(d => d.key === 'W')!;
  const dimH = category.dimensions.find(d => d.key === 'H')!;
  const dimD = category.dimensions.find(d => d.key === 'D')!;

  // flat 型元件 @see 規格 4.2.B
  if (component.type === 'flat') {
    if (component.flatPrice === undefined || component.flatPrice === null) {
      throw new Error(`元件「${component.name}」尚未設定單價`);
    }
    const unitPrice = component.flatPrice * multiplier;
    return {
      componentId: component.id,
      componentName: component.name,
      componentType: 'flat',
      quantity,
      matched: {
        tier: {},
        basePrice: component.flatPrice,
        isFallback: false,
      },
      ratio: { factors: {}, R: 1 },
      unitPriceBeforeMultiplier: component.flatPrice,
      unitPrice,
      lineSubtotal: Math.round(unitPrice * quantity),
    };
  }

  // 矩陣型元件 @see 規格 4.2.A
  const prices = component.prices ?? {};
  const entries = Object.entries(prices).filter(([, v]) => v !== undefined && v !== null) as [string, number][];
  if (entries.length === 0) {
    throw new Error(`元件「${component.name}」矩陣完全為空，請先填入至少一筆資料`);
  }

  const cW = findCeilingTier(W, dimW.tierValues);
  const cH = findCeilingTier(H, dimH.tierValues);
  const cD = findCeilingTier(D, dimD.tierValues);

  let key: string;
  let usedDims: ('W' | 'H' | 'D')[];
  if (component.type === 'body') {
    key = `${cW.tier}:${cH.tier}:${cD.tier}`;
    usedDims = ['W', 'H', 'D'];
  } else if (component.type === 'door') {
    key = `${cW.tier}:${cH.tier}`;
    usedDims = ['W', 'H'];
  } else {
    // shelf
    key = `${cW.tier}:${cD.tier}`;
    usedDims = ['W', 'D'];
  }

  const tierMap: Record<string, { tier: number; ratio: number }> = {
    W: cW,
    H: cH,
    D: cD,
  };

  // 查找基礎價格
  let basePrice: number;
  let isFallback = false;
  let fallbackKind: 'cell-empty' | 'beyond-all' | undefined;
  let ratioOverrideDims: Partial<Record<'W' | 'H' | 'D', number>> | null = null;

  if (prices[key] !== undefined) {
    basePrice = prices[key];
  } else {
    // 保守 fallback：找所有相關維度中 W(>=W_tier)、H(>=H_tier) 的儲存格；D 不參與過濾
    const wTier = cW.tier;
    const hTier = cH.tier;

    const candidates = entries.filter(([k]) => {
      const parts = k.split(':');
      if (component.type === 'body') {
        // W:H:D — 只檢查 W 和 H
        return Number(parts[0]) >= wTier && Number(parts[1]) >= hTier;
      } else if (component.type === 'door') {
        // W:H
        return Number(parts[0]) >= wTier && Number(parts[1]) >= hTier;
      } else {
        // shelf W:D — 只檢查 W
        return Number(parts[0]) >= wTier;
      }
    });

    if (candidates.length > 0) {
      // cell-empty fallback: take minimum price
      const min = candidates.reduce((a, b) => a[1] < b[1] ? a : b);
      basePrice = min[1];
      isFallback = true;
      fallbackKind = 'cell-empty';
    } else {
      // beyond-all: find best reference cell and use its dims as effective max
      isFallback = true;
      fallbackKind = 'beyond-all';

      let refEntry: [string, number];

      if (component.type === 'door') {
        // For doors, find the max H in the table, then pick the ceiling-W entry at that max H.
        // This gives the correct base price for the given width when only H exceeds the table.
        const maxH = Math.max(...entries.map(([k]) => Number(k.split(':')[1])));
        const atMaxH = entries.filter(([k]) => {
          const parts = k.split(':');
          return Number(parts[1]) === maxH && Number(parts[0]) >= cW.tier;
        });
        if (atMaxH.length > 0) {
          // pick minimum W at max H (ceiling match for width)
          refEntry = atMaxH.reduce((a, b) =>
            Number(a[0].split(':')[0]) <= Number(b[0].split(':')[0]) ? a : b
          );
        } else {
          refEntry = entries.reduce((a, b) => a[1] > b[1] ? a : b);
        }
      } else {
        refEntry = entries.reduce((a, b) => a[1] > b[1] ? a : b);
      }

      basePrice = refEntry[1];
      // compute effective ratio based on reference cell's dims
      const maxParts = refEntry[0].split(':');
      const effectiveDimValues: Partial<Record<'W' | 'H' | 'D', number>> = {};
      if (component.type === 'body') {
        effectiveDimValues.W = Number(maxParts[0]);
        effectiveDimValues.H = Number(maxParts[1]);
        effectiveDimValues.D = Number(maxParts[2]);
      } else if (component.type === 'door') {
        effectiveDimValues.W = Number(maxParts[0]);
        effectiveDimValues.H = Number(maxParts[1]);
      } else {
        effectiveDimValues.W = Number(maxParts[0]);
        effectiveDimValues.D = Number(maxParts[1]);
      }
      ratioOverrideDims = effectiveDimValues;
    }
  }

  // 計算超尺寸比例 @see 規格 4.3
  const inputMap: Record<string, number> = { W, H, D };
  const factors: Partial<Record<'W' | 'H' | 'D', number>> = {};
  let R = 1;

  for (const dim of usedDims) {
    let effectiveMax: number;
    if (ratioOverrideDims && ratioOverrideDims[dim] !== undefined) {
      effectiveMax = ratioOverrideDims[dim]!;
    } else {
      effectiveMax = tierMap[dim].tier;
    }
    const f = Math.max(1, inputMap[dim] / effectiveMax);
    factors[dim] = f;
    R *= f;
  }

  const tierResult: Partial<Record<'W' | 'H' | 'D', number>> = {};
  for (const dim of usedDims) {
    tierResult[dim] = tierMap[dim].tier;
  }

  const unitPriceBeforeMultiplier = basePrice * R;
  const unitPrice = unitPriceBeforeMultiplier * multiplier;
  const lineSubtotal = Math.round(unitPrice * quantity);

  return {
    componentId: component.id,
    componentName: component.name,
    componentType: component.type,
    quantity,
    matched: {
      tier: tierResult,
      basePrice,
      isFallback,
      fallbackKind,
    },
    ratio: { factors, R },
    unitPriceBeforeMultiplier,
    unitPrice,
    lineSubtotal,
  };
}

/**
 * 計算單一品項（主體 + 加購）
 * @see 規格 4.5
 */
export function calculateQuoteItem(input: {
  category: CategoryConfig;
  bodyComponent: ComponentSpec;
  addons: Array<{ component: ComponentSpec; quantity: number }>;
  W: number;
  H: number;
  D: number;
  multiplier: number;
}): { body: ComponentCalcResult; addons: ComponentCalcResult[]; itemSubtotal: number } {
  const { category, bodyComponent, addons, W, H, D, multiplier } = input;

  const body = calculateComponent({ W, H, D, quantity: 1, multiplier }, bodyComponent, category);

  const addonResults = addons
    .filter(a => a.quantity > 0)
    .map(a => calculateComponent({ W, H, D, quantity: a.quantity, multiplier }, a.component, category));

  const itemSubtotal = body.lineSubtotal + addonResults.reduce((s, r) => s + r.lineSubtotal, 0);

  return { body, addons: addonResults, itemSubtotal };
}
