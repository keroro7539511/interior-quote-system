export interface DimensionSpec {
  key: 'W' | 'H' | 'D';
  label: string;
  unit: 'mm';
  tierValues: number[];
}

export interface CategoryConfig {
  id: string;
  name: string;
  dimensions: [DimensionSpec, DimensionSpec, DimensionSpec];
  createdAt: string;
  updatedAt: string;
}

export type ComponentType = 'body' | 'door' | 'shelf' | 'flat';

export interface ComponentSpec {
  id: string;
  categoryId: string;
  name: string;
  type: ComponentType;
  prices?: Record<string, number>;
  flatPrice?: number;
  sortOrder: number;
  updatedAt: string;
}

export interface ComponentCalcResult {
  componentId: string;
  componentName: string;
  componentType: ComponentType;
  quantity: number;
  matched: {
    tier: Partial<Record<'W' | 'H' | 'D', number>>;
    basePrice: number;
    isFallback: boolean;
    fallbackKind?: 'cell-empty' | 'beyond-all';
  };
  ratio: {
    factors: Partial<Record<'W' | 'H' | 'D', number>>;
    R: number;
  };
  unitPriceBeforeMultiplier: number;
  unitPrice: number;
  lineSubtotal: number;
}

export interface QuoteItem {
  id: string;
  categoryId: string;
  categoryName: string;
  spaceName?: string;           // 規劃空間名稱，如「臥室」「洗衣間」
  inputs: { W: number; H: number; D: number };
  multiplier: number;
  body: ComponentCalcResult;
  addons: ComponentCalcResult[];
  itemSubtotal: number;
  note?: string;
}

export interface Quote {
  id: string;
  customer: {
    name: string;
    phone?: string;
    address?: string;
    project?: string;
  };
  defaultMultiplier: number;
  items: QuoteItem[];
  total: number;
  createdAt: string;
  updatedAt: string;
}
