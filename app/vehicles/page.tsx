'use client'
import React from 'react'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

const STATUS_CONFIG: Record<string, { bg: string; color: string; dot: string }> = {
  '在庫中': { bg: '#e6f4ea', color: '#1e7e34', dot: '#34a853' },
  '商談中': { bg: '#fff3e0', color: '#e65100', dot: '#fb8c00' },
  '売約済': { bg: '#e8f0fe', color: '#1a73e8', dot: '#4285f4' },
  '納車済': { bg: '#f1f3f4', color: '#5f6368', dot: '#9aa0a6' },
}

const STATUSES = ['すべて', '在庫中', '商談中', '売約済', '納車済']

const SORT_OPTIONS = [
  { value: 'created_at_desc', label: '入庫日：新しい順' },
  { value: 'created_at_asc',  label: '入庫日：古い順' },
  { value: 'body_price_desc', label: '価格：高い順' },
  { value: 'body_price_asc',  label: '価格：安い順' },
]

const WEB_ITEMS = [
  { key: 'web_carsensor', label: 'カーセンサー' },
  { key: 'web_goo',       label: 'グーネット' },
  { key: 'web_hp',        label: 'HP' },
  { key: 'web_x',         label: 'X' },
  { key: 'web_line',      label: 'LINE' },
]

const CHECK_ITEMS = [
  { key: 'purchase_check',   label: '仕入' },
  { key: 'entry_check',      label: '入庫済' },
  { key: 'car_wash_check',   label: '洗車済' },
  { key: 'photo_shoot_check',label: '撮影済' },
]

function calcStockDays(stockDate: string | null): number | null {
  if (!stockDate) return null
  return Math.floor((Date.now() - new Date(stockDate).getTime()) / 86400000)
}

