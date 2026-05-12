import type { ComponentCalcResult } from '../types';
import { formatNTD } from '../lib/utils';
import { cn } from '../lib/utils';

interface Props {
  result: ComponentCalcResult;
  quantity: number;
  onQuantityChange: (qty: number) => void;
}

export function CalcDetail({ r }: { r: ComponentCalcResult }) {
  const { matched, ratio, unitPrice, quantity, lineSubtotal } = r;

  if (r.componentType === 'flat') {
    return (
      <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 pl-1">
        單價 {formatNTD(matched.basePrice)} × 倍率 → {formatNTD(unitPrice)} × {quantity} = {formatNTD(lineSubtotal)}
      </p>
    );
  }

  const tierStr = Object.entries(matched.tier).map(([k, v]) => `${k}=${v}`).join(', ');
  const ratioStr = ratio.R !== 1
    ? `｜R=${ratio.R.toFixed(4)}（${Object.entries(ratio.factors)
        .filter(([, v]) => v > 1)
        .map(([k, v]) => {
          const t = matched.tier[k as 'W' | 'H' | 'D'] ?? 1;
          return `${k}:${(v * t).toFixed(0)}/${t}`;
        }).join(', ')}）`
    : '';

  const isBeyond = matched.fallbackKind === 'beyond-all';
  const isFallback = matched.isFallback;

  return (
    <p className={cn(
      'text-xs mt-0.5 px-2 py-0.5 rounded-md leading-relaxed',
      isBeyond ? 'bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400'
        : isFallback ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400'
        : 'text-slate-400 dark:text-slate-500'
    )}>
      {isFallback && <span className="mr-1">{isBeyond ? '⚠️ 超尺寸估算' : '⚠️ 補位'}</span>}
      採用級距 ({tierStr})={formatNTD(matched.basePrice)}{ratioStr}｜單價 {formatNTD(unitPrice)} × {quantity} = {formatNTD(lineSubtotal)}
    </p>
  );
}

export default function AddonRow({ result, quantity, onQuantityChange }: Props) {
  const hasValue = quantity > 0;
  return (
    <div className={cn(
      'py-2.5 px-3 rounded-xl transition-colors',
      hasValue
        ? 'bg-slate-50 dark:bg-slate-800/60'
        : 'hover:bg-slate-50 dark:hover:bg-slate-800/30'
    )}>
      <div className="flex items-center gap-3">
        <span className="text-sm text-slate-700 dark:text-slate-300 flex-1 min-w-0 truncate">
          {result.componentName}
        </span>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onQuantityChange(Math.max(0, quantity - 1))}
            className="w-6 h-6 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-sm font-bold flex items-center justify-center hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
          >−</button>
          <input
            type="number"
            min="0"
            className={cn(
              'w-12 rounded-lg border text-center text-sm py-0.5',
              'bg-white dark:bg-slate-800',
              'border-slate-200 dark:border-slate-700',
              'text-slate-800 dark:text-slate-200',
              'focus:outline-none focus:ring-1 focus:ring-blue-500'
            )}
            value={quantity}
            onChange={e => onQuantityChange(Math.max(0, parseInt(e.target.value) || 0))}
          />
          <button
            onClick={() => onQuantityChange(quantity + 1)}
            className="w-6 h-6 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-sm font-bold flex items-center justify-center hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
          >+</button>
          <span className="text-xs text-slate-400 dark:text-slate-500 w-4">件</span>
        </div>
        {hasValue && (
          <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 min-w-[72px] text-right">
            {formatNTD(result.lineSubtotal)}
          </span>
        )}
      </div>
      {hasValue && <CalcDetail r={{ ...result, quantity }} />}
    </div>
  );
}
