'use client'
import { useEffect, useState } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import LoadingOverlay from '@/components/LoadingOverlay'

export default function QuotePage() {
  const { id } = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const nvId = searchParams.get('nv')
  const vehicleId = searchParams.get('vehicle')
  const baseQuoteId = searchParams.get('base')

  const [vehicle, setVehicle] = useState<any>(null)
  const [customer, setCustomer] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [loadingOverlay, setLoadingOverlay] = useState(false)
  const [loadingMessage, setLoadingMessage] = useState('処理中...')
  const [autoTaxOptions, setAutoTaxOptions] = useState<any[]>([])
  const [weightTaxOptions, setWeightTaxOptions] = useState<any[]>([])
  const [liabilityOptions, setLiabilityOptions] = useState<any[]>([])

  const [form, setForm] = useState<Record<string, string>>({
    vehicle_price: '',
    misc_unpaid_auto_tax: '',
    misc_unpaid_liability: '',
    misc_registration_fee: '',
    misc_out_of_pref_fee: '',
    misc_garage_cert_fee: '',
    misc_real_estate_fee: '',
    misc_document_fee: '',
    misc_trade_in_fee: '',
    misc_delivery_fee: '',
    misc_auction_fee: '',
    misc_other_fee: '',
    legal_eco_tax: '',
    legal_recycle_deposit: '',
    legal_registration_stamp: '',
    legal_inspection_stamp: '',
    legal_garage_cert_stamp: '',
    legal_notary_fee: '',
    legal_other: '',
    payment_type: '現金',
    notes: '',
  })

  const [legalAutoTax, setLegalAutoTax] = useState(0)
  const [legalWeightTax, setLegalWeightTax] = useState(0)
  const [legalLiability, setLegalLiability] = useState(0)
  const [options, setOptions] = useState<{ name: string; price: string }[]>([])

  const n = (v: string) => parseInt(v.replace(/,/g, '')) || 0

  const sectionTitle = (label: string, color = '#1a1a2e') => (
    <div style={{ background: color, color: 'white', padding: '4px 10px', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>{label}</div>
  )

  useEffect(() => {
    const fetchAll = async () => {
      if (vehicleId) {
        const { data: v } = await supabase.from('vehicles')
          .select('*, master_makers(name), master_models(name)')
          .eq('id', vehicleId).single()
        setVehicle(v)
        if (v?.body_price) setForm(f => ({ ...f, vehicle_price: String(v.body_price) }))
      }
      const { data: neg } = await supabase.from('negotiations')
        .select('*, customers(*)')
        .eq('id', id as string).single()
      if (neg?.customers) setCustomer(neg.customers)

      const [at, wt, li] = await Promise.all([
        supabase.from('tax_automobile').select('*').order('displacement_from'),
        supabase.from('tax_weight').select('*').order('weight_from'),
        supabase.from('tax_liability').select('*'),
      ])
      setAutoTaxOptions(at.data ?? [])
      setWeightTaxOptions(wt.data ?? [])
      setLiabilityOptions(li.data ?? [])
    }
    fetchAll()
  }, [id, vehicleId, baseQuoteId])

  const set = (name: string, value: string) => {
    setForm(f => ({ ...f, [name]: value.replace(/[^0-9]/g, '') }))
  }

  const addOption = () => setOptions(o => [...o, { name: '', price: '' }])
  const updateOption = (i: number, key: string, value: string) => {
    const opts = [...options]
    if (key === 'price') {
      opts[i] = { ...opts[i], price: value.replace(/[^0-9]/g, '') }
    } else {
      opts[i] = { ...opts[i], name: value }
    }
    setOptions(opts)
  }
  const removeOption = (i: number) => setOptions(o => o.filter((_, idx) => idx !== i))

  const miscB = n(form.misc_unpaid_auto_tax) + n(form.misc_unpaid_liability) + n(form.misc_registration_fee) +
    n(form.misc_out_of_pref_fee) + n(form.misc_garage_cert_fee) + n(form.misc_real_estate_fee) +
    n(form.misc_document_fee) + n(form.misc_trade_in_fee) + n(form.misc_delivery_fee) +
    n(form.misc_auction_fee) + n(form.misc_other_fee)
  const optionsC = options.reduce((s, o) => s + n(o.price), 0)
  const taxableTotal = n(form.vehicle_price) + miscB + optionsC
  const consumptionTax = Math.floor(taxableTotal * 0.1)
  const legalD = legalAutoTax + legalWeightTax + legalLiability +
    n(form.legal_eco_tax) + n(form.legal_recycle_deposit) + n(form.legal_registration_stamp) +
    n(form.legal_inspection_stamp) + n(form.legal_garage_cert_stamp) + n(form.legal_notary_fee) + n(form.legal_other)
  const grandTotal = taxableTotal + consumptionTax + legalD

  const generateQuoteNumber = () => {
    const now = new Date()
    const y = now.getFullYear()
    const m = String(now.getMonth() + 1).padStart(2, '0')
    const d = String(now.getDate()).padStart(2, '0')
    const r = String(Math.floor(Math.random() * 100)).padStart(2, '0')
    return `BB-${y}${m}${d}-${r}`
  }

  const handleSubmit = async () => {
    setLoadingMessage('登録中...')
    setLoadingOverlay(true)
    setLoading(true)
    const payload = {
      quote_number: generateQuoteNumber(),
      negotiation_id: id as string,
      negotiation_vehicle_id: nvId || null,
      parent_quote_id: baseQuoteId || null,
      version: baseQuoteId ? 2 : 1,
      vehicle_price: n(form.vehicle_price),
      misc_unpaid_auto_tax: n(form.misc_unpaid_auto_tax),
      misc_unpaid_liability: n(form.misc_unpaid_liability),
      misc_registration_fee: n(form.misc_registration_fee),
      misc_out_of_pref_fee: n(form.misc_out_of_pref_fee),
      misc_garage_cert_fee: n(form.misc_garage_cert_fee),
      misc_real_estate_fee: n(form.misc_real_estate_fee),
      misc_document_fee: n(form.misc_document_fee),
      misc_trade_in_fee: n(form.misc_trade_in_fee),
      misc_delivery_fee: n(form.misc_delivery_fee),
      misc_auction_fee: n(form.misc_auction_fee),
      misc_other_fee: n(form.misc_other_fee),
      options: options.map(o => ({ name: o.name, price: n(o.price) })),
      legal_auto_tax: legalAutoTax,
      legal_weight_tax: legalWeightTax,
      legal_liability_insurance: legalLiability,
      legal_eco_tax: n(form.legal_eco_tax),
      legal_recycle_deposit: n(form.legal_recycle_deposit),
      legal_registration_stamp: n(form.legal_registration_stamp),
      legal_inspection_stamp: n(form.legal_inspection_stamp),
      legal_garage_cert_stamp: n(form.legal_garage_cert_stamp),
      legal_notary_fee: n(form.legal_notary_fee),
      legal_other: n(form.legal_other),
      taxable_total: taxableTotal,
      consumption_tax: consumptionTax,
      non_taxable_total: legalD,
      grand_total: grandTotal,
      payment_type: form.payment_type,
      notes: form.notes,
    }
    const { data: quote, error } = await supabase.from('quotes').insert([payload]).select().single()
    if (error) { alert('エラー: ' + error.message); setLoadingOverlay(false); setLoading(false); return }
    if (nvId) await supabase.from('negotiation_vehicles').update({ status: '見積済' }).eq('id', nvId)
    await supabase.from('negotiations').update({ status: '見積済' }).eq('id', id as string)
    setLoadingOverlay(false)
    router.push(`/negotiations/${id}/quote/preview?quote_id=${quote.id}`)
  }

  const inpStyle: React.CSSProperties = {
    width: '100%',
    padding: '5px 8px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '12px',
    textAlign: 'right',
    boxSizing: 'border-box',
  }

  if (!vehicle) return <div style={{ padding: '2rem' }}>読み込み中...</div>

  const miscRows = [
    { label: '未経過自動車税相当額', name: 'misc_unpaid_auto_tax' },
    { label: '未経過自賠責相当額', name: 'misc_unpaid_liability' },
    { label: '登録代行費用', name: 'misc_registration_fee' },
    { label: '県外登録費用', name: 'misc_out_of_pref_fee' },
    { label: '車庫証明代行費用', name: 'misc_garage_cert_fee' },
    { label: '不動産手続代行費用', name: 'misc_real_estate_fee' },
    { label: '書類作成費用', name: 'misc_document_fee' },
    { label: '下取車諸手続費用', name: 'misc_trade_in_fee' },
    { label: '納車代行費用', name: 'misc_delivery_fee' },
    { label: 'オークション手数料', name: 'misc_auction_fee' },
    { label: 'その他', name: 'misc_other_fee' },
  ]

  const legalRows = [
    { label: '環境性能割/自動車取得税', name: 'legal_eco_tax' },
    { label: 'リサイクル預託金', name: 'legal_recycle_deposit' },
    { label: '登録印紙代', name: 'legal_registration_stamp' },
    { label: '新規検査印紙代', name: 'legal_inspection_stamp' },
    { label: '車庫証明印紙代', name: 'legal_garage_cert_stamp' },
    { label: '公正証書作成', name: 'legal_notary_fee' },
    { label: 'その他', name: 'legal_other' },
  ]

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1100px', margin: '0 auto' }}>
      {loadingOverlay && <LoadingOverlay message={loadingMessage} />}
      <div style={{ marginBottom: '1rem' }}>
        <Link href={`/negotiations/${id}`} style={{ fontSize: '13px', color: '#888', textDecoration: 'none' }}>← 商談に戻る</Link>
        <h1 style={{ fontSize: '20px', fontWeight: 700, margin: '6px 0 0' }}>
          見積り作成 {baseQuoteId && <span style={{ fontSize: '13px', color: '#888', fontWeight: 400 }}>（前回見積りをベースに作成）</span>}
        </h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
        <div style={{ background: 'white', borderRadius: '8px', border: '1px solid #eee', padding: '1rem' }}>
          <div style={{ fontSize: '11px', color: '#888', marginBottom: '4px' }}>対象車両</div>
          <div style={{ fontSize: '15px', fontWeight: 600 }}>{vehicle?.master_makers?.name} {vehicle?.master_models?.name}</div>
          <div style={{ fontSize: '12px', color: '#aaa' }}>{vehicle?.db_number}　{vehicle?.year ? vehicle.year + '年' : ''}　{vehicle?.mileage ? vehicle.mileage.toLocaleString() + 'km' : ''}</div>
        </div>
        <div style={{ background: 'white', borderRadius: '8px', border: '1px solid #eee', padding: '1rem' }}>
          <div style={{ fontSize: '11px', color: '#888', marginBottom: '4px' }}>顧客</div>
          <div style={{ fontSize: '15px', fontWeight: 600 }}>{customer?.氏名 ?? '未設定'}　様</div>
          <div style={{ fontSize: '12px', color: '#aaa' }}>{customer?.電話番号 ?? ''}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          {/* A: 車両価格 */}
          <div style={{ background: 'white', borderRadius: '8px', border: '1px solid #eee', padding: '1rem' }}>
            {sectionTitle('A. 車両価格【課税】', '#0070f3')}
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8f9fa' }}>
                  <th style={{ padding: '4px 8px', fontSize: '11px', color: '#888', textAlign: 'left' }}>項目</th>
                  <th style={{ padding: '4px 8px', fontSize: '11px', color: '#888', textAlign: 'right' }}>金額</th>
                  <th style={{ padding: '4px 8px', fontSize: '11px', color: '#888', textAlign: 'right' }}>消費税</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ padding: '4px 8px', fontSize: '12px' }}>車両価格</td>
                  <td style={{ padding: '4px 8px', width: '110px' }}>
                    <input type="text" value={form.vehicle_price}
                      onChange={e => set('vehicle_price', e.target.value)}
                      placeholder="0" style={inpStyle} />
                  </td>
                  <td style={{ padding: '4px 8px', fontSize: '12px', textAlign: 'right', color: '#555', width: '80px' }}>
                    {n(form.vehicle_price) > 0 ? Math.floor(n(form.vehicle_price) * 0.1).toLocaleString() : ''}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* B: 諸費用 */}
          <div style={{ background: 'white', borderRadius: '8px', border: '1px solid #eee', padding: '1rem' }}>
            {sectionTitle('B. 諸費用詳細【課税】', '#0070f3')}
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8f9fa' }}>
                  <th style={{ padding: '4px 8px', fontSize: '11px', color: '#888', textAlign: 'left' }}>項目</th>
                  <th style={{ padding: '4px 8px', fontSize: '11px', color: '#888', textAlign: 'right' }}>金額</th>
                  <th style={{ padding: '4px 8px', fontSize: '11px', color: '#888', textAlign: 'right' }}>消費税</th>
                </tr>
              </thead>
              <tbody>
                {miscRows.map(row => (
                  <tr key={row.name}>
                    <td style={{ padding: '4px 8px', fontSize: '12px', borderBottom: '1px solid #f0f0f0' }}>{row.label}</td>
                    <td style={{ padding: '4px 8px', borderBottom: '1px solid #f0f0f0', width: '110px' }}>
                      <input type="text" value={form[row.name]}
                        onChange={e => set(row.name, e.target.value)}
                        placeholder="0" style={inpStyle} />
                    </td>
                    <td style={{ padding: '4px 8px', fontSize: '12px', borderBottom: '1px solid #f0f0f0', textAlign: 'right', color: '#555', width: '80px' }}>
                      {n(form[row.name]) > 0 ? Math.floor(n(form[row.name]) * 0.1).toLocaleString() : ''}
                    </td>
                  </tr>
                ))}
                <tr style={{ background: '#f8f9fa' }}>
                  <td style={{ padding: '4px 8px', fontSize: '12px', fontWeight: 600 }}>小計</td>
                  <td style={{ padding: '4px 8px', fontSize: '12px', fontWeight: 600, textAlign: 'right' }}>{miscB.toLocaleString()}</td>
                  <td style={{ padding: '4px 8px', fontSize: '12px', textAlign: 'right', color: '#555' }}>{Math.floor(miscB * 0.1).toLocaleString()}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* C: オプション */}
          <div style={{ background: 'white', borderRadius: '8px', border: '1px solid #eee', padding: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <div style={{ background: '#0070f3', color: 'white', padding: '4px 10px', fontSize: '12px', fontWeight: 600 }}>C. 特別仕様・オプション【課税】</div>
              <button onClick={addOption} style={{ padding: '3px 10px', background: '#0070f3', color: 'white', border: 'none', borderRadius: '4px', fontSize: '11px', cursor: 'pointer' }}>+ 追加</button>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8f9fa' }}>
                  <th style={{ padding: '4px 8px', fontSize: '11px', color: '#888', textAlign: 'left' }}>付属品名</th>
                  <th style={{ padding: '4px 8px', fontSize: '11px', color: '#888', textAlign: 'right' }}>金額</th>
                  <th style={{ padding: '4px 8px', fontSize: '11px', color: '#888', textAlign: 'right' }}>消費税</th>
                  <th style={{ width: '30px' }}></th>
                </tr>
              </thead>
              <tbody>
                {options.length === 0 && (
                  <tr><td colSpan={4} style={{ padding: '8px', textAlign: 'center', fontSize: '12px', color: '#aaa' }}>オプションなし</td></tr>
                )}
                {options.map((opt, i) => (
                  <tr key={i}>
                    <td style={{ padding: '4px 8px', borderBottom: '1px solid #f0f0f0' }}>
                      <input value={opt.name} onChange={e => updateOption(i, 'name', e.target.value)} placeholder="オプション名"
                        style={{ width: '100%', padding: '4px 6px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '12px', boxSizing: 'border-box' }} />
                    </td>
                    <td style={{ padding: '4px 8px', borderBottom: '1px solid #f0f0f0', width: '110px' }}>
                      <input type="text" value={opt.price}
                        onChange={e => updateOption(i, 'price', e.target.value)}
                        placeholder="0" style={inpStyle} />
                    </td>
                    <td style={{ padding: '4px 8px', fontSize: '12px', textAlign: 'right', color: '#555', borderBottom: '1px solid #f0f0f0', width: '80px' }}>
                      {n(opt.price) > 0 ? Math.floor(n(opt.price) * 0.1).toLocaleString() : ''}
                    </td>
                    <td style={{ padding: '4px 8px', borderBottom: '1px solid #f0f0f0' }}>
                      <button onClick={() => removeOption(i)} style={{ padding: '2px 6px', background: 'white', color: '#e53e3e', border: '1px solid #e53e3e', borderRadius: '4px', fontSize: '11px', cursor: 'pointer' }}>✕</button>
                    </td>
                  </tr>
                ))}
                <tr style={{ background: '#f8f9fa' }}>
                  <td style={{ padding: '4px 8px', fontSize: '12px', fontWeight: 600 }}>小計</td>
                  <td style={{ padding: '4px 8px', fontSize: '12px', fontWeight: 600, textAlign: 'right' }}>{optionsC.toLocaleString()}</td>
                  <td style={{ padding: '4px 8px', fontSize: '12px', textAlign: 'right', color: '#555' }}>{Math.floor(optionsC * 0.1).toLocaleString()}</td>
                  <td></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          {/* D: 法定費用 */}
          <div style={{ background: 'white', borderRadius: '8px', border: '1px solid #eee', padding: '1rem' }}>
            {sectionTitle('D. 法定費用【非課税】', '#e65100')}

            <div style={{ marginBottom: '8px' }}>
              <div style={{ fontSize: '11px', color: '#888', marginBottom: '3px' }}>自動車税（排気量で選択）</div>
              <select onChange={e => setLegalAutoTax(parseInt(e.target.value) || 0)}
                style={{ width: '100%', padding: '5px 8px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '12px' }}>
                <option value="0">選択してください</option>
                {autoTaxOptions.map(t => (
                  <option key={t.id} value={t.full_year}>
                    {t.displacement_from === 0 ? '1L以下' : `${t.displacement_from / 1000}L超〜${t.displacement_to / 1000}L以下`}　¥{t.full_year.toLocaleString()}
                  </option>
                ))}
              </select>
              {legalAutoTax > 0 && <div style={{ textAlign: 'right', fontSize: '12px', color: '#555', marginTop: '2px' }}>¥{legalAutoTax.toLocaleString()}</div>}
            </div>

            <div style={{ marginBottom: '8px' }}>
              <div style={{ fontSize: '11px', color: '#888', marginBottom: '3px' }}>自動車重量税（車重で選択）</div>
              <select onChange={e => setLegalWeightTax(parseInt(e.target.value) || 0)}
                style={{ width: '100%', padding: '5px 8px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '12px' }}>
                <option value="0">選択してください</option>
                {weightTaxOptions.map(t => (
                  <option key={t.id} value={t.normal}>
                    {t.weight_from}〜{t.weight_to}kg　通常:¥{t.normal.toLocaleString()}　13年超:¥{t.aged_13.toLocaleString()}
                  </option>
                ))}
              </select>
              {legalWeightTax > 0 && <div style={{ textAlign: 'right', fontSize: '12px', color: '#555', marginTop: '2px' }}>¥{legalWeightTax.toLocaleString()}</div>}
            </div>

            <div style={{ marginBottom: '8px' }}>
              <div style={{ fontSize: '11px', color: '#888', marginBottom: '3px' }}>自賠責保険（車種・月数で選択）</div>
              <select onChange={e => setLegalLiability(parseInt(e.target.value) || 0)}
                style={{ width: '100%', padding: '5px 8px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '12px' }}>
                <option value="0">選択してください</option>
                {liabilityOptions.map(t => [
                  { months: 37, value: t.month_37 }, { months: 36, value: t.month_36 },
                  { months: 25, value: t.month_25 }, { months: 24, value: t.month_24 },
                  { months: 13, value: t.month_13 }, { months: 12, value: t.month_12 },
                ].filter(m => m.value > 0).map(m => (
                  <option key={`${t.id}-${m.months}`} value={m.value}>
                    {t.vehicle_type}　{m.months}ヶ月　¥{m.value.toLocaleString()}
                  </option>
                )))}
              </select>
              {legalLiability > 0 && <div style={{ textAlign: 'right', fontSize: '12px', color: '#555', marginTop: '2px' }}>¥{legalLiability.toLocaleString()}</div>}
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                {legalRows.map(row => (
                  <tr key={row.name}>
                    <td style={{ padding: '4px 8px', fontSize: '12px', borderBottom: '1px solid #f0f0f0' }}>{row.label}</td>
                    <td style={{ padding: '4px 8px', borderBottom: '1px solid #f0f0f0', width: '110px' }}>
                      <input type="text" value={form[row.name]}
                        onChange={e => set(row.name, e.target.value)}
                        placeholder="0" style={inpStyle} />
                    </td>
                  </tr>
                ))}
                <tr style={{ background: '#f8f9fa' }}>
                  <td style={{ padding: '4px 8px', fontSize: '12px', fontWeight: 600 }}>小計</td>
                  <td style={{ padding: '4px 8px', fontSize: '12px', fontWeight: 600, textAlign: 'right' }}>{legalD.toLocaleString()}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* 合計 */}
          <div style={{ background: 'white', borderRadius: '8px', border: '2px solid #1a1a2e', padding: '1rem' }}>
            <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>合計</div>
            {[
              { label: '車両価格 (A)', value: n(form.vehicle_price), tax: Math.floor(n(form.vehicle_price) * 0.1) },
              { label: '諸費用等合計 (B)', value: miscB, tax: Math.floor(miscB * 0.1) },
              { label: '特別仕様価格 (C)', value: optionsC, tax: Math.floor(optionsC * 0.1) },
            ].map((r, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', fontSize: '12px', borderBottom: '1px solid #f0f0f0' }}>
                <span>{r.label}</span>
                <span>{r.value.toLocaleString()}円　<span style={{ color: '#888' }}>{r.tax.toLocaleString()}円</span></span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '12px', borderBottom: '1px solid #ddd', marginTop: '4px' }}>
              <span style={{ fontWeight: 600 }}>課税対象合計（税込）10%</span>
              <span style={{ fontWeight: 600 }}>{(taxableTotal + consumptionTax).toLocaleString()}円</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', fontSize: '12px', color: '#888' }}>
              <span>内消費税合計 10%</span>
              <span>{consumptionTax.toLocaleString()}円</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', fontSize: '12px', borderBottom: '1px solid #ddd' }}>
              <span>法定費用等合計 (D) 非課税</span>
              <span>{legalD.toLocaleString()}円</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0 4px', fontSize: '18px', fontWeight: 700, color: '#1a1a2e' }}>
              <span>お支払い総額</span>
              <span>¥{grandTotal.toLocaleString()}</span>
            </div>
          </div>

          {/* 支払方法 */}
          <div style={{ background: 'white', borderRadius: '8px', border: '1px solid #eee', padding: '1rem' }}>
            <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>支払方法</div>
            <div style={{ display: 'flex', gap: '8px' }}>
              {['現金', 'ローン', '頭金あり'].map(t => (
                <button key={t} onClick={() => setForm(f => ({ ...f, payment_type: t }))}
                  style={{ padding: '6px 16px', borderRadius: '20px', border: '1.5px solid', fontSize: '13px', cursor: 'pointer', fontWeight: form.payment_type === t ? 600 : 400, background: form.payment_type === t ? '#1a1a2e' : 'white', color: form.payment_type === t ? 'white' : '#555', borderColor: form.payment_type === t ? '#1a1a2e' : '#ddd' }}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* 社内メモ */}
          <div style={{ background: 'white', borderRadius: '8px', border: '1px solid #eee', padding: '1rem' }}>
            <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>社内メモ</div>
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3}
              style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '13px', resize: 'vertical', boxSizing: 'border-box' }} />
          </div>

          <button onClick={handleSubmit} disabled={loading}
            style={{ padding: '14px', background: '#1a1a2e', color: 'white', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
            {loading ? '作成中...' : '📄 見積書をプレビュー・確定する'}
          </button>
        </div>
      </div>
    </div>
  )
}