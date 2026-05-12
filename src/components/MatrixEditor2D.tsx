import { useState } from 'react';
import type { ComponentSpec, CategoryConfig } from '../types';
import { upsertComponent } from '../lib/storage';
import { cn } from '../lib/utils';

interface Props {
  component: ComponentSpec;
  category: CategoryConfig;
  onChange: (comp: ComponentSpec) => void;
}

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

export default function MatrixEditor2D({ component, category, onChange }: Props) {
  const isDoor = component.type === 'door';
  const dimW = category.dimensions.find(d => d.key === 'W')!;
  const dimH = category.dimensions.find(d => d.key === 'H')!;
  const dimD = category.dimensions.find(d => d.key === 'D')!;

  // door: rows=H cols=W  |  shelf: rows=D cols=W
  const rowDim = isDoor ? dimH : dimD;
  const colDim = dimW;

  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [pasteMsg, setPasteMsg] = useState<string | null>(null);

  const prices = component.prices ?? {};
  const totalCells = colDim.tierValues.length * rowDim.tierValues.length;
  const filledCells = Object.keys(prices).length;

  // key = `${W}:${H_or_D}`
  function getKey(col: number, row: number) {
    return `${col}:${row}`;
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

  /** 從 (startRowIdx, startColIdx) 開始貼上，回傳填入格數 */
  function applyPaste(rows: (number | null)[][], startRowIdx: number, startColIdx: number): number {
    const newPrices = { ...prices };
    let count = 0;
    rows.forEach((row, ri) => {
      row.forEach((val, ci) => {
        const rowIdx = startRowIdx + ri;
        const colIdx = startColIdx + ci;
        if (rowIdx >= rowDim.tierValues.length || colIdx >= colDim.tierValues.length) return;
        const key = getKey(colDim.tierValues[colIdx], rowDim.tierValues[rowIdx]);
        if (val === null) { delete newPrices[key]; }
        else { newPrices[key] = val; count++; }
      });
    });
    save(newPrices);
    return count;
  }

  function handleInputPaste(e: React.ClipboardEvent<HTMLInputElement>, key: string) {
    const text = e.clipboardData.getData('text');
    if (!text.includes('\t') && !text.includes('\n')) return;
    e.preventDefault();

    // key = `${col}:${row}` → col=W, row=H or D
    const [col, row] = key.split(':').map(Number);
    const colIdx = colDim.tierValues.indexOf(col);
    const rowIdx = rowDim.tierValues.indexOf(row);
    if (colIdx === -1 || rowIdx === -1) return;

    const parsed = parseTSV(text);
    const count = applyPaste(parsed, rowIdx, colIdx);
    setEditingKey(null);
    showPasteMsg(count);
  }

  function showPasteMsg(count: number) {
    setPasteMsg(`已貼上 ${count} 格`);
    setTimeout(() => setPasteMsg(null), 2500);
  }

  const rowLabel = isDoor ? '高 H' : '深 D';

  return (
    <div>
      <div className="flex items-center justify-end mb-3 gap-3">
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

      <p className="text-xs text-slate-400 dark:text-slate-500 mb-3">
        💡 點選起始格後可直接貼上 Excel 複製的資料（Ctrl+V），會從該格往右下填入
      </p>

      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
        <table className="border-collapse text-sm w-full">
          <thead>
            <tr>
              <th className={cn(
                'px-3 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap text-left',
                'bg-slate-50 dark:bg-slate-800/60 border-b border-r border-slate-200 dark:border-slate-700'
              )}>
                {rowLabel} ↓　寬 W →
              </th>
              {colDim.tierValues.map(c => (
                <th key={c} className={cn(
                  'px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 text-center whitespace-nowrap',
                  'bg-slate-50 dark:bg-slate-800/60 border-b border-r last:border-r-0 border-slate-200 dark:border-slate-700'
                )}>
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rowDim.tierValues.map((row, ri) => (
              <tr key={row} className={ri % 2 === 0 ? '' : 'bg-slate-50/50 dark:bg-slate-800/20'}>
                <td className={cn(
                  'px-3 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap text-right',
                  'bg-slate-50 dark:bg-slate-800/60 border-b border-r border-slate-200 dark:border-slate-700'
                )}>
                  {row}
                </td>
                {colDim.tierValues.map(col => {
                  const key = getKey(col, row);
                  const val = prices[key];
                  const isEditing = editingKey === key;
                  return (
                    <td
                      key={col}
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
