'use client'
import { useEffect, useState, useRef } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function QuotePDFPage() {
  const { id } = useParams()
  const searchParams = useSearchParams()
  const quoteId = searchParams.get('quote_id')
  const printRef = useRef<HTMLDivElement>(null)

  const [quote, setQuote] = useState<any>(null)
  const [negotiation, setNegotiation] = useState<any>(null)
  const [vehicle, setVehicle] = useState<any>(null)
  const [customer, setCustomer] = useState<any>(null)
  const [company, setCompany] = useState<any>({
    name: 'Brain Base',
    address: '〒000-0000 住所を設定してください',
    tel: '000-000-0000',
    fax: '000-000-0000',
    tax_number: '',
  })

  useEffect(() => {
    const fetchAll = async () => {
      const { data: neg } = await supabase.from('negotiations')
        .select(`*, customers(*), vehicles(*, master_makers(name), master_models(name))`)
        .eq('id', id).single()
      setNegotiation(neg)
      setCustomer(neg?.customers)
      setVehicle(neg?.vehicles)

      if (quoteId) {
        const { data: q } = await supabase.from('quotes').select('*').eq('id', quoteId).single()
        setQuote(q)
      }
    }
    fetchAll()
  }, [id, quoteId])

  const handlePrint = () => window.print()

  if (!quote || !vehicle || !customer) return <div style={{ padding: '2rem' }}>読み込み中...</div>

  const today = new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' })
  const quoteNo = `BB-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}-${(id as string).slice(-4).toUpperCase()}`

  const vehiclePrice = quote.車体価格 ?? 0
  const miscFees = quote.諸費用合計 ?? 0
  const optionsTotal = 0
  const taxableTotal = vehiclePrice + miscFees + optionsTotal
  const consumptionTax = Math.floor(taxableTotal * 0.1)
  const legalFees = (quote.自動車税 ?? 0) + (quote.重量税 ?? 0) + (quote.自賠責保険 ?? 0) + (quote.登録費用 ?? 0)
  const grandTotal = taxableTotal + consumptionTax + legalFees

  const s = {
    page: { width: '210mm', minHeight: '297mm', margin: '0 auto', background: 'white', padding: '12mm 14mm', boxSizing: 'border-box' as const, fontFamily: '"Hiragino Sans", "Yu Gothic", sans-serif', fontSize: '10pt', color: '#1a1a1a' },
    title: { textAlign: 'center' as const, fontSize: '22pt', fontWeight: 700, letterSpacing: '0.5em', marginBottom: '6mm' },
    headerGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8mm', marginBottom: '6mm' },
    customerName: { fontSize: '16pt', fontWeight: 700, marginBottom: '2mm' },
    sectionTitle: { background: '#1a1a2e', color: 'white', padding: '3px 10px', fontSize: '9pt', fontWeight: 600, marginBottom: '4px' },
    table: { width: '100%', borderCollapse: 'collapse' as const, fontSize: '9pt' },
    td: { padding: '3px 6px', border: '1px solid #ddd' },
    tdLabel: { padding: '3px 6px', border: '1px solid #ddd', background: '#f5f5f5', fontWeight: 500, whiteSpace: 'nowrap' as const },
    amountRow: { display: 'flex', justifyContent: 'space-between', padding: '3px 6px', borderBottom: '1px solid #eee', fontSize: '9pt' },
    totalBox: { background: '#1a1a2e', color: 'white', padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px', borderRadius: '4px' },
  }

  return (
    <>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #print-area, #print-area * { visibility: visible; }
          #print-area { position: absolute; left: 0; top: 0; width: 100%; }
          #no-print { display: none; }
          @page { size: A4; margin: 0; }
        }
      `}</style>

      {/* 印刷ボタン */}
      <div id="no-print" style={{ padding: '1rem 2rem', background: '#f8f9fa', borderBottom: '1px solid #eee', display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <button onClick={handlePrint} style={{ padding: '10px 24px', background: '#1a1a2e', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>
          🖨️ PDF印刷・保存
        </button>
        <a href={`/negotiations/${id}`} style={{ fontSize: '13px', color: '#888', textDecoration: 'none' }}>← 商談に戻る</a>
      </div>

      <div id="print-area" ref={printRef} style={s.page}>
        {/* タイトル */}
        <div style={s.title}>御　見　積　書</div>

        {/* 発行日・見積番号 */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: '9pt', marginBottom: '6mm', gap: '16px' }}>
          <span>発行日　{today}</span>
          <span>見積書番号　{quoteNo}</span>
        </div>

        {/* ヘッダー：顧客 + 会社 */}
        <div style={s.headerGrid}>
          {/* 左：顧客情報 */}
          <div>
            <div style={s.customerName}>{customer.氏名}　様</div>
            <div style={{ fontSize: '9pt', color: '#555', lineHeight: 1.8 }}>
              <div>〒{customer.住所?.slice(0, 7) ?? ''}</div>
              <div>{customer.住所?.slice(7) ?? ''}</div>
              <div>TEL {customer.電話番号 ?? ''}</div>
              <div style={{ marginTop: '4px', color: '#aaa' }}>事業者登録番号</div>
            </div>
          </div>
          {/* 右：会社情報 */}
          <div style={{ textAlign: 'right' as const }}>
            <div style={{ fontSize: '13pt', fontWeight: 700, marginBottom: '2mm' }}>{company.name}</div>
            <div style={{ fontSize: '9pt', color: '#555', lineHeight: 1.8 }}>
              <div>{company.address}</div>
              <div>TEL {company.tel}　FAX {company.fax}</div>
              <div>事業者登録番号 {company.tax_number}</div>
            </div>
          </div>
        </div>

        {/* 車両明細 + 顧客・見積情報 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6mm', marginBottom: '5mm' }}>
          {/* 車両明細 */}
          <div>
            <div style={s.sectionTitle}>車両明細</div>
            <table style={s.table}>
              <tbody>
                <tr><td style={s.tdLabel}>車名</td><td style={s.td} colSpan={3}>{vehicle.master_makers?.name}　{vehicle.master_models?.name}</td></tr>
                <tr><td style={s.tdLabel}>車台番号</td><td style={s.td} colSpan={3}>{vehicle.chassis_number ?? '—'}</td></tr>
                <tr>
                  <td style={s.tdLabel}>型式</td><td style={s.td}>{vehicle.model_type ?? '—'}</td>
                  <td style={s.tdLabel}>年式</td><td style={s.td}>{vehicle.year ?? '—'}</td>
                </tr>
                <tr>
                  <td style={s.tdLabel}>外装色</td><td style={s.td}>{vehicle.color ?? '—'}</td>
                  <td style={s.tdLabel}>走行距離</td><td style={s.td}>{vehicle.mileage ? vehicle.mileage.toLocaleString() + 'km' : '—'}</td>
                </tr>
                <tr>
                  <td style={s.tdLabel}>排気量</td><td style={s.td}>{vehicle.displacement ?? '—'}</td>
                  <td style={s.tdLabel}>車検</td><td style={s.td}>{vehicle.inspection_date ?? '—'}</td>
                </tr>
                <tr>
                  <td style={s.tdLabel}>シフト</td><td style={s.td}>{vehicle.shift ?? '—'}</td>
                  <td style={s.tdLabel}>修理歴</td><td style={s.td}>{vehicle.repair_history ? '有' : '無'}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* 顧客・見積情報 */}
          <div>
            <div style={s.sectionTitle}>見積情報</div>
            <table style={s.table}>
              <tbody>
                <tr><td style={s.tdLabel}>顧客名</td><td style={s.td}>{customer.氏名}　様</td></tr>
                <tr><td style={s.tdLabel}>生年月日</td><td style={s.td}>{customer.生年月日 ?? '　'}</td></tr>
                <tr><td style={s.tdLabel}>見積発行店舗</td><td style={s.td}>{company.name}</td></tr>
                <tr><td style={s.tdLabel}>見積担当</td><td style={s.td}>　</td></tr>
                <tr><td style={s.tdLabel}>有効期限</td><td style={s.td}>{new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('ja-JP')}</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* 価格サマリー */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6mm', marginBottom: '5mm' }}>
          {/* 左：課税・非課税サマリー */}
          <div>
            <div style={s.sectionTitle}>販売価格</div>
            <div style={{ border: '1px solid #ddd', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', background: '#f5f5f5', padding: '3px 6px', fontSize: '8pt', fontWeight: 600, gap: '8px' }}>
                <span>課税</span><span>金額</span><span>消費税10%</span>
              </div>
              {[
                { label: '車両価格 (A)', value: vehiclePrice, tax: Math.floor(vehiclePrice * 0.1) },
                { label: '諸費用等合計 (B)', value: miscFees, tax: Math.floor(miscFees * 0.1) },
                { label: '特別仕様価格 (C)', value: optionsTotal, tax: Math.floor(optionsTotal * 0.1) },
              ].map((r, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', padding: '3px 6px', borderTop: '1px solid #eee', fontSize: '9pt', gap: '8px' }}>
                  <span>{r.label}</span>
                  <span style={{ textAlign: 'right' as const }}>{r.value.toLocaleString()}円</span>
                  <span style={{ textAlign: 'right' as const }}>{r.tax.toLocaleString()}円</span>
                </div>
              ))}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', padding: '3px 6px', borderTop: '1px solid #ddd', background: '#f5f5f5', fontWeight: 600, fontSize: '9pt', gap: '8px' }}>
                <span>小計</span>
                <span style={{ textAlign: 'right' as const }}>{taxableTotal.toLocaleString()}円</span>
                <span style={{ textAlign: 'right' as const }}>{consumptionTax.toLocaleString()}円</span>
              </div>
              <div style={{ padding: '3px 6px', borderTop: '1px solid #ddd', fontSize: '9pt', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 600 }}>課税対象合計（税込）10%</span>
                <span style={{ fontWeight: 600 }}>{(taxableTotal + consumptionTax).toLocaleString()}円</span>
              </div>
              <div style={{ padding: '3px 6px', borderTop: '1px solid #eee', fontSize: '9pt', display: 'flex', justifyContent: 'space-between', color: '#555' }}>
                <span>内消費税合計 10%</span>
                <span>{consumptionTax.toLocaleString()}円</span>
              </div>
              <div style={{ padding: '3px 6px', borderTop: '1px solid #ddd', fontSize: '9pt', display: 'flex', justifyContent: 'space-between', background: '#f5f5f5' }}>
                <span style={{ fontWeight: 600 }}>非課税　法定費用等合計 (D)</span>
                <span style={{ fontWeight: 600 }}>{legalFees.toLocaleString()}円　非課税</span>
              </div>
            </div>
            <div style={s.totalBox}>
              <span style={{ fontSize: '11pt', fontWeight: 600 }}>お支払い総額　A+B+C+D</span>
              <span style={{ fontSize: '16pt', fontWeight: 700 }}>{grandTotal.toLocaleString()}円</span>
            </div>
          </div>

          {/* 右：法定費用 */}
          <div>
            <div style={s.sectionTitle}>法定費用【非課税】(D)</div>
            <div style={{ border: '1px solid #ddd', borderRadius: '4px', overflow: 'hidden' }}>
              {[
                { label: '自動車税種別割', value: quote.自動車税 },
                { label: '自動車重量税', value: quote.重量税 },
                { label: '自賠責保険', value: quote.自賠責保険 },
                { label: '環境性能割/自動車取得税', value: 0 },
                { label: 'リサイクル預託金', value: quote.登録費用 },
                { label: '登録印紙代', value: 0 },
                { label: '新規検査印紙代', value: 0 },
                { label: '車庫証明印紙代', value: 0 },
                { label: '公正証書作成', value: 0 },
              ].map((r, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 6px', borderBottom: '1px solid #eee', fontSize: '9pt' }}>
                  <span>{r.label}</span>
                  <span>{r.value ? r.value.toLocaleString() + '円' : ''}</span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 6px', background: '#f5f5f5', fontWeight: 600, fontSize: '9pt' }}>
                <span>小計</span>
                <span>{legalFees.toLocaleString()}円</span>
              </div>
            </div>
          </div>
        </div>

        {/* 諸費用詳細 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6mm', marginBottom: '5mm' }}>
          {/* 特別仕様明細 */}
          <div>
            <div style={s.sectionTitle}>特別仕様明細 (C)</div>
            <table style={{ ...s.table, border: '1px solid #ddd' }}>
              <thead>
                <tr style={{ background: '#f5f5f5' }}>
                  <th style={{ ...s.td, fontWeight: 600 }}>付属品</th>
                  <th style={{ ...s.td, fontWeight: 600, textAlign: 'right' as const }}>金額</th>
                  <th style={{ ...s.td, fontWeight: 600, textAlign: 'right' as const }}>消費税</th>
                </tr>
              </thead>
              <tbody>
                {[1,2,3,4,5].map(i => (
                  <tr key={i}><td style={s.td}>　</td><td style={s.td}></td><td style={s.td}></td></tr>
                ))}
                <tr style={{ background: '#f5f5f5' }}>
                  <td style={{ ...s.td, fontWeight: 600 }}>付属品小計</td>
                  <td style={{ ...s.td, textAlign: 'right' as const, fontWeight: 600 }}>{optionsTotal.toLocaleString()}円</td>
                  <td style={{ ...s.td, textAlign: 'right' as const }}>{Math.floor(optionsTotal * 0.1).toLocaleString()}円</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* 諸費用詳細 */}
          <div>
            <div style={s.sectionTitle}>諸費用詳細【課税】(B)</div>
            <div style={{ border: '1px solid #ddd', borderRadius: '4px', overflow: 'hidden' }}>
              {[
                { label: '未経過自動車税相当額', value: 0 },
                { label: '未経過自賠責相当額', value: 0 },
                { label: '登録代行費用', value: quote.登録費用 },
                { label: '県外登録費用', value: 0 },
                { label: '車庫証明代行費用', value: 0 },
                { label: '不動産手続代行費用', value: 0 },
                { label: '書類作成費用', value: 0 },
                { label: '下取車諸手続費用', value: 0 },
                { label: '納車代行費用', value: 0 },
                { label: 'オークション手数料', value: 0 },
                { label: 'その他', value: 0 },
              ].map((r, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', padding: '3px 6px', borderBottom: '1px solid #eee', fontSize: '9pt', gap: '8px' }}>
                  <span>{r.label}</span>
                  <span style={{ textAlign: 'right' as const }}>{r.value ? r.value.toLocaleString() + '円' : ''}</span>
                  <span style={{ textAlign: 'right' as const }}>{r.value ? Math.floor(r.value * 0.1).toLocaleString() + '円' : ''}</span>
                </div>
              ))}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', padding: '3px 6px', background: '#f5f5f5', fontWeight: 600, fontSize: '9pt', gap: '8px' }}>
                <span>小計</span>
                <span style={{ textAlign: 'right' as const }}>{miscFees.toLocaleString()}円</span>
                <span style={{ textAlign: 'right' as const }}>{Math.floor(miscFees * 0.1).toLocaleString()}円</span>
              </div>
            </div>

            {/* 支払総額 */}
            <div style={{ ...s.totalBox, marginTop: '6mm' }}>
              <span style={{ fontSize: '11pt', fontWeight: 600 }}>お支払い総額 (E)</span>
              <span style={{ fontSize: '16pt', fontWeight: 700 }}>{grandTotal.toLocaleString()}円</span>
            </div>
          </div>
        </div>

        {/* 振込先・注意事項 */}
        <div style={{ border: '1px solid #ddd', borderRadius: '4px', padding: '8px 12px', fontSize: '8pt', color: '#555', marginTop: '4mm' }}>
          <div style={{ fontWeight: 600, marginBottom: '4px' }}>【振込先】</div>
          <div>銀行名・支店名・口座番号は設定画面で登録してください</div>
          <div style={{ marginTop: '6px', borderTop: '1px solid #eee', paddingTop: '6px' }}>
            ※振込手数料はお客様負担にてお願いします。<br/>
            ※この見積の有効期限は記載がない場合有効ではありません。<br/>
            上記見積りについての御質問・御相談は発行店舗担当へご連絡お願い致します。
          </div>
        </div>
      </div>
    </>
  )
}