export default function VehiclesPage() {
  const [vehicles, setVehicles]     = useState<any[]>([])
  const [loading, setLoading]       = useState(true)
  const [filterStatus, setFilterStatus] = useState('すべて')
  const [filterMaker, setFilterMaker]   = useState('')
  const [search, setSearch]         = useState('')
  const [sortVal, setSortVal]       = useState('created_at_desc')
  const [makers, setMakers]         = useState<any[]>([])
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const key = sortVal.startsWith('body_price') ? 'body_price' : 'created_at'
      const asc  = sortVal.endsWith('_asc')

      const { data } = await supabase
        .from('vehicles')
        .select('*, master_models(name), master_makers(name), master_colors(name)')
        .is('deleted_at', null)
        .order(key, { ascending: asc })

      setVehicles(data ?? [])
      const makerSet = new Map()
      ;(data ?? []).forEach((v: any) => {
        if (v.master_makers?.name) makerSet.set(v.maker_id, v.master_makers.name)
      })
      setMakers(Array.from(makerSet.entries()).map(([id, name]) => ({ id, name })))
      setLoading(false)
    }
    load()
  }, [sortVal])

  const filtered = vehicles.filter(v => {
    const matchStatus = filterStatus === 'すべて' || v.status === filterStatus
    const matchMaker  = !filterMaker || v.maker_id === filterMaker
    const matchSearch = !search ||
      (v.master_models?.name  ?? '').includes(search) ||
      (v.master_makers?.name  ?? '').includes(search) ||
      (v.db_number            ?? '').includes(search) ||
      (v.chassis_number       ?? '').includes(search) ||
      (v.car_number           ?? '').includes(search)
    return matchStatus && matchMaker && matchSearch
  })

  const hasFilter = filterStatus !== 'すべて' || !!filterMaker || !!search
  const resetFilter = () => { setFilterStatus('すべて'); setFilterMaker(''); setSearch('') }

  const statusCounts = STATUSES.reduce((acc, s) => {
    acc[s] = s === 'すべて' ? vehicles.length : vehicles.filter(v => v.status === s).length
    return acc
  }, {} as Record<string, number>)

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>

      {/* ヘッダー */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, margin: 0 }}>在庫一覧</h1>
          <p style={{ fontSize: '13px', color: '#888', margin: '4px 0 0' }}>
            {filtered.length}台表示 / 全{vehicles.length}台
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Link href="/vehicles/import" style={{ padding: '10px 20px', background: '#666', color: 'white', borderRadius: '8px', textDecoration: 'none', fontSize: '14px', fontWeight: 600 }}>
            CSV取込み
          </Link>
          <Link href="/vehicles/new" style={{ padding: '10px 20px', background: '#0070f3', color: 'white', borderRadius: '8px', textDecoration: 'none', fontSize: '14px', fontWeight: 600 }}>
            ＋ 車両登録
          </Link>
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
                transition: 'all 0.15s',
                background: active ? (cfg?.dot ?? '#111') : '#f1f3f4',
                color: active ? 'white' : '#666',
                boxShadow: active ? `0 2px 6px ${cfg?.dot ?? '#0003'}40` : 'none',
              }}>
                {s !== 'すべて' && (
                  <span style={{
                    width: '6px', height: '6px', borderRadius: '50%',
                    background: active ? 'rgba(255,255,255,0.8)' : (cfg?.dot ?? '#aaa'),
                    flexShrink: 0,
                  }} />
                )}
                {s}
                <span style={{ fontSize: '10px', opacity: 0.75 }}>
                  {statusCounts[s]}
                </span>
              </button>
            )
          })}
        </div>

        {/* 検索・絞り込み・ソート */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
            <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#bbb', fontSize: '14px', pointerEvents: 'none' }}>🔍</span>
            <input
              type="text"
              placeholder="車種名・管理番号・車台番号で検索"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ width: '100%', border: '1px solid #e8e8e8', borderRadius: '8px', padding: '8px 12px 8px 32px', fontSize: '13px', outline: 'none', boxSizing: 'border-box', background: '#fafafa' }}
            />
          </div>

          <select
            value={filterMaker}
            onChange={e => setFilterMaker(e.target.value)}
            style={{ border: '1px solid #e8e8e8', borderRadius: '8px', padding: '8px 12px', fontSize: '13px', outline: 'none', background: '#fafafa', color: filterMaker ? '#111' : '#888', minWidth: '130px' }}
          >
            <option value="">メーカー：全て</option>
            {makers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>

          <select
            value={sortVal}
            onChange={e => setSortVal(e.target.value)}
            style={{ border: '1px solid #e8e8e8', borderRadius: '8px', padding: '8px 12px', fontSize: '13px', outline: 'none', background: '#fafafa', color: '#555', minWidth: '160px' }}
          >
            {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>

          {hasFilter && (
            <button
              onClick={resetFilter}
              style={{ padding: '8px 14px', border: '1px solid #ddd', borderRadius: '8px', background: 'white', fontSize: '12px', cursor: 'pointer', color: '#888', whiteSpace: 'nowrap' }}
            >
              ✕ リセット
            </button>
          )}
        </div>
      </div>

      {/* テーブル */}
      <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #eee', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '4rem', textAlign: 'center', color: '#bbb', fontSize: '14px' }}>読み込み中...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '4rem', textAlign: 'center', color: '#bbb', fontSize: '14px' }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>🚗</div>
            該当する車両がありません
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', minWidth: '900px' }}>
            <colgroup>
              <col style={{ width: '60px' }} />
              <col style={{ width: '80px' }} />
              <col style={{ width: '80px' }} />
              <col style={{ width: '90px' }} />
              <col style={{ width: '150px' }} />
              <col style={{ width: '70px' }} />
              <col style={{ width: '90px' }} />
              <col style={{ width: '60px' }} />
              <col style={{ width: '100px' }} />
              <col style={{ width: '70px' }} />
              <col style={{ width: '40px' }} />
            </colgroup>
            <thead>
              <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #f0f0f0' }}>
                {['画像', '管理番号', 'ステータス', '入庫日', 'メーカー・車種', '年式', '走行距離', '色', '車体価格', '在庫日数', ''].map((h, i) => (
                  <th key={i} style={{ padding: '10px 8px', textAlign: 'left', fontSize: '11px', color: '#9aa0a6', fontWeight: 600, letterSpacing: '0.03em', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((v: any, i) => {
                const isExpanded = expandedId === v.id
                const cfg = STATUS_CONFIG[v.status]
                return (
                  <React.Fragment key={v.id}>
                    <tr
                      onClick={() => setExpandedId(prev => prev === v.id ? null : v.id)}
                      style={{
                        borderBottom: isExpanded ? 'none' : '1px solid #f4f4f4',
                        cursor: 'pointer',
                        background: isExpanded ? '#f0f5ff' : 'white',
                      }}
                      onMouseEnter={e => { if (!isExpanded) e.currentTarget.style.background = '#fafbff' }}
                      onMouseLeave={e => { if (!isExpanded) e.currentTarget.style.background = 'white' }}
                    >
                      {/* 画像 */}
                      <td style={{ padding: '6px 8px' }}>
                        {v.image_urls?.length > 0 ? (
                          <img src={v.image_urls[0]} alt="" style={{ width: '52px', height: '40px', objectFit: 'cover', borderRadius: '5px', border: '1px solid #eee', display: 'block' }} />
                        ) : (
                          <div style={{ width: '52px', height: '40px', background: '#f5f5f5', borderRadius: '5px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', border: '1px solid #eee' }}>🚗</div>
                        )}
                      </td>

                      {/* 管理番号 */}
                      <td style={{ padding: '10px 8px', overflow: 'hidden' }}>
                        <Link
                          href={`/vehicles/${v.id}`}
                          onClick={e => e.stopPropagation()}
                          style={{ fontSize: '11px', color: '#555', fontFamily: 'monospace', fontWeight: 600, textDecoration: 'none', border: '1px solid #ddd', borderRadius: '5px', padding: '2px 6px', display: 'inline-block', whiteSpace: 'nowrap' }}
                          onMouseEnter={e => (e.currentTarget.style.background = '#f5f5f5')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                        >
                          {v.db_number ?? '—'}
                        </Link>
                      </td>

                      {/* ステータスバッジ */}
                      <td style={{ padding: '10px 8px', overflow: 'hidden' }}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: '4px',
                          fontSize: '11px', padding: '3px 7px', borderRadius: '20px', fontWeight: 600,
                          background: cfg?.bg ?? '#f1f3f4', color: cfg?.color ?? '#5f6368',
                        }}>
                          <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: cfg?.dot ?? '#aaa', flexShrink: 0 }} />
                          {v.status}
                        </span>
                      </td>

                      {/* 入庫日 */}
                      <td style={{ padding: '10px 8px', fontSize: '12px', color: '#555', overflow: 'hidden' }}>
                        {v.stock_date ?? '―'}
                      </td>

                      {/* メーカー・車種 */}
                      <td style={{ padding: '10px 8px', overflow: 'hidden' }}>
                        {v.master_makers?.name && (
                          <div style={{ fontSize: '10px', color: '#999', marginBottom: '1px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{v.master_makers.name}</div>
                        )}
                        <div style={{ fontSize: '12px', fontWeight: 600, color: '#111', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {v.master_models?.name ?? v.car_name ?? '—'}
                        </div>
                      </td>

                      {/* 年式 */}
                      <td style={{ padding: '10px 8px', fontSize: '12px', color: '#555', overflow: 'hidden' }}>
                        {v.year ? `${v.year}年` : '—'}
                      </td>

                      {/* 走行距離 */}
                      <td style={{ padding: '10px 8px', fontSize: '12px', color: '#555', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                        {v.mileage ? `${v.mileage.toLocaleString()} km` : '—'}
                      </td>

                      {/* 色 */}
                      <td style={{ padding: '10px 8px', fontSize: '12px', color: '#555', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                        {v.master_colors?.name ?? v.color ?? '—'}
                      </td>

                      {/* 車体価格 */}
                      <td style={{ padding: '10px 8px', fontSize: '12px', fontWeight: 500, color: '#111', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                        {v.body_price ? `¥${v.body_price.toLocaleString()}` : '—'}
                      </td>

                      {/* 在庫日数 */}
                      {(() => {
                        const days = calcStockDays(v.stock_date)
                        const color = days === null ? '#ccc' : days > 60 ? '#c0392b' : days > 30 ? '#e74c3c' : '#555'
                        const fw = days !== null && days > 60 ? 700 : 400
                        return (
                          <td style={{ padding: '10px 8px', fontSize: '12px', color, fontWeight: fw, whiteSpace: 'nowrap', overflow: 'hidden' }}>
                            {days === null ? '―' : `${days}日`}
                          </td>
                        )
                      })()}

                      {/* 展開アイコン */}
                      <td style={{ padding: '10px 0', textAlign: 'center', color: '#ccc', fontSize: '11px' }}>
                        {isExpanded ? '▲' : '▼'}
                      </td>
                    </tr>

                    {/* アコーディオン */}
                    {isExpanded && (
                      <tr style={{ borderBottom: '1px solid #d0dcf5', background: '#f0f5ff' }}>
                        <td colSpan={11} style={{ padding: '8px 16px 16px' }}>
                          <div style={{ display: 'flex', gap: '0', boxShadow: '0 4px 12px rgba(0,0,0,0.10)', borderRadius: '10px', background: 'white', overflow: 'hidden' }}>

                            {/* 4カラム情報グリッド */}
                            {(() => {
                              const hcell = (label: string, value: any) => (
                                <div key={label} style={{ display: 'flex', gap: '6px', fontSize: '12px', marginBottom: '4px', alignItems: 'baseline' }}>
                                  <span style={{ color: '#aaa', flexShrink: 0, minWidth: '68px' }}>{label}</span>
                                  <span style={{ color: value ? '#222' : '#ccc', fontWeight: value ? 500 : 400 }}>{value || '―'}</span>
                                </div>
                              )
                              const hsec = (title: string) => (
                                <div style={{ fontSize: '10px', fontWeight: 700, color: '#bbb', letterSpacing: '0.08em', marginBottom: '7px', textTransform: 'uppercase' }}>{title}</div>
                              )
                              return (
                                <div style={{ flex: 1, padding: '14px 18px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0 20px' }}>
                                  <div>
                                    {hsec('車輌')}
                                    {hcell('車台番号', v.chassis_number)}
                                    {hcell('シフト', v.shift)}
                                    {hcell('車検満了', v.inspection_date)}
                                    {hcell('車両ナンバー', v.car_number)}
                                    {hcell('修復歴', v.repair_history ? 'あり' : null)}
                                    {hcell('排気量', v.displacement ? v.displacement + 'cc' : null)}
                                  </div>
                                  <div>
                                    {hsec('各契約日')}
                                    {hcell('仕）契約日', v.purchase_contract_date)}
                                    {hcell('入庫日', v.stock_date)}
                                    {hcell('販）契約日', null)}
                                    {hcell('売上日', null)}
                                  </div>
                                  <div>
                                    {hsec('財務情報')}
                                    {hcell('仕入金額', v.purchase_price ? `¥${v.purchase_price.toLocaleString()}` : null)}
                                    {hcell('売上', null)}
                                  </div>
                                  <div>
                                    {hsec('担当')}
                                    {hcell('仕入担当', v.purchase_staff)}
                                    {hcell('売上担当', null)}
                                  </div>
                                </div>
                              )
                            })()}

                            {/* WEB掲載・入庫チェック */}
                            <div style={{ width: '190px', flexShrink: 0, borderLeft: '1px solid #eef0f5', padding: '14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                              <div>
                                <div style={{ fontSize: '10px', fontWeight: 700, color: '#bbb', letterSpacing: '0.08em', marginBottom: '6px', textTransform: 'uppercase' }}>WEB掲載</div>
                                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                  {WEB_ITEMS.map(w => (
                                    <span key={w.key} style={{
                                      fontSize: '11px', padding: '2px 7px', borderRadius: '20px', fontWeight: 500,
                                      background: v[w.key] ? '#e8f0fe' : '#f5f5f5',
                                      color: v[w.key] ? '#1a73e8' : '#bbb',
                                    }}>
                                      {v[w.key] ? '✓ ' : ''}{w.label}
                                    </span>
                                  ))}
                                </div>
                              </div>
                              <div>
                                <div style={{ fontSize: '10px', fontWeight: 700, color: '#bbb', letterSpacing: '0.08em', marginBottom: '6px', textTransform: 'uppercase' }}>入庫チェック</div>
                                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                  {CHECK_ITEMS.map(c => (
                                    <span key={c.key} style={{
                                      fontSize: '11px', padding: '2px 7px', borderRadius: '20px', fontWeight: 500,
                                      background: (v as any)[c.key] ? '#e6f4ea' : '#f5f5f5',
                                      color: (v as any)[c.key] ? '#1e7e34' : '#bbb',
                                    }}>
                                      {(v as any)[c.key] ? '✓ ' : ''}{c.label}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </div>

                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
