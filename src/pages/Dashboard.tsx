import { useState, useEffect } from 'react';
import type { Quote } from '../types';
import { loadQuotes } from '../lib/storage';
import { formatNTD } from '../lib/utils';

interface Props {
  onNewQuote: () => void;
  onViewQuote: (id: string) => void;
}

export default function Dashboard({ onNewQuote, onViewQuote }: Props) {
  const [quotes, setQuotes] = useState<Quote[]>([]);

  useEffect(() => {
    setQuotes(loadQuotes().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));
  }, []);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">報價記錄</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">共 {quotes.length} 筆</p>
        </div>
        <button
          onClick={onNewQuote}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium shadow-sm transition-colors"
        >
          <span className="text-base leading-none">+</span>
          新增報價單
        </button>
      </div>

      {quotes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-3xl mb-4">📋</div>
          <p className="text-slate-500 dark:text-slate-400 text-sm">尚無報價記錄</p>
          <button onClick={onNewQuote} className="mt-4 text-sm text-blue-600 dark:text-blue-400 hover:underline">
            建立第一張報價單
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {quotes.map(q => (
            <button
              key={q.id}
              onClick={() => onViewQuote(q.id)}
              className="w-full text-left group"
            >
              <div className={[
                'rounded-2xl border px-5 py-4 transition-all',
                'bg-white dark:bg-slate-900',
                'border-slate-200 dark:border-slate-800',
                'hover:border-blue-400 dark:hover:border-blue-600',
                'hover:shadow-md dark:hover:shadow-slate-900',
              ].join(' ')}>
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900 dark:text-slate-50 text-base truncate">
                        {q.customer.name}
                      </span>
                      {q.customer.project && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                          {q.customer.project}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-400 dark:text-slate-500">
                      <span>{q.items.length} 個品項</span>
                      <span>·</span>
                      <span>
                        {new Date(q.updatedAt).toLocaleDateString('zh-TW', {
                          year: 'numeric', month: '2-digit', day: '2-digit',
                        })}
                      </span>
                      {q.customer.phone && (
                        <>
                          <span>·</span>
                          <span>{q.customer.phone}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-lg font-bold text-slate-900 dark:text-slate-50">
                      {formatNTD(q.total)}
                    </div>
                    <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                      倍率 {q.defaultMultiplier.toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
