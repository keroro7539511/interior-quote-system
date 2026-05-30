import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const SEED_PATH = resolve(__dirname, 'src/lib/seed.ts')

// ---- seed.ts 產生器 ----
function pricesLiteral(prices: Record<string, number>): string {
  if (!prices || Object.keys(prices).length === 0) return '{}'
  // 依 W 分組，每組一行
  const byW: Record<string, string[]> = {}
  for (const [k, v] of Object.entries(prices)) {
    const w = k.split(':')[0]
    ;(byW[w] ??= []).push(`"${k}":${v}`)
  }
  const lines = Object.keys(byW)
    .sort((a, b) => +a - +b)
    .map(w => '  ' + byW[w].join(','))
  return `{\n${lines.join(',\n')},\n}`
}

interface Component {
  id: string; categoryId: string; name: string; type: string
  prices?: Record<string, number>; flatPrice?: number; sortOrder: number
}
interface Category {
  id: string; name: string
  dimensions: { key: string; label: string; unit: string; tierValues: number[] }[]
}

function generateSeedTs(categories: Category[], components: Component[]): string {
  const cat = categories.find(c => c.id === 'seed-category-system-cabinet')
  if (!cat) throw new Error('找不到系統櫃類別')

  const dimLines = cat.dimensions.map(d => {
    const vals = d.key === 'H'
      ? `generateArithmeticTiers(320, 160, 2400)`
      : `[${d.tierValues.join(', ')}]`
    return `      { key: '${d.key}', label: '${d.label}', unit: 'mm', tierValues: ${vals} },`
  }).join('\n')

  // 有價格的元件先宣告常數
  const priceConsts: string[] = []
  const compLines: string[] = []

  for (const c of components.filter(c => c.categoryId === cat.id)) {
    const hasPrices = c.prices && Object.keys(c.prices).length > 0
    const pricesRef = hasPrices ? `PRICES_${c.sortOrder}` : '{}'

    if (hasPrices) {
      priceConsts.push(`// ${c.name}\nconst PRICES_${c.sortOrder}: Record<string, number> = ${pricesLiteral(c.prices!)};`)
    }

    const props: string[] = [
      `id: '${c.id}'`,
      `categoryId: SEED_CATEGORY_ID`,
      `name: '${c.name}'`,
      `type: '${c.type}'`,
    ]
    if (c.type !== 'flat') props.push(`prices: ${pricesRef}`)
    if (c.flatPrice !== undefined) props.push(`flatPrice: ${c.flatPrice}`)
    props.push(`sortOrder: ${c.sortOrder}`, `updatedAt: now`)

    compLines.push(`    { ${props.join(', ')} },`)
  }

  return `import type { CategoryConfig, ComponentSpec } from '../types';
import { generateArithmeticTiers } from './tierUtils';
import { loadCategories, saveCategories, loadComponents, saveComponents } from './storage';

const SEED_CATEGORY_ID = 'seed-category-system-cabinet';

${priceConsts.join('\n\n')}

export function initSeedIfNeeded(): void {
  const existing = loadCategories();
  if (existing.some(c => c.id === SEED_CATEGORY_ID)) return;

  const now = new Date().toISOString();

  const category: CategoryConfig = {
    id: SEED_CATEGORY_ID,
    name: '${cat.name}',
    dimensions: [
${dimLines}
    ],
    createdAt: now,
    updatedAt: now,
  };

  const components: ComponentSpec[] = [
${compLines.join('\n')}
  ];

  saveCategories([...existing, category]);
  saveComponents([...loadComponents(), ...components]);
}
`
}

// ---- Vite plugin ----
function seedSyncPlugin() {
  return {
    name: 'seed-sync',
    configureServer(server: any) {
      server.middlewares.use('/__seed_sync', async (req: any, res: any) => {
        if (req.method !== 'POST') { res.statusCode = 405; res.end(); return }
        const chunks: Buffer[] = []
        for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
        try {
          const { categories, components } = JSON.parse(Buffer.concat(chunks).toString())
          const content = generateSeedTs(categories, components)
          writeFileSync(SEED_PATH, content, 'utf-8')
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ ok: true }))
        } catch (e) {
          res.statusCode = 500
          res.end(JSON.stringify({ error: String(e) }))
        }
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), seedSyncPlugin()],
  base: './',   // Electron 需要相對路徑
  test: {
    environment: 'node',
    globals: true,
  },
})
