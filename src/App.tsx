import { useState, useEffect } from 'react';
import { initSeedIfNeeded } from './lib/seed';
import Dashboard from './pages/Dashboard';
import NewQuote from './pages/NewQuote';
import QuoteDetail from './pages/QuoteDetail';
import Pricing from './pages/Pricing';
import type { Quote } from './types';
import { cn } from './lib/utils';

type Page =
  | { name: 'dashboard' }
  | { name: 'newQuote' }
  | { name: 'editQuote'; quote: Quote }
  | { name: 'quoteDetail'; quoteId: string }
  | { name: 'pricing' };

function useTheme() {
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem('iqs:theme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (dark) { root.classList.add('dark'); } else { root.classList.remove('dark'); }
    localStorage.setItem('iqs:theme', dark ? 'dark' : 'light');
  }, [dark]);

  return { dark, toggle: () => setDark(d => !d) };
}

export default function App() {
  const [page, setPage] = useState<Page>({ name: 'dashboard' });
  const { dark, toggle } = useTheme();

  useEffect(() => {
    initSeedIfNeeded();
    document.title = '室內設計報價系統';
  }, []);

  function renderPage() {
    switch (page.name) {
      case 'dashboard':
        return <Dashboard onNewQuote={() => setPage({ name: 'newQuote' })} onViewQuote={id => setPage({ name: 'quoteDetail', quoteId: id })} />;
      case 'newQuote':
        return <NewQuote onSaved={id => setPage({ name: 'quoteDetail', quoteId: id })} onCancel={() => setPage({ name: 'dashboard' })} />;
      case 'editQuote':
        return <NewQuote editQuote={page.quote} onSaved={id => setPage({ name: 'quoteDetail', quoteId: id })} onCancel={() => setPage({ name: 'quoteDetail', quoteId: page.quote.id })} />;
      case 'quoteDetail':
        return <QuoteDetail quoteId={page.quoteId} onBack={() => setPage({ name: 'dashboard' })} onEdit={q => setPage({ name: 'editQuote', quote: q })} />;
      case 'pricing':
        return <Pricing />;
    }
  }

  const navItems: { label: string; icon: string; pageName: Page['name'] }[] = [
    { label: '報價記錄', icon: '📋', pageName: 'dashboard' },
    { label: '元件定價', icon: '🔧', pageName: 'pricing' },
  ];

  const activeNav = ['dashboard', 'newQuote', 'editQuote', 'quoteDetail'].includes(page.name)
    ? 'dashboard'
    : page.name;

  return (
    <div className={cn('min-h-screen flex flex-col', 'bg-slate-50 dark:bg-slate-950')}>
      {/* Top Nav */}
      <nav className={cn(
        'no-print h-14 flex items-center px-5 gap-1 border-b',
        'bg-white dark:bg-slate-900',
        'border-slate-200 dark:border-slate-800',
        'shadow-sm'
      )}>
        {/* Logo */}
        <div className="flex items-center gap-2 mr-5">
          <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white text-sm font-bold">報</div>
          <span className="font-semibold text-slate-800 dark:text-slate-100 text-sm tracking-tight">室內設計報價</span>
        </div>

        {/* Nav links */}
        {navItems.map(nav => (
          <button
            key={nav.pageName}
            onClick={() => setPage({ name: nav.pageName })}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
              activeNav === nav.pageName
                ? 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-400'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200'
            )}
          >
            <span>{nav.icon}</span>
            {nav.label}
          </button>
        ))}

        {/* Breadcrumb for sub-pages */}
        {(page.name === 'newQuote' || page.name === 'editQuote') && (
          <span className="ml-2 text-sm text-slate-400 dark:text-slate-500">
            / {page.name === 'editQuote' ? '編輯報價單' : '新增報價單'}
          </span>
        )}

        {/* Spacer + Theme toggle */}
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={toggle}
            title={dark ? '切換亮色' : '切換深色'}
            className={cn(
              'w-9 h-9 rounded-lg flex items-center justify-center text-base transition-colors',
              'text-slate-500 dark:text-slate-400',
              'hover:bg-slate-100 dark:hover:bg-slate-800'
            )}
          >
            {dark ? '☀️' : '🌙'}
          </button>
        </div>
      </nav>

      {/* Page content */}
      <main className="flex-1 overflow-auto">
        {renderPage()}
      </main>
    </div>
  );
}
