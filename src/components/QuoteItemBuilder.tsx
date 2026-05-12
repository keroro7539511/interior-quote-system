import { useState, useEffect, useCallback } from 'react';
import type { CategoryConfig, ComponentSpec, QuoteItem, ComponentCalcResult } from '../types';
import { calculateComponent } from '../lib/pricing';
import { v4 as uuid } from 'uuid';
import AddonRow, { CalcDetail } from './AddonRow';
import { formatNTD, cn } from '../lib/utils';

interface AddonState {
  component: ComponentSpec;
  quantity: number;
}

interface Props {
  categories: CategoryConfig[];
  allComponents: ComponentSpec[];
  multiplier: number;
  onItemChange: (item: QuoteItem | null) => void;
  initialItem?: QuoteItem;
  itemId: string;
  onRemove: () => void;
  index: number;
}

const inputCls = cn(
  'rounded-xl border px-3 py-2 text-sm',
  'bg-white dark:bg-slate-800',
  'border-slate-200 dark:border-slate-700',
  'text-slate-900 dark:text-slate-100',
  'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'
);

export default function QuoteItemBuilder({
  categories, allComponents, multiplier, onItemChange, initialItem, itemId, onRemove, index
}: Props) {
  const firstCat = categories[0];
  const [catId, setCatId] = useState(initialItem?.categoryId ?? firstCat?.id ?? '');
  const [W, setW] = useState(initialItem?.inputs.W ?? 600);
  const [H, setH] = useState(initialItem?.inputs.H ?? 1200);
  const [D, setD] = useState(initialItem?.inputs.D ?? 400);
  const [itemMultiplier, setItemMultiplier] = useState(initialItem?.multiplier ?? multiplier);

  const category = categories.find(c => c.id === catId);
  const bodyComp = allComponents.find(c => c.categoryId === catId && c.type === 'body');
  const addonComps = allComponents
    .filter(c => c.categoryId === catId && c.type !== 'body')
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const [addonStates, setAddonStates] = useState<AddonState[]>(
    () => addonComps.map(c => ({
      component: c,
      quantity: initialItem?.addons.find(a => a.componentId === c.id)?.quantity ?? 0,
    }))
  );

  useEffect(() => {
    setAddonStates(addonComps.map(c => ({
      component: c,
      quantity: addonStates.find(a => a.component.id === c.id)?.quantity ?? 0,
    })));
  }, [catId, allComponents.length]);

  useEffect(() => { setItemMultiplier(multiplier); }, [multiplier]);

  const [calcError, setCalcError] = useState<string | null>(null);
  const [bodyResult, setBodyResult] = useState<ComponentCalcResult | null>(null);
  const [addonResults, setAddonResults] = useState<ComponentCalcResult[]>([]);

  const recalculate = useCallback(() => {
    if (!category || !bodyComp || W <= 0 || H <= 0 || D <= 0) {
      setBodyResult(null); setAddonResults([]); onItemChange(null); return;
    }
    try {
      setCalcError(null);
      const bResult = calculateComponent({ W, H, D, quantity: 1, multiplier: itemMultiplier }, bodyComp, category);
      setBodyResult(bResult);

      const aResults = addonStates
        .filter(a => a.quantity > 0)
        .map(a => calculateComponent({ W, H, D, quantity: a.quantity, multiplier: itemMultiplier }, a.component, category));
      setAddonResults(aResults);

      const itemSubtotal = bResult.lineSubtotal + aResults.reduce((s, r) => s + r.lineSubtotal, 0);

      const quoteItem: QuoteItem = {
        id: itemId,
        categoryId: catId,
        categoryName: category.name,
        inputs: { W, H, D },
        multiplier: itemMultiplier,
        body: bResult,
        addons: [
          ...aResults,
          ...addonStates.filter(a => a.quantity === 0).map(a => ({
            componentId: a.component.id, componentName: a.component.name,
            componentType: a.component.type, quantity: 0,
            matched: { tier: {}, basePrice: 0, isFallback: false },
            ratio: { factors: {}, R: 1 },
            unitPriceBeforeMultiplier: 0, unitPrice: 0, lineSubtotal: 0,
          } as ComponentCalcResult)),
        ],
        itemSubtotal,
      };
      onItemChange(quoteItem);
    } catch (e) {
      setCalcError((e as Error).message);
      setBodyResult(null); setAddonResults([]); onItemChange(null);
    }
  }, [category, bodyComp, W, H, D, itemMultiplier, addonStates, catId]);

  useEffect(() => { recalculate(); }, [recalculate]);

  const itemSubtotal = (bodyResult?.lineSubtotal ?? 0) + addonResults.reduce((s, r) => s + r.lineSubtotal, 0);

  return (
    <div className={cn(
      'rounded-2xl border overflow-hidden',
      'bg-white dark:bg-slate-900',
      'border-slate-200 dark:border-slate-800',
      'shadow-sm'
    )}>
      {/* Header */}
      <div className={cn(
        'flex items-center justify-between px-5 py-3 border-b',
        'bg-slate-50 dark:bg-slate-800/60',
        'border-slate-200 dark:border-slate-700'
      )}>
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">
            {index}
          </span>
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{category?.name ?? '品項'}</span>
        </div>
        <button onClick={onRemove} className="text-xs text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 transition-colors">
          移除
        </button>
      </div>

      <div className="p-5">
        {/* Inputs row */}
        <div className="flex flex-wrap gap-3 mb-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">類別</label>
            <select className={inputCls} value={catId} onChange={e => setCatId(e.target.value)}>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          {(['W', 'H', 'D'] as const).map(dim => {
            const val = dim === 'W' ? W : dim === 'H' ? H : D;
            const setter = dim === 'W' ? setW : dim === 'H' ? setH : setD;
            const dimSpec = category?.dimensions.find(d => d.key === dim);
            return (
              <div key={dim}>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                  {dimSpec?.label ?? dim} (mm)
                </label>
                <input
                  type="number" min="1"
                  className={cn(inputCls, 'w-24')}
                  value={val}
                  onChange={e => setter(parseInt(e.target.value) || 0)}
                />
              </div>
            );
          })}
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">倍率</label>
            <input
              type="number" step="0.01" min="0.01"
              className={cn(inputCls, 'w-20')}
              value={itemMultiplier}
              onChange={e => setItemMultiplier(parseFloat(e.target.value) || 1)}
            />
          </div>
        </div>

        {calcError && (
          <div className="flex items-start gap-2 bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 text-sm px-4 py-3 rounded-xl mb-4">
            <span>⚠️</span><span>{calcError}</span>
          </div>
        )}

        {/* Body result */}
        {bodyResult && (
          <div className={cn(
            'rounded-xl p-3 mb-3 border',
            'bg-slate-50 dark:bg-slate-800/50',
            'border-slate-200 dark:border-slate-700'
          )}>
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">主體</span>
              <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{formatNTD(bodyResult.lineSubtotal)}</span>
            </div>
            <CalcDetail r={bodyResult} />
          </div>
        )}

        {/* Addons */}
        {addonComps.length > 0 && (
          <div>
            <div className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-2 px-1">
              加購配件
            </div>
            <div className="space-y-1">
              {addonStates.map((addon, i) => {
                const result = addonResults.find(r => r.componentId === addon.component.id) ?? {
                  componentId: addon.component.id, componentName: addon.component.name,
                  componentType: addon.component.type, quantity: addon.quantity,
                  matched: { tier: {}, basePrice: 0, isFallback: false },
                  ratio: { factors: {}, R: 1 },
                  unitPriceBeforeMultiplier: 0, unitPrice: 0, lineSubtotal: 0,
                } as ComponentCalcResult;
                return (
                  <AddonRow
                    key={addon.component.id}
                    result={{ ...result, quantity: addon.quantity }}
                    quantity={addon.quantity}
                    onQuantityChange={qty => setAddonStates(prev => prev.map((a, j) => j === i ? { ...a, quantity: qty } : a))}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* Subtotal */}
        {bodyResult && (
          <div className={cn(
            'flex justify-between items-center mt-4 pt-4 border-t',
            'border-slate-200 dark:border-slate-700'
          )}>
            <span className="text-sm text-slate-500 dark:text-slate-400">品項小計</span>
            <span className="text-xl font-bold text-slate-900 dark:text-slate-50">{formatNTD(itemSubtotal)}</span>
          </div>
        )}
      </div>
    </div>
  );
}
