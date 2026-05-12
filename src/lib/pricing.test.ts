import { describe, it, expect } from 'vitest';
import { calculateComponent } from './pricing';
import { generateArithmeticTiers } from './tierUtils';
import type { CategoryConfig, ComponentSpec } from '../types';

const W_TIERS = [450, 500, 600, 700, 800, 900, 1000];
const H_TIERS = generateArithmeticTiers(320, 160, 2400);
const D_TIERS = [350, 400, 560];

const category: CategoryConfig = {
  id: 'cat-1',
  name: '系統櫃',
  dimensions: [
    { key: 'W', label: '寬', unit: 'mm', tierValues: W_TIERS },
    { key: 'H', label: '高', unit: 'mm', tierValues: H_TIERS },
    { key: 'D', label: '深', unit: 'mm', tierValues: D_TIERS },
  ],
  createdAt: '',
  updatedAt: '',
};

const body: ComponentSpec = {
  id: 'body-1',
  categoryId: 'cat-1',
  name: '主體',
  type: 'body',
  prices: {
    '450:320:350': 800,
    '500:320:350': 900,
    '500:480:350': 1100,
    '600:320:350': 1000,
    '1000:2400:560': 9000,
  },
  sortOrder: 0,
  updatedAt: '',
};

const door: ComponentSpec = {
  id: 'door-1',
  categoryId: 'cat-1',
  name: '木門總成',
  type: 'door',
  prices: {
    '450:320': 200,
    '500:480': 350,
    '800:1600': 900,
    '1000:2400': 1500,
  },
  sortOrder: 1,
  updatedAt: '',
};

const shelf: ComponentSpec = {
  id: 'shelf-1',
  categoryId: 'cat-1',
  name: '活格',
  type: 'shelf',
  prices: {
    '450:350': 80,
    '800:400': 150,
    '1000:560': 250,
  },
  sortOrder: 2,
  updatedAt: '',
};

const footboard: ComponentSpec = {
  id: 'flat-1',
  categoryId: 'cat-1',
  name: '腳板',
  type: 'flat',
  flatPrice: 50,
  sortOrder: 3,
  updatedAt: '',
};

const lineboard: ComponentSpec = {
  id: 'flat-2',
  categoryId: 'cat-1',
  name: '線板',
  type: 'flat',
  flatPrice: 30,
  sortOrder: 4,
  updatedAt: '',
};

