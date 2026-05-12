import { useState } from 'react';
import type { ComponentSpec, CategoryConfig } from '../types';
import { upsertComponent } from '../lib/storage';
import { cn } from '../lib/utils';

interface Props {
  component: ComponentSpec;
  category: CategoryConfig;
  onChange: (comp: ComponentSpec) => void;
}

/** 解析 Excel 複製的 TSV，回傳數值矩陣（null = 空格） */
function parseTSV(text: string): (number | null)[][] {
  return text
    .replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim()
    .split('\n')
    .map(row =>
      row.split('\t').map(cell => {
        const n = Number(cell.trim().replace(/,/g, ''));
        return cell.trim() === '' || isNaN(n) || n <= 0 ? null : n;
      })
    );
}

export default function MatrixEditor3D({ component, category, onChange }: Props) {
  const dimW = category.dimensions.find(d => d.key === 'W')!;
  const dimH = category.dimensions.find(d => d.key === 'H')!;
  const dimD = category.dimensions.find(d => d.key === 'D')!;

  const [activeW, setActiveW] = useState(dimW.tierValues[0]);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [pasteMsg, setPasteMsg] = useState<string | null>(null);

  const prices = component.prices ?? {};
  const totalCells = dimW.tierValues.length * dimH.tierValues.length * dimD.tierValues.length;
  const filledCells = Object.keys(prices).length;

  function getKey(w: number, h: number, d: number) {
    return `${w}:${h}:${d}`;
  }

  function startEdit(key: string) {
    setEditingKey(key);
    setEditValue(prices[key] !== undefined ? String(prices[key]) : '');
  }

  function commitEdit(key: string) {
    const val = editValue.trim();
    const newPrices = { ...prices };
    if (val === '' || val === '0') {
      delete newPrices[key];
    } else {
      const n = Number(val);
      if (!isNaN(n) && n > 0) newPrices[key] = n;
    }
    save(newPrices);
    setEditingKey(null);
  }

  function save(newPrices: Record<string, number>) {
    const updated = { ...component, prices: newPrices, updatedAt: new Date().toISOString() };
    upsertComponent(updated);
    onChange(updated);
  }

  /** 從 (startHIdx, startDIdx) 開始貼上，回傳填入格數 */
  function applyPaste(rows: (number | null)[][], startHIdx: number, startDIdx: number): number {
    const newPrices = { ...prices };
    let count = 0;
    rows.forEach((row, ri) => {
      row.forEach((val, ci) => {
        const hIdx = startHIdx + ri;
        const dIdx = startDIdx + ci;
        if (hIdx >= dimH.tierValues.length || dIdx >= dimD.tierValues.length) return;
        const key = getKey(activeW, dimH.tierValues[hIdx], dimD.tierValues[dIdx]);
        if (val === null) { delete newPrices[key]; }
        else { newPrices[key] = val; count++; }
      });
    });
    save(newPrices);
    return count;
  }

  function handleInputPaste(e: React.ClipboardEvent<HTMLInputElement>, key: string) {
    const text = e.clipboardData.getData('text');
    // 單格貼上（無 tab / 換行）→ 讓瀏覽器預設處理
    if (!text.includes('\t') && !text.includes('\n')) return;
    e.preventDefault();

    const parts = key.split(':');
    const [, h, d] = [Number(parts[0]), Number(parts[1]), Number(parts[2])];
    const hIdx = dimH.tierValues.indexOf(h);
    const dIdx = dimD.tierValues.indexOf(d);
    if (hIdx === -1 || dIdx === -1) return;

    const rows = parseTSV(text);
    const count = applyPaste(rows, hIdx, dIdx);
    setEditingKey(null);
    showPasteMsg(count);
  }

  function showPasteMsg(count: number) {
    setPasteMsg(`已貼上 ${count} 格`);
    setTimeout(() => setPasteMsg(null), 2500);
  }

  return (
    <div>
      {/* W tabs */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
          櫃寬 W（mm）
        </span>
        <div className="flex gap-1 flex-wrap">
          {dimW.tierValues.map(w => (
            <button
              key={w}
              onClick={() => setActiveW(w)}
              className={cn(
                'px-3 py-1 text-xs rounded-lg font-medium border transition-colors',
                activeW === w
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                  : [
                    'border-slate-200 dark:border-slate-700',
                    'text-slate-600 dark:text-slate-400',
                    'bg-white dark:bg-slate-800',
                    'hover:border-blue-400 hover:text-blue-600 dark:hover:border-blue-600 dark:hover:text-blue-400',
                  ].join(' ')
              )}
            >
              {w}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-3">
          {pasteMsg && (
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
              <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor">
                <path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.75.75 0 0 1 1.06-1.06L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0z"/>
              </svg>
              {pasteMsg}
            </span>
          )}
          <span className="text-xs text-slate-400 dark:text-slate-500">
            已填 <span className="text-blue-600 dark:text-blue-400 font-medium">{filledCells}</span> / {totalCells} 格
          </span>
        </div>
      </div>

      {/* Paste hint */}
      <p className="text-xs text-slate-400 dark:text-slate-500 mb-3">
        💡 點選起始格後可直接貼上 Excel 複製的資料（Ctrl+V），會從該格往右下填入
      </p>

      {/* Matrix: rows = H, cols = D */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
        <table className="border-collapse text-sm w-full">
          <thead>
            <tr>
              <th className={cn(
                'px-3 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap text-left',
                'bg-slate-50 dark:bg-slate-800/60 border-b border-r border-slate-200 dark:border-slate-700'
              )}>
                高 H ↓　深 D →
              </th>
              {dimD.tierValues.map(d => (
                <th key={d} className={cn(
                  'px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 text-center whitespace-nowrap',
                  'bg-slate-50 dark:bg-slate-800/60 border-b border-r last:border-r-0 border-slate-200 dark:border-slate-700'
                )}>
                  {d}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dimH.tierValues.map((h, hi) => (
              <tr key={h} className={hi % 2 === 0 ? '' : 'bg-slate-50/50 dark:bg-slate-800/20'}>
                <td className={cn(
                  'px-3 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap text-right',
                  'bg-slate-50 dark:bg-slate-800/60 border-b border-r border-slate-200 dark:border-slate-700'
                )}>
                  {h}
                </td>
                {dimD.tierValues.map(d => {
                  const key = getKey(activeW, h, d);
                  const val = prices[key];
                  const isEditing = editingKey === key;
                  return (
                    <td
                      key={d}
                      onClick={() => !isEditing && startEdit(key)}
                      className={cn(
                        'border-b border-r last:border-r-0 border-slate-200 dark:border-slate-700',
                        'text-center min-w-[84px] cursor-pointer transition-colors',
                        isEditing ? 'p-0' : 'px-3 py-2',
                        val !== undefined
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/40'
                          : 'hover:bg-blue-50 dark:hover:bg-blue-950/30'
                      )}
                    >
                      {isEditing ? (
                        <input
                          autoFocus
                          className={cn(
                            'w-full h-full px-2 py-2 text-center text-sm outline-none',
                            'bg-blue-50 dark:bg-blue-950 text-blue-900 dark:text-blue-100',
                            'ring-2 ring-inset ring-blue-500'
                          )}
                          value={editValue}
                          onChange={e => setEditValue(e.target.value)}
                          onBlur={() => commitEdit(key)}
                          onPaste={e => handleInputPaste(e, key)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') commitEdit(key);
                            if (e.key === 'Escape') setEditingKey(null);
                          }}
                        />
                      ) : (
                        <span className={cn(
                          'text-xs font-mono',
                          val !== undefined
                            ? 'text-emerald-700 dark:text-emerald-400 font-semibold'
                            : 'text-slate-300 dark:text-slate-600'
                        )}>
                          {val !== undefined ? val.toLocaleString() : '—'}
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
