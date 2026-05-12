import { useState } from 'react';
import type { ComponentSpec } from '../types';
import { upsertComponent } from '../lib/storage';
import { cn } from '../lib/utils';

interface Props {
  component: ComponentSpec;
  onChange: (comp: ComponentSpec) => void;
}

export default function FlatPriceEditor({ component, onChange }: Props) {
  const [value, setValue] = useState(
    component.flatPrice !== undefined ? String(component.flatPrice) : ''
  );
  const [saved, setSaved] = useState(false);

  function handleSave() {
    const n = Number(value);
    if (isNaN(n) || n < 0) return;
    const updated = { ...component, flatPrice: n, updatedAt: new Date().toISOString() };
    upsertComponent(updated);
    onChange(updated);
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  }

  return (
    <div className="flex flex-col gap-4 max-w-xs">
      <div>
        <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wide">
          固定單價（NT$）
        </label>
        <div className="flex gap-2">
          <input
            type="number"
            min="0"
            placeholder="輸入單價"
            className={cn(
              'flex-1 rounded-xl border px-3 py-2 text-sm',
              'bg-white dark:bg-slate-800',
              'border-slate-200 dark:border-slate-700',
              'text-slate-900 dark:text-slate-100',
              'placeholder-slate-300 dark:placeholder-slate-600',
              'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'
            )}
            value={value}
            onChange={e => { setValue(e.target.value); setSaved(false); }}
            onKeyDown={e => e.key === 'Enter' && handleSave()}
          />
          <button
            onClick={handleSave}
            className={cn(
              'px-4 py-2 rounded-xl text-sm font-medium transition-colors',
              saved
                ? 'bg-emerald-600 text-white'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            )}
          >
            {saved ? '已儲存 ✓' : '儲存'}
          </button>
        </div>
      </div>
      {component.flatPrice !== undefined && (
        <div className="text-sm text-slate-500 dark:text-slate-400">
          目前單價：
          <span className="font-semibold text-slate-900 dark:text-slate-100 ml-1">
            NT${component.flatPrice.toLocaleString()}
          </span>
        </div>
      )}
    </div>
  );
}
