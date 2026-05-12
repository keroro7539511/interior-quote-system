import { useEffect } from 'react';
import type { Quote } from '../types';
import { formatNTD } from '../lib/utils';

interface Props {
  quote: Quote;
  onClose: () => void;
}

export default function QuotePrintView({ quote, onClose }: Props) {
  useEffect(() => {
    document.title = `報價單_${quote.customer.name}`;
    return () => { document.title = '室內設計報價系統'; };
  }, [quote]);

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950">
      {/* Toolbar */}
      <div className="no-print sticky top-0 z-10 flex items-center gap-3 px-5 py-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm">
        <button
          onClick={onClose}
          className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
        >
          ← 返回
        </button>
        <span className="text-sm font-medium text-slate-700 dark:text-slate-200 flex-1">列印預覽</span>
        <button
          onClick={() => window.print()}
          className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-xl font-medium transition-colors"
        >
          列印 / 存 PDF
        </button>
      </div>

      {/* Print sheet */}
      <div className="py-8 px-4 print:p-0 print:py-0">
        <div className="max-w-[794px] mx-auto bg-white text-gray-900 rounded-2xl shadow-lg print:shadow-none print:rounded-none p-10 print:p-8">

          {/* Title */}
          <div className="flex items-start justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 tracking-tight">報價單</h1>
              <p className="text-sm text-gray-400 mt-1">
                {new Date(quote.createdAt).toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-400 uppercase tracking-widest mb-1">總計金額</div>
              <div className="text-2xl font-bold text-gray-900">{formatNTD(quote.total)}</div>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t-2 border-gray-900 mb-6" />

          {/* Customer */}
          <div className="grid grid-cols-2 gap-4 mb-8 text-sm">
            <div>
              <div className="text-xs uppercase tracking-widest text-gray-400 mb-2">客戶資料</div>
              <div className="font-semibold text-lg text-gray-900">{quote.customer.name}</div>
              {quote.customer.phone && <div className="text-gray-600 mt-0.5">{quote.customer.phone}</div>}
              {quote.customer.address && <div className="text-gray-600 mt-0.5">{quote.customer.address}</div>}
            </div>
            {quote.customer.project && (
              <div>
                <div className="text-xs uppercase tracking-widest text-gray-400 mb-2">工程名稱</div>
                <div className="font-semibold text-gray-900">{quote.customer.project}</div>
              </div>
            )}
          </div>

          {/* Items table */}
          <table className="w-full text-sm mb-8">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="text-left py-2 pr-4 text-xs uppercase tracking-widest text-gray-400 font-medium w-8">#</th>
                <th className="text-left py-2 pr-4 text-xs uppercase tracking-widest text-gray-400 font-medium">品項</th>
                <th className="text-center py-2 pr-4 text-xs uppercase tracking-widest text-gray-400 font-medium">規格</th>
                <th className="text-right py-2 text-xs uppercase tracking-widest text-gray-400 font-medium">金額</th>
              </tr>
            </thead>
            <tbody>
              {quote.items.map((item, idx) => (
                <>
                  {/* Item header row */}
                  <tr key={`${item.id}-hdr`} className="border-b border-gray-100">
                    <td className="py-3 pr-4 text-gray-400 text-xs align-top">{idx + 1}</td>
                    <td className="py-3 pr-4 align-top">
                      <div className="font-semibold text-gray-900">{item.categoryName}</div>
                      <div className="text-xs text-gray-400 mt-0.5">倍率 {item.multiplier.toFixed(2)}</div>
                    </td>
                    <td className="py-3 pr-4 text-center text-xs text-gray-500 align-top whitespace-nowrap">
                      W{item.inputs.W} × H{item.inputs.H} × D{item.inputs.D}
                    </td>
                    <td className="py-3 font-bold text-right align-top text-gray-900">{formatNTD(item.itemSubtotal)}</td>
                  </tr>
                  {/* Body sub-row */}
                  <tr key={`${item.id}-body`} className="border-b border-gray-50">
                    <td />
                    <td className="py-1.5 pr-4 pl-4 text-gray-500 text-xs">主體</td>
                    <td className="py-1.5 pr-4 text-center text-xs text-gray-400">× 1</td>
                    <td className="py-1.5 text-right text-xs text-gray-600">{formatNTD(item.body.lineSubtotal)}</td>
                  </tr>
                  {/* Addon sub-rows */}
                  {item.addons.filter(a => a.quantity > 0).map(a => (
                    <tr key={`${item.id}-${a.componentId}`} className="border-b border-gray-50">
                      <td />
                      <td className="py-1.5 pr-4 pl-4 text-gray-500 text-xs">{a.componentName}</td>
                      <td className="py-1.5 pr-4 text-center text-xs text-gray-400">× {a.quantity}</td>
                      <td className="py-1.5 text-right text-xs text-gray-600">{formatNTD(a.lineSubtotal)}</td>
                    </tr>
                  ))}
                </>
              ))}
            </tbody>
          </table>

          {/* Total footer */}
          <div className="border-t-2 border-gray-900 pt-4 flex justify-between items-baseline">
            <span className="text-sm text-gray-400 uppercase tracking-widest">報價總計</span>
            <span className="text-3xl font-bold text-gray-900">{formatNTD(quote.total)}</span>
          </div>

          {/* Footer note */}
          <p className="mt-8 text-xs text-gray-300 text-center">以上報價僅供參考，實際價格以合約為準</p>
        </div>
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          @page { size: A4 portrait; margin: 1.5cm; }
        }
      `}</style>
    </div>
  );
}
