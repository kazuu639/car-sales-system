'use client'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase, getCurrentUserScope } from '@/lib/supabase'
import Link from 'next/link'
import LoadingOverlay from '@/components/LoadingOverlay'

const PREFECTURES = [
  '北海道','青森県','岩手県','宮城県','秋田県','山形県','福島県',
  '茨城県','栃木県','群馬県','埼玉県','千葉県','東京都','神奈川県',
  '新潟県','富山県','石川県','福井県','山梨県','長野県','岐阜県',
  '静岡県','愛知県','三重県',
  '滋賀県','京都府','大阪府','兵庫県','奈良県','和歌山県',
  '鳥取県','島根県','岡山県','広島県','山口県',
  '徳島県','香川県','愛媛県','高知県',
  '福岡県','佐賀県','長崎県','熊本県','大分県','宮崎県','鹿児島県','沖縄県',
]

const SOURCES = [
  { value: 'carsensor',  label: 'カーセンサー', color: '#c0392b', bg: '#fde8e8' },
  { value: 'goo',        label: 'グーネット',   color: '#27ae60', bg: '#e8f8ef' },
  { value: 'hp',         label: 'HP',           color: '#2980b9', bg: '#e8f0fe' },
  { value: 'x',          label: 'X(Twitter)',   color: '#111',    bg: '#f0f0f0' },
  { value: 'instagram',  label: 'Instagram',    color: '#8e44ad', bg: '#f3e8fd' },
  { value: 'youtube',    label: 'YouTube',      color: '#e74c3c', bg: '#fde8e8' },
  { value: 'line',       label: 'LINE',         color: '#27ae60', bg: '#e8f8ef' },
  { value: 'tel',        label: '電話',         color: '#e65100', bg: '#fff3e0' },
  { value: 'visit',      label: '来店',         color: '#1a73e8', bg: '#e8f0fe' },
  { value: 'referral',   label: '紹介',         color: '#6d4c41', bg: '#f5ede8' },
  { value: 'other',      label: 'その他',       color: '#5f6368', bg: '#f1f3f4' },
]

const CATEGORIES = [
  { value: 'purchase', label: '買取',   color: '#1e7e34', bg: '#e6f4ea' },
  { value: 'sales',    label: '販売',   color: '#1a73e8', bg: '#e8f0fe' },
  { value: 'other',    label: 'その他', color: '#e65100', bg: '#fff3e0' },
]

const TITLE: Record<string, string> = {
  purchase: '買取問合 登録',
  sales:    '販売問合 登録',
  other:    'その他問合 登録',
}

const Req = () => <span style={{ color: '#e53e3e', marginLeft: '2px' }}>*</span>

function NewInquiryContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const typeParam = searchParams.get('type') || 'sales'

  const [loading, setLoading] = useState(false)
  const [loadingOverlay, setLoadingOverlay] = useState(false)
  const [loadingMessage, setLoadingMessage] = useState('処理中...')
  const [submitted, setSubmitted] = useState(false)

  // 顧客モード
  const [useExistingCustomer, setUseExistingCustomer] = useState(false)
  const [customers, setCustomers] = useState<any[]>([])
  const [existingCustomerId, setExistingCustomerId] = useState('')
  const [newCustomer, setNewCustomer] = useState({
    氏名: '', 氏名カナ: '', 電話番号: '', 都道府県: '', メール: '',
  })

  // メーカー・車種（買取用）
  const [makers, setMakers] = useState<any[]>([])
  const [allModels, setAllModels] = useState<any[]>([])
  const [filteredModels, setFilteredModels] = useState<any[]>([])
  const [purchaseMakerId, setPurchaseMakerId] = useState('')

  // 問合フォーム
  const [form, setForm] = useState({
    inquiry_date: new Date().toISOString().split('T')[0],
    car_interest: '',
    source: '',
    status: 'closed',
    memo: '',
    assigned_to: '',
    category: typeParam,
    visit_date: '',
    visited: false,
    purchase_maker: '',
    purchase_model: '',
    purchase_year: '',
    purchase_mileage: '',
    purchase_chassis_number: '',
    purchase_color: '',
    purchase_desired_price: '',
    purchase_repair_history: false,
  })

  useEffect(() => {
    const load = async () => {
      const [{ data: { user } }, { data: custData }, { data: mkData }, { data: mdData }] = await Promise.all([
        supabase.auth.getUser(),
        supabase.from('customers').select('id, 氏名, 電話番号, メール').order('作成日時', { ascending: false }),
        supabase.from('master_makers').select('*').order('sort_order'),
        supabase.from('master_models').select('*').order('sort_order'),
      ])
      setCustomers(custData ?? [])
      setMakers(mkData ?? [])
      setAllModels(mdData ?? [])
      if (!user) return
      const { data: profile } = await supabase
        .from('profiles').select('display_name').eq('id', user.id).single()
      if (profile?.display_name) setForm(f => ({ ...f, assigned_to: profile.display_name }))
    }
    load()
  }, [])

  const handleMakerChange = (makerId: string, makerName: string) => {
    setPurchaseMakerId(makerId)
    setFilteredModels(makerId ? allModels.filter(m => m.maker_id === makerId) : [])
    setForm(f => ({ ...f, purchase_maker: makerName, purchase_model: '' }))
  }

  const sourceError = submitted && !form.source

  const handleSubmit = async () => {
    setSubmitted(true)
    if (!form.source) {
      setTimeout(() => {
        const el = document.getElementById('source-field')
        if (el) {
          const top = el.getBoundingClientRect().top + window.scrollY - 100
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

    // 顧客処理
    let customerId: string | null = null
    let customerName = ''
    let customerPhone = ''
    let customerEmail = ''

    if (useExistingCustomer && existingCustomerId) {
      const found = customers.find(c => c.id === existingCustomerId)
      customerId    = existingCustomerId
      customerName  = found?.氏名      || ''
      customerPhone = found?.電話番号  || ''
      customerEmail = found?.メール    || ''
    } else if (newCustomer.氏名) {
      const { data: cust, error: custErr } = await supabase
        .from('customers')
        .insert([{
          氏名:       newCustomer.氏名,
          氏名カナ:   newCustomer.氏名カナ || null,
          電話番号:   newCustomer.電話番号 || null,
          住所:       newCustomer.都道府県 || null,
          メール:     newCustomer.メール   || null,
          company_id: scope.company_id,
          branch_id:  scope.branch_id,
        }])
        .select()
        .single()
      if (custErr) { alert('顧客登録エラー: ' + custErr.message); setLoadingOverlay(false); setLoading(false); return }
      customerId    = cust.id
      customerName  = newCustomer.氏名
      customerPhone = newCustomer.電話番号
      customerEmail = newCustomer.メール
    }

    const payload: Record<string, unknown> = {
      inquiry_date:  form.inquiry_date,
      customer_id:   customerId,
      customer_name: customerName || null,
      phone:         customerPhone || null,
      email:         customerEmail || null,
      car_interest:  form.category === 'purchase' ? null : (form.car_interest || null),
      source:        form.source,
      status:        form.status,
      memo:          form.memo || null,
      assigned_to:   form.assigned_to || null,
      category:      form.category,
      visit_date:    form.visit_date || null,
      visited:       form.visited,
      company_id:    scope.company_id,
      branch_id:     scope.branch_id,
    }

    if (form.category === 'purchase') {
      payload.purchase_maker          = form.purchase_maker          || null
      payload.purchase_model          = form.purchase_model          || null
      payload.purchase_year           = form.purchase_year           ? parseInt(form.purchase_year)          : null
      payload.purchase_mileage        = form.purchase_mileage        ? parseInt(form.purchase_mileage)       : null
      payload.purchase_chassis_number = form.purchase_chassis_number || null
      payload.purchase_color          = form.purchase_color          || null
      payload.purchase_desired_price  = form.purchase_desired_price  ? parseInt(form.purchase_desired_price) : null
      payload.purchase_repair_history = form.purchase_repair_history
    }

    const { error } = await supabase.from('inquiries').insert(payload)
    if (error) { alert('エラー: ' + error.message); setLoadingOverlay(false); setLoading(false); return }
    setLoadingOverlay(false)
    router.push('/inquiries')
  }

  const inp = (error = false, filled = false) => ({
    width: '100%', padding: '9px 12px',
    border: `1px solid ${error ? '#e53e3e' : filled ? '#1a73e8' : '#ddd'}`,
    borderRadius: '8px', fontSize: '13px',
    boxSizing: 'border-box' as const, outline: 'none',
  })
  const lbl    = { fontSize: '12px', fontWeight: 500 as const, color: '#888', marginBottom: '6px', display: 'block' as const }
  const minp   = { width: '100%', border: '1px solid #ddd', borderRadius: '8px', padding: '7px 10px', fontSize: '12px', boxSizing: 'border-box' as const, outline: 'none' }
  const mlbl   = { fontSize: '11px', color: '#888', fontWeight: 500 as const, display: 'block' as const, marginBottom: '4px' }
  const errMsg = { fontSize: '11px', color: '#e53e3e', marginTop: '4px' }

  return (
    <div style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
      {loadingOverlay && <LoadingOverlay message={loadingMessage} />}
      <div style={{ marginBottom: '1.5rem' }}>
        <Link href="/inquiries" style={{ fontSize: '13px', color: '#888', textDecoration: 'none' }}>← 問合一覧に戻る</Link>
        <h1 style={{ fontSize: '22px', fontWeight: 700, margin: '8px 0 0' }}>{TITLE[form.category] ?? '問合登録'}</h1>
      </div>

      <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #eee', padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>

        {/* カテゴリ */}
        <div>
          <label style={lbl}>カテゴリ <Req /></label>
          <div style={{ display: 'flex', gap: '8px' }}>
            {CATEGORIES.map(c => (
              <button key={c.value} onClick={() => setForm(f => ({ ...f, category: c.value }))}
                style={{
                  flex: 1, padding: '8px',
                  border: form.category === c.value ? `2px solid ${c.color}` : '2px solid transparent',
                  borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                  background: form.category === c.value ? c.color : c.bg,
                  color: form.category === c.value ? 'white' : c.color,
                }}>
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* 日付・ステータス */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label style={lbl}>日付</label>
            <input type="date" value={form.inquiry_date} onChange={e => setForm(f => ({ ...f, inquiry_date: e.target.value }))} style={inp()} />
          </div>
          <div>
            <label style={lbl}>ステータス</label>
            <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} style={inp()}>
              <option value="new">新規</option>
              <option value="in_progress">対応中</option>
              <option value="closed">完了</option>
            </select>
          </div>
        </div>

        {/* 流入経路 */}
        <div id="source-field">
          <label style={lbl}>流入経路 <Req /></label>
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
          {sourceError && <p style={errMsg}>必須項目です</p>}
        </div>

        {/* 顧客情報 */}
        <div style={{ background: '#f8f9fa', border: '1px solid #eee', borderRadius: '10px', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#333' }}>
              顧客情報
              <span style={{ marginLeft: '8px', fontSize: '11px', fontWeight: 400, color: '#aaa' }}>（任意）</span>
            </span>
            <button
              onClick={() => { setUseExistingCustomer(v => !v); setExistingCustomerId('') }}
              style={{ background: 'none', border: '1px solid #1a73e8', color: '#1a73e8', cursor: 'pointer', fontSize: '12px', padding: '4px 12px', borderRadius: '20px', fontWeight: 500 }}>
              {useExistingCustomer ? '新規顧客として登録' : '既存顧客から選ぶ'}
            </button>
          </div>

          {useExistingCustomer ? (
            <select value={existingCustomerId} onChange={e => setExistingCustomerId(e.target.value)}
              style={{ ...inp(), background: 'white' }}>
              <option value="">顧客を選択してください</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>{c.氏名}　{c.電話番号 ?? ''}</option>
              ))}
            </select>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={lbl}>氏名</label>
                <input type="text" value={newCustomer.氏名} onChange={e => setNewCustomer(p => ({ ...p, 氏名: e.target.value }))}
                  placeholder="田中 太郎" style={{ ...inp(), background: 'white' }} />
              </div>
              <div>
                <label style={lbl}>氏名カナ</label>
                <input type="text" value={newCustomer.氏名カナ} onChange={e => setNewCustomer(p => ({ ...p, 氏名カナ: e.target.value }))}
                  placeholder="タナカ タロウ" style={{ ...inp(), background: 'white' }} />
              </div>
              <div>
                <label style={lbl}>電話番号</label>
                <input type="text" value={newCustomer.電話番号} onChange={e => setNewCustomer(p => ({ ...p, 電話番号: e.target.value }))}
                  placeholder="090-0000-0000" style={{ ...inp(), background: 'white' }} />
              </div>
              <div>
                <label style={lbl}>都道府県</label>
                <select value={newCustomer.都道府県} onChange={e => setNewCustomer(p => ({ ...p, 都道府県: e.target.value }))}
                  style={{ ...inp(), background: 'white' }}>
                  <option value="">選択してください</option>
                  {PREFECTURES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>メール</label>
                <input type="email" value={newCustomer.メール} onChange={e => setNewCustomer(p => ({ ...p, メール: e.target.value }))}
                  placeholder="example@mail.com" style={{ ...inp(), background: 'white' }} />
              </div>
              <div>
                <label style={lbl}>担当者</label>
                <div style={{ ...inp(), background: '#f0f0f0', color: '#555', display: 'flex', alignItems: 'center' }}>
                  {form.assigned_to || '―'}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 希望車種（販売・その他のみ） */}
        {form.category !== 'purchase' && (
          <div>
            <label style={lbl}>希望車種</label>
            <input type="text" value={form.car_interest} onChange={e => setForm(f => ({ ...f, car_interest: e.target.value }))}
              placeholder="アルファード など" style={inp()} />
          </div>
        )}

        {/* 買取車両情報（買取カテゴリのみ） */}
        {form.category === 'purchase' && (
          <div style={{ background: '#f0faf4', border: '1px solid #c3e6cb', borderRadius: '10px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#1e7e34' }}>買取車両情報</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={mlbl}>メーカー</label>
                <select
                  value={form.purchase_maker}
                  onChange={e => {
                    const name = e.target.value
                    const maker = makers.find(m => m.name === name)
                    handleMakerChange(maker?.id || '', name)
                  }}
                  style={minp}>
                  <option value="">選択してください</option>
                  {makers.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
                </select>
              </div>
              <div>
                <label style={mlbl}>車種</label>
                <select
                  value={form.purchase_model}
                  onChange={e => setForm(f => ({ ...f, purchase_model: e.target.value }))}
                  disabled={!purchaseMakerId}
                  style={{ ...minp, background: purchaseMakerId ? 'white' : '#f5f5f5' }}>
                  <option value="">{purchaseMakerId ? '選択してください' : 'メーカーを先に選択'}</option>
                  {filteredModels.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
                </select>
              </div>
              <div>
                <label style={mlbl}>年式</label>
                <select value={form.purchase_year} onChange={e => setForm(f => ({ ...f, purchase_year: e.target.value }))} style={minp}>
                  <option value="">選択</option>
                  {Array.from({ length: 36 }, (_, i) => 2025 - i).map(y => (
                    <option key={y} value={String(y)}>{y}年</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={mlbl}>走行距離（km）</label>
                <input type="number" value={form.purchase_mileage} onChange={e => setForm(f => ({ ...f, purchase_mileage: e.target.value }))}
                  placeholder="50000" style={minp} />
              </div>
              <div>
                <label style={mlbl}>車台番号</label>
                <input type="text" value={form.purchase_chassis_number} onChange={e => setForm(f => ({ ...f, purchase_chassis_number: e.target.value }))}
                  placeholder="ABC-1234567" style={minp} />
              </div>
              <div>
                <label style={mlbl}>色</label>
                <input type="text" value={form.purchase_color} onChange={e => setForm(f => ({ ...f, purchase_color: e.target.value }))}
                  placeholder="パールホワイト" style={minp} />
              </div>
              <div>
                <label style={mlbl}>希望買取金額（円）</label>
                <input type="number" value={form.purchase_desired_price} onChange={e => setForm(f => ({ ...f, purchase_desired_price: e.target.value }))}
                  placeholder="2000000" style={minp} />
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: '4px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
                  <input type="checkbox" checked={form.purchase_repair_history} onChange={e => setForm(f => ({ ...f, purchase_repair_history: e.target.checked }))}
                    style={{ width: '16px', height: '16px', cursor: 'pointer' }} />
                  修復歴あり
                </label>
              </div>
            </div>
          </div>
        )}

        {/* 来店日 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label style={lbl}>来店日</label>
            <input type="date" value={form.visit_date} onChange={e => setForm(f => ({ ...f, visit_date: e.target.value }))} style={inp()} />
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: '2px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
              <input type="checkbox" checked={form.visited} onChange={e => setForm(f => ({ ...f, visited: e.target.checked }))}
                style={{ width: '16px', height: '16px', cursor: 'pointer' }} />
              来店済み
            </label>
          </div>
        </div>

        {/* メモ */}
        <div>
          <label style={lbl}>メモ</label>
          <textarea value={form.memo} onChange={e => setForm(f => ({ ...f, memo: e.target.value }))} rows={3}
            placeholder="備考・対応履歴など" style={{ ...inp(), resize: 'vertical' }} />
        </div>

        <button onClick={handleSubmit} disabled={loading}
          style={{ padding: '12px', background: '#0070f3', color: 'white', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
          {loading ? '登録中...' : '問合を登録する'}
        </button>
      </div>
    </div>
  )
}

export default function NewInquiryPage() {
  return (
    <Suspense fallback={<div style={{ padding: '2rem', color: '#aaa' }}>読み込み中...</div>}>
      <NewInquiryContent />
    </Suspense>
  )
}
