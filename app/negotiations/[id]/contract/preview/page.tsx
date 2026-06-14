'use client'
import { useEffect, useState } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import LoadingOverlay from '@/components/LoadingOverlay'

export default function ContractPreviewPage() {
  const { id } = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const contractId = searchParams.get('contract_id')

  const [contract, setContract] = useState<any>(null)
  const [quote, setQuote] = useState<any>(null)
  const [vehicle, setVehicle] = useState<any>(null)
  const [customer, setCustomer] = useState<any>(null)
  const [company, setCompany] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [loadingOverlay, setLoadingOverlay] = useState(false)
  const [loadingMessage, setLoadingMessage] = useState('処理中...')

  useEffect(() => {
    const fetchAll = async () => {
      const { data: c } = await supabase.from('contracts').select('*').eq('id', contractId as string).single()
      setContract(c)

      const { data: neg } = await supabase.from('negotiations')
        .select('*, customers(*), vehicles(*, master_makers(name), master_models(name))')
        .eq('id', id as string).single()
      setCustomer(neg?.customers)
      setVehicle(neg?.vehicles)

      const { data: q } = await supabase.from('quotes')
        .select('*')
        .eq('negotiation_id', id as string)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()
      setQuote(q)

      const { data: co } = await supabase.from('companies').select('*').limit(1).single()
      setCompany(co)
    }
    fetchAll()
  }, [id, contractId])

  const handleConfirm = async () => {
    setLoadingMessage('処理中...')
    setLoadingOverlay(true)
    setLoading(true)
    await supabase.from('contracts').update({ status: '締結済' }).eq('id', contractId as string)
    await supabase.from('negotiations').update({ status: '成約' }).eq('id', id as string)
    await supabase.from('vehicles').update({ status: '売約済' }).eq('id', vehicle?.id)

    const { data: delivery } = await supabase.from('deliveries').insert([{
      contract_id: contractId,
      current_step: 1,
    }]).select().single()

    setLoadingOverlay(false)
    router.push(`/deliveries/${delivery.id}`)
  }

  const handleSaveOnly = async () => {
    setLoadingMessage('保存中...')
    setLoadingOverlay(true)
    setLoading(true)
    await supabase.from('contracts').update({ status: '作成済' }).eq('id', contractId as string)
    setLoadingOverlay(false)
    router.push(`/negotiations/${id}`)
  }

  const handlePrint = () => window.print()

  if (!contract || !vehicle || !customer) return <div style={{ padding: '2rem' }}>読み込み中...</div>

  const today = contract.contract_date ? new Date(contract.contract_date).toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' }) : ''
  const contractNo = `BB-${new Date(contract.created_at).getFullYear()}${String(new Date(contract.created_at).getMonth() + 1).padStart(2, '0')}${String(new Date(contract.created_at).getDate()).padStart(2, '0')}-${(contract.id as string).slice(-4).toUpperCase()}`

  const vehiclePrice = quote?.vehicle_price ?? 0
  const miscB = (quote?.misc_unpaid_auto_tax ?? 0) + (quote?.misc_unpaid_liability ?? 0) + (quote?.misc_registration_fee ?? 0) +
    (quote?.misc_out_of_pref_fee ?? 0) + (quote?.misc_garage_cert_fee ?? 0) + (quote?.misc_real_estate_fee ?? 0) +
    (quote?.misc_document_fee ?? 0) + (quote?.misc_trade_in_fee ?? 0) + (quote?.misc_delivery_fee ?? 0) +
    (quote?.misc_auction_fee ?? 0) + (quote?.misc_other_fee ?? 0)
  const optionsC = (quote?.options ?? []).reduce((s: number, o: any) => s + o.price, 0)
  const taxableTotal = quote?.taxable_total ?? 0
  const consumptionTax = quote?.consumption_tax ?? 0
  const legalD = quote?.non_taxable_total ?? 0
  const grandTotal = quote?.grand_total ?? 0

  const s: any = {
    page: { width: '210mm', minHeight: '297mm', margin: '0 auto', background: 'white', padding: '8mm 10mm', boxSizing: 'border-box', fontFamily: '"Hiragino Sans", "Yu Gothic", sans-serif', fontSize: '8.5pt', color: '#1a1a1a' },
    td: { padding: '2px 5px', border: '1px solid #ccc', fontSize: '8pt' },
    tdLabel: { padding: '2px 5px', border: '1px solid #ccc', background: '#f0f4ff', fontWeight: 500, fontSize: '8pt', whiteSpace: 'nowrap' as const },
    sectionTitle: { background: '#1a1a2e', color: 'white', padding: '3px 8px', fontSize: '8pt', fontWeight: 600, marginBottom: '3px' },
  }

  const ContractBody = ({ title }: { title: string }) => (
    <div style={s.page}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4mm' }}>
        <div>
          <div style={{ background: '#e8f0fe', border: '1px solid #93b4f0', padding: '2px 10px', fontSize: '8pt', fontWeight: 600, marginBottom: '2mm', display: 'inline-block' }}>{title}</div>
          <div style={{ fontSize: '20pt', fontWeight: 700, letterSpacing: '0.3em' }}>契　約　書</div>
        </div>
        <div style={{ textAlign: 'right' as const }}>
          <div style={{ display: 'flex', gap: '16px', fontSize: '8pt', marginBottom: '2mm' }}>
            <span>契約日　{today}</span>
            <span>契約書番号　{contractNo}</span>
          </div>
          <div style={{ fontSize: '11pt', fontWeight: 700 }}>{company?.name ?? 'Brain Base'}</div>
          <div style={{ fontSize: '7.5pt', color: '#555', lineHeight: 1.6 }}>
            <div>〒{company?.zip_code ?? ''} {company?.address ?? '住所を設定してください'}</div>
            <div>TEL {company?.tel ?? '000-000-0000'}　FAX {company?.fax ?? ''}</div>
            <div>事業者登録番号 {company?.tax_number ?? ''}</div>
            <div>振込先　{company?.bank_name ?? ''} {company?.bank_branch ?? ''} {company?.bank_type ?? ''} {company?.bank_account ?? ''}</div>
            <div>{company?.bank_holder ?? ''}</div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4mm', marginBottom: '3mm' }}>
        <div>
          <div style={s.sectionTitle}>買主（注文者）</div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              <tr><td style={s.tdLabel}>フリガナ</td><td style={s.td} colSpan={3}>{customer.氏名カナ ?? ''}</td><td style={{ ...s.td, width: '30px', textAlign: 'center' as const }}>㊞</td></tr>
              <tr><td style={s.tdLabel}>氏名</td><td style={{ ...s.td, fontSize: '11pt', fontWeight: 700 }} colSpan={4}>{customer.氏名}</td></tr>
              <tr><td style={s.tdLabel}>Eメール</td><td style={s.td} colSpan={4}>{customer.メール ?? ''}</td></tr>
              <tr><td style={s.tdLabel}>生年月日</td><td style={s.td} colSpan={4}>{customer.生年月日 ?? '　'}</td></tr>
              <tr><td style={s.tdLabel} rowSpan={2}>住所</td><td style={s.td} colSpan={4}>〒{customer.住所?.slice(0, 7) ?? ''}</td></tr>
              <tr><td style={s.td} colSpan={4}>{customer.住所?.slice(7) ?? ''}</td></tr>
              <tr>
                <td style={s.tdLabel}>電話</td><td style={s.td}>{customer.電話番号 ?? ''}</td>
                <td style={s.tdLabel}>その他電話</td><td style={s.td} colSpan={2}></td>
              </tr>
              <tr><td style={s.tdLabel}>会社名</td><td style={s.td} colSpan={4}></td></tr>
              <tr><td style={s.tdLabel} rowSpan={2}>登録名義</td><td style={s.tdLabel}>所有者</td><td style={s.td} colSpan={3}>{customer.氏名}</td></tr>
              <tr><td style={s.tdLabel}>使用者</td><td style={s.td} colSpan={3}>{customer.氏名}</td></tr>
              <tr><td style={s.tdLabel}>事業者登録番号</td><td style={s.td} colSpan={4}></td></tr>
            </tbody>
          </table>

          <div style={{ marginTop: '3mm' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f0f4ff' }}>
                  <th style={{ ...s.td, fontWeight: 600 }}>課税</th>
                  <th style={{ ...s.td, fontWeight: 600, textAlign: 'right' as const }}>販売価格</th>
                  <th style={{ ...s.td, fontWeight: 600, textAlign: 'right' as const }}>消費税 ※10%</th>
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
                    <td style={{ ...s.td, textAlign: 'right' as const }}>{r.value.toLocaleString()}円</td>
                    <td style={{ ...s.td, textAlign: 'right' as const }}>{Math.floor(r.value * 0.1).toLocaleString()}円</td>
                  </tr>
                ))}
                <tr style={{ background: '#f5f5f5' }}>
                  <td style={{ ...s.td, fontWeight: 600 }}>小計</td>
                  <td style={{ ...s.td, textAlign: 'right' as const, fontWeight: 600 }}>{taxableTotal.toLocaleString()}円</td>
                  <td style={{ ...s.td, textAlign: 'right' as const }}>{consumptionTax.toLocaleString()}円</td>
                </tr>
                <tr>
                  <td style={s.td} colSpan={2}>課税対象合計（税込）※税率10%</td>
                  <td style={{ ...s.td, textAlign: 'right' as const, fontWeight: 600 }}>{(taxableTotal + consumptionTax).toLocaleString()}円</td>
                </tr>
                <tr>
                  <td style={s.td} colSpan={2}>内消費税合計 ※税率10%</td>
                  <td style={{ ...s.td, textAlign: 'right' as const, color: '#555' }}>{consumptionTax.toLocaleString()}円</td>
                </tr>
                <tr>
                  <td style={{ ...s.td, background: '#f5f5f5' }}>非課税</td>
                  <td style={s.td}>法定費用等合計 (D)</td>
                  <td style={{ ...s.td, textAlign: 'right' as const }}>{legalD.toLocaleString()}円　非課税</td>
                </tr>
              </tbody>
            </table>
            <div style={{ background: '#1a1a2e', color: 'white', padding: '5px 8px', display: 'flex', justifyContent: 'space-between', marginTop: '2px' }}>
              <span style={{ fontSize: '8pt' }}>お支払い総額　A+B+C+D (E)</span>
              <span style={{ fontSize: '12pt', fontWeight: 700 }}>{grandTotal.toLocaleString()}円</span>
            </div>
          </div>

          <div style={{ marginTop: '3mm' }}>
            <div style={s.sectionTitle}>特別仕様明細 (C)</div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f0f4ff' }}>
                  <th style={{ ...s.td, fontWeight: 600 }}>付属品</th>
                  <th style={{ ...s.td, textAlign: 'right' as const, fontWeight: 600 }}>金額</th>
                  <th style={{ ...s.td, textAlign: 'right' as const, fontWeight: 600 }}>消費税</th>
                </tr>
              </thead>
              <tbody>
                {(quote?.options ?? []).map((opt: any, i: number) => (
                  <tr key={i}>
                    <td style={s.td}>{opt.name}</td>
                    <td style={{ ...s.td, textAlign: 'right' as const }}>{opt.price.toLocaleString()}円</td>
                    <td style={{ ...s.td, textAlign: 'right' as const }}>{Math.floor(opt.price * 0.1).toLocaleString()}円</td>
                  </tr>
                ))}
                {[...Array(Math.max(0, 5 - (quote?.options ?? []).length))].map((_, i) => (
                  <tr key={`empty-${i}`}><td style={s.td}>　</td><td style={s.td}></td><td style={s.td}></td></tr>
                ))}
                <tr style={{ background: '#f5f5f5' }}>
                  <td style={{ ...s.td, fontWeight: 600 }}>付属品小計</td>
                  <td style={{ ...s.td, textAlign: 'right' as const, fontWeight: 600 }}>{optionsC.toLocaleString()}円</td>
                  <td style={{ ...s.td, textAlign: 'right' as const }}>{Math.floor(optionsC * 0.1).toLocaleString()}円</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <div style={s.sectionTitle}>車両明細</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '3mm' }}>
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

          <div style={{ background: '#1a1a2e', color: 'white', padding: '6px 10px', display: 'flex', justifyContent: 'space-between', marginBottom: '3mm' }}>
            <span style={{ fontSize: '9pt', fontWeight: 600 }}>お支払い総額 (E)</span>
            <span style={{ fontSize: '14pt', fontWeight: 700 }}>{grandTotal.toLocaleString()}円</span>
          </div>

          <div style={s.sectionTitle}>法定費用【非課税】(D)</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '3mm' }}>
            <tbody>
              {[
                { label: '自動車税種別割', value: quote?.legal_auto_tax },
                { label: '自動車重量税', value: quote?.legal_weight_tax },
                { label: '自賠責保険', value: quote?.legal_liability_insurance },
                { label: '環境性能割/自動車取得税', value: quote?.legal_eco_tax },
                { label: 'リサイクル預託金', value: quote?.legal_recycle_deposit },
                { label: '登録印紙代', value: quote?.legal_registration_stamp },
                { label: '新規検査印紙代', value: quote?.legal_inspection_stamp },
                { label: '車庫証明印紙代', value: quote?.legal_garage_cert_stamp },
                { label: '公正証書作成', value: quote?.legal_notary_fee },
                { label: 'その他', value: quote?.legal_other },
              ].map((r, i) => (
                <tr key={i}>
                  <td style={s.td}>{r.label}</td>
                  <td style={{ ...s.td, textAlign: 'right' as const }}>{r.value > 0 ? r.value.toLocaleString() + '円' : ''}</td>
                </tr>
              ))}
              <tr style={{ background: '#f5f5f5' }}>
                <td style={{ ...s.td, fontWeight: 600 }}>小計</td>
                <td style={{ ...s.td, textAlign: 'right' as const, fontWeight: 600 }}>{legalD.toLocaleString()}円</td>
              </tr>
            </tbody>
          </table>

          <div style={s.sectionTitle}>諸費用詳細【課税】(B)</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '3mm' }}>
            <tbody>
              {[
                { label: '未経過自動車税相当額', value: quote?.misc_unpaid_auto_tax },
                { label: '未経過自賠責相当額', value: quote?.misc_unpaid_liability },
                { label: '登録代行費用', value: quote?.misc_registration_fee },
                { label: '県外登録費用', value: quote?.misc_out_of_pref_fee },
                { label: '車庫証明代行費用', value: quote?.misc_garage_cert_fee },
                { label: '不動産手続代行費用', value: quote?.misc_real_estate_fee },
                { label: '書類作成費用', value: quote?.misc_document_fee },
                { label: '下取車諸手続費用', value: quote?.misc_trade_in_fee },
                { label: '納車代行費用', value: quote?.misc_delivery_fee },
                { label: 'オークション手数料', value: quote?.misc_auction_fee },
                { label: 'その他', value: quote?.misc_other_fee },
              ].map((r, i) => (
                <tr key={i}>
                  <td style={s.td}>{r.label}</td>
                  <td style={{ ...s.td, textAlign: 'right' as const }}>{r.value > 0 ? r.value.toLocaleString() + '円' : ''}</td>
                  <td style={{ ...s.td, textAlign: 'right' as const }}>{r.value > 0 ? Math.floor(r.value * 0.1).toLocaleString() + '円' : ''}</td>
                </tr>
              ))}
              <tr style={{ background: '#f5f5f5' }}>
                <td style={{ ...s.td, fontWeight: 600 }}>小計</td>
                <td style={{ ...s.td, textAlign: 'right' as const, fontWeight: 600 }}>{miscB.toLocaleString()}円</td>
                <td style={{ ...s.td, textAlign: 'right' as const }}>{Math.floor(miscB * 0.1).toLocaleString()}円</td>
              </tr>
            </tbody>
          </table>

          <div style={s.sectionTitle}>契約書発行情報</div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              <tr><td style={s.tdLabel}>契約書発行店舗</td><td style={s.td}>{company?.name ?? 'Brain Base'}</td></tr>
              <tr><td style={s.tdLabel}>契約担当</td><td style={s.td}>　</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ border: '1px solid #ccc', padding: '4px 8px', fontSize: '7pt', color: '#555' }}>
        この契約書及び別添えの契約書(割賦販売の場合)記載の約款は、売買の条件を記したものでありますから、これらの事項をよくお読み頂き充分ご納得の上でご署名(記入、捺印)くださるようお願いします。またクーリングオフの適応はございません。
      </div>
    </div>
  )

  return (
    <>
      <style>{`
      {loadingOverlay && <LoadingOverlay message={loadingMessage} />}
        @media print {
          #action-bar { display: none !important; }
          nav { display: none !important; }
          .page-break { page-break-before: always; }
          body { margin: 0; }
        }
      `}</style>

      <div id="action-bar" style={{ background: '#1a1a2e', padding: '1rem 2rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <Link href={`/negotiations/${id}/contract`} style={{ color: '#aaa', fontSize: '13px', textDecoration: 'none' }}>← 契約書に戻る</Link>
        <div style={{ flex: 1 }} />
        <button onClick={handlePrint}
          style={{ padding: '8px 20px', background: 'white', color: '#1a1a2e', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
          🖨️ PDF印刷・保存
        </button>
        <button onClick={handleSaveOnly} disabled={loading}
          style={{ padding: '8px 20px', background: '#888', color: 'white', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
          📋 作成のみ（在庫継続）
        </button>
        <button onClick={handleConfirm} disabled={loading}
          style={{ padding: '8px 20px', background: '#00a86b', color: 'white', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
          ✅ 契約確定→納車管理へ
        </button>
      </div>

      <ContractBody title="お客様控え" />
      <div className="page-break">
        <ContractBody title="店舗控え" />
      </div>
    </>
  )
}