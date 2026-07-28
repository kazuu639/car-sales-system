'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, getCurrentUserScope } from '@/lib/supabase'

const REASONS = ['車検', '修理', 'メンテナンス', 'カスタム', 'チューニング', '事故', 'クレーム']
const STATUSES = ['受付', '作業中', '完了', '引渡済']

const inp: React.CSSProperties = { width: '100%', padding: '9px 12px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '13px', boxSizing: 'border-box', outline: 'none' }
const lbl: React.CSSProperties = { fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px', fontWeight: 500 }
const sec: React.CSSProperties = { background: 'white', borderRadius: '12px', border: '1px solid #eee', overflow: 'hidden', marginBottom: '16px' }
const secHead = (bg: string, border: string, color: string, title: string) => (
  <div style={{ padding: '12px 20px', background: bg, borderBottom: `1px solid ${border}` }}>
    <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color }}>{title}</h3>
  </div>
)

export default function CustodyNewPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [ownerType, setOwnerType] = useState<'customer' | 'dealer'>('customer')
  const [customers, setCustomers] = useState<any[]>([])
  const [dealers, setDealers]     = useState<any[]>([])

  const [form, setForm] = useState({
    customer_id: '', dealer_id: '',
    car_name: '', chassis_number: '', car_number: '',
    year: '', mileage: '', color: '',
    custody_reason: '修理',
    status: '受付',
    intake_date: new Date().toISOString().slice(0, 10),
    scheduled_delivery_date: '',
    notes: '',
  })

  useEffect(() => {
    const load = async () => {
      const scope = await getCurrentUserScope()
      if (!scope?.company_id) return
      const [{ data: c }, { data: d }] = await Promise.all([
        supabase.from('customers').select('id, 氏名, 電話番号').eq('company_id', scope.company_id).is('deleted_at', null).order('作成日時', { ascending: false }),
        supabase.from('dealers').select('id, 業者名, 担当者名').eq('company_id', scope.company_id).is('deleted_at', null).order('作成日時', { ascending: false }),
      ])
      setCustomers(c ?? [])
      setDealers(d ?? [])
    }
    load()
  }, [])

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    const customerId = ownerType === 'customer' ? form.customer_id : null
    const dealerId   = ownerType === 'dealer'   ? form.dealer_id   : null
    if (!customerId && !dealerId) { alert('顧客または業者を選択してください'); return }
    if (!form.custody_reason)    { alert('預かり理由を選択してください');     return }

    setSaving(true)
    const scope = await getCurrentUserScope()
    if (!scope?.company_id) { alert('ログイン情報の取得に失敗しました'); setSaving(false); return }

    const { data, error } = await supabase.from('custody').insert({
      company_id:               scope.company_id,
      customer_id:              customerId || null,
      dealer_id:                dealerId   || null,
      car_name:                 form.car_name     || null,
      chassis_number:           form.chassis_number || null,
      car_number:               form.car_number   || null,
      year:                     form.year     ? parseInt(form.year)    : null,
      mileage:                  form.mileage  ? parseInt(form.mileage) : null,
      color:                    form.color    || null,
      custody_reason:           form.custody_reason,
      status:                   form.status,
      intake_date:              form.intake_date || null,
      scheduled_delivery_date:  form.scheduled_delivery_date || null,
      notes:                    form.notes || null,
    }).select('id').single()

    setSaving(false)
    if (error) { alert('登録に失敗しました: ' + error.message); return }
    router.push(`/custody/${data.id}`)
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '860px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <button onClick={() => router.push('/custody')} style={{ padding: '8px 16px', background: 'white', border: '1px solid #ddd', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}>← 戻る</button>
        <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 700 }}>新規受付</h1>
      </div>

      {/* 預かり理由（最重要） */}
      <div style={sec}>
        {secHead('#fff7ed', '#fed7aa', '#c2410c', '預かり理由')}
        <div style={{ padding: '20px' }}>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {REASONS.map(r => (
              <button key={r} onClick={() => set('custody_reason', r)} style={{
                padding: '8px 18px', borderRadius: '20px', border: '2px solid',
                fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                background: form.custody_reason === r ? '#c2410c' : 'white',
                color: form.custody_reason === r ? 'white' : '#666',
                borderColor: form.custody_reason === r ? '#c2410c' : '#e5e7eb',
              }}>{r}</button>
            ))}
          </div>
        </div>
      </div>

      {/* 顧客 / 業者 */}
      <div style={sec}>
        {secHead('#eff6ff', '#bfdbfe', '#1d4ed8', '顧客 / 業者情報')}
        <div style={{ padding: '20px' }}>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            {(['customer', 'dealer'] as const).map(t => (
              <button key={t} onClick={() => setOwnerType(t)} style={{
                padding: '7px 20px', borderRadius: '8px', border: '2px solid',
                fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                background: ownerType === t ? '#1d4ed8' : 'white',
                color: ownerType === t ? 'white' : '#666',
                borderColor: ownerType === t ? '#1d4ed8' : '#e5e7eb',
              }}>{t === 'customer' ? '👤 顧客' : '🏢 業者'}</button>
            ))}
          </div>
          {ownerType === 'customer' ? (
            <div>
              <label style={lbl}>顧客 <span style={{ color: '#e53e3e' }}>*</span></label>
              <select value={form.customer_id} onChange={e => set('customer_id', e.target.value)} style={inp}>
                <option value="">顧客を選択してください</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c['氏名']}{c['電話番号'] ? `　${c['電話番号']}` : ''}</option>)}
              </select>
              <div style={{ marginTop: '8px', fontSize: '12px', color: '#888' }}>
                顧客が未登録の場合は先に<a href="/customers/new" target="_blank" style={{ color: '#0070f3' }}>顧客登録</a>してください
              </div>
            </div>
          ) : (
            <div>
              <label style={lbl}>業者 <span style={{ color: '#e53e3e' }}>*</span></label>
              <select value={form.dealer_id} onChange={e => set('dealer_id', e.target.value)} style={inp}>
                <option value="">業者を選択してください</option>
                {dealers.map(d => <option key={d.id} value={d.id}>{d['業者名']}{d['担当者名'] ? `　${d['担当者名']}` : ''}</option>)}
              </select>
              <div style={{ marginTop: '8px', fontSize: '12px', color: '#888' }}>
                業者が未登録の場合は先に<a href="/dealers/new" target="_blank" style={{ color: '#0070f3' }}>業者登録</a>してください
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 車両情報 */}
      <div style={sec}>
        {secHead('#f0fdf4', '#bbf7d0', '#15803d', '車両情報')}
        <div style={{ padding: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={lbl}>車種名</label>
            <input value={form.car_name} onChange={e => set('car_name', e.target.value)} placeholder="例：ホンダ フィット" style={inp} />
          </div>
          <div>
            <label style={lbl}>車体番号</label>
            <input value={form.chassis_number} onChange={e => set('chassis_number', e.target.value)} placeholder="例：GK3-1234567" style={inp} />
          </div>
          <div>
            <label style={lbl}>車両ナンバー</label>
            <input value={form.car_number} onChange={e => set('car_number', e.target.value)} placeholder="例：品川330あ1234" style={inp} />
          </div>
          <div>
            <label style={lbl}>年式</label>
            <input type="number" value={form.year} onChange={e => set('year', e.target.value)} placeholder="例：2020" style={inp} />
          </div>
          <div>
            <label style={lbl}>走行距離（km）</label>
            <input type="number" value={form.mileage} onChange={e => set('mileage', e.target.value)} placeholder="例：35000" style={inp} />
          </div>
          <div>
            <label style={lbl}>色</label>
            <input value={form.color} onChange={e => set('color', e.target.value)} placeholder="例：パールホワイト" style={inp} />
          </div>
        </div>
      </div>

      {/* 受付情報 */}
      <div style={sec}>
        {secHead('#faf5ff', '#e9d5ff', '#7e22ce', '受付情報')}
        <div style={{ padding: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
          <div>
            <label style={lbl}>ステータス</label>
            <select value={form.status} onChange={e => set('status', e.target.value)} style={inp}>
              {STATUSES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div />
          <div>
            <label style={lbl}>受付日</label>
            <input type="date" value={form.intake_date} onChange={e => set('intake_date', e.target.value)} style={inp} />
          </div>
          <div>
            <label style={lbl}>予定引渡日</label>
            <input type="date" value={form.scheduled_delivery_date} onChange={e => set('scheduled_delivery_date', e.target.value)} style={inp} />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={lbl}>備考</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={3}
              style={{ ...inp, resize: 'vertical' }} placeholder="症状・要望など" />
          </div>
        </div>
      </div>

      {/* 保存ボタン */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
        <button onClick={() => router.push('/custody')} style={{ padding: '11px 28px', background: 'white', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px', cursor: 'pointer' }}>キャンセル</button>
        <button onClick={handleSave} disabled={saving}
          style={{ padding: '11px 36px', background: '#0070f3', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
          {saving ? '登録中...' : '登録する'}
        </button>
      </div>
    </div>
  )
}
