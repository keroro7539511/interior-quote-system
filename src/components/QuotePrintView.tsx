import { useEffect } from 'react';
import type React from 'react';
import type { Quote, QuoteItem, ComponentCalcResult } from '../types';
import eiffelLogo from '../assets/eiffel-logo.jpg';

interface Props { quote: Quote; onClose: () => void; }

/* ─── 常數 ─────────────────────────────────────────────────── */
const CO = {
  en:      'EIFFEL SYSTEM  FURNITURE.KITCHEN FACILITIES.',
  addr:    '門市地址：新北市新店區北新路一段145號1樓',
  tel:     'TEL：02-2918-9333',
  fax:     'FAX：02-2918-9660',
  account: '匯款帳戶：清騰家具有限公司／聯邦銀行代號：803 安康分行／帳號：081-10-7001319',
  material:'本報價使用歐洲進口E1級V313防水、耐燃健康板材、8MM背板、德國HAFELE緩衝鉸鍊',
};

const TERMS_SUMMARY = [
  '1、本單及設計圖面經雙方同意簽約後，請客戶預付工程款30%訂金，基於誠信交易，訂金收訖概不退還。簽圖下單後付足總工程款90%，尾款10%於工程完竣一星期內驗收完成，壹次付清。',
  '2、櫃體板材十年保固、結構五金三年保固、其他配件一年保固。',
  '3、本報價單僅限本工程使用，煩請確認後簽名回傳。',
];
const TERMS_DETAIL = [
  '1、本單及設計圖面經雙方同意簽約後，請客戶預付工程款30%訂金，基於誠信交易，訂金收訖概不退還。餘款分二次付，於進料付足總工程款90%，尾款10%於工程完竣一星期內驗收完成，壹次付清。',
  '2、櫃體板材十年保固、結構五金三年保固、其他配件一年保固。',
  '3、本報價單僅限本工程使用，煩請確認後簽名回傳。',
];

const CAB_RATE = 1.35;
const YELLOW   = '#FFFF00';

/* ─── 工具 ─────────────────────────────────────────────────── */
function today() {
  const d = new Date();
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
}
function fmt(n: number) { return `$${Math.round(n).toLocaleString('zh-TW')}`; }
const DASH = '$ -';

function preLine(r: ComponentCalcResult) {
  return Math.round(r.unitPriceBeforeMultiplier * r.quantity);
}

/* ─── 腳板/側腳板/線板/腳粒 屬於「櫃體」區域（含 35% 施工費）── */
const CAB_FLAT_NAMES = new Set(['腳板', '側腳板', '線板', '腳粒']);

function isCabAddon(a: ComponentCalcResult): boolean {
  // non-flat 一定是櫃體；flat 中名稱在清單內的也算櫃體
  return a.componentType !== 'flat' || CAB_FLAT_NAMES.has(a.componentName);
}

/* ─── 規劃空間分組 ──────────────────────────────────────────── */
type SpaceGroup = { spaceName: string; items: QuoteItem[] };

function groupBySpace(items: QuoteItem[]): SpaceGroup[] {
  const map = new Map<string, QuoteItem[]>();
  for (const it of items) {
    const key = it.spaceName || it.categoryName;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(it);
  }
  return Array.from(map.entries()).map(([spaceName, items]) => ({ spaceName, items }));
}

/* ─── 計算（以空間群組為單位）────────────────────────────────── */
function cabPreSub(item: QuoteItem): number {
  return preLine(item.body) +
    item.addons.filter(a => isCabAddon(a) && a.quantity > 0)
               .reduce((s, a) => s + preLine(a), 0);
}
function hwSub(item: QuoteItem): number {
  return item.addons.filter(a => !isCabAddon(a) && a.quantity > 0)
                    .reduce((s, a) => s + preLine(a), 0);
}
// 群組合計（彙總表用）
function groupCabFinal(g: SpaceGroup): number {
  return Math.round(g.items.reduce((s, it) => s + cabPreSub(it), 0) * CAB_RATE);
}
function groupHwSub(g: SpaceGroup): number {
  return g.items.reduce((s, it) => s + hwSub(it), 0);
}

