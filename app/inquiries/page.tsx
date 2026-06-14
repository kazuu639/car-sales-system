'use client'
import { useEffect, useState, Fragment } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useProfile } from '@/hooks/useProfile'
import LoadingOverlay from '@/components/LoadingOverlay'


const STATUS_COLOR: Record<string, { bg: string; color: string }> = {
  new:         { bg: '#e8f0fe', color: '#1a73e8' },
  in_progress: { bg: '#fff3e0', color: '#e65100' },
  closed:      { bg: '#f1f3f4', color: '#5f6368' },
}
const STATUS_LABEL: Record<string, string> = {
  new: '新規', in_progress: '対応中', closed: '完了'
}

const CATEGORIES = [
  { value: 'all',      label: 'すべて',  color: '#555',    bg: '#f1f3f4' },
  { value: 'sales',    label: '販売',    color: '#1a73e8', bg: '#e8f0fe' },
  { value: 'purchase', label: '買取',    color: '#1e7e34', bg: '#e6f4ea' },
  { value: 'other',    label: 'その他',  color: '#e65100', bg: '#fff3e0' },
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
const SOURCE_MAP = Object.fromEntries(SOURCES.map(s => [s.value, s]))

const emptyForm = {
  inquiry_date: new Date().toISOString().split('T')[0],
  customer_name: '',
  phone: '',
  email: '',
  car_interest: '',
  source: '',
  status: 'new',
  memo: '',
  assigned_to: '',
  category: 'sales',
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
}

export default function InquiriesPage() {
  const router = useRouter()
  const [inquiries, setInquiries] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingOverlay, setLoadingOverlay] = useState(false)
  const [loadingMessage, setLoadingMessage] = useState('処理中...')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterCategory, setFilterCategory] = useState('purchase')
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editSubmitted, setEditSubmitted] = useState(false)
  const [editTarget, setEditTarget] = useState<any | null>(null)
  const [form, setForm] = useState(emptyForm)
  const { profile, isAdmin } = useProfile()
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const toggleRow = (id: string) => setExpandedId(prev => prev === id ? null : id)

  const goToNegotiation = (inq: any) => {
    const params = new URLSearchParams({
      from_inquiry: inq.id,
      category: inq.category || 'sales',
    })
    router.push(`/negotiations/new?${params}`)
  }

  const NEG_BUTTON: Record<string, { label: string; color: string; bg: string }> = {
    purchase: { label: '仕入商談へ',   color: '#1e7e34', bg: '#e6f4ea' },
    sales:    { label: '販売商談へ',   color: '#1a73e8', bg: '#e8f0fe' },
    other:    { label: 'その他商談へ', color: '#e65100', bg: '#fff3e0' },
  }

  const fetchInquiries = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('inquiries')
      .select('*')
      .is('deleted_at', null)
      .order('inquiry_date', { ascending: false })
    setInquiries(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchInquiries() }, [])

  const openNew = () => {
    setEditTarget(null)
    setForm({ ...emptyForm, inquiry_date: new Date().toISOString().split('T')[0], assigned_to: profile?.display_name || '' })
    setShowModal(true)
  }

  const openEdit = (inq: any) => {
    setEditTarget(inq)
    setForm({
      inquiry_date: inq.inquiry_date,
      customer_name: inq.customer_name,
      phone: inq.phone || '',
      email: inq.email || '',
      car_interest: inq.car_interest || '',
      source: inq.source || '',
      status: inq.status,
      memo: inq.memo || '',
      assigned_to: inq.assigned_to || '',
      category: inq.category || 'sales',
      visit_date: inq.visit_date || '',
      visited: inq.visited || false,
      purchase_maker: inq.purchase_maker || '',
      purchase_model: inq.purchase_model || '',
      purchase_year: inq.purchase_year?.toString() || '',
      purchase_mileage: inq.purchase_mileage?.toString() || '',
      purchase_chassis_number: inq.purchase_chassis_number || '',
      purchase_color: inq.purchase_color || '',
      purchase_desired_price: inq.purchase_desired_price?.toString() || '',
      purchase_repair_history: inq.purchase_repair_history || false,
    })
    setShowModal(true)
  }

  const editSourceError = editSubmitted && !form.source

  const handleSave = async () => {
  setLoadingMessage('保存中...')
  setLoadingOverlay(true)
  setEditSubmitted(true)
  if (!form.source) {
    document.getElementById('edit-source-field')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    return
  }
  if (!form.customer_name) return alert('お客様名を入力してください')
  const payload = {
    ...form,
    visit_date: form.visit_date || null,
    company_id: '00000000-0000-0000-0000-000000000001',
    purchase_maker: form.purchase_maker || null,
    purchase_model: form.purchase_model || null,
    purchase_year: form.purchase_year ? parseInt(form.purchase_year) : null,
    purchase_mileage: form.purchase_mileage ? parseInt(form.purchase_mileage) : null,
    purchase_chassis_number: form.purchase_chassis_number || null,
    purchase_color: form.purchase_color || null,
    purchase_desired_price: form.purchase_desired_price ? parseInt(form.purchase_desired_price) : null,
  }
  if (editTarget) {
    await supabase.from('inquiries').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', editTarget.id)
  } else {
    await supabase.from('inquiries').insert(payload)
  }
  setShowModal(false)
  setEditSubmitted(false)
  setLoadingOverlay(false)
  fetchInquiries()
}

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`「${name}」を削除しますか？`)) return
    await supabase.from('inquiries').update({ deleted_at: new Date().toISOString() }).eq('id', id)
    fetchInquiries()
  }

  const handleStatusChange = async (id: string, status: string) => {
    await supabase.from('inquiries').update({ status, updated_at: new Date().toISOString() }).eq('id', id)
    fetchInquiries()
  }

  // CSVダウンロード
  const downloadCSV = () => {
    const headers = ['日付', 'カテゴリ', 'お客様名', '電話番号', 'メール', '希望車種', '流入経路', 'ステータス', '担当者', '来店日', 'メモ']
    const rows = filtered.map(inq => [
      inq.inquiry_date,
      CATEGORIES.find(c => c.value === inq.category)?.label ?? '',
      inq.customer_name,
      inq.phone || '',
      inq.email || '',
      inq.car_interest || '',
      SOURCE_MAP[inq.source || '']?.label || '',
      STATUS_LABEL[inq.status] || inq.status,
      inq.assigned_to || '',
      inq.visit_date || '',
      inq.memo || '',
    ])
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `問合一覧_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  const filtered = inquiries.filter(inq => {
    const matchStatus = filterStatus === 'all' || inq.status === filterStatus
    const matchCategory = inq.category === filterCategory
    const matchSearch = !search ||
      inq.customer_name.includes(search) ||
      (inq.phone || '').includes(search) ||
      (inq.car_interest || '').includes(search)
    return matchStatus && matchCategory && matchSearch
  })

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      {/* ヘッダー */}
      {loadingOverlay && <LoadingOverlay message={loadingMessage} />}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, margin: 0 }}>問合管理</h1>
          <p style={{ fontSize: '13px', color: '#888', margin: '4px 0 0' }}>全 {inquiries.length} 件</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={downloadCSV} style={{ padding: '10px 16px', background: '#f1f3f4', color: '#555', borderRadius: '8px', border: 'none', fontSize: '14px', fontWeight: 500, cursor: 'pointer' }}>
            ⬇ CSV
          </button>
          <button onClick={openNew} style={{ padding: '10px 20px', background: '#0070f3', color: 'white', borderRadius: '8px', border: 'none', fontSize: '14px', fontWeight: 500, cursor: 'pointer' }}>
            ＋ 新規問合
          </button>
        </div>
      </div>

      {/* カテゴリタブ */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          {[{ value: 'purchase', label: '買取' }, { value: 'sales', label: '販売' }, { value: 'other', label: 'その他' }].map(tab => {
            const active = filterCategory === tab.value
            return (
              <button key={tab.value} onClick={() => setFilterCategory(tab.value)} style={{
                padding: '10px 40px', fontSize: '15px', fontWeight: 600, cursor: 'pointer',
                borderRadius: '8px',
                background: active ? '#1a1a1a' : 'transparent',
                color: active ? 'white' : '#888',
                border: active ? 'none' : '1px solid #ddd',
              }}>
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* 検索・フィルター */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
        <input type="text" placeholder="お客様名・電話番号・車種で検索" value={search} onChange={e => setSearch(e.target.value)}
          style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '8px 12px', fontSize: '13px', width: '260px', outline: 'none' }} />
        {['all', 'new', 'in_progress', 'closed'].map(s => (
          <button key={s} onClick={() => setFilterStatus(s)} style={{
            padding: '7px 14px', borderRadius: '8px', border: 'none', fontSize: '13px', fontWeight: 500, cursor: 'pointer',
            background: filterStatus === s ? '#0070f3' : '#f1f3f4',
            color: filterStatus === s ? 'white' : '#555',
          }}>
            {s === 'all' ? 'すべて' : STATUS_LABEL[s]}
          </button>
        ))}
        {(filterStatus !== 'all' || filterCategory !== 'purchase' || search) && (
          <button onClick={() => { setFilterStatus('all'); setFilterCategory('purchase'); setSearch('') }}
            style={{ padding: '7px 12px', border: '1px solid #ddd', borderRadius: '8px', background: 'white', fontSize: '13px', cursor: 'pointer', color: '#888' }}>
            ✕ リセット
          </button>
        )}
        <span style={{ fontSize: '13px', color: '#888', marginLeft: 'auto' }}>{filtered.length}件表示</span>
      </div>

      {/* テーブル */}
      <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #eee', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#aaa' }}>読み込み中...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#aaa' }}>問合がありません</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #f0f0f0' }}>
                {['日付', 'カテゴリ', 'お客様名', '連絡先', '希望車種', '流入経路', 'ステータス', '担当', ''].map(h => (
                  <th key={h} style={{ padding: '11px 16px', textAlign: 'left', fontSize: '11px', color: '#9aa0a6', fontWeight: 600, letterSpacing: '0.03em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((inq, i) => {
                const cat = CATEGORIES.find(c => c.value === inq.category)
                const src = SOURCE_MAP[inq.source || '']
                const isExpanded = expandedId === inq.id
                return (
                  <Fragment key={inq.id}>
                    <tr
                      style={{ borderBottom: isExpanded ? 'none' : (i < filtered.length - 1 ? '1px solid #f4f4f4' : 'none'), background: isExpanded ? '#f0f5ff' : 'white', cursor: 'pointer', boxShadow: isExpanded ? '0 4px 12px rgba(0,0,0,0.10)' : 'none' }}
                      onMouseEnter={e => { if (!isExpanded) e.currentTarget.style.background = '#fafbff' }}
                      onMouseLeave={e => { if (!isExpanded) e.currentTarget.style.background = 'white' }}
                      onClick={() => toggleRow(inq.id)}
                    >
                      <td style={{ padding: '14px 16px', fontSize: '13px', color: '#888' }}>{inq.inquiry_date}</td>
                      <td style={{ padding: '14px 16px' }}>
                        {cat && cat.value !== 'all' && (
                          <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', fontWeight: 600, background: cat.bg, color: cat.color }}>
                            {cat.label}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: '14px', fontWeight: 600 }}>{inq.customer_name}</td>
                      <td style={{ padding: '14px 16px', fontSize: '13px', color: '#555' }}>
                        {inq.phone && <div>{inq.phone}</div>}
                        {inq.email && <div style={{ fontSize: '12px', color: '#888' }}>{inq.email}</div>}
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: '13px' }}>
                        {inq.category === 'purchase'
                          ? [inq.purchase_maker, inq.purchase_model].filter(Boolean).join(' ') || '―'
                          : inq.car_interest || '―'}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        {src ? (
                          <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', fontWeight: 600, background: src.bg, color: src.color }}>
                            {src.label}
                          </span>
                        ) : <span style={{ color: '#ccc', fontSize: '12px' }}>―</span>}
                      </td>
                      <td style={{ padding: '14px 16px' }} onClick={e => e.stopPropagation()}>
                        <select value={inq.status} onChange={e => handleStatusChange(inq.id, e.target.value)}
                          style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '20px', border: 'none', fontWeight: 500, cursor: 'pointer', background: STATUS_COLOR[inq.status]?.bg ?? '#f1f3f4', color: STATUS_COLOR[inq.status]?.color ?? '#5f6368' }}>
                          <option value="new">新規</option>
                          <option value="in_progress">対応中</option>
                          <option value="closed">完了</option>
                        </select>
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: '13px', color: '#888' }}>{inq.assigned_to || '―'}</td>
                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                        <span style={{ fontSize: '11px', color: isExpanded ? '#1a73e8' : '#bbb' }}>{isExpanded ? '▲' : '▼'}</span>
                      </td>
                    </tr>
                    <tr>
                      <td colSpan={9} style={{ padding: 0, paddingBottom: isExpanded ? '8px' : 0, borderBottom: isExpanded ? 'none' : (i < filtered.length - 1 ? '1px solid #f4f4f4' : 'none') }}>
                        <div style={{ overflow: 'hidden', maxHeight: isExpanded ? '800px' : '0', transition: 'max-height 0.25s ease', boxShadow: isExpanded ? '0 4px 12px rgba(0,0,0,0.10)' : 'none' }}>
                          <div style={{ background: 'white', borderTop: '1px solid #e8eaed', padding: '20px 24px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                              {/* 基本情報 */}
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {([
                                  ['お客様名', inq.customer_name],
                                  ['電話番号', inq.phone],
                                  ['メール', inq.email],
                                  ['流入経路', src?.label],
                                  ['ステータス', STATUS_LABEL[inq.status]],
                                  ['担当者', inq.assigned_to],
                                  ['備考', inq.memo],
                                ] as [string, any][]).map(([label, value]) => (
                                  <div key={label} style={{ display: 'flex', gap: '12px', fontSize: '13px' }}>
                                    <span style={{ width: '80px', color: '#888', flexShrink: 0, fontSize: '12px' }}>{label}</span>
                                    <span style={{ color: value ? '#111' : '#bbb', whiteSpace: 'pre-wrap' }}>{value || '―'}</span>
                                  </div>
                                ))}
                              </div>
                              {/* 買取車両情報 */}
                              {inq.category === 'purchase' ? (
                                <div>
                                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#1e7e34', marginBottom: '10px' }}>買取車両情報</div>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    {([
                                      ['メーカー', inq.purchase_maker],
                                      ['車種', inq.purchase_model],
                                      ['年式', inq.purchase_year ? inq.purchase_year + '年' : null],
                                      ['走行距離', inq.purchase_mileage ? Number(inq.purchase_mileage).toLocaleString() + ' km' : null],
                                      ['希望買取金額', inq.purchase_desired_price ? '¥' + Number(inq.purchase_desired_price).toLocaleString() : null],
                                      ['車台番号', inq.purchase_chassis_number],
                                      ['色', inq.purchase_color],
                                      ['修復歴', inq.purchase_repair_history ? 'あり' : 'なし'],
                                    ] as [string, any][]).map(([label, value]) => (
                                      <div key={label} style={{ display: 'flex', gap: '12px', fontSize: '13px' }}>
                                        <span style={{ width: '100px', color: '#888', flexShrink: 0, fontSize: '12px' }}>{label}</span>
                                        <span style={{ color: value ? '#111' : '#bbb' }}>{value ?? '―'}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ) : <div />}
                            </div>
                            {/* ボタン */}
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #eee' }}>
                              {(() => {
                                const btn = NEG_BUTTON[inq.category]
                                if (!btn) return null
                                return (
                                  <button onClick={e => { e.stopPropagation(); goToNegotiation(inq) }}
                                    style={{ padding: '7px 16px', fontSize: '13px', fontWeight: 600, borderRadius: '6px', border: 'none', cursor: 'pointer', background: btn.bg, color: btn.color }}>
                                    {btn.label}
                                  </button>
                                )
                              })()}
                              <button onClick={e => { e.stopPropagation(); openEdit(inq) }}
                                style={{ padding: '7px 16px', fontSize: '13px', fontWeight: 500, borderRadius: '6px', border: '1px solid #ddd', cursor: 'pointer', background: 'white', color: '#555' }}>
                                編集
                              </button>
                              {isAdmin && (
                                <button onClick={e => { e.stopPropagation(); handleDelete(inq.id, inq.customer_name) }}
                                  style={{ padding: '7px 16px', fontSize: '13px', fontWeight: 500, borderRadius: '6px', border: '1px solid #fce8e6', cursor: 'pointer', background: '#fff5f5', color: '#e53e3e' }}>
                                  削除
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* モーダル */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: '1rem' }}>
          <div style={{ background: 'white', borderRadius: '16px', width: '100%', maxWidth: '960px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: 'white', zIndex: 1 }}>
              <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>{editTarget ? '問合編集' : '新規問合'}</h2>
              <button onClick={() => { setShowModal(false); setEditSubmitted(false) }} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#888' }}>×</button>
            </div>
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

              {/* カテゴリ */}
              <div>
                <label style={{ fontSize: '12px', color: '#888', fontWeight: 500 }}>カテゴリ *</label>
                <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                  {CATEGORIES.filter(c => c.value !== 'all').map(c => (
                    <button key={c.value} onClick={() => setForm(f => ({ ...f, category: c.value }))}
                      style={{ flex: 1, padding: '8px', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', background: form.category === c.value ? c.color : c.bg, color: form.category === c.value ? 'white' : c.color }}>
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 日付・ステータス */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: '#888', fontWeight: 500 }}>日付</label>
                  <input type="date" value={form.inquiry_date} onChange={e => setForm({ ...form, inquiry_date: e.target.value })}
                    style={{ width: '100%', border: '1px solid #ddd', borderRadius: '8px', padding: '8px 12px', fontSize: '13px', marginTop: '4px', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: '#888', fontWeight: 500 }}>ステータス</label>
                  <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}
                    style={{ width: '100%', border: '1px solid #ddd', borderRadius: '8px', padding: '8px 12px', fontSize: '13px', marginTop: '4px', boxSizing: 'border-box' }}>
                    <option value="new">新規</option>
                    <option value="in_progress">対応中</option>
                    <option value="closed">完了</option>
                  </select>
                </div>
              </div>

              {/* 流入経路 */}
              <div id="edit-source-field">
                <label style={{ fontSize: '12px', color: '#888', fontWeight: 500 }}>流入経路 <span style={{ color: '#e53e3e' }}>*</span></label>
                <div style={{
                  display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px', padding: '10px',
                  border: `1px solid ${editSourceError ? '#e53e3e' : form.source ? '#1a73e8' : '#eee'}`,
                  borderRadius: '10px',
                }}>
                  {SOURCES.map(s => (
                    <button key={s.value} onClick={() => setForm({ ...form, source: form.source === s.value ? '' : s.value })}
                      style={{ padding: '4px 10px', borderRadius: '20px', border: 'none', fontSize: '11px', fontWeight: 500, cursor: 'pointer', background: form.source === s.value ? s.color : s.bg, color: form.source === s.value ? 'white' : s.color }}>
                      {s.label}
                    </button>
                  ))}
                </div>
                {editSourceError && <p style={{ color: '#e53e3e', fontSize: '12px', marginTop: '4px' }}>必須項目です</p>}
              </div>

              {/* お客様名 */}
              <div>
                <label style={{ fontSize: '12px', color: '#888', fontWeight: 500 }}>お客様名 *</label>
                <input type="text" value={form.customer_name} onChange={e => setForm({ ...form, customer_name: e.target.value })} placeholder="田中 太郎"
                  style={{ width: '100%', border: '1px solid #ddd', borderRadius: '8px', padding: '8px 12px', fontSize: '13px', marginTop: '4px', boxSizing: 'border-box' }} />
              </div>

              {/* 電話・メール */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: '#888', fontWeight: 500 }}>電話番号</label>
                  <input type="text" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="090-0000-0000"
                    style={{ width: '100%', border: '1px solid #ddd', borderRadius: '8px', padding: '8px 12px', fontSize: '13px', marginTop: '4px', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: '#888', fontWeight: 500 }}>メール</label>
                  <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="example@mail.com"
                    style={{ width: '100%', border: '1px solid #ddd', borderRadius: '8px', padding: '8px 12px', fontSize: '13px', marginTop: '4px', boxSizing: 'border-box' }} />
                </div>
              </div>

              {/* 希望車種・担当 */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: '#888', fontWeight: 500 }}>
                    {form.category === 'purchase' ? '買取希望車種' : '希望車種'}
                  </label>
                  <input type="text" value={form.car_interest} onChange={e => setForm({ ...form, car_interest: e.target.value })}
                    placeholder={form.category === 'purchase' ? '売りたい車種' : 'アルファード など'}
                    style={{ width: '100%', border: '1px solid #ddd', borderRadius: '8px', padding: '8px 12px', fontSize: '13px', marginTop: '4px', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: '#888', fontWeight: 500 }}>担当者</label>
                  <div style={{ width: '100%', border: '1px solid #e8e8e8', borderRadius: '8px', padding: '8px 12px', fontSize: '13px', marginTop: '4px', background: '#f8f9fa', color: '#555' }}>
                    {form.assigned_to || '―'}
                  </div>
                </div>
              </div>

              {/* 買取車両情報（買取カテゴリのみ） */}
              {form.category === 'purchase' && (
                <div style={{ background: '#f0faf4', border: '1px solid #c3e6cb', borderRadius: '10px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#1e7e34' }}>買取車両情報</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    {([
                      ['purchase_maker', 'text', 'メーカー', 'トヨタ'],
                      ['purchase_model', 'text', '車種', 'アルファード'],
                      ['purchase_year', 'number', '年式', '2020'],
                      ['purchase_mileage', 'number', '走行距離（km）', '50000'],
                      ['purchase_chassis_number', 'text', '車台番号', 'ABC-1234567'],
                      ['purchase_color', 'text', '色', 'パールホワイト'],
                      ['purchase_desired_price', 'number', '希望買取金額（円）', '2000000'],
                    ] as const).map(([key, type, label, placeholder]) => (
                      <div key={key}>
                        <label style={{ fontSize: '11px', color: '#888', fontWeight: 500, display: 'block', marginBottom: '4px' }}>{label}</label>
                        <input type={type} value={form[key] as string} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} placeholder={placeholder}
                          style={{ width: '100%', border: '1px solid #ddd', borderRadius: '8px', padding: '7px 10px', fontSize: '12px', boxSizing: 'border-box' }} />
                      </div>
                    ))}
                    <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: '4px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12px' }}>
                        <input type="checkbox" checked={form.purchase_repair_history} onChange={e => setForm(f => ({ ...f, purchase_repair_history: e.target.checked }))}
                          style={{ width: '14px', height: '14px', cursor: 'pointer' }} />
                        修復歴あり
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* 来店日 */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: '#888', fontWeight: 500 }}>来店日</label>
                  <input type="date" value={form.visit_date} onChange={e => setForm({ ...form, visit_date: e.target.value })}
                    style={{ width: '100%', border: '1px solid #ddd', borderRadius: '8px', padding: '8px 12px', fontSize: '13px', marginTop: '4px', boxSizing: 'border-box' }} />
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: '2px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
                    <input type="checkbox" checked={form.visited} onChange={e => setForm({ ...form, visited: e.target.checked })}
                      style={{ width: '16px', height: '16px', cursor: 'pointer' }} />
                    来店済み
                  </label>
                </div>
              </div>

              {/* メモ */}
              <div>
                <label style={{ fontSize: '12px', color: '#888', fontWeight: 500 }}>メモ</label>
                <textarea value={form.memo} onChange={e => setForm({ ...form, memo: e.target.value })} rows={3} placeholder="備考・対応履歴など"
                  style={{ width: '100%', border: '1px solid #ddd', borderRadius: '8px', padding: '8px 12px', fontSize: '13px', marginTop: '4px', boxSizing: 'border-box', resize: 'vertical' }} />
              </div>
            </div>
            <div style={{ padding: '16px 24px', borderTop: '1px solid #eee', display: 'flex', justifyContent: 'flex-end', gap: '12px', position: 'sticky', bottom: 0, background: 'white' }}>
              <button onClick={() => { setShowModal(false); setEditSubmitted(false) }} style={{ padding: '10px 20px', background: '#f1f3f4', color: '#555', borderRadius: '8px', border: 'none', fontSize: '14px', cursor: 'pointer' }}>キャンセル</button>
              <button onClick={handleSave} style={{ padding: '10px 20px', background: '#0070f3', color: 'white', borderRadius: '8px', border: 'none', fontSize: '14px', fontWeight: 500, cursor: 'pointer' }}>保存</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}