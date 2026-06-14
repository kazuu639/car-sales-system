'use client'
import { useEffect, useState, Fragment } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { useProfile } from '@/hooks/useProfile'

const STATUS_CONFIG: Record<string, { bg: string; color: string; dot: string }> = {
  '商談中': { bg: '#fff3e0', color: '#e65100', dot: '#fb8c00' },
  '見積済': { bg: '#e8f0fe', color: '#1a73e8', dot: '#4285f4' },
  '成約':   { bg: '#e6f4ea', color: '#1e7e34', dot: '#34a853' },
  '失注':   { bg: '#f1f3f4', color: '#5f6368', dot: '#9aa0a6' },
}

const STATUSES = ['すべて', '商談中', '見積済', '成約', '失注']


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
const SOURCE_MAP = Object.fromEntries(SOURCES.map(s => [s.value, s]))

export default function NegotiationsPage() {
  const [negotiations, setNegotiations] = useState<any[]>([])
  const [loading, setLoading]           = useState(true)
  const [filterStatus, setFilterStatus]     = useState('すべて')
  const [filterCategory, setFilterCategory] = useState('purchase')
  const [search, setSearch]                 = useState('')
  const { isAdmin } = useProfile()
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const toggleRow = (id: string) => setExpandedId(prev => prev === id ? null : id)

  const load = async () => {
    setLoading(true)
    const { data } = await supabase.from('negotiations')
      .select('*, customers(氏名, 電話番号, メール), vehicles(db_number, master_models(name), master_makers(name))')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
    setNegotiations(data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`「${name}」の商談を削除BOXに移動しますか？\n関連する契約・納車情報も移動されます。`)) return
    await supabase.from('negotiations').update({ deleted_at: new Date().toISOString() }).eq('id', id)
    load()
  }

  const filtered = negotiations.filter(n => {
    const matchStatus   = filterStatus === 'すべて' || n.status === filterStatus
    const matchCategory = n.category === filterCategory
    const matchSearch = !search ||
      (n.customers?.氏名               ?? '').includes(search) ||
      (n.vehicles?.master_models?.name ?? '').includes(search) ||
      (n.vehicles?.master_makers?.name ?? '').includes(search) ||
      (n.vehicles?.db_number           ?? '').includes(search) ||
      (n.purchase_maker                ?? '').includes(search) ||
      (n.purchase_model                ?? '').includes(search) ||
      (n.assigned_to                   ?? '').includes(search)
    return matchStatus && matchCategory && matchSearch
  })

  const statusCounts = STATUSES.reduce((acc, s) => {
    acc[s] = s === 'すべて' ? negotiations.length : negotiations.filter(n => n.status === s).length
    return acc
  }, {} as Record<string, number>)

  const hasFilter = filterStatus !== 'すべて' || !!search

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>

      {/* ヘッダー */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, margin: 0 }}>商談一覧</h1>
          <p style={{ fontSize: '13px', color: '#888', margin: '4px 0 0' }}>
            {filtered.length}件表示 / 全{negotiations.length}件
          </p>
        </div>
        <Link href="/negotiations/new" style={{ padding: '10px 20px', background: '#0070f3', color: 'white', borderRadius: '8px', textDecoration: 'none', fontSize: '14px', fontWeight: 600 }}>
          ＋ 商談登録
        </Link>
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

      {/* フィルターバー */}
      <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #eee', padding: '14px 16px', marginBottom: '16px' }}>

        {/* ステータスタブ */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '12px', flexWrap: 'wrap' }}>
          {STATUSES.map(s => {
            const cfg = STATUS_CONFIG[s]
            const active = filterStatus === s
            return (
              <button key={s} onClick={() => setFilterStatus(s)} style={{
                display: 'flex', alignItems: 'center', gap: '5px',
                padding: '5px 14px', borderRadius: '20px', border: 'none',
                fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                background: active ? (cfg?.dot ?? '#111') : '#f1f3f4',
                color: active ? 'white' : '#666',
                boxShadow: active ? `0 2px 6px ${cfg?.dot ?? '#0003'}40` : 'none',
              }}>
                {s !== 'すべて' && (
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: active ? 'rgba(255,255,255,0.8)' : (cfg?.dot ?? '#aaa'), flexShrink: 0 }} />
                )}
                {s}
                <span style={{ fontSize: '10px', opacity: 0.75 }}>{statusCounts[s]}</span>
              </button>
            )
          })}
        </div>

        {/* 検索 */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1, maxWidth: '360px' }}>
            <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#bbb', fontSize: '14px', pointerEvents: 'none' }}>🔍</span>
            <input
              type="text"
              placeholder="顧客名・車種・担当者で検索"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ width: '100%', border: '1px solid #e8e8e8', borderRadius: '8px', padding: '8px 12px 8px 32px', fontSize: '13px', outline: 'none', background: '#fafafa', boxSizing: 'border-box' }}
            />
          </div>
          {hasFilter && (
            <button onClick={() => { setSearch(''); setFilterStatus('すべて') }}
              style={{ padding: '8px 14px', border: '1px solid #ddd', borderRadius: '8px', background: 'white', fontSize: '12px', cursor: 'pointer', color: '#888' }}>
              ✕ リセット
            </button>
          )}
          <span style={{ fontSize: '13px', color: '#aaa', marginLeft: 'auto' }}>{filtered.length}件</span>
        </div>
      </div>

      {/* テーブル */}
      <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #eee', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '4rem', textAlign: 'center', color: '#bbb', fontSize: '14px' }}>読み込み中...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '4rem', textAlign: 'center', color: '#bbb', fontSize: '14px' }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>📋</div>
            {hasFilter ? '検索条件に一致する商談がありません' : '商談データがありません'}
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #f0f0f0' }}>
                {['顧客', '対象車両', '流入経路', '担当', 'ステータス', '登録日', ''].map(h => (
                  <th key={h} style={{ padding: '11px 16px', textAlign: 'left', fontSize: '11px', color: '#9aa0a6', fontWeight: 600, letterSpacing: '0.03em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((n, i) => {
                const cfg = STATUS_CONFIG[n.status]
                const src = SOURCE_MAP[n.source] ?? null
                const srcLabel = src?.label ?? n.inquiry_route ?? null
                const isExpanded = expandedId === n.id
                return (
                  <Fragment key={n.id}>
                    <tr
                      style={{ borderBottom: isExpanded ? 'none' : (i < filtered.length - 1 ? '1px solid #f4f4f4' : 'none'), background: isExpanded ? '#f0f5ff' : 'white', cursor: 'pointer', boxShadow: isExpanded ? '0 4px 12px rgba(0,0,0,0.10)' : 'none' }}
                      onMouseEnter={e => { if (!isExpanded) e.currentTarget.style.background = '#fafbff' }}
                      onMouseLeave={e => { if (!isExpanded) e.currentTarget.style.background = 'white' }}
                      onClick={() => toggleRow(n.id)}
                    >
                      {/* 顧客 */}
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontSize: '14px', fontWeight: 600, color: '#111' }}>
                          {n.customers?.氏名 ?? <span style={{ color: '#bbb', fontWeight: 400 }}>未設定</span>}
                        </div>
                        {n.customers?.電話番号 && (
                          <div style={{ fontSize: '11px', color: '#bbb', marginTop: '1px' }}>{n.customers.電話番号}</div>
                        )}
                      </td>

                      {/* 対象車両 */}
                      <td style={{ padding: '14px 16px' }}>
                        {n.vehicles ? (
                          <>
                            <div style={{ fontSize: '13px', fontWeight: 500, color: '#333' }}>
                              {n.vehicles.master_makers?.name} {n.vehicles.master_models?.name}
                            </div>
                            <div style={{ fontSize: '11px', color: '#bbb', marginTop: '1px', fontFamily: 'monospace' }}>
                              {n.vehicles.db_number}
                            </div>
                          </>
                        ) : n.purchase_model ? (
                          <div style={{ fontSize: '13px', fontWeight: 500, color: '#333' }}>
                            {n.purchase_model}
                          </div>
                        ) : <span style={{ fontSize: '12px', color: '#ccc' }}>未選択</span>}
                      </td>

                      {/* 流入経路 */}
                      <td style={{ padding: '14px 16px' }}>
                        {srcLabel ? (
                          <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', fontWeight: 600, background: src?.bg ?? '#f5f5f5', color: src?.color ?? '#666' }}>
                            {srcLabel}
                          </span>
                        ) : <span style={{ color: '#ccc', fontSize: '12px' }}>―</span>}
                      </td>

                      {/* 担当 */}
                      <td style={{ padding: '14px 16px', fontSize: '13px', color: '#888' }}>
                        {n.assigned_to ?? <span style={{ color: '#ccc' }}>―</span>}
                      </td>

                      {/* ステータス */}
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: '5px',
                          fontSize: '11px', padding: '4px 10px', borderRadius: '20px', fontWeight: 600,
                          background: cfg?.bg ?? '#f1f3f4', color: cfg?.color ?? '#5f6368',
                        }}>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: cfg?.dot ?? '#aaa', flexShrink: 0 }} />
                          {n.status}
                        </span>
                      </td>

                      {/* 登録日 */}
                      <td style={{ padding: '14px 16px', fontSize: '13px', color: '#888', whiteSpace: 'nowrap' }}>
                        {n.created_at ? new Date(n.created_at).toLocaleDateString('ja-JP') : '―'}
                      </td>

                      {/* 展開アイコン */}
                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                        <span style={{ fontSize: '11px', color: isExpanded ? '#1a73e8' : '#bbb' }}>{isExpanded ? '▲' : '▼'}</span>
                      </td>
                    </tr>

                    {/* アコーディオン */}
                    <tr>
                      <td colSpan={7} style={{ padding: 0, paddingBottom: isExpanded ? '8px' : 0, borderBottom: isExpanded ? 'none' : (i < filtered.length - 1 ? '1px solid #f4f4f4' : 'none') }}>
                        <div style={{ overflow: 'hidden', maxHeight: isExpanded ? '600px' : '0', transition: 'max-height 0.25s ease', boxShadow: isExpanded ? '0 4px 12px rgba(0,0,0,0.10)' : 'none' }}>
                          <div style={{ background: 'white', borderTop: '1px solid #e8eaed', padding: '20px 24px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                              {/* 基本情報 */}
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {([
                                  ['顧客名',   n.customers?.氏名],
                                  ['電話番号', n.customers?.電話番号],
                                  ['メール',   n.customers?.メール],
                                  ['流入経路', srcLabel],
                                  ['担当者',   n.assigned_to],
                                  ['登録日',   n.created_at ? new Date(n.created_at).toLocaleDateString('ja-JP') : null],
                                  ['備考',     n.notes],
                                ] as [string, any][]).map(([label, value]) => (
                                  <div key={label} style={{ display: 'flex', gap: '12px', fontSize: '13px' }}>
                                    <span style={{ width: '80px', color: '#888', flexShrink: 0, fontSize: '12px' }}>{label}</span>
                                    <span style={{ color: value ? '#111' : '#bbb', whiteSpace: 'pre-wrap' }}>{value ?? '―'}</span>
                                  </div>
                                ))}
                              </div>
                              {/* 買取車両情報 */}
                              {n.category === 'purchase' ? (
                                <div>
                                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#1e7e34', marginBottom: '10px' }}>買取車両情報</div>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    {([
                                      ['メーカー',     n.purchase_maker],
                                      ['車種',         n.purchase_model],
                                      ['年式',         n.purchase_year ? n.purchase_year + '年' : null],
                                      ['走行距離',     n.purchase_mileage ? Number(n.purchase_mileage).toLocaleString() + ' km' : null],
                                      ['希望買取金額', n.purchase_desired_price ? '¥' + Number(n.purchase_desired_price).toLocaleString() : null],
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
                              <Link href={`/negotiations/${n.id}`} onClick={e => e.stopPropagation()}
                                style={{ padding: '7px 16px', fontSize: '13px', fontWeight: 600, borderRadius: '6px', textDecoration: 'none', background: '#e8f0fe', color: '#1a73e8' }}>
                                詳細
                              </Link>
                              {isAdmin && (
                                <button onClick={e => { e.stopPropagation(); handleDelete(n.id, n.customers?.氏名 ?? '商談') }}
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
    </div>
  )
}