describe('規格 4.7 驗證案例', () => {
  it('T01: body 450×320×350 命中', () => {
    const r = calculateComponent({ W: 450, H: 320, D: 350, quantity: 1, multiplier: 1 }, body, category);
    expect(r.matched.basePrice).toBe(800);
    expect(r.ratio.R).toBeCloseTo(1);
    expect(r.unitPrice).toBeCloseTo(800);
    expect(r.lineSubtotal).toBe(800);
  });

  it('T02: body 460×310×340 → ceiling (500,320,350) 命中', () => {
    const r = calculateComponent({ W: 460, H: 310, D: 340, quantity: 1, multiplier: 1 }, body, category);
    expect(r.matched.basePrice).toBe(900);
    expect(r.ratio.R).toBeCloseTo(1);
    expect(r.unitPrice).toBeCloseTo(900);
    expect(r.lineSubtotal).toBe(900);
  });

  it('T03: body 1100×2400×560 → W 超尺寸', () => {
    const r = calculateComponent({ W: 1100, H: 2400, D: 560, quantity: 1, multiplier: 1 }, body, category);
    expect(r.matched.basePrice).toBe(9000);
    expect(r.ratio.R).toBeCloseTo(1.1);
    expect(r.lineSubtotal).toBe(9900);
  });

  it('T04: body 1100×2500×600 → 三維皆超', () => {
    const r = calculateComponent({ W: 1100, H: 2500, D: 600, quantity: 1, multiplier: 1 }, body, category);
    expect(r.matched.basePrice).toBe(9000);
    const expectedR = (1100 / 1000) * (2500 / 2400) * (600 / 560);
    expect(r.ratio.R).toBeCloseTo(expectedR, 4);
    expect(r.lineSubtotal).toBe(Math.round(9000 * expectedR));
  });

  it('T05: body 470×330×360 → cell-empty fallback → (500,480,350)=1100', () => {
    const r = calculateComponent({ W: 470, H: 330, D: 360, quantity: 1, multiplier: 1 }, body, category);
    expect(r.matched.isFallback).toBe(true);
    expect(r.matched.fallbackKind).toBe('cell-empty');
    expect(r.matched.basePrice).toBe(1100);
    expect(r.ratio.R).toBeCloseTo(1);
    expect(r.lineSubtotal).toBe(1100);
  });

  it('T06: body 450×320×350 × qty=2 × multiplier=1.05', () => {
    const r = calculateComponent({ W: 450, H: 320, D: 350, quantity: 2, multiplier: 1.05 }, body, category);
    expect(r.matched.basePrice).toBe(800);
    expect(r.unitPrice).toBeCloseTo(840);
    expect(r.lineSubtotal).toBe(1680);
  });

  it('T07: door 450×320 命中', () => {
    const r = calculateComponent({ W: 450, H: 320, D: 350, quantity: 1, multiplier: 1 }, door, category);
    expect(r.matched.basePrice).toBe(200);
    expect(r.ratio.R).toBeCloseTo(1);
    expect(r.lineSubtotal).toBe(200);
  });

  it('T08: door 550×500 → cell-empty fallback → (800,1600)=900', () => {
    const r = calculateComponent({ W: 550, H: 500, D: 350, quantity: 2, multiplier: 1 }, door, category);
    expect(r.matched.isFallback).toBe(true);
    expect(r.matched.fallbackKind).toBe('cell-empty');
    expect(r.matched.basePrice).toBe(900);
    expect(r.ratio.R).toBeCloseTo(1);
    expect(r.lineSubtotal).toBe(1800);
  });

  it('T09: door 1100×2500 → W、H 皆超', () => {
    const r = calculateComponent({ W: 1100, H: 2500, D: 350, quantity: 1, multiplier: 1 }, door, category);
    expect(r.matched.basePrice).toBe(1500);
    const expectedR = (1100 / 1000) * (2500 / 2400);
    expect(r.ratio.R).toBeCloseTo(expectedR, 4);
    expect(r.lineSubtotal).toBe(Math.round(1500 * expectedR));
  });

  it('T10: shelf W=460 D=360 → cell-empty fallback → (800,400)=150, qty=3', () => {
    const r = calculateComponent({ W: 460, H: 320, D: 360, quantity: 3, multiplier: 1 }, shelf, category);
    expect(r.matched.isFallback).toBe(true);
    expect(r.matched.fallbackKind).toBe('cell-empty');
    expect(r.matched.basePrice).toBe(150);
    expect(r.ratio.R).toBeCloseTo(1);
    expect(r.lineSubtotal).toBe(450);
  });

  it('T11: flat 腳板 × qty=4', () => {
    const r = calculateComponent({ W: 450, H: 320, D: 350, quantity: 4, multiplier: 1 }, footboard, category);
    expect(r.matched.basePrice).toBe(50);
    expect(r.unitPrice).toBeCloseTo(50);
    expect(r.lineSubtotal).toBe(200);
  });

  it('T12: flat 線板 × qty=2 × multiplier=1.05', () => {
    const r = calculateComponent({ W: 450, H: 320, D: 350, quantity: 2, multiplier: 1.05 }, lineboard, category);
    expect(r.matched.basePrice).toBe(30);
    expect(r.unitPrice).toBeCloseTo(31.5);
    expect(r.lineSubtotal).toBe(63);
  });

  it('T13: 品項總計 body+木門×1+活格×2+腳板×4 = 1360', () => {
    const b = calculateComponent({ W: 450, H: 320, D: 350, quantity: 1, multiplier: 1 }, body, category);
    const d = calculateComponent({ W: 450, H: 320, D: 350, quantity: 1, multiplier: 1 }, door, category);
    const s = calculateComponent({ W: 450, H: 320, D: 350, quantity: 2, multiplier: 1 }, shelf, category);
    const f = calculateComponent({ W: 450, H: 320, D: 350, quantity: 4, multiplier: 1 }, footboard, category);
    expect(b.lineSubtotal).toBe(800);
    expect(d.lineSubtotal).toBe(200);
    expect(s.lineSubtotal).toBe(160);
    expect(f.lineSubtotal).toBe(200);
    expect(b.lineSubtotal + d.lineSubtotal + s.lineSubtotal + f.lineSubtotal).toBe(1360);
  });
});
