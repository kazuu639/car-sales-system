'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useProfile } from '@/hooks/useProfile'
import Link from 'next/link'

const REASONS = ['車検', '修理', 'メンテナンス', 'カスタム', 'チューニング', '事故', 'クレーム']
const STATUSES = ['受付', '作業中', '完了', '引渡済']

const REASON_CONFIG: Record<string, { bg: string; color: string; border: string }> = {
  '車検':       { bg: '#e8f0fe', color: '#1a73e8', border: '#aac4f5' },
  '修理':       { bg: '#fce8e6', color: '#c62828', border: '#f5a5a0' },
  'メンテナンス': { bg: '#e6f4ea', color: '#1e7e34', border: '#a8d5b5' },
  'カスタム':   { bg: '#f3e8fd', color: '#7b1fa2', border: '#d4a8f5' },
  'チューニング': { bg: '#fff3e0', color: '#e65100', border: '#ffcc99' },
  '事故':       { bg: '#fce8e6', color: '#b71c1c', border: '#f5a5a0' },
  'クレーム':   { bg: '#fce8e6', color: '#c62828', border: '#f5a5a0' },
}
const STATUS_CONFIG: Record<string, { bg: string; color: string; dot: string }> = {
  '受付':   { bg: '#e8f0fe', color: '#1a73e8', dot: '#4285f4' },
  '作業中': { bg: '#fff3e0', color: '#e65100', dot: '#fb8c00' },
  '完了':   { bg: '#e6f4ea', color: '#1e7e34', dot: '#34a853' },
  '引渡済': { bg: '#f1f3f4', color: '#5f6368', dot: '#9aa0a6' },
}
const TAB_COLOR: Record<string, { bg: string; color: string; border: string; shadow: string }> = {
  '作業': { bg: '#fff7ed', color: '#c2410c', border: '#fed7aa', shadow: '0 2px 6px rgba(194,65,12,0.15)' },
  '見積': { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe', shadow: '0 2px 6px rgba(29,78,216,0.15)'  },
  '請求': { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0', shadow: '0 2px 6px rgba(21,128,61,0.15)'  },
  '財務': { bg: '#fefce8', color: '#a16207', border: '#fde68a', shadow: '0 2px 6px rgba(161,98,7,0.15)'   },
}

const inp: React.CSSProperties = { width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box', outline: 'none' }
const lbl: React.CSSProperties = { fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '3px', fontWeight: 500 }

function cell(label: string, value: any) {
  return (
    <div style={{ display: 'flex', gap: '6px', fontSize: '12px', marginBottom: '5px', alignItems: 'baseline' }}>
      <span style={{ color: '#aaa', flexShrink: 0, minWidth: '80px' }}>{label}</span>
      <span style={{ color: value ? '#222' : '#ccc', fontWeight: value ? 500 : 400 }}>{value || '―'}</span>
    </div>
  )
}

export default function CustodyDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const { isAdmin } = useProfile()

  const [c, setC]               = useState<any>(null)
  const [works, setWorks]       = useState<any[]>([])
  const [estimates, setEstimates] = useState<any[]>([])
  const [invoices, setInvoices] = useState<any[]>([])
  const [transactions, setTransactions] = useState<any[]>([])
  const [tab, setTab]           = useState<'作業' | '見積' | '請求' | '財務'>('作業')
  const [saving, setSaving]     = useState(false)
  const [editingInfo, setEditingInfo] = useState(false)
  const [editForm, setEditForm] = useState<Record<string, any>>({})

  // 作業追加フォーム
  const [workForm, setWorkForm] = useState({ title: '', description: '', worker: '', work_date: new Date().toISOString().slice(0, 10), amount: '' })
  const [addingWork, setAddingWork] = useState(false)

  const fetchAll = async () => {
    const [
      { data: custody },
      { data: w },
      { data: e },
      { data: inv },
      { data: tx },
    ] = await Promise.all([
      supabase.from('custody').select('*, customers(id, 氏名, 電話番号, メール, 住所), dealers(id, 業者名, 担当者名, 電話番号)').eq('id', id as string).single(),
      supabase.from('custody_works').select('*').eq('custody_id', id as string).order('work_date', { ascending: false }),
      supabase.from('custody_estimates').select('*').eq('custody_id', id as string).order('created_at', { ascending: false }),
      supabase.from('custody_invoices').select('*').eq('custody_id', id as string).order('created_at', { ascending: false }),
      supabase.from('transactions').select('*').eq('custody_id', id as string).order('date', { ascending: false }),
    ])
    setC(custody)
    setWorks(w ?? [])
    setEstimates(e ?? [])
    setInvoices(inv ?? [])
    setTransactions(tx ?? [])
  }

  useEffect(() => { fetchAll() }, [id])

  if (!c) return <div style={{ padding: '4rem', textAlign: 'center', color: '#bbb' }}>読み込み中...</div>

  const ownerName = c.customers?.['氏名'] ?? c.dealers?.['業者名'] ?? '—'
  const isDealer  = !!c.dealer_id
  const rcfg = REASON_CONFIG[c.custody_reason] ?? { bg: '#f1f3f4', color: '#555', border: '#ddd' }
  const scfg = STATUS_CONFIG[c.status]         ?? { bg: '#f1f3f4', color: '#555', dot: '#aaa' }

  const handleSaveInfo = async () => {
    setSaving(true)
    await supabase.from('custody').update({
      car_name:               editForm.car_name     || null,
      chassis_number:         editForm.chassis_number || null,
      car_number:             editForm.car_number   || null,
      year:                   editForm.year         ? parseInt(editForm.year)    : null,
      mileage:                editForm.mileage      ? parseInt(editForm.mileage) : null,
      color:                  editForm.color        || null,
      custody_reason:         editForm.custody_reason,
      status:                 editForm.status,
      intake_date:            editForm.intake_date  || null,
      scheduled_delivery_date: editForm.scheduled_delivery_date || null,
      actual_delivery_date:   editForm.actual_delivery_date || null,
      notes:                  editForm.notes        || null,
    }).eq('id', id as string)
    setSaving(false)
    setEditingInfo(false)
    fetchAll()
  }

  const handleAddWork = async () => {
    if (!workForm.title) { alert('作業名を入力してください'); return }
    setSaving(true)
    await supabase.from('custody_works').insert({
      custody_id:  id as string,
      title:       workForm.title,
      description: workForm.description || null,
      worker:      workForm.worker      || null,
      work_date:   workForm.work_date   || null,
      amount:      workForm.amount      ? parseInt(workForm.amount) : null,
    })
    setSaving(false)
    setAddingWork(false)
    setWorkForm({ title: '', description: '', worker: '', work_date: new Date().toISOString().slice(0, 10), amount: '' })
    fetchAll()
  }

  const handleDeleteWork = async (wid: string) => {
    if (!confirm('この作業履歴を削除しますか？')) return
    await supabase.from('custody_works').delete().eq('id', wid)
    fetchAll()
  }

  const handleCreateInvoice = async () => {
    const { data } = await supabase.from('custody_invoices').insert({
      custody_id:  id as string,
      company_id:  c.company_id,
      issued_date: new Date().toISOString().slice(0, 10),
      items:       '[]',
      total_amount: 0,
      status:      '未請求',
    }).select('id').single()
    if (data) router.push(`/custody/${id}/invoice/${data.id}`)
  }

  const handleCreateEstimate = async () => {
    const { data } = await supabase.from('custody_estimates').insert({
      custody_id:  id as string,
      company_id:  c.company_id,
      issued_date: new Date().toISOString().slice(0, 10),
      items:       '[]',
      total_amount: 0,
      status:      '下書き',
    }).select('id').single()
    if (data) router.push(`/custody/${id}/estimate/${data.id}`)
  }

  const handleMarkPaid = async (inv: any) => {
    if (!confirm('入金済みにして会計に記録しますか？')) return
    const paidAt = new Date().toISOString()
    await supabase.from('custody_invoices').update({ status: '入金済', paid_at: paidAt }).eq('id', inv.id)
    await supabase.from('transactions').insert({
      company_id:  c.company_id,
      custody_id:  id as string,
      date:        paidAt.slice(0, 10),
      type:        'in',
      category:    '売上',
      subcategory: c.custody_reason,
      amount:      inv.total_amount,
      note:        `預かり案件（${c.custody_reason}）請求入金`,
    })
    fetchAll()
  }

  const handleDelete = async () => {
    if (!confirm('この預かり案件を削除しますか？')) return
    await supabase.from('custody').update({ deleted_at: new Date().toISOString() }).eq('id', id as string)
    router.push('/custody')
  }

  const totalWork = works.reduce((s, w) => s + (w.amount ?? 0), 0)
  const totalInvoiced = invoices.reduce((s, i) => s + (i.total_amount ?? 0), 0)
  const totalPaid     = invoices.filter(i => i.status === '入金済').reduce((s, i) => s + (i.total_amount ?? 0), 0)

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1100px', margin: '0 auto' }}>

      {/* ヘッダーカード */}
      <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #eee', padding: '16px 20px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
            <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: isDealer ? '#fff3e0' : '#e8f0fe', color: isDealer ? '#e65100' : '#1a73e8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', fontWeight: 700, flexShrink: 0 }}>
              {isDealer ? '業' : (ownerName[0] ?? '?')}
            </div>
            <div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: '#111', marginBottom: '4px' }}>{ownerName}</div>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '11px', padding: '2px 10px', borderRadius: '20px', fontWeight: 600, background: rcfg.bg, color: rcfg.color, border: `1px solid ${rcfg.border}`, boxShadow: '0 2px 6px rgba(0,0,0,0.10)' }}>{c.custody_reason}</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', padding: '2px 10px', borderRadius: '20px', fontWeight: 600, background: scfg.bg, color: scfg.color, border: `1px solid ${scfg.dot}44`, boxShadow: '0 2px 6px rgba(0,0,0,0.10)' }}>
                  <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: scfg.dot }} />{c.status}
                </span>
                {c.car_name && <span style={{ fontSize: '12px', color: '#555', fontWeight: 500 }}>🚗 {c.car_name}</span>}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <Link href="/custody" style={{ padding: '7px 14px', background: '#f1f3f4', color: '#555', borderRadius: '8px', textDecoration: 'none', fontSize: '13px' }}>← 一覧</Link>
            <button onClick={() => { setEditingInfo(true); setEditForm({ car_name: c.car_name ?? '', chassis_number: c.chassis_number ?? '', car_number: c.car_number ?? '', year: c.year ?? '', mileage: c.mileage ?? '', color: c.color ?? '', custody_reason: c.custody_reason ?? '', status: c.status ?? '', intake_date: c.intake_date ?? '', scheduled_delivery_date: c.scheduled_delivery_date ?? '', actual_delivery_date: c.actual_delivery_date ?? '', notes: c.notes ?? '' }) }}
              style={{ padding: '7px 14px', background: '#f1f3f4', color: '#555', borderRadius: '8px', border: 'none', fontSize: '13px', cursor: 'pointer' }}>編集</button>
            {isAdmin && <button onClick={handleDelete} style={{ padding: '7px 14px', background: '#fce8e6', color: '#c62828', borderRadius: '8px', border: 'none', fontSize: '13px', cursor: 'pointer' }}>削除</button>}
          </div>
        </div>

        {/* 情報グリッド */}
        {!editingInfo ? (
          <div style={{ marginTop: '16px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0 24px', borderTop: '1px solid #f0f0f0', paddingTop: '14px' }}>
            <div>
              {cell('車種名', c.car_name)}
              {cell('車体番号', c.chassis_number)}
              {cell('ナンバー', c.car_number)}
            </div>
            <div>
              {cell('年式', c.year ? c.year + '年' : null)}
              {cell('走行距離', c.mileage ? c.mileage.toLocaleString() + ' km' : null)}
              {cell('色', c.color)}
            </div>
            <div>
              {cell('受付日', c.intake_date)}
              {cell('予定引渡', c.scheduled_delivery_date)}
              {cell('実際引渡', c.actual_delivery_date)}
            </div>
            <div>
              {isDealer
                ? <>{cell('業者', c.dealers?.['業者名'])}{cell('担当', c.dealers?.['担当者名'])}{cell('電話', c.dealers?.['電話番号'])}</>
                : <>{cell('氏名', c.customers?.['氏名'])}{cell('電話', c.customers?.['電話番号'])}{cell('メール', c.customers?.['メール'])}</>
              }
            </div>
          </div>
        ) : (
          <div style={{ marginTop: '16px', borderTop: '1px solid #f0f0f0', paddingTop: '14px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '12px' }}>
              {[
                ['car_name', '車種名', 'text', '例：ホンダ フィット'],
                ['chassis_number', '車体番号', 'text', ''],
                ['car_number', '車両ナンバー', 'text', ''],
                ['year', '年式', 'number', ''],
                ['mileage', '走行距離（km）', 'number', ''],
                ['color', '色', 'text', ''],
                ['intake_date', '受付日', 'date', ''],
                ['scheduled_delivery_date', '予定引渡日', 'date', ''],
                ['actual_delivery_date', '実際引渡日', 'date', ''],
              ].map(([key, label, type, ph]) => (
                <div key={key as string}>
                  <label style={lbl}>{label as string}</label>
                  <input type={type as string} value={editForm[key as string]} onChange={e => setEditForm(f => ({ ...f, [key as string]: e.target.value }))} placeholder={ph as string} style={inp} />
                </div>
              ))}
              <div>
                <label style={lbl}>預かり理由</label>
                <select value={editForm.custody_reason} onChange={e => setEditForm(f => ({ ...f, custody_reason: e.target.value }))} style={inp}>
                  {REASONS.map(r => <option key={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>ステータス</label>
                <select value={editForm.status} onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))} style={inp}>
                  {STATUSES.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={lbl}>備考</label>
                <textarea value={editForm.notes} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} rows={2} style={{ ...inp, resize: 'vertical' }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button onClick={() => setEditingInfo(false)} style={{ padding: '8px 20px', background: '#f1f3f4', border: 'none', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}>キャンセル</button>
              <button onClick={handleSaveInfo} disabled={saving} style={{ padding: '8px 24px', background: '#0070f3', color: 'white', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
                {saving ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        )}

        {c.notes && !editingInfo && (
          <div style={{ marginTop: '12px', padding: '10px 14px', background: '#fafafa', borderRadius: '8px', fontSize: '13px', color: '#555', borderLeft: '3px solid #ddd' }}>{c.notes}</div>
        )}
      </div>

      {/* タブ */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '16px', flexWrap: 'wrap' }}>
        {(['作業', '見積', '請求', '財務'] as const).map(t => {
          const tc = TAB_COLOR[t]; const active = tab === t
          return (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: '7px 22px', fontSize: '13px', cursor: 'pointer', fontWeight: active ? 700 : 400,
              background: active ? tc.bg : 'white', color: active ? tc.color : '#999',
              border: active ? `1px solid ${tc.border}` : '1px solid #e8e8e8',
              borderRadius: '8px', boxShadow: active ? tc.shadow : 'none', transition: 'all 0.15s',
            }}
            onMouseEnter={e => { if (!active) { e.currentTarget.style.background = tc.bg; e.currentTarget.style.color = tc.color } }}
            onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'white'; e.currentTarget.style.color = '#999' } }}
            >{t}</button>
          )
        })}
      </div>

      {/* ===== 作業タブ ===== */}
      {tab === '作業' && (
        <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #eee', overflow: 'hidden' }}>
          <div style={{ padding: '12px 20px', background: '#fff7ed', borderBottom: '1px solid #fed7aa', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#c2410c' }}>作業履歴</h3>
            <button onClick={() => setAddingWork(true)} style={{ padding: '6px 16px', background: '#c2410c', color: 'white', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>＋ 作業追加</button>
          </div>
          {addingWork && (
            <div style={{ padding: '16px 20px', background: '#fffbf5', borderBottom: '1px solid #fed7aa' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                <div>
                  <label style={lbl}>作業名 <span style={{ color: '#e53e3e' }}>*</span></label>
                  <input value={workForm.title} onChange={e => setWorkForm(f => ({ ...f, title: e.target.value }))} placeholder="例：オイル交換" style={inp} />
                </div>
                <div>
                  <label style={lbl}>担当者</label>
                  <input value={workForm.worker} onChange={e => setWorkForm(f => ({ ...f, worker: e.target.value }))} style={inp} />
                </div>
                <div>
                  <label style={lbl}>作業日</label>
                  <input type="date" value={workForm.work_date} onChange={e => setWorkForm(f => ({ ...f, work_date: e.target.value }))} style={inp} />
                </div>
                <div>
                  <label style={lbl}>金額（円）</label>
                  <input type="number" value={workForm.amount} onChange={e => setWorkForm(f => ({ ...f, amount: e.target.value }))} style={inp} />
                </div>
                <div style={{ gridColumn: '2 / -1' }}>
                  <label style={lbl}>詳細</label>
                  <input value={workForm.description} onChange={e => setWorkForm(f => ({ ...f, description: e.target.value }))} style={inp} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button onClick={() => setAddingWork(false)} style={{ padding: '7px 18px', background: '#f1f3f4', border: 'none', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}>キャンセル</button>
                <button onClick={handleAddWork} disabled={saving} style={{ padding: '7px 20px', background: '#c2410c', color: 'white', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>追加</button>
              </div>
            </div>
          )}
          <div style={{ padding: '16px 20px' }}>
            {works.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#bbb', padding: '2rem' }}>作業履歴がありません</div>
            ) : (
              <>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #f0f0f0' }}>
                      {['作業日', '作業名', '詳細', '担当', '金額', ''].map(h => (
                        <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: '11px', color: '#9aa0a6', fontWeight: 600 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {works.map(w => (
                      <tr key={w.id} style={{ borderBottom: '1px solid #f4f4f4' }}>
                        <td style={{ padding: '10px 12px', color: '#888', whiteSpace: 'nowrap' }}>{w.work_date ?? '—'}</td>
                        <td style={{ padding: '10px 12px', fontWeight: 600 }}>{w.title}</td>
                        <td style={{ padding: '10px 12px', color: '#666' }}>{w.description ?? '—'}</td>
                        <td style={{ padding: '10px 12px', color: '#666' }}>{w.worker ?? '—'}</td>
                        <td style={{ padding: '10px 12px', whiteSpace: 'nowrap', fontWeight: 500 }}>{w.amount ? `¥${w.amount.toLocaleString()}` : '—'}</td>
                        <td style={{ padding: '10px 12px' }}>
                          <button onClick={() => handleDeleteWork(w.id)} style={{ padding: '3px 10px', background: 'none', border: '1px solid #f0f0f0', color: '#e53e3e', borderRadius: '4px', fontSize: '11px', cursor: 'pointer' }}>削除</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div style={{ textAlign: 'right', marginTop: '12px', fontSize: '13px', fontWeight: 600, color: '#111' }}>
                  作業合計：¥{totalWork.toLocaleString()}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ===== 見積タブ ===== */}
      {tab === '見積' && (
        <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #eee', overflow: 'hidden' }}>
          <div style={{ padding: '12px 20px', background: '#eff6ff', borderBottom: '1px solid #bfdbfe', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#1d4ed8' }}>見積履歴</h3>
            <button onClick={handleCreateEstimate} style={{ padding: '6px 16px', background: '#1d4ed8', color: 'white', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>＋ 見積作成</button>
          </div>
          <div style={{ padding: '16px 20px' }}>
            {estimates.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#bbb', padding: '2rem' }}>見積がありません</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #f0f0f0' }}>
                    {['発行日', 'ステータス', '合計金額', ''].map(h => (
                      <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: '11px', color: '#9aa0a6', fontWeight: 600 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {estimates.map(e => (
                    <tr key={e.id} style={{ borderBottom: '1px solid #f4f4f4' }}>
                      <td style={{ padding: '10px 12px', color: '#888' }}>{e.issued_date ?? '—'}</td>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '10px', background: e.status === '承認済' ? '#e6f4ea' : e.status === '発行済' ? '#e8f0fe' : '#f1f3f4', color: e.status === '承認済' ? '#1e7e34' : e.status === '発行済' ? '#1a73e8' : '#555', fontWeight: 600 }}>{e.status}</span>
                      </td>
                      <td style={{ padding: '10px 12px', fontWeight: 600 }}>¥{(e.total_amount ?? 0).toLocaleString()}</td>
                      <td style={{ padding: '10px 12px' }}>
                        <Link href={`/custody/${id}/estimate/${e.id}`} style={{ padding: '4px 12px', background: '#e8f0fe', color: '#1a73e8', borderRadius: '5px', textDecoration: 'none', fontSize: '12px', fontWeight: 600 }}>開く</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ===== 請求タブ ===== */}
      {tab === '請求' && (
        <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #eee', overflow: 'hidden' }}>
          <div style={{ padding: '12px 20px', background: '#f0fdf4', borderBottom: '1px solid #bbf7d0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#15803d' }}>請求履歴</h3>
            <button onClick={handleCreateInvoice} style={{ padding: '6px 16px', background: '#15803d', color: 'white', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>＋ 請求作成</button>
          </div>
          <div style={{ padding: '16px 20px' }}>
            {invoices.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#bbb', padding: '2rem' }}>請求がありません</div>
            ) : (
              <>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #f0f0f0' }}>
                      {['発行日', 'ステータス', '合計金額', '入金日', ''].map(h => (
                        <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: '11px', color: '#9aa0a6', fontWeight: 600 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map(inv => (
                      <tr key={inv.id} style={{ borderBottom: '1px solid #f4f4f4' }}>
                        <td style={{ padding: '10px 12px', color: '#888' }}>{inv.issued_date ?? '—'}</td>
                        <td style={{ padding: '10px 12px' }}>
                          <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '10px', background: inv.status === '入金済' ? '#e6f4ea' : inv.status === '請求済' ? '#fff3e0' : '#f1f3f4', color: inv.status === '入金済' ? '#1e7e34' : inv.status === '請求済' ? '#e65100' : '#555', fontWeight: 600 }}>{inv.status}</span>
                        </td>
                        <td style={{ padding: '10px 12px', fontWeight: 600 }}>¥{(inv.total_amount ?? 0).toLocaleString()}</td>
                        <td style={{ padding: '10px 12px', color: '#888', fontSize: '12px' }}>{inv.paid_at ? new Date(inv.paid_at).toLocaleDateString('ja-JP') : '—'}</td>
                        <td style={{ padding: '10px 12px' }}>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <Link href={`/custody/${id}/invoice/${inv.id}`} style={{ padding: '4px 12px', background: '#e8f0fe', color: '#1a73e8', borderRadius: '5px', textDecoration: 'none', fontSize: '12px', fontWeight: 600 }}>開く</Link>
                            {inv.status !== '入金済' && (
                              <button onClick={() => handleMarkPaid(inv)} style={{ padding: '4px 12px', background: '#e6f4ea', color: '#1e7e34', border: 'none', borderRadius: '5px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>入金済</button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div style={{ marginTop: '12px', display: 'flex', gap: '24px', justifyContent: 'flex-end', fontSize: '13px' }}>
                  <span style={{ color: '#888' }}>請求合計：¥{totalInvoiced.toLocaleString()}</span>
                  <span style={{ fontWeight: 700, color: '#1e7e34' }}>入金済：¥{totalPaid.toLocaleString()}</span>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ===== 財務タブ ===== */}
      {tab === '財務' && (
        <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #eee', overflow: 'hidden' }}>
          <div style={{ padding: '12px 20px', background: '#fefce8', borderBottom: '1px solid #fde68a' }}>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#a16207' }}>財務明細（会計連携）</h3>
          </div>
          <div style={{ padding: '16px 20px' }}>
            {transactions.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#bbb', padding: '2rem' }}>
                <div style={{ fontSize: '13px', marginBottom: '8px' }}>財務記録がありません</div>
                <div style={{ fontSize: '12px', color: '#ccc' }}>請求タブで「入金済」にすると自動的に会計に記録されます</div>
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #f0f0f0' }}>
                    {['日付', '種別', 'カテゴリ', '金額', '備考'].map(h => (
                      <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: '11px', color: '#9aa0a6', fontWeight: 600 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {transactions.map(tx => (
                    <tr key={tx.id} style={{ borderBottom: '1px solid #f4f4f4' }}>
                      <td style={{ padding: '10px 12px', color: '#888' }}>{tx.date}</td>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '10px', background: tx.type === 'in' ? '#e6f4ea' : '#fce8e6', color: tx.type === 'in' ? '#1e7e34' : '#c62828', fontWeight: 600 }}>{tx.type === 'in' ? '入金' : '出金'}</span>
                      </td>
                      <td style={{ padding: '10px 12px', color: '#555' }}>{tx.category}{tx.subcategory ? ` / ${tx.subcategory}` : ''}</td>
                      <td style={{ padding: '10px 12px', fontWeight: 600, color: tx.type === 'in' ? '#1e7e34' : '#c62828' }}>
                        {tx.type === 'in' ? '+' : '-'}¥{tx.amount.toLocaleString()}
                      </td>
                      <td style={{ padding: '10px 12px', color: '#888', fontSize: '12px' }}>{tx.note ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