/* ─── 明細列型別 ─────────────────────────────────────────────── */
type Row = {
  name: string; bold?: boolean;
  W?: number; D?: number; H?: number;
  qty?: number; up?: number; lt: number;
  note?: string;
};
function buildCabRows(item: QuoteItem): Row[] {
  const { W, H, D } = item.inputs;
  const rows: Row[] = [{
    name: item.body.componentName, bold: true,
    W, D, H, qty: 1,
    up: item.body.unitPriceBeforeMultiplier,
    lt: preLine(item.body),
  }];
  for (const a of item.addons.filter(a => isCabAddon(a) && a.quantity > 0)) {
    const hasDims = a.componentType !== 'flat';
    const dims = a.componentType === 'door'  ? { W: Math.round(W / a.quantity), D: 18, H }
               : a.componentType === 'shelf' ? { W, D, H: 18 }
               : { W, D, H };
    rows.push({
      name: a.componentName,
      ...(hasDims ? dims : {}),
      qty: a.quantity, up: a.unitPriceBeforeMultiplier, lt: preLine(a),
    });
  }
  return rows;
}
function buildHwRows(item: QuoteItem): Row[] {
  return item.addons.filter(a => !isCabAddon(a) && a.quantity > 0).map(a => ({
    name: a.componentName, qty: a.quantity,
    up: a.unitPriceBeforeMultiplier, lt: preLine(a),
  }));
}
// 群組版：合併同空間所有 items 的明細列
function buildGroupCabRows(g: SpaceGroup): Row[] {
  return g.items.flatMap(it => buildCabRows(it));
}
function buildGroupHwRows(g: SpaceGroup): Row[] {
  return g.items.flatMap(it => buildHwRows(it));
}

/* ─── 印刷樣式（全用 pt 確保列印正確）─────────────────────────
   修正 7：所有 fontSize 改 pt；表格欄用百分比
──────────────────────────────────────────────────────────────── */
const B = '0.5pt solid #444';
const T: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' };

// 修正 7：fontSize 全部改 pt
const tdBase = (o?: React.CSSProperties): React.CSSProperties => ({
  border: B, padding: '1pt 3pt',
  fontSize: '11pt', fontFamily: "'標楷體','DFKai-SB','BiauKai','霞鹜文楷','LXGW WenKai','KaiTi',serif",
  verticalAlign: 'middle', lineHeight: 1.35,
  whiteSpace: 'nowrap', overflow: 'hidden',
  ...o,
});
const thBase = (o?: React.CSSProperties): React.CSSProperties => ({
  ...tdBase(o), background: '#d0d0d0', fontWeight: 'bold', textAlign: 'center',
});

/* ═══════════════════════════════════════════════════════════════
   共用頁首
   修正 5：Logo 置中 + 修正 6：store info space-between + 修正 7：pt 字級
═══════════════════════════════════════════════════════════════ */
function Header({ dateStr }: { dateStr: string }) {
  return (
    <div className="page-header">
      {/* 修正 5：Logo 置中，列印日期 absolute 右上 */}
      <div style={{ position: 'relative', textAlign: 'center', lineHeight: 0, marginBottom: '4pt' }}>
        <img src={eiffelLogo} alt="愛菲爾"
          style={{ height: '42pt', objectFit: 'contain', display: 'inline-block' }} />
        <span style={{
          position: 'absolute', top: 0, right: 0,
          fontSize: '9pt', lineHeight: 1.5,
          fontFamily: "'標楷體','DFKai-SB','BiauKai','霞鹜文楷','LXGW WenKai','KaiTi',serif",
        }}>
          列印日期{dateStr}
        </span>
      </div>

      {/* EIFFEL SYSTEM 英文，置中 */}
      <div style={{
        textAlign: 'center', fontSize: '12pt', fontWeight: 'bold',
        letterSpacing: '1pt', marginBottom: '2pt',
        fontFamily: "'標楷體','DFKai-SB','BiauKai','霞鹜文楷','LXGW WenKai','KaiTi',serif",
      }}>
        {CO.en}
      </div>

      {/* 修正 6：門市地址 / TEL / FAX 分散 */}
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        fontSize: '10pt', fontFamily: "'標楷體','DFKai-SB','BiauKai','霞鹜文楷','LXGW WenKai','KaiTi',serif",
      }}>
        <span>{CO.addr}</span>
        <span>{CO.tel}</span>
        <span>{CO.fax}</span>
      </div>

      {/* 粗分隔線 */}
      <div style={{ borderTop: '2pt solid #222', marginTop: '4pt' }} />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   彙總頁（橫向）
