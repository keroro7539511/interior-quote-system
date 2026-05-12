import { useState, useEffect } from 'react';
import type { CategoryConfig, ComponentSpec } from '../types';
import { loadCategories, loadComponents } from '../lib/storage';
import MatrixEditor3D from '../components/MatrixEditor3D';
import MatrixEditor2D from '../components/MatrixEditor2D';
import FlatPriceEditor from '../components/FlatPriceEditor';
import { cn } from '../lib/utils';

const TYPE_BADGE: Record<string, { label: string; cls: string }> = {
  body:  { label: '主體',   cls: 'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-400' },
  door:  { label: '門',     cls: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400' },
  shelf: { label: '層板',   cls: 'bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-400' },
  flat:  { label: '固定價', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400' },
};

export default function Pricing() {
  const [categories, setCategories] = useState<CategoryConfig[]>([]);
  const [components, setComponents] = useState<ComponentSpec[]>([]);
  const [selectedCatId, setSelectedCatId] = useState('');
  const [selectedCompId, setSelectedCompId] = useState('');
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  function reload() {
    const cats = loadCategories();
    const comps = loadComponents();
    setCategories(cats);
    setComponents(comps);
    if (!selectedCatId && cats.length > 0) setSelectedCatId(cats[0].id);
  }

  useEffect(() => { reload(); }, []);

  const category = categories.find(c => c.id === selectedCatId);
  const catComps = components
    .filter(c => c.categoryId === selectedCatId)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const selectedComp = catComps.find(c => c.id === selectedCompId) ?? catComps[0];

  function handleCompChange(updated: ComponentSpec) {
    setComponents(prev => prev.map(c => c.id === updated.id ? updated : c));
    setSavedAt(new Date());
  }

  const filledCount = (comp: ComponentSpec) => {
    if (comp.type === 'flat') return comp.flatPrice !== undefined ? 1 : 0;
    return Object.keys(comp.prices ?? {}).length;
  };

  return (
    <div className="flex h-[calc(100vh-56px)]">
      {/* Sidebar */}
      <div className={cn(
        'w-60 flex flex-col border-r',
        'bg-white dark:bg-slate-900',
        'border-slate-200 dark:border-slate-800'
      )}>
        {/* Category picker */}
        <div className="p-3 border-b border-slate-200 dark:border-slate-800">
          <select
            className={cn(
              'w-full rounded-lg px-2.5 py-1.5 text-sm border',
              'bg-slate-50 dark:bg-slate-800',
              'border-slate-200 dark:border-slate-700',
              'text-slate-800 dark:text-slate-200',
              'focus:outline-none focus:ring-2 focus:ring-blue-500'
            )}
            value={selectedCatId}
            onChange={e => { setSelectedCatId(e.target.value); setSelectedCompId(''); }}
          >
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        {/* Component list */}
        <div className="flex-1 overflow-y-auto py-1">
          {catComps.map(comp => {
            const badge = TYPE_BADGE[comp.type];
            const active = selectedComp?.id === comp.id;
            const filled = filledCount(comp);
            return (
              <button
                key={comp.id}
                onClick={() => setSelectedCompId(comp.id)}
                className={cn(
                  'w-full text-left px-3 py-2.5 flex items-center gap-2.5 transition-colors',
                  active
                    ? 'bg-blue-50 dark:bg-blue-950 text-blue-800 dark:text-blue-300'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                )}
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{comp.name}</div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className={cn('text-xs px-1.5 py-0.5 rounded-md font-medium', badge.cls)}>
                      {badge.label}
                    </span>
                    {filled > 0 && (
                      <span className="text-xs text-slate-400 dark:text-slate-500">{filled} 格</span>
                    )}
                  </div>
                </div>
                {active && <span className="text-blue-500 text-xs">›</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Editor */}
      <div className={cn(
        'flex-1 overflow-auto p-6',
        'bg-slate-50 dark:bg-slate-950'
      )}>
        {!category || !selectedComp ? (
          <div className="flex items-center justify-center h-full text-slate-400 dark:text-slate-600">
            請從左側選擇元件
          </div>
        ) : (
          <>
            <div className="mb-5">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-50">{selectedComp.name}</h2>
                <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', TYPE_BADGE[selectedComp.type].cls)}>
                  {TYPE_BADGE[selectedComp.type].label}
                </span>
                {savedAt && (
                  <span className="ml-auto flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                    <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.75.75 0 0 1 1.06-1.06L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0z"/>
                    </svg>
                    已自動儲存　{savedAt.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                {category.name}　·　點擊格子輸入金額，Enter 儲存，Esc 取消
              </p>
            </div>

            <div className={cn(
              'rounded-2xl border p-5',
              'bg-white dark:bg-slate-900',
              'border-slate-200 dark:border-slate-800',
              'shadow-sm'
            )}>
              {selectedComp.type === 'body' && (
                <MatrixEditor3D component={selectedComp} category={category} onChange={handleCompChange} />
              )}
              {(selectedComp.type === 'door' || selectedComp.type === 'shelf') && (
                <MatrixEditor2D component={selectedComp} category={category} onChange={handleCompChange} />
              )}
              {selectedComp.type === 'flat' && (
                <FlatPriceEditor component={selectedComp} onChange={handleCompChange} />
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
