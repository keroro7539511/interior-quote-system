import { useState, useEffect } from 'react';
import type { Quote } from '../types';
import { loadQuotes, deleteQuote } from '../lib/storage';
import QuotePrintView from '../components/QuotePrintView';
import { formatNTD, cn } from '../lib/utils';

interface Props {
  quoteId: string;
  onBack: () => void;
  onEdit: (quote: Quote) => void;
}

export default function QuoteDetail({ quoteId, onBack, onEdit }: Props) {
  const [quote, setQuote] = useState<Quote | null>(null);
  const [showPrint, setShowPrint] = useState(false);

  useEffect(() => {
    const q = loadQuotes().find(q => q.id === quoteId);
    setQuote(q ?? null);
  }, [quoteId]);

  if (!quote) return <div className="p-8 text-slate-400 dark:text-slate-500">報價單不存在</div>;
  if (showPrint) return <QuotePrintView quote={quote} onClose={() => setShowPrint(false)} />;

  function handleDelete() {
    if (!confirm('確定要刪除此報價單？')) return;
    deleteQuote(quoteId);
    onBack();
  }

  const cardCls = cn(
    'rounded-2xl border p-5 mb-4',
    'bg-white dark:bg-slate-900',
    'border-slate-200 dark:border-slate-800'
  );

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <button onClick={onBack} className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 text-sm transition-colors">
          ← 返回
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">{quote.customer.name}</h1>
          {quote.customer.project && (
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{quote.customer.project}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onEdit(quote)}
            className={cn(
              'px-4 py-2 rounded-xl text-sm font-medium transition-colors',
              'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300',
              'hover:bg-slate-200 dark:hover:bg-slate-700'
            )}
          >
            編輯
          </button>
          <button
            onClick={() => setShowPrint(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-colors"
          >
            列印預覽
          </button>
          <button
            onClick={handleDelete}
            className={cn(
              'px-4 py-2 rounded-xl text-sm font-medium transition-colors',
              'bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400',
              'hover:bg-red-100 dark:hover:bg-red-900/50'
            )}
          >
            刪除
          </button>
        </div>
      </div>

      {/* Customer info */}
      <div className={cardCls}>
        <h2 className="text-xs font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-3">客戶資訊</h2>
        <div className="grid grid-cols-2 gap-2 text-sm">
          {quote.customer.phone && (
            <div><span className="text-slate-400 dark:text-slate-500">電話　</span>
              <span className="text-slate-800 dark:text-slate-200">{quote.customer.phone}</span></div>
          )}
          {quote.customer.address && (
            <div className="col-span-2"><span className="text-slate-400 dark:text-slate-500">地址　</span>
              <span className="text-slate-800 dark:text-slate-200">{quote.customer.address}</span></div>
          )}
          <div>
            <span className="text-slate-400 dark:text-slate-500">建立　</span>
            <span className="text-slate-800 dark:text-slate-200">
              {new Date(quote.createdAt).toLocaleDateString('zh-TW')}
            </span>
          </div>
          <div>
            <span className="text-slate-400 dark:text-slate-500">預設倍率　</span>
            <span className="text-slate-800 dark:text-slate-200">{quote.defaultMultiplier.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Items */}
      {quote.items.map((item, idx) => (
        <div key={item.id} className={cardCls}>
          <div className="flex items-center gap-2 mb-3">
            <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">
              {idx + 1}
            </span>
            <span className="font-semibold text-slate-800 dark:text-slate-100">{item.categoryName}</span>
            <span className="text-xs text-slate-400 dark:text-slate-500">
              W{item.inputs.W} × H{item.inputs.H} × D{item.inputs.D} mm　·　倍率 {item.multiplier.toFixed(2)}
            </span>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-slate-600 dark:text-slate-400">主體</span>
              <span className="font-medium text-slate-900 dark:text-slate-100">{formatNTD(item.body.lineSubtotal)}</span>
            </div>
            {item.addons.filter(a => a.quantity > 0).map(a => (
              <div key={a.componentId} className="flex justify-between text-sm">
                <span className="text-slate-600 dark:text-slate-400">{a.componentName} × {a.quantity}</span>
                <span className="font-medium text-slate-900 dark:text-slate-100">{formatNTD(a.lineSubtotal)}</span>
              </div>
            ))}
          </div>

          <div className={cn(
            'flex justify-between mt-3 pt-3 border-t',
            'border-slate-100 dark:border-slate-800'
          )}>
            <span className="text-sm text-slate-500 dark:text-slate-400">品項小計</span>
            <span className="font-bold text-slate-900 dark:text-slate-50">{formatNTD(item.itemSubtotal)}</span>
          </div>
        </div>
      ))}

      {/* Total */}
      <div className={cn(
        'rounded-2xl border p-5 flex justify-between items-center',
        'bg-slate-900 dark:bg-slate-800',
        'border-slate-800 dark:border-slate-700'
      )}>
        <span className="text-slate-400 text-sm">報價單總計</span>
        <span className="text-2xl font-bold text-white">{formatNTD(quote.total)}</span>
      </div>
    </div>
  );
}
