import { z } from 'zod';
import type { CategoryConfig, ComponentSpec, Quote } from '../types';

const DimensionSpecSchema = z.object({
  key: z.enum(['W', 'H', 'D']),
  label: z.string(),
  unit: z.literal('mm'),
  tierValues: z.array(z.number()),
});

const CategoryConfigSchema = z.object({
  id: z.string(),
  name: z.string(),
  dimensions: z.tuple([DimensionSpecSchema, DimensionSpecSchema, DimensionSpecSchema]),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const ComponentSpecSchema = z.object({
  id: z.string(),
  categoryId: z.string(),
  name: z.string(),
  type: z.enum(['body', 'door', 'shelf', 'flat']),
  prices: z.record(z.number()).optional(),
  flatPrice: z.number().optional(),
  sortOrder: z.number(),
  updatedAt: z.string(),
});

const KEYS = {
  categories: 'iqs:categories',
  components: 'iqs:components',
  quotes: 'iqs:quotes',
};

function loadJSON<T>(key: string, schema: z.ZodType<T>): T[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return z.array(schema).parse(parsed);
  } catch {
    return [];
  }
}

function saveJSON<T>(key: string, data: T[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    alert('儲存失敗，請確認瀏覽器儲存空間是否充足。');
    throw e;
  }
}

/** 開發模式下自動將最新資料同步回 seed.ts（production 無效） */
function syncSeedToDisk(): void {
  if (!import.meta.env.DEV) return;
  fetch('/__seed_sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      categories: loadCategories(),
      components: loadComponents(),
    }),
  }).catch(() => { /* 靜默失敗，不影響主功能 */ });
}

// Categories
export function loadCategories(): CategoryConfig[] {
  return loadJSON(KEYS.categories, CategoryConfigSchema);
}

export function saveCategories(cats: CategoryConfig[]): void {
  saveJSON(KEYS.categories, cats);
}

export function upsertCategory(cat: CategoryConfig): void {
  const all = loadCategories();
  const idx = all.findIndex(c => c.id === cat.id);
  if (idx >= 0) all[idx] = cat; else all.push(cat);
  saveCategories(all);
  syncSeedToDisk();
}

// Components
export function loadComponents(): ComponentSpec[] {
  return loadJSON(KEYS.components, ComponentSpecSchema);
}

export function saveComponents(comps: ComponentSpec[]): void {
  saveJSON(KEYS.components, comps);
}

export function upsertComponent(comp: ComponentSpec): void {
  const all = loadComponents();
  const idx = all.findIndex(c => c.id === comp.id);
  if (idx >= 0) all[idx] = comp; else all.push(comp);
  saveComponents(all);
  syncSeedToDisk();
}

export function deleteComponent(id: string): void {
  saveComponents(loadComponents().filter(c => c.id !== id));
  syncSeedToDisk();
}

// Quotes
export function loadQuotes(): Quote[] {
  return loadJSON(KEYS.quotes, z.any() as z.ZodType<Quote>);
}

export function saveQuotes(quotes: Quote[]): void {
  saveJSON(KEYS.quotes, quotes);
}

export function upsertQuote(quote: Quote): void {
  const all = loadQuotes();
  const idx = all.findIndex(q => q.id === quote.id);
  if (idx >= 0) all[idx] = quote; else all.push(quote);
  saveQuotes(all);
}

export function deleteQuote(id: string): void {
  saveQuotes(loadQuotes().filter(q => q.id !== id));
}
