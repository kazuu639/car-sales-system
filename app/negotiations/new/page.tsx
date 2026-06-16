'use client'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase, getCurrentUserScope } from '@/lib/supabase'
import Link from 'next/link'
import LoadingOverlay from '@/components/LoadingOverlay'

const SOURCES = [
  { value: 'carsensor', label: 'カーセンサー', color: '#c0392b', bg: '#fde8e8' },
  { value: 'goo',       label: 'グーネット',   color: '#27ae60', bg: '#e8f8ef' },
  { value: 'hp',        label: 'HP',           color: '#2980b9', bg: '#e8f0fe' },
  { value: 'x',         label: 'X(Twitter)',   color: '#111',    bg: '#f0f0f0' },
  { value: 'instagram', label: 'Instagram',    color: '#8e44ad', bg: '#f3e8fd' },
  { value: 'youtube',   label: 'YouTube',      color: '#e74c3c', bg: '#fde8e8' },
  { value: 'line',      label: 'LINE',         color: '#27ae60', bg: '#e8f8ef' },
  { value: 'tel',       label: '電話',         color: '#e65100', bg: '#fff3e0' },
  { value: 'visit',     label: '来店',         color: '#1a73e8', bg: '#e8f0fe' },
  { value: 'referral',  label: '紹介',         color: '#6d4c41', bg: '#f5ede8' },
  { value: 'other',     label: 'その他',       color: '#5f6368', bg: '#f1f3f4' },
]

const TITLE_CONFIG: Record<string, string> = {
  purchase: '買取商談 登録',
  sales:    '販売商談 登録',
  inspection: '車検商談 登録',
  repair:     '修理商談 登録',
  dresup:     'ドレスUP商談 登録',
  other:    'その他商談 登録',
}

const BANNER_CONFIG: Record<string, { bg: string; border: string; color: string; sub: string; label: string }> = {
  purchase: { bg: '#e6f4ea', border: '#a8d5b5', color: '#1e7e34', sub: '#2d6a3f', label: '買取問合せから引き継ぎ' },
  sales:    { bg: '#e8f0fe', border: '#93b4f0', color: '#1a73e8', sub: '#1558b0', label: '販売問合せから引き継ぎ' },
  other:    { bg: '#fff3e0', border: '#ffc080', color: '#e65100', sub: '#b83c00', label: 'その他問合せから引き継ぎ' },
}

function NewNegotiationContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const fromInquiry = searchParams.get('from_inquiry')

  const [loading, setLoading] = useState(false)
  const [loadingOverlay, setLoadingOverlay] = useState(false)
  const [loadingMessage, setLoadingMessage] = useState('処理中...')
  const [submitted, setSubmitted] = useState(false)
  const [customers, setCustomers] = useState<any[]>([])
  const [vehicles, setVehicles] = useState<any[]>([])
  const [staffList, setStaffList] = useState<any[]>([])
  const [inquiryData, setInquiryData] = useState<any>(null)
  const [purchaseInfo, setPurchaseInfo] = useState({
    maker: '', model: '', year: '', mileage: '',
    desired_price: '', chassis_number: '', color: '', repair_history: false,
  })
  const [makers, setMakers] = useState<any[]>([])
  const [allModels, setAllModels] = useState<any[]>([])
  const [filteredModels, setFilteredModels] = useState<any[]>([])
  const [purchaseMakerId, setPurchaseMakerId] = useState('')
  const [form, setForm] = useState({
    customer_id: '',
    vehicle_id: '',
    category: searchParams.get('category') || 'sales',
    source: '',
    assigned_to: '',
    inquiry_date: new Date().toISOString().split('T')[0],
    visit_date: '',
    notes: '',
  })

  useEffect(() => {
    const load = async () => {
      const [c, v, p, { data: { user } }, mk, md] = await Promise.all([
        supabase.from('customers').select('*').order('作成日時', { ascending: false }),
        supabase.from('vehicles').select('*, master_makers(name), master_models(name)').is('deleted_at', null).order('created_at', { ascending: false }),
        supabase.from('profiles').select('id, display_name, role, company_id').order('created_at', { ascending: true }),
        supabase.auth.getUser(),
        supabase.from('master_makers').select('*').order('sort_order'),
        supabase.from('master_models').select('*').order('sort_order'),
      ])
      const customerList = c.data ?? []
      const profileList  = p.data ?? []
      const makerList    = mk.data ?? []
      const modelList    = md.data ?? []
      setCustomers(customerList)
      setVehicles(v.data ?? [])
      setStaffList(profileList)
      setMakers(makerList)
      setAllModels(modelList)

      // 担当者デフォルト
      const me = profileList.find((pr: any) => pr.id === user?.id)
      if (me) setForm(f => ({ ...f, assigned_to: me.display_name }))

      // 問合せから引き継ぎ
      if (fromInquiry) {
        const { data: inq } = await supabase.from('inquiries').select('*').eq('id', fromInquiry).single()
        if (inq) {
          setInquiryData(inq)

          // フォームに問合せ情報をセット
          setForm(f => ({
            ...f,
            category:     inq.category || f.category,
            source:       inq.source   || '',
            inquiry_date: inq.inquiry_date || f.inquiry_date,
            visit_date:   inq.visit_date   || '',
            notes:        inq.memo         || '',
          }))

          // 顧客マッチング（customer_id直接参照を優先、なければ名前/電話で検索）
          if (inq.customer_id) {
            setForm(f => ({ ...f, customer_id: inq.customer_id }))
          } else {
            const match = customerList.find((cu: any) =>
              (inq.phone && cu.電話番号 === inq.phone) ||
              (inq.customer_name && cu.氏名 === inq.customer_name)
            )
            if (match) setForm(f => ({ ...f, customer_id: match.id }))
          }

          // 買取車両情報プリセット
          if (inq.category === 'purchase') {
            setPurchaseInfo({
              maker:          inq.purchase_maker          || '',
              model:          inq.purchase_model          || '',
              year:           inq.purchase_year?.toString()          || '',
              mileage:        inq.purchase_mileage?.toString()       || '',
              desired_price:  inq.purchase_desired_price?.toString() || '',
              chassis_number: inq.purchase_chassis_number || '',
              color:          inq.purchase_color          || '',
              repair_history: inq.purchase_repair_history || false,
            })
            // メーカーIDを名前から逆引きして車種を絞り込み
            if (inq.purchase_maker) {
              const foundMaker = makerList.find((m: any) => m.name === inq.purchase_maker)
              if (foundMaker) {
                setPurchaseMakerId(foundMaker.id)
                setFilteredModels(modelList.filter((m: any) => m.maker_id === foundMaker.id))
              }
            }
          }
        }
      }
    }
    load()
  }, [])

  const sourceError = submitted && !form.source

  const handleSubmit = async () => {
    console.log('handleSubmit called')
    setSubmitted(true)
    if (!form.source) {
      setTimeout(() => {
        const el = document.getElementById('source-field')
        console.log('source-field el:', el)
        console.log('scrollY:', window.scrollY)
        if (el) {
          const rect = el.getBoundingClientRect()
          console.log('rect.top:', rect.top)
          const top = rect.top + window.scrollY - 100
          console.log('scrollTo top:', top)
          window.scrollTo({ top, behavior: 'smooth' })
        }
      }, 50)
      return
    }
    setLoadingMessage('登録中...')
    setLoadingOverlay(true)
    setLoading(true)
    const scope = await getCurrentUserScope()
    if (!scope) { alert('ログイン情報の取得に失敗しました'); setLoadingOverlay(false); setLoading(false); return }
    const isPurchase = form.category === 'purchase'
    const { data, error } = await supabase.from('negotiations').insert([{
      customer_id:             form.customer_id  || null,
      vehicle_id:              form.vehicle_id   || null,
      source:                  form.source       || null,
      assigned_to:             form.assigned_to  || null,
      inquiry_date:            form.inquiry_date,
      visit_date:              form.visit_date   || null,
      notes:                   form.notes        || null,
      category:                form.category     || null,
      status:                  '商談中',
      company_id:              scope.company_id,
      branch_id:               scope.branch_id,
      purchase_maker:          isPurchase ? (purchaseInfo.maker || null)          : null,
      purchase_model:          isPurchase ? (purchaseInfo.model || null)          : null,
      purchase_year:           isPurchase ? (purchaseInfo.year ? parseInt(purchaseInfo.year) : null) : null,
      purchase_mileage:        isPurchase ? (purchaseInfo.mileage ? parseInt(purchaseInfo.mileage) : null) : null,
      purchase_desired_price:  isPurchase ? (purchaseInfo.desired_price ? parseInt(purchaseInfo.desired_price) : null) : null,
      purchase_chassis_number: isPurchase ? (purchaseInfo.chassis_number || null) : null,
      purchase_color:          isPurchase ? (purchaseInfo.color || null)          : null,
      purchase_repair_history: isPurchase ? purchaseInfo.repair_history          : false,
    }]).select().single()
    if (error) { alert('エラー: ' + error.message); setLoadingOverlay(false); setLoading(false); return }
    if (fromInquiry) {
      await supabase.from('inquiries').update({ status: 'in_progress' }).eq('id', fromInquiry)
    }
    setLoadingOverlay(false)
    router.push(`/negotiations/${data.id}`)
  }

  const inp = { width: '100%', padding: '9px 12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '13px', boxSizing: 'border-box' as const, outline: 'none' }
  const lbl = { fontSize: '12px', fontWeight: 500 as const, color: '#888', marginBottom: '6px', display: 'block' as const }

  const bc = BANNER_CONFIG[inquiryData?.category] ?? BANNER_CONFIG.sales

  return (
    <div style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
      {loadingOverlay && <LoadingOverlay message={loadingMessage} />}
      <div style={{ marginBottom: '1.5rem' }}>
        <Link href="/negotiations" style={{ fontSize: '13px', color: '#888', textDecoration: 'none' }}>← 商談一覧に戻る</Link>
        <h1 style={{ fontSize: '22px', fontWeight: 700, margin: '8px 0 0' }}>{TITLE_CONFIG[form.category] ?? '商談登録'}</h1>
      </div>

      {/* 問合せ引き継ぎバナー */}
      {fromInquiry && inquiryData && (
        <div style={{ background: bc.bg, border: `1px solid ${bc.border}`, borderRadius: '10px', padding: '12px 16px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '18px' }}>🔗</span>
          <div>
            <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: bc.color }}>{bc.label}</p>
            <p style={{ margin: '2px 0 0', fontSize: '12px', color: bc.sub }}>
              {inquiryData.customer_name}
              {inquiryData.phone && <span style={{ marginLeft: '8px', opacity: 0.8 }}>{inquiryData.phone}</span>}
            </p>
          </div>
        </div>
      )}

      <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #eee', padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>

        {/* 流入経路 */}
        <div id="source-field">
          <label style={lbl}>流入経路 <span style={{ color: '#e53e3e' }}>*</span></label>
          <div style={{
            display: 'flex', flexWrap: 'wrap', gap: '6px', padding: '10px',
            border: `1px solid ${sourceError ? '#e53e3e' : form.source ? '#1a73e8' : '#eee'}`,
            borderRadius: '10px',
          }}>
            {SOURCES.map(s => (
              <button key={s.value} onClick={() => setForm(f => ({ ...f, source: f.source === s.value ? '' : s.value }))}
                style={{ padding: '5px 12px', borderRadius: '20px', border: 'none', fontSize: '12px', fontWeight: 500, cursor: 'pointer', background: form.source === s.value ? s.color : s.bg, color: form.source === s.value ? 'white' : s.color }}>
                {s.label}
              </button>
            ))}
          </div>
          {sourceError && <p style={{ color: '#e53e3e', fontSize: '12px', marginTop: '4px' }}>必須項目です</p>}
        </div>

        {/* 顧客（問合せからの引き継ぎ時は非表示） */}
        {!fromInquiry && (
          <div>
            <label style={lbl}>顧客 *</label>
            <select value={form.customer_id} onChange={e => setForm(f => ({ ...f, customer_id: e.target.value }))} style={inp}>
              <option value="">顧客を選択してください</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.氏名}　{c.電話番号 ?? ''}</option>)}
            </select>
            <p style={{ fontSize: '11px', color: '#aaa', marginTop: '4px' }}>
              未登録の場合は<a href="/customers/new" target="_blank" style={{ color: '#0070f3' }}>顧客登録</a>してから選択してください
            </p>
          </div>
        )}

        {/* 対象車両 */}
        <div>
          <label style={lbl}>
            {form.category === 'purchase' ? '関連車両（任意）' : form.category === 'sales' ? '対象車両（在庫中）' : '関連車両'}
          </label>
          <select value={form.vehicle_id} onChange={e => setForm(f => ({ ...f, vehicle_id: e.target.value }))} style={inp}>
            <option value="">（車両なし）</option>
            {(form.category === 'sales'
              ? vehicles.filter(v => v.status === '在庫中')
              : vehicles
            ).map(v => (
              <option key={v.id} value={v.id}>
                {v.db_number}　{v.master_makers?.name} {v.master_models?.name}　{v.year ? v.year + '年' : ''}　[{v.status}]
              </option>
            ))}
          </select>
        </div>

        {/* 買取車両情報（買取商談のみ） */}
        {form.category === 'purchase' && (
          <div style={{ background: '#f0faf4', border: '1px solid #c3e6cb', borderRadius: '10px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#1e7e34' }}>買取車両情報</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
              <div>
                <label style={lbl}>メーカー</label>
                <select
                  value={purchaseInfo.maker}
                  onChange={e => {
                    const name = e.target.value
                    const maker = makers.find(m => m.name === name)
                    setPurchaseMakerId(maker?.id || '')
                    setFilteredModels(maker ? allModels.filter(m => m.maker_id === maker.id) : [])
                    setPurchaseInfo(p => ({ ...p, maker: name, model: '' }))
                  }}
                  style={inp}>
                  <option value="">選択してください</option>
                  {makers.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>車種</label>
                <select
                  value={purchaseInfo.model}
                  onChange={e => setPurchaseInfo(p => ({ ...p, model: e.target.value }))}
                  disabled={!purchaseMakerId}
                  style={{ ...inp, background: purchaseMakerId ? 'white' : '#f5f5f5' }}>
                  <option value="">{purchaseMakerId ? '選択してください' : 'メーカーを先に選択'}</option>
                  {filteredModels.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>年式</label>
                <select value={purchaseInfo.year} onChange={e => setPurchaseInfo(p => ({ ...p, year: e.target.value }))} style={inp}>
                  <option value="">選択</option>
                  {Array.from({ length: 36 }, (_, i) => 2025 - i).map(y => (
                    <option key={y} value={String(y)}>{y}年</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={lbl}>走行距離（km）</label>
                <input type="number" value={purchaseInfo.mileage} onChange={e => setPurchaseInfo(p => ({ ...p, mileage: e.target.value }))} placeholder="50000" style={inp} />
              </div>
              <div>
                <label style={lbl}>希望買取金額（円）</label>
                <input type="number" value={purchaseInfo.desired_price} onChange={e => setPurchaseInfo(p => ({ ...p, desired_price: e.target.value }))} placeholder="2000000" style={inp} />
              </div>
              <div>
                <label style={lbl}>車台番号</label>
                <input type="text" value={purchaseInfo.chassis_number} onChange={e => setPurchaseInfo(p => ({ ...p, chassis_number: e.target.value }))} placeholder="ABC-1234567" style={inp} />
              </div>
              <div>
                <label style={lbl}>色</label>
                <input type="text" value={purchaseInfo.color} onChange={e => setPurchaseInfo(p => ({ ...p, color: e.target.value }))} placeholder="パールホワイト" style={inp} />
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: '2px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
                  <input type="checkbox" checked={purchaseInfo.repair_history} onChange={e => setPurchaseInfo(p => ({ ...p, repair_history: e.target.checked }))}
                    style={{ width: '16px', height: '16px', cursor: 'pointer' }} />
                  修復歴あり
                </label>
              </div>
            </div>
          </div>
        )}

        {/* 担当者・問合日・来店日（3カラム） */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
          <div>
            <label style={lbl}>担当者</label>
            <select value={form.assigned_to} onChange={e => setForm(f => ({ ...f, assigned_to: e.target.value }))} style={inp}>
              <option value="">担当者を選択</option>
              {staffList.map(s => (
                <option key={s.id} value={s.display_name}>{s.display_name}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={lbl}>問合日</label>
            <input type="date" value={form.inquiry_date} onChange={e => setForm(f => ({ ...f, inquiry_date: e.target.value }))} style={inp} />
          </div>
          <div>
            <label style={lbl}>来店日</label>
            <input type="date" value={form.visit_date} onChange={e => setForm(f => ({ ...f, visit_date: e.target.value }))} style={inp} />
          </div>
        </div>

        {/* 備考 */}
        <div>
          <label style={lbl}>備考</label>
          <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3}
            style={{ ...inp, resize: 'vertical' }} placeholder="メモがあれば..." />
        </div>

        <button onClick={handleSubmit} disabled={loading} style={{ padding: '12px', background: '#0070f3', color: 'white', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
          {loading ? '登録中...' : '商談を登録する'}
        </button>
      </div>
    </div>
  )
}

export default function NewNegotiationPage() {
  return (
    <Suspense fallback={<div style={{ padding: '2rem', color: '#aaa' }}>読み込み中...</div>}>
      <NewNegotiationContent />
    </Suspense>
  )
}
