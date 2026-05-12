import { useState, useEffect } from 'react';
import { v4 as uuid } from 'uuid';
import type { Quote, QuoteItem, CategoryConfig, ComponentSpec } from '../types';
import { loadCategories, loadComponents, upsertQuote } from '../lib/storage';
import QuoteItemBuilder from '../components/QuoteItemBuilder';
import { formatNTD, cn } from '../lib/utils';

const MULTIPLIER_PRESETS = [1.00, 1.05, 1.10, 1.15];

const inputCls = cn(
  'w-full rounded-xl border px-3 py-2 text-sm',
  'bg-white dark:bg-slate-800',
  'border-slate-200 dark:border-slate-700',
  'text-slate-900 dark:text-slate-100',
  'placeholder-slate-400 dark:placeholder-slate-500',
  'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'
);

const labelCls = 'block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1';

interface Props {
  onSaved: (quoteId: string) => void;
  onCancel: () => void;
  editQuote?: Quote;
}

export default function NewQuote({ onSaved, onCancel, editQuote }: Props) {
  const [categories, setCategories] = useState<CategoryConfig[]>([]);
  const [allComponents, setAllComponents] = useState<ComponentSpec[]>([]);
  const [customerName, setCustomerName] = useState(editQuote?.customer.name ?? '');
  const [customerPhone, setCustomerPhone] = useState(editQuote?.customer.phone ?? '');
  const [customerAddress, setCustomerAddress] = useState(editQuote?.customer.address ?? '');
  const [project, setProject] = useState(editQuote?.customer.project ?? '');
  const [defaultMultiplier, setDefaultMultiplier] = useState(editQuote?.defaultMultiplier ?? 1.00);
  const [itemIds, setItemIds] = useState<string[]>(() => editQuote?.items.map(i => i.id) ?? [uuid()]);
  const [itemMap, setItemMap] = useState<Record<string, QuoteItem | null>>({});

  useEffect(() => {
    setCategories(loadCategories());
    setAllComponents(loadComponents());
  }, []);

  const validItems = itemIds.map(id => itemMap[id]).filter(Boolean) as QuoteItem[];
  const total = validItems.reduce((s, i) => s + i.itemSubtotal, 0);

  function handleSave() {
    if (!customerName.trim()) { alert('請輸入客戶姓名'); return; }
    if (validItems.length === 0) { alert('請至少新增一個有效品項'); return; }
    const now = new Date().toISOString();
    const quote: Quote = {
      id: editQuote?.id ?? uuid(),
      customer: { name: customerName.trim(), phone: customerPhone, address: customerAddress, project },
      defaultMultiplier,
      items: validItems,
      total,
      createdAt: editQuote?.createdAt ?? now,
      updatedAt: now,
    };
    upsertQuote(quote);
    onSaved(quote.id);
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <button onClick={onCancel} className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors text-sm">
          ← 返回
        </button>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">
          {editQuote ? '編輯報價單' : '新增報價單'}
        </h1>
      </div>

      {/* Customer */}
      <section className={cn(
        'rounded-2xl border p-5 mb-5',
        'bg-white dark:bg-slate-900',
        'border-slate-200 dark:border-slate-800'
      )}>
        <h2 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-4 flex items-center gap-2">
          <span className="w-5 h-5 rounded-md bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs">👤</span>
          客戶資訊
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>姓名 *</label>
            <input className={inputCls} placeholder="客戶姓名" value={customerName} onChange={e => setCustomerName(e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>電話</label>
            <input className={inputCls} placeholder="聯絡電話" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>地址</label>
            <input className={inputCls} placeholder="施工地址" value={customerAddress} onChange={e => setCustomerAddress(e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>工程名稱</label>
            <input className={inputCls} placeholder="工程名稱" value={project} onChange={e => setProject(e.target.value)} />
          </div>
        </div>
      </section>

      {/* Multiplier */}
      <section className={cn(
        'rounded-2xl border p-5 mb-5',
        'bg-white dark:bg-slate-900',
        'border-slate-200 dark:border-slate-800'
      )}>
        <h2 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-3 flex items-center gap-2">
          <span className="w-5 h-5 rounded-md bg-violet-100 dark:bg-violet-950 text-violet-600 dark:text-violet-400 flex items-center justify-center text-xs">×</span>
          整單預設倍率
        </h2>
        <div className="flex items-center gap-2 flex-wrap">
          {MULTIPLIER_PRESETS.map(p => (
            <button
              key={p}
              onClick={() => setDefaultMultiplier(p)}
              className={cn(
                'px-3 py-1.5 text-sm rounded-xl border font-medium transition-colors',
                defaultMultiplier === p
                  ? 'bg-blue-600 text-white border-blue-600'
                  : [
                    'bg-white dark:bg-slate-800',
                    'border-slate-200 dark:border-slate-700',
                    'text-slate-700 dark:text-slate-300',
                    'hover:border-blue-400 dark:hover:border-blue-600',
                  ].join(' ')
              )}
            >
              {p.toFixed(2)}
            </button>
          ))}
          <input
            type="number" step="0.01" min="0.01"
            className={cn(
              'rounded-xl border px-3 py-1.5 text-sm w-24',
              'bg-white dark:bg-slate-800',
              'border-slate-200 dark:border-slate-700',
              'text-slate-900 dark:text-slate-100',
              'focus:outline-none focus:ring-2 focus:ring-blue-500'
            )}
            value={defaultMultiplier}
            onChange={e => setDefaultMultiplier(parseFloat(e.target.value) || 1)}
          />
        </div>
      </section>

      {/* Items */}
      <div className="space-y-4 mb-5">
        {itemIds.map((id, idx) => (
          <QuoteItemBuilder
            key={id}
            itemId={id}
            index={idx + 1}
            categories={categories}
            allComponents={allComponents}
            multiplier={defaultMultiplier}
            onItemChange={item => setItemMap(prev => ({ ...prev, [id]: item }))}
            onRemove={() => {
              setItemIds(prev => prev.filter(x => x !== id));
              setItemMap(prev => { const n = { ...prev }; delete n[id]; return n; });
            }}
          />
        ))}
        <button
          onClick={() => setItemIds(prev => [...prev, uuid()])}
          className={cn(
            'w-full py-3 rounded-2xl border-2 border-dashed text-sm font-medium transition-colors',
            'border-slate-200 dark:border-slate-700',
            'text-slate-400 dark:text-slate-500',
            'hover:border-blue-400 dark:hover:border-blue-600',
            'hover:text-blue-500 dark:hover:text-blue-400',
            'hover:bg-blue-50/50 dark:hover:bg-blue-950/20'
          )}
        >
          ＋ 新增品項
        </button>
      </div>

      {/* Total & Save */}
      <div className={cn(
        'rounded-2xl border p-5 flex items-center justify-between',
        'bg-white dark:bg-slate-900',
        'border-slate-200 dark:border-slate-800',
        'sticky bottom-4 shadow-lg shadow-black/5 dark:shadow-black/30'
      )}>
        <div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">報價單總計</div>
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-50">{formatNTD(total)}</div>
        </div>
        <button
          onClick={handleSave}
          className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-sm transition-colors"
        >
          儲存報價單
        </button>
      </div>
    </div>
  );
}
