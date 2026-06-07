'use client'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { useProfile } from '@/hooks/useProfile'

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
  purchase: '仕入商談 登録',
  sales:    '販売商談 登録',
  other:    'その他商談 登録',
}

function NewNegotiationContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { profile } = useProfile()
  const fromInquiry = searchParams.get('from_inquiry')
  const inquiryCategory = searchParams.get('category') || 'sales'
  const inquiryCustomerName = searchParams.get('customer_name') || ''
  const inquiryPhone = searchParams.get('phone') || ''

  const [loading, setLoading] = useState(false)
  const [customers, setCustomers] = useState<any[]>([])
  const [vehicles, setVehicles] = useState<any[]>([])
  const [staffList, setStaffList] = useState<any[]>([])
  const [purchaseInfo, setPurchaseInfo] = useState({
    maker: '', model: '', year: '', mileage: '',
    desired_price: '', chassis_number: '', color: '', repair_history: false,
  })
  const [form, setForm] = useState({
    customer_id: '',
    vehicle_id: '',
    category: inquiryCategory,
    source: searchParams.get('source') || '',
    assigned_to: searchParams.get('assigned_to') || '',
    inquiry_date: searchParams.get('inquiry_date') || new Date().toISOString().split('T')[0],
    visit_date: searchParams.get('visit_date') || '',
    notes: searchParams.get('notes') || '',
  })

  const BANNER_CONFIG: Record<string, { bg: string; border: string; color: string; subcolor: string; label: string }> = {
    purchase: { bg: '#e6f4ea', border: '#a8d5b5', color: '#1e7e34', subcolor: '#2d6a3f', label: '買取問合せから引き継ぎ' },
    sales:    { bg: '#e8f0fe', border: '#93b4f0', color: '#1a73e8', subcolor: '#1558b0', label: '販売問合せから引き継ぎ' },
    other:    { bg: '#fff3e0', border: '#ffc080', color: '#e65100', subcolor: '#b83c00', label: 'その他問合せから引き継ぎ' },
  }

  useEffect(() => {
    const load = async () => {
      const [c, v, p, { data: { user } }] = await Promise.all([
        supabase.from('customers').select('*').order('作成日時', { ascending: false }),
        supabase.from('vehicles').select('*, master_makers(name), master_models(name)').is('deleted_at', null).order('created_at', { ascending: false }),
        supabase.from('profiles').select('id, display_name, role').order('created_at', { ascending: true }),
        supabase.auth.getUser(),
      ])
      const customerList = c.data ?? []
      const profileList = p.data ?? []
      setCustomers(customerList)
      setVehicles(v.data ?? [])
      setStaffList(profileList)

      const currentProfile = profileList.find((pr: any) => pr.id === user?.id)
      if (currentProfile && !searchParams.get('assigned_to')) {
        setForm(f => ({ ...f, assigned_to: currentProfile.display_name }))
      }

      if (fromInquiry && (inquiryPhone || inquiryCustomerName)) {
        const match = customerList.find((cu: any) =>
          (inquiryPhone && cu.電話番号 === inquiryPhone) ||
          (inquiryCustomerName && cu.氏名 === inquiryCustomerName)
        )
        if (match) {
          setForm(f => ({ ...f, customer_id: match.id }))
        }
      }
    }
    load()
  }, [])

  const handleSubmit = async () => {
    setLoading(true)
    let notesText = form.notes || ''
    if (form.category === 'purchase') {
      const fields: [string, string][] = [
        ['メーカー',     purchaseInfo.maker],
        ['車種',         purchaseInfo.model],
        ['年式',         purchaseInfo.year ? purchaseInfo.year + '年' : ''],
        ['走行距離',     purchaseInfo.mileage ? purchaseInfo.mileage + 'km' : ''],
        ['希望買取金額', purchaseInfo.desired_price ? '¥' + Number(purchaseInfo.desired_price).toLocaleString() : ''],
        ['車台番号',     purchaseInfo.chassis_number],
        ['色',           purchaseInfo.color],
        ['修復歴',       purchaseInfo.repair_history ? 'あり' : ''],
      ]
      const info = fields.filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join('\n')
      if (info) notesText = `【買取車両情報】\n${info}${notesText ? '\n\n【備考】\n' + notesText : ''}`
    }
    const { data, error } = await supabase.from('negotiations').insert([{
      customer_id: form.customer_id || null,
      vehicle_id: form.vehicle_id || null,
      source: form.source || null,
      assigned_to: form.assigned_to || null,
      inquiry_date: form.inquiry_date,
      visit_date: form.visit_date || null,
      notes: notesText || null,
      category: form.category || null,
      status: '商談中',
      company_id: profile?.company_id ?? null,
    }]).select().single()
    if (error) { alert('エラー: ' + error.message); setLoading(false); return }
    router.push(`/negotiations/${data.id}`)
  }

  const inp = { width: '100%', padding: '9px 12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '13px', boxSizing: 'border-box' as const, outline: 'none' }
  const lbl = { fontSize: '12px', fontWeight: 500, color: '#888', marginBottom: '6px', display: 'block' }

  return (
    <div style={{ padding: '2rem', maxWidth: '640px', margin: '0 auto' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <Link href="/negotiations" style={{ fontSize: '13px', color: '#888', textDecoration: 'none' }}>← 商談一覧に戻る</Link>
        <h1 style={{ fontSize: '22px', fontWeight: 700, margin: '8px 0 0' }}>{TITLE_CONFIG[form.category] ?? '商談登録'}</h1>
      </div>

      {fromInquiry && (() => {
        const bc = BANNER_CONFIG[inquiryCategory] ?? BANNER_CONFIG.sales
        return (
          <div style={{ background: bc.bg, border: `1px solid ${bc.border}`, borderRadius: '10px', padding: '12px 16px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '18px' }}>🔗</span>
            <div>
              <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: bc.color }}>{bc.label}</p>
              <p style={{ margin: '2px 0 0', fontSize: '12px', color: bc.subcolor }}>
                {inquiryCustomerName}
                {inquiryPhone && <span style={{ marginLeft: '8px', opacity: 0.8 }}>{inquiryPhone}</span>}
                　※ 顧客が一覧にある場合は自動選択されています
              </p>
            </div>
          </div>
        )
      })()}

      <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #eee', padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>

        {/* 流入経路 */}
        <div>
          <label style={lbl}>流入経路</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {SOURCES.map(s => (
              <button key={s.value} onClick={() => setForm(f => ({ ...f, source: f.source === s.value ? '' : s.value }))}
                style={{ padding: '5px 12px', borderRadius: '20px', border: 'none', fontSize: '12px', fontWeight: 500, cursor: 'pointer', background: form.source === s.value ? s.color : s.bg, color: form.source === s.value ? 'white' : s.color }}>
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* 顧客 */}
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

        {/* 買取車両情報（仕入商談のみ） */}
        {form.category === 'purchase' && (
          <div style={{ background: '#f8f9fa', borderRadius: '10px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#333', marginBottom: '2px' }}>買取車両情報</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={lbl}>メーカー</label>
                <input type="text" value={purchaseInfo.maker} onChange={e => setPurchaseInfo(p => ({ ...p, maker: e.target.value }))} placeholder="トヨタ" style={inp} />
              </div>
              <div>
                <label style={lbl}>車種</label>
                <input type="text" value={purchaseInfo.model} onChange={e => setPurchaseInfo(p => ({ ...p, model: e.target.value }))} placeholder="アルファード" style={inp} />
              </div>
              <div>
                <label style={lbl}>年式</label>
                <input type="number" value={purchaseInfo.year} onChange={e => setPurchaseInfo(p => ({ ...p, year: e.target.value }))} placeholder="2020" style={inp} />
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

        {/* 担当者・問合日 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
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
        </div>

        {/* 来店日 */}
        <div>
          <label style={lbl}>来店日</label>
          <input type="date" value={form.visit_date} onChange={e => setForm(f => ({ ...f, visit_date: e.target.value }))} style={inp} />
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