═══════════════════════════════════════════════════════════════ */
function SummaryPage({ quote, groups, dateStr }: { quote: Quote; groups: SpaceGroup[]; dateStr: string }) {
  const ROWS = 10;
  const padded = [
    ...groups,
    ...Array(Math.max(0, ROWS - groups.length)).fill(null),
  ] as (SpaceGroup | null)[];

  const grandCab = groups.reduce((s, g) => s + groupCabFinal(g), 0);
  const grandHw  = groups.reduce((s, g) => s + groupHwSub(g),   0);
  const grandTot = grandCab + grandHw;

  return (
    <div className="sheet sheet-ls">
      <Header dateStr={dateStr} />

      {/* 修正 7：主標題 16pt */}
      <div style={{
        textAlign: 'center', fontSize: '16pt', fontWeight: 'bold',
        letterSpacing: '8pt', margin: '6pt 0',
        fontFamily: "'標楷體','DFKai-SB','BiauKai','霞鹜文楷','LXGW WenKai','KaiTi',serif",
      }}>
        報　價　單　彙　總　表
      </div>

      {/* 修正 3：客戶資訊純文字，修正 7：14pt */}
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        fontSize: '13pt', marginBottom: '6pt', lineHeight: 1.9,
        fontFamily: "'標楷體','DFKai-SB','BiauKai','霞鹜文楷','LXGW WenKai','KaiTi',serif",
      }}>
        <div>
          <div>客 戶 名 稱：{quote.customer.name}</div>
          <div>工 地 地 址：{quote.customer.address}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div>報價日期：{dateStr}</div>
          <div>聯絡電話：{quote.customer.phone ?? ''}</div>
          <div>製單人員：{quote.customer.project ?? ''}</div>
        </div>
      </div>

      {/* 主表格 */}
      <table style={T}>
        <colgroup>
          <col style={{ width: '4%' }} />
          <col style={{ width: '24%' }} />
          <col style={{ width: '18%' }} />
          <col style={{ width: '18%' }} />
          <col style={{ width: '18%' }} />
          <col style={{ width: '18%' }} />
        </colgroup>
        <thead>
          <tr>
            <th style={thBase()}>項次</th>
            <th style={thBase()}>規　劃　空　間</th>
            <th style={thBase()}>櫃　體</th>
            <th style={thBase()}>五 金 配 件</th>
            <th style={thBase()}>合　計</th>
            <th style={thBase()}>備　　　　　　　註</th>
          </tr>
        </thead>
        <tbody>
          {padded.map((g, i) => (
            <tr key={i}>
              <td style={tdBase({ textAlign: 'center' })}>{i + 1}</td>
              <td style={tdBase()}>{g?.spaceName ?? ''}</td>
              <td style={tdBase({ textAlign: 'right' })}>{fmt(g ? groupCabFinal(g) : 0)}</td>
              <td style={tdBase({ textAlign: 'right' })}>{fmt(g ? groupHwSub(g)   : 0)}</td>
              <td style={tdBase({ textAlign: 'right' })}>{fmt(g ? groupCabFinal(g) + groupHwSub(g) : 0)}</td>
              {i === 0 && (
                <td rowSpan={ROWS} style={tdBase({
                  textAlign: 'center', verticalAlign: 'middle',
                  color: '#0000cc', fontWeight: 'bold',
                })}>
                  系統板材皆為<br />E1-V313
                </td>
              )}
            </tr>
          ))}
          <tr>
            <td colSpan={2} style={tdBase({ textAlign: 'right', fontWeight: 'bold' })}>小計</td>
            <td style={tdBase({ textAlign: 'right', fontWeight: 'bold' })}>{fmt(grandCab)}</td>
            <td style={tdBase({ textAlign: 'right', fontWeight: 'bold' })}>{fmt(grandHw)}</td>
            <td style={tdBase({ textAlign: 'right', fontWeight: 'bold' })}>{fmt(grandTot)}</td>
            {/* 修正：成交價靠左 */}
            <td style={tdBase({ textAlign: 'left', fontWeight: 'bold' })}>成交價：</td>
          </tr>
        </tbody>
      </table>

      {/* 備註 + 匯款 */}
      <div style={{ marginTop: '6pt', fontSize: '10pt', lineHeight: 1.85, fontFamily: "'標楷體','DFKai-SB','BiauKai','霞鹜文楷','LXGW WenKai','KaiTi',serif" }}>
        {TERMS_SUMMARY.map((t, i) => <div key={i}>{t}</div>)}
        <div style={{ marginTop: '2pt' }}>{CO.account}</div>
      </div>

      {/* 修正 3：簽名區純文字虛線，修正 7：14pt */}
      <div style={{ display: 'flex', marginTop: '12pt', gap: '12pt' }}>
        {(['客戶簽名：', '設計師簽名：', '簽約日期：　　　年　　　月　　　日'] as const).map((label, i) => (
          <div key={i} style={{ flex: 1, textAlign: 'center', fontSize: '13pt', fontFamily: "'標楷體','DFKai-SB','BiauKai','霞鹜文楷','LXGW WenKai','KaiTi',serif" }}>
            <div style={{ marginBottom: '4pt' }}>{label}</div>
            <div style={{ borderBottom: '1pt dashed #555', height: '18pt' }} />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   明細頁（直向）
═══════════════════════════════════════════════════════════════ */
function DetailPage({
  quote, spaceName, category, rows, dateStr,
}: {
  quote: Quote; spaceName: string;
  category: '櫃體' | '五金';
  rows: Row[]; dateStr: string;
}) {
  const MAX = 32;
  const padded: (Row | null)[] = [...rows, ...Array(Math.max(0, MAX - rows.length)).fill(null)];
  const preSubtotal = rows.reduce((s, r) => s + r.lt, 0);
  const finalAmt = category === '櫃體' ? Math.round(preSubtotal * CAB_RATE) : preSubtotal;

  return (
    <div className="sheet sheet-pt">
      <Header dateStr={dateStr} />

      {/* 修正 7：標題 16pt，類別右上角 */}
      <div style={{ display: 'flex', alignItems: 'baseline', margin: '2pt 0 6pt' }}>
        <div style={{ flex: 1 }} />
        <div style={{ fontSize: '16pt', fontWeight: 'bold', letterSpacing: '8pt', fontFamily: "'標楷體','DFKai-SB','BiauKai','霞鹜文楷','LXGW WenKai','KaiTi',serif" }}>
          報　價　單
        </div>
        <div style={{ flex: 1, textAlign: 'right', fontSize: '12pt', fontWeight: 'bold', fontFamily: "'標楷體','DFKai-SB','BiauKai','霞鹜文楷','LXGW WenKai','KaiTi',serif" }}>
          {category}
        </div>
      </div>

      {/* 修正 3：客戶資訊純文字，修正 7：13pt */}
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        fontSize: '13pt', marginBottom: '6pt', lineHeight: 1.9,
        fontFamily: "'標楷體','DFKai-SB','BiauKai','霞鹜文楷','LXGW WenKai','KaiTi',serif",
      }}>
        <div>
          <div>客 戶 名 稱：{quote.customer.name}</div>
          <div>工 地 地 址：{quote.customer.address}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div>報價日期：{dateStr}</div>
          <div>製單人員：{quote.customer.project ?? ''}</div>
          <div>規劃空間：{spaceName}</div>
        </div>
      </div>

      {/* 明細表 32 列 — 修正 8：fixed + 規格欄寬，避免溢出 */}
      <table style={T}>
        <colgroup>
          <col style={{ width: '5%' }} />   {/* 項次 */}
          <col style={{ width: '20%' }} />  {/* 品名 */}
          <col style={{ width: '7%' }} />   {/* 寬 */}
          <col style={{ width: '7%' }} />   {/* 深 */}
          <col style={{ width: '7%' }} />   {/* 高 */}
          <col style={{ width: '8%' }} />   {/* 數量 */}
          <col style={{ width: '11%' }} />  {/* 單價 */}
          <col style={{ width: '12%' }} />  {/* 複價 */}
          <col style={{ width: '23%' }} />  {/* 備註 */}
        </colgroup>
        <thead>
          <tr>
            <th style={thBase()}>項次</th>
            <th style={thBase()}>品　名</th>
            <th style={thBase()}>寬</th>
            <th style={thBase()}>深</th>
            <th style={thBase()}>高</th>
            <th style={thBase()}>數量</th>
            <th style={thBase()}>單價</th>
            <th style={thBase()}>複價</th>
            <th style={thBase()}>備　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　注</th>
          </tr>
        </thead>
        <tbody>
          {padded.map((r, i) => (
            <tr key={i}>
              <td style={tdBase({ textAlign: 'center' })}>{i + 1}</td>
              <td style={tdBase({ fontWeight: r?.bold ? 'bold' : 'normal' })}>{r?.name ?? ''}</td>
              <td style={tdBase({ textAlign: 'center' })}>{r?.W ?? ''}</td>
              <td style={tdBase({ textAlign: 'center' })}>{r?.D ?? ''}</td>
              <td style={tdBase({ textAlign: 'center' })}>{r?.H ?? ''}</td>
              <td style={tdBase({ textAlign: 'center' })}>{r?.qty ?? ''}</td>
              <td style={tdBase({ textAlign: 'right' })}>
                {r?.up != null ? r.up.toLocaleString('zh-TW') : ''}
              </td>
              <td style={tdBase({ textAlign: 'right' })}>
                {r != null ? fmt(r.lt) : DASH}
              </td>
              <td style={tdBase()}>{r?.note ?? ''}</td>
            </tr>
          ))}

          {/* 小計（白底）*/}
          <tr>
            <td colSpan={7} style={tdBase({ textAlign: 'right' })}>小計</td>
            <td style={tdBase({ textAlign: 'right', fontWeight: 'bold' })}>{fmt(preSubtotal)}</td>
            <td style={tdBase()} />
          </tr>

          {/* 修正 2：黃底末列，櫃體=施工含運費(35%)，五金=五金小計 */}
          <tr>
            <td colSpan={7} style={tdBase({ textAlign: 'right', background: YELLOW })}>
              {category === '櫃體' ? '施工含運費(35%)' : '五金小計'}
            </td>
            <td style={tdBase({ textAlign: 'right', fontWeight: 'bold', background: YELLOW })}>{fmt(finalAmt)}</td>
            <td style={tdBase({ background: YELLOW })} />
          </tr>
        </tbody>
      </table>

      {/* 材料聲明 */}
      <div style={{
        border: B, borderTop: 'none',
        textAlign: 'center', fontWeight: 'bold',
        fontSize: '10pt', padding: '3pt 0',
        fontFamily: "'標楷體','DFKai-SB','BiauKai','霞鹜文楷','LXGW WenKai','KaiTi',serif",
      }}>
        {CO.material}
      </div>

      {/* 頁尾備註 */}
      <div style={{ marginTop: '5pt', fontSize: '10pt', lineHeight: 1.85, fontFamily: "'標楷體','DFKai-SB','BiauKai','霞鹜文楷','LXGW WenKai','KaiTi',serif" }}>
        {TERMS_DETAIL.map((t, i) => <div key={i}>{t}</div>)}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   主元件
═══════════════════════════════════════════════════════════════ */
export default function QuotePrintView({ quote, onClose }: Props) {
  const dateStr = today();
  useEffect(() => {
    document.title = `報價單_${quote.customer.name}`;
    return () => { document.title = '室內設計報價系統'; };
  }, [quote]);

  return (
    <div style={{ minHeight: '100vh', background: '#777' }}>
      {/* 工具列 */}
      <div className="no-print" style={{
        position: 'sticky', top: 0, zIndex: 10,
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '10px 20px', background: 'white',
        borderBottom: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,.1)',
      }}>
        <button onClick={onClose} style={{ fontSize: 14, color: '#64748b', background: 'none', border: 'none', cursor: 'pointer' }}>
          ← 返回
        </button>
        <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: '#334155' }}>
          列印預覽 — {quote.customer.name}　愛菲爾報價單
        </span>
        <span style={{ fontSize: 11, color: '#f59e0b', background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 6, padding: '3px 8px' }}>
          ⚠ 列印時請關閉「頁首及頁尾」
        </span>
        <button onClick={() => window.print()} style={{
          padding: '6px 18px', background: '#2563eb', color: 'white',
          border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: 'pointer',
        }}>
          列印 / 存 PDF
        </button>
      </div>

      <div style={{ padding: '28px 20px' }}>
        {/* 依規劃空間分組：相同空間合併成一對明細頁 */}
        {(() => {
          const groups = groupBySpace(quote.items);
          return (
            <>
              <SummaryPage quote={quote} groups={groups} dateStr={dateStr} />
              {groups.map(g => (
                <div key={g.spaceName}>
                  <DetailPage quote={quote} spaceName={g.spaceName} category="櫃體"
                    rows={buildGroupCabRows(g)} dateStr={dateStr} />
                  <DetailPage quote={quote} spaceName={g.spaceName} category="五金"
                    rows={buildGroupHwRows(g)} dateStr={dateStr} />
                </div>
              ))}
            </>
          );
        })()}
      </div>

      <style>{`
        /* ── 螢幕預覽 ── */
        .sheet {
          background: white;
          margin: 0 auto 28px;
          box-shadow: 0 2px 16px rgba(0,0,0,.22);
          padding: 20px 28px 16px;
          box-sizing: border-box;
          font-family: '標楷體','DFKai-SB','BiauKai','霞鹜文楷','LXGW WenKai','KaiTi',serif;
        }
        /* 直向：A4 portrait */
        .sheet-pt {
          width: 794px;
          min-height: 1050px;
        }
        /* 橫向：A4 landscape */
        .sheet-ls {
          width: 1060px;
          min-height: 720px;
        }

        /* ── 列印 ──
           修正 1：@page margin:0 → 瀏覽器無空間放頁首頁尾
           修正 7：font-size 改 pt，width:100% 防縮放
        ── */
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; margin: 0; }

          /* 修正 1：@page margin:0 讓瀏覽器無空間放頁首頁尾 */
          /* 修正 8：直向給 12mm 上下、14mm 左右，讓可列印區 = 182mm = 516pt */
          @page    { size: A4 portrait;  margin: 12mm 14mm; }
          @page ls { size: A4 landscape; margin: 12mm 14mm; }
          .sheet-ls { page: ls; }

          /* 修正 7+8：width:100%，padding:0（邊距由 @page margin 管） */
          .sheet, .sheet-pt, .sheet-ls {
            width: 100% !important;
            min-height: unset !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            page-break-after: always;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .sheet:last-child { page-break-after: avoid; }
          .print-date { position: absolute; top: 0; right: 0; }
          .page-header { position: relative; }
        }
      `}</style>
    </div>
  );
}
