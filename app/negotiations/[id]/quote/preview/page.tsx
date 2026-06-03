'use client'
import { useEffect, useState } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function QuotePreviewPage() {
  const { id } = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const quoteId = searchParams.get('quote_id')

  const [quote, setQuote] = useState<any>(null)
  const [vehicle, setVehicle] = useState<any>(null)
  const [customer, setCustomer] = useState<any>(null)
  const [showFollowup, setShowFollowup] = useState(false)
  const [followupDate, setFollowupDate] = useState('')
  const [followupNote, setFollowupNote] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const fetchAll = async () => {
      if (!quoteId) return
      const { data: q } = await supabase.from('quotes').select('*').eq('id', quoteId).single()
      setQuote(q)

      const { data: neg } = await supabase.from('negotiations')
        .select('*, customers(*), vehicles(*, master_makers(name), master_models(name))')
        .eq('id', id as string).single()
      setCustomer(neg?.customers)
      setVehicle(neg?.vehicles)
    }
    fetchAll()
  }, [id, quoteId])

  const handleContract = () => {
  router.push(`/negotiations/${id}/contract`)
}

  const handleFollowup = async () => {
    if (!followupDate) { alert('連絡日を設定してください'); return }
    setLoading(true)
    await supabase.from('quotes').update({ status: '持ち越し', followup_date: followupDate, notes: followupNote }).eq('id', quoteId)
    router.push(`/negotiations/${id}`)
  }

  const handleEnd = async () => {
    if (!confirm('この見積りで終了しますか？')) return
    setLoading(true)
    await supabase.from('quotes').update({ status: '終了' }).eq('id', quoteId)
    router.push(`/negotiations/${id}`)
  }

  const handlePrint = () => window.print()

  if (!quote || !vehicle || !customer) return <div style={{ padding: '2rem' }}>読み込み中...</div>

  const today = new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' })
  const validUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('ja-JP')

  const taxableTotal = quote.taxable_total ?? 0
  const consumptionTax = quote.consumption_tax ?? 0
  const legalD = quote.non_taxable_total ?? 0
  const grandTotal = quote.grand_total ?? 0
  const vehiclePrice = quote.vehicle_price ?? 0
  const miscB = quote.misc_unpaid_auto_tax + quote.misc_unpaid_liability + quote.misc_registration_fee +
    quote.misc_out_of_pref_fee + quote.misc_garage_cert_fee + quote.misc_real_estate_fee +
    quote.misc_document_fee + quote.misc_trade_in_fee + quote.misc_delivery_fee +
    quote.misc_auction_fee + quote.misc_other_fee
  const optionsC = (quote.options ?? []).reduce((s: number, o: any) => s + o.price, 0)

  const s: any = {
    page: { width: '210mm', minHeight: '297mm', margin: '0 auto', background: 'white', padding: '10mm 12mm', boxSizing: 'border-box', fontFamily: '"Hiragino Sans", "Yu Gothic", sans-serif', fontSize: '9pt', color: '#1a1a1a' },
    sectionTitle: { background: '#1a1a2e', color: 'white', padding: '3px 8px', fontSize: '8pt', fontWeight: 600, marginBottom: '3px' },
    td: { padding: '3px 6px', border: '1px solid #ddd', fontSize: '8pt' },
    tdLabel: { padding: '3px 6px', border: '1px solid #ddd', background: '#f5f5f5', fontWeight: 500, fontSize: '8pt', whiteSpace: 'nowrap' },
  }

  return (
    <>
      <style>{`
  @media print {
    #action-bar { display: none !important; }
    nav { display: none !important; }
    body { margin: 0; }
  }
`}</style>

      {/* アクションバー */}
      <div id="action-bar" style={{ background: '#1a1a2e', padding: '1rem 2rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <Link href={`/negotiations/${id}`} style={{ color: '#aaa', fontSize: '13px', textDecoration: 'none' }}>← 商談に戻る</Link>
        <div style={{ flex: 1 }} />
        <button onClick={handlePrint}
          style={{ padding: '8px 20px', background: 'white', color: '#1a1a2e', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
          🖨️ PDF印刷・保存
        </button>
        <Link href={`/negotiations/${id}/quote?nv=${searchParams.get('nv') ?? ''}&vehicle=${vehicle?.id}&base=${quoteId}`}
          style={{ padding: '8px 20px', background: '#0070f3', color: 'white', borderRadius: '6px', fontSize: '13px', fontWeight: 600, textDecoration: 'none' }}>
          ✏️ 見積りを修正
        </Link>
        <button onClick={handleContract} disabled={loading}
          style={{ padding: '8px 20px', background: '#00a86b', color: 'white', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
          ✅ 契約書作成へ
        </button>
        <button onClick={() => setShowFollowup(!showFollowup)}
          style={{ padding: '8px 20px', background: '#e65100', color: 'white', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
          📅 数日持ち越し
        </button>
        <button onClick={handleEnd} disabled={loading}
          style={{ padding: '8px 20px', background: '#666', color: 'white', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
          🔚 見積で終了
        </button>
      </div>

      {/* 持ち越し設定 */}
      {showFollowup && (
        <div style={{ background: '#fff3e0', padding: '1rem 2rem', display: 'flex', gap: '1rem', alignItems: 'center', borderBottom: '1px solid #ffe0b2' }}>
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#e65100' }}>📅 次回連絡日</span>
          <input type="date" value={followupDate} onChange={e => setFollowupDate(e.target.value)}
            style={{ padding: '6px 10px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '13px' }} />
          <input type="text" value={followupNote} onChange={e => setFollowupNote(e.target.value)}
            placeholder="メモ（任意）"
            style={{ flex: 1, padding: '6px 10px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '13px' }} />
          <button onClick={handleFollowup} disabled={loading}
            style={{ padding: '8px 20px', background: '#e65100', color: 'white', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
            設定する
          </button>
        </div>
      )}

      {/* 見積書本体 */}
      <div style={s.page}>
        {/* タイトル */}
        <div style={{ textAlign: 'center', fontSize: '18pt', fontWeight: 700, letterSpacing: '0.5em', marginBottom: '4mm' }}>御　見　積　書</div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: '8pt', marginBottom: '4mm', gap: '16px' }}>
          <span>発行日　{today}</span>
          <span>見積書番号　{quote.quote_number}</span>
        </div>

        {/* 顧客・会社情報 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6mm', marginBottom: '4mm' }}>
          <div>
            <div style={{ fontSize: '14pt', fontWeight: 700, marginBottom: '2mm' }}>{customer.氏名}　様</div>
            <div style={{ fontSize: '8pt', color: '#555', lineHeight: 1.8 }}>
              <div>{customer.住所 ?? ''}</div>
              <div>TEL {customer.電話番号 ?? ''}</div>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '12pt', fontWeight: 700, marginBottom: '1mm' }}>Brain Base</div>
            <div style={{ fontSize: '8pt', color: '#555', lineHeight: 1.8 }}>
              <div>〒000-0000 住所を設定してください</div>
              <div>TEL 000-000-0000</div>
            </div>
          </div>
        </div>

        {/* 車両明細・見積情報 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4mm', marginBottom: '4mm' }}>
          <div>
            <div style={s.sectionTitle}>車両明細</div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                <tr><td style={s.tdLabel}>車名</td><td style={s.td} colSpan={3}>{vehicle.master_makers?.name}　{vehicle.master_models?.name}</td></tr>
                <tr><td style={s.tdLabel}>車台番号</td><td style={s.td} colSpan={3}>{vehicle.chassis_number ?? '—'}</td></tr>
                <tr>
                  <td style={s.tdLabel}>年式</td><td style={s.td}>{vehicle.year ?? '—'}</td>
                  <td style={s.tdLabel}>シフト</td><td style={s.td}>{vehicle.shift ?? '—'}</td>
                </tr>
                <tr>
                  <td style={s.tdLabel}>外装色</td><td style={s.td}>{vehicle.color ?? '—'}</td>
                  <td style={s.tdLabel}>修理歴</td><td style={s.td}>{vehicle.repair_history ? '有' : '無'}</td>
                </tr>
                <tr>
                  <td style={s.tdLabel}>走行距離</td><td style={s.td}>{vehicle.mileage ? vehicle.mileage.toLocaleString() + 'km' : '—'}</td>
                  <td style={s.tdLabel}>車検</td><td style={s.td}>{vehicle.inspection_date ?? '—'}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div>
            <div style={s.sectionTitle}>見積情報</div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                <tr><td style={s.tdLabel}>顧客名</td><td style={s.td}>{customer.氏名}　様</td></tr>
                <tr><td style={s.tdLabel}>見積担当</td><td style={s.td}>　</td></tr>
                <tr><td style={s.tdLabel}>有効期限</td><td style={s.td}>{validUntil}</td></tr>
                <tr><td style={s.tdLabel}>支払方法</td><td style={s.td}>{quote.payment_type ?? '—'}</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* 価格サマリー・法定費用 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4mm', marginBottom: '4mm' }}>
          {/* 左：課税サマリー */}
          <div>
            <div style={s.sectionTitle}>販売価格</div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f5f5f5' }}>
                  <th style={{ ...s.td, fontWeight: 600 }}>課税</th>
                  <th style={{ ...s.td, textAlign: 'right', fontWeight: 600 }}>金額</th>
                  <th style={{ ...s.td, textAlign: 'right', fontWeight: 600 }}>消費税10%</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { label: '車両価格 (A)', value: vehiclePrice },
                  { label: '諸費用等合計 (B)', value: miscB },
                  { label: '特別仕様価格 (C)', value: optionsC },
                ].map((r, i) => (
                  <tr key={i}>
                    <td style={s.td}>{r.label}</td>
                    <td style={{ ...s.td, textAlign: 'right' }}>{r.value.toLocaleString()}円</td>
                    <td style={{ ...s.td, textAlign: 'right' }}>{Math.floor(r.value * 0.1).toLocaleString()}円</td>
                  </tr>
                ))}
                <tr style={{ background: '#f5f5f5', fontWeight: 600 }}>
                  <td style={s.td}>小計</td>
                  <td style={{ ...s.td, textAlign: 'right' }}>{taxableTotal.toLocaleString()}円</td>
                  <td style={{ ...s.td, textAlign: 'right' }}>{consumptionTax.toLocaleString()}円</td>
                </tr>
                <tr>
                  <td style={{ ...s.td, fontWeight: 600 }} colSpan={2}>課税対象合計（税込）10%</td>
                  <td style={{ ...s.td, textAlign: 'right', fontWeight: 600 }}>{(taxableTotal + consumptionTax).toLocaleString()}円</td>
                </tr>
                <tr>
                  <td style={s.td} colSpan={2}>内消費税合計 10%</td>
                  <td style={{ ...s.td, textAlign: 'right', color: '#555' }}>{consumptionTax.toLocaleString()}円</td>
                </tr>
                <tr style={{ background: '#f5f5f5' }}>
                  <td style={{ ...s.td, fontWeight: 600 }} colSpan={2}>法定費用等合計 (D) 非課税</td>
                  <td style={{ ...s.td, textAlign: 'right', fontWeight: 600 }}>{legalD.toLocaleString()}円</td>
                </tr>
              </tbody>
            </table>
            <div style={{ background: '#1a1a2e', color: 'white', padding: '6px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '3px', borderRadius: '4px' }}>
              <span style={{ fontSize: '9pt', fontWeight: 600 }}>お支払い総額　A+B+C+D</span>
              <span style={{ fontSize: '14pt', fontWeight: 700 }}>{grandTotal.toLocaleString()}円</span>
            </div>
          </div>

          {/* 右：法定費用 */}
          <div>
            <div style={s.sectionTitle}>法定費用【非課税】(D)</div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                {[
                  { label: '自動車税種別割', value: quote.legal_auto_tax },
                  { label: '自動車重量税', value: quote.legal_weight_tax },
                  { label: '自賠責保険', value: quote.legal_liability_insurance },
                  { label: '環境性能割/自動車取得税', value: quote.legal_eco_tax },
                  { label: 'リサイクル預託金', value: quote.legal_recycle_deposit },
                  { label: '登録印紙代', value: quote.legal_registration_stamp },
                  { label: '新規検査印紙代', value: quote.legal_inspection_stamp },
                  { label: '車庫証明印紙代', value: quote.legal_garage_cert_stamp },
                  { label: '公正証書作成', value: quote.legal_notary_fee },
                  { label: 'その他', value: quote.legal_other },
                ].map((r, i) => (
                  <tr key={i}>
                    <td style={s.td}>{r.label}</td>
                    <td style={{ ...s.td, textAlign: 'right' }}>{r.value > 0 ? r.value.toLocaleString() + '円' : ''}</td>
                  </tr>
                ))}
                <tr style={{ background: '#f5f5f5', fontWeight: 600 }}>
                  <td style={s.td}>小計</td>
                  <td style={{ ...s.td, textAlign: 'right' }}>{legalD.toLocaleString()}円</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* 特別仕様・諸費用詳細 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4mm', marginBottom: '4mm' }}>
          {/* 特別仕様 */}
          <div>
            <div style={s.sectionTitle}>特別仕様明細 (C)</div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f5f5f5' }}>
                  <th style={{ ...s.td, fontWeight: 600 }}>付属品</th>
                  <th style={{ ...s.td, textAlign: 'right', fontWeight: 600 }}>金額</th>
                  <th style={{ ...s.td, textAlign: 'right', fontWeight: 600 }}>消費税</th>
                </tr>
              </thead>
              <tbody>
                {(quote.options ?? []).length === 0 && (
                  <tr><td style={s.td} colSpan={3}>　</td></tr>
                )}
                {(quote.options ?? []).map((opt: any, i: number) => (
                  <tr key={i}>
                    <td style={s.td}>{opt.name}</td>
                    <td style={{ ...s.td, textAlign: 'right' }}>{opt.price.toLocaleString()}円</td>
                    <td style={{ ...s.td, textAlign: 'right' }}>{Math.floor(opt.price * 0.1).toLocaleString()}円</td>
                  </tr>
                ))}
                <tr style={{ background: '#f5f5f5', fontWeight: 600 }}>
                  <td style={s.td}>付属品小計</td>
                  <td style={{ ...s.td, textAlign: 'right' }}>{optionsC.toLocaleString()}円</td>
                  <td style={{ ...s.td, textAlign: 'right' }}>{Math.floor(optionsC * 0.1).toLocaleString()}円</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* 諸費用詳細 */}
          <div>
            <div style={s.sectionTitle}>諸費用詳細【課税】(B)</div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                {[
                  { label: '未経過自動車税相当額', value: quote.misc_unpaid_auto_tax },
                  { label: '未経過自賠責相当額', value: quote.misc_unpaid_liability },
                  { label: '登録代行費用', value: quote.misc_registration_fee },
                  { label: '県外登録費用', value: quote.misc_out_of_pref_fee },
                  { label: '車庫証明代行費用', value: quote.misc_garage_cert_fee },
                  { label: '不動産手続代行費用', value: quote.misc_real_estate_fee },
                  { label: '書類作成費用', value: quote.misc_document_fee },
                  { label: '下取車諸手続費用', value: quote.misc_trade_in_fee },
                  { label: '納車代行費用', value: quote.misc_delivery_fee },
                  { label: 'オークション手数料', value: quote.misc_auction_fee },
                  { label: 'その他', value: quote.misc_other_fee },
                ].map((r, i) => (
                  <tr key={i}>
                    <td style={s.td}>{r.label}</td>
                    <td style={{ ...s.td, textAlign: 'right' }}>{r.value > 0 ? r.value.toLocaleString() + '円' : ''}</td>
                    <td style={{ ...s.td, textAlign: 'right' }}>{r.value > 0 ? Math.floor(r.value * 0.1).toLocaleString() + '円' : ''}</td>
                  </tr>
                ))}
                <tr style={{ background: '#f5f5f5', fontWeight: 600 }}>
                  <td style={s.td}>小計</td>
                  <td style={{ ...s.td, textAlign: 'right' }}>{miscB.toLocaleString()}円</td>
                  <td style={{ ...s.td, textAlign: 'right' }}>{Math.floor(miscB * 0.1).toLocaleString()}円</td>
                </tr>
              </tbody>
            </table>
            <div style={{ background: '#1a1a2e', color: 'white', padding: '6px 10px', display: 'flex', justifyContent: 'space-between', marginTop: '3px', borderRadius: '4px' }}>
              <span style={{ fontSize: '9pt', fontWeight: 600 }}>お支払い総額 (E)</span>
              <span style={{ fontSize: '14pt', fontWeight: 700 }}>{grandTotal.toLocaleString()}円</span>
            </div>
          </div>
        </div>

        {/* 注意事項 */}
        <div style={{ border: '1px solid #ddd', borderRadius: '4px', padding: '6px 10px', fontSize: '7pt', color: '#555' }}>
          ※振込手数料はお客様負担にてお願いします。<br/>
          ※この見積の有効期限は記載がない場合有効ではありません。<br/>
          上記見積りについての御質問・御相談は発行店舗担当へご連絡お願い致します。
        </div>
      </div>
    </>
  )
}