'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Inquiry = {
  id: string
  inquiry_date: string
  customer_name: string
  phone: string | null
  email: string | null
  car_interest: string | null
  inquiry_type: string | null
  source: string | null
  status: string
  memo: string | null
  assigned_to: string | null
}

const STATUS_COLOR: Record<string, { bg: string; color: string }> = {
  new:         { bg: '#e8f0fe', color: '#1a73e8' },
  in_progress: { bg: '#fff3e0', color: '#e65100' },
  closed:      { bg: '#f1f3f4', color: '#5f6368' },
}
const STATUS_LABEL: Record<string, string> = {
  new: '新規', in_progress: '対応中', closed: '完了'
}

// 流入経路
const SOURCES: { value: string; label: string; color: string; bg: string }[] = [
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
  inquiry_type: 'web',
  source: '',
  status: 'new',
  memo: '',
  assigned_to: '',
}

export default function InquiriesPage() {
  const [inquiries, setInquiries] = useState<Inquiry[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterSource, setFilterSource] = useState('all')
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editTarget, setEditTarget] = useState<Inquiry | null>(null)
  const [form, setForm] = useState(emptyForm)

  const fetchInquiries = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('inquiries')
      .select('*')
      .order('inquiry_date', { ascending: false })
    setInquiries(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchInquiries() }, [])

  const openNew = () => {
    setEditTarget(null)
    setForm({ ...emptyForm, inquiry_date: new Date().toISOString().split('T')[0] })
    setShowModal(true)
  }

  const openEdit = (inq: Inquiry) => {
    setEditTarget(inq)
    setForm({
      inquiry_date: inq.inquiry_date,
      customer_name: inq.customer_name,
      phone: inq.phone || '',
      email: inq.email || '',
      car_interest: inq.car_interest || '',
      inquiry_type: inq.inquiry_type || 'web',
      source: inq.source || '',
      status: inq.status,
      memo: inq.memo || '',
      assigned_to: inq.assigned_to || '',
    })
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!form.customer_name) return alert('お客様名を入力してください')
    if (editTarget) {
      await supabase.from('inquiries').update({ ...form, updated_at: new Date().toISOString() }).eq('id', editTarget.id)
    } else {
      await supabase.from('inquiries').insert(form)
    }
    setShowModal(false)
    fetchInquiries()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('この問合を削除しますか？')) return
    await supabase.from('inquiries').delete().eq('id', id)
    fetchInquiries()
  }

  const handleStatusChange = async (id: string, status: string) => {
    await supabase.from('inquiries').update({ status, updated_at: new Date().toISOString() }).eq('id', id)
    fetchInquiries()
  }

  // CSVダウンロード
  const downloadCSV = () => {
    const headers = ['日付', 'お客様名', '電話番号', 'メール', '希望車種', '流入経路', '種別', 'ステータス', '担当者', 'メモ']
    const rows = filtered.map(inq => [
      inq.inquiry_date,
      inq.customer_name,
      inq.phone || '',
      inq.email || '',
      inq.car_interest || '',
      SOURCE_MAP[inq.source || '']?.label || inq.source || '',
      inq.inquiry_type || '',
      STATUS_LABEL[inq.status] || inq.status,
      inq.assigned_to || '',
      inq.memo || '',
    ])
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `問合一覧_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const filtered = inquiries.filter(inq => {
    const matchStatus = filterStatus === 'all' || inq.status === filterStatus
    const matchSource = filterSource === 'all' || inq.source === filterSource
    const matchSearch = !search ||
      inq.customer_name.includes(search) ||
      (inq.phone || '').includes(search) ||
      (inq.car_interest || '').includes(search)
    return matchStatus && matchSource && matchSearch
  })

  // 経路別集計
  const sourceCounts = SOURCES.map(s => ({
    ...s,
    count: inquiries.filter(inq => inq.source === s.value).length,
  })).filter(s => s.count > 0)

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      {/* ヘッダー */}
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

      {/* 経路別サマリー */}
      {sourceCounts.length > 0 && (
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
          {sourceCounts.map(s => (
            <button key={s.value} onClick={() => setFilterSource(filterSource === s.value ? 'all' : s.value)}
              style={{
                padding: '6px 14px', borderRadius: '20px', border: 'none', fontSize: '12px', fontWeight: 600,
                cursor: 'pointer', transition: 'all 0.15s',
                background: filterSource === s.value ? s.color : s.bg,
                color: filterSource === s.value ? 'white' : s.color,
              }}>
              {s.label} {s.count}
            </button>
          ))}
        </div>
      )}

      {/* 検索・フィルター */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          type="text"
          placeholder="お客様名・電話番号・車種で検索"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '8px 12px', fontSize: '13px', width: '260px', outline: 'none' }}
        />
        {['all', 'new', 'in_progress', 'closed'].map(s => (
          <button key={s} onClick={() => setFilterStatus(s)} style={{
            padding: '8px 14px', borderRadius: '8px', border: 'none', fontSize: '13px', fontWeight: 500, cursor: 'pointer',
            background: filterStatus === s ? '#0070f3' : '#f1f3f4',
            color: filterStatus === s ? 'white' : '#555',
          }}>
            {s === 'all' ? 'すべて' : STATUS_LABEL[s]}
          </button>
        ))}
        {(filterStatus !== 'all' || filterSource !== 'all' || search) && (
          <button onClick={() => { setFilterStatus('all'); setFilterSource('all'); setSearch('') }}
            style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: '8px', background: 'white', fontSize: '13px', cursor: 'pointer', color: '#888' }}>
            ✕ リセット
          </button>
        )}
      </div>

      {/* テーブル */}
      <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #eee', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#aaa', fontSize: '14px' }}>読み込み中...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#aaa', fontSize: '14px' }}>問合がありません</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8f9fa', borderBottom: '1px solid #eee' }}>
                {['日付', 'お客様名', '連絡先', '希望車種', '流入経路', 'ステータス', '担当', '操作'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', color: '#888', fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((inq, i) => (
                <tr key={inq.id} style={{ borderBottom: i < filtered.length - 1 ? '1px solid #f0f0f0' : 'none' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#fafafa')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'white')}
                >
                  <td style={{ padding: '12px 16px', fontSize: '13px', color: '#888' }}>{inq.inquiry_date}</td>
                  <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: 500 }}>{inq.customer_name}</td>
                  <td style={{ padding: '12px 16px', fontSize: '13px', color: '#555' }}>
                    {inq.phone && <div>{inq.phone}</div>}
                    {inq.email && <div style={{ fontSize: '12px', color: '#888' }}>{inq.email}</div>}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '13px' }}>{inq.car_interest || '―'}</td>
                  <td style={{ padding: '12px 16px' }}>
                    {inq.source ? (
                      <span style={{
                        fontSize: '11px', padding: '3px 10px', borderRadius: '20px', fontWeight: 600,
                        background: SOURCE_MAP[inq.source]?.bg ?? '#f1f3f4',
                        color: SOURCE_MAP[inq.source]?.color ?? '#555',
                      }}>
                        {SOURCE_MAP[inq.source]?.label ?? inq.source}
                      </span>
                    ) : <span style={{ color: '#ccc', fontSize: '12px' }}>―</span>}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <select
                      value={inq.status}
                      onChange={e => handleStatusChange(inq.id, e.target.value)}
                      style={{
                        fontSize: '11px', padding: '3px 8px', borderRadius: '20px', border: 'none', fontWeight: 500, cursor: 'pointer',
                        background: STATUS_COLOR[inq.status]?.bg ?? '#f1f3f4',
                        color: STATUS_COLOR[inq.status]?.color ?? '#5f6368',
                      }}
                    >
                      <option value="new">新規</option>
                      <option value="in_progress">対応中</option>
                      <option value="closed">完了</option>
                    </select>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '13px', color: '#888' }}>{inq.assigned_to || '―'}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <button onClick={() => openEdit(inq)} style={{ fontSize: '12px', color: '#0070f3', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>編集</button>
                      <button onClick={() => handleDelete(inq.id)} style={{ fontSize: '12px', color: '#e53e3e', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>削除</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* モーダル */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: '1rem' }}>
          <div style={{ background: 'white', borderRadius: '16px', width: '100%', maxWidth: '540px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: 'white' }}>
              <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>{editTarget ? '問合編集' : '新規問合'}</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#888' }}>×</button>
            </div>
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

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
              <div>
                <label style={{ fontSize: '12px', color: '#888', fontWeight: 500 }}>流入経路</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                  {SOURCES.map(s => (
                    <button key={s.value} onClick={() => setForm({ ...form, source: form.source === s.value ? '' : s.value })}
                      style={{
                        padding: '5px 12px', borderRadius: '20px', border: 'none', fontSize: '12px', fontWeight: 500, cursor: 'pointer',
                        background: form.source === s.value ? s.color : s.bg,
                        color: form.source === s.value ? 'white' : s.color,
                      }}>
                      {s.label}
                    </button>
                  ))}
                </div>
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
                  <label style={{ fontSize: '12px', color: '#888', fontWeight: 500 }}>希望車種</label>
                  <input type="text" value={form.car_interest} onChange={e => setForm({ ...form, car_interest: e.target.value })} placeholder="アルファード など"
                    style={{ width: '100%', border: '1px solid #ddd', borderRadius: '8px', padding: '8px 12px', fontSize: '13px', marginTop: '4px', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: '#888', fontWeight: 500 }}>担当者</label>
                  <input type="text" value={form.assigned_to} onChange={e => setForm({ ...form, assigned_to: e.target.value })} placeholder="山田"
                    style={{ width: '100%', border: '1px solid #ddd', borderRadius: '8px', padding: '8px 12px', fontSize: '13px', marginTop: '4px', boxSizing: 'border-box' }} />
                </div>
              </div>

              {/* メモ */}
              <div>
                <label style={{ fontSize: '12px', color: '#888', fontWeight: 500 }}>メモ</label>
                <textarea value={form.memo} onChange={e => setForm({ ...form, memo: e.target.value })} rows={3} placeholder="備考・対応履歴など"
                  style={{ width: '100%', border: '1px solid #ddd', borderRadius: '8px', padding: '8px 12px', fontSize: '13px', marginTop: '4px', boxSizing: 'border-box', resize: 'vertical' }} />
              </div>
            </div>
            <div style={{ padding: '16px 24px', borderTop: '1px solid #eee', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button onClick={() => setShowModal(false)} style={{ padding: '10px 20px', background: '#f1f3f4', color: '#555', borderRadius: '8px', border: 'none', fontSize: '14px', cursor: 'pointer' }}>キャンセル</button>
              <button onClick={handleSave} style={{ padding: '10px 20px', background: '#0070f3', color: 'white', borderRadius: '8px', border: 'none', fontSize: '14px', fontWeight: 500, cursor: 'pointer' }}>保存</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}