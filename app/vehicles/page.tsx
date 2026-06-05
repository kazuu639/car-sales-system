'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

const STATUS_COLOR: any = {
  '在庫中': { bg: '#e6f4ea', color: '#1e7e34' },
  '商談中': { bg: '#fff3e0', color: '#e65100' },
  '売約済': { bg: '#e8f0fe', color: '#1a73e8' },
  '納車済': { bg: '#f1f3f4', color: '#5f6368' },
}

const STATUSES = ['すべて', '在庫中', '商談中', '売約済', '納車済']

const WEB_ITEMS = [
  { key: 'web_carsensor', label: 'カーセンサー' },
  { key: 'web_goo',       label: 'グーネット' },
  { key: 'web_hp',        label: 'HP' },
  { key: 'web_x',         label: 'X' },
]

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('すべて')
  const [filterMaker, setFilterMaker] = useState('')
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState('created_at')
  const [sortAsc, setSortAsc] = useState(false)
  const [makers, setMakers] = useState<any[]>([])
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    const fetch = async () => {
      setLoading(true)
      const { data } = await supabase
        .from('vehicles')
        .select('*, master_models(name), master_makers(name), master_colors(name)')
        .order(sortKey, { ascending: sortAsc })
      setVehicles(data ?? [])
      const makerSet = new Map()
      ;(data ?? []).forEach((v: any) => {
        if (v.master_makers?.name) makerSet.set(v.maker_id, v.master_makers.name)
      })
      setMakers(Array.from(makerSet.entries()).map(([id, name]) => ({ id, name })))
      setLoading(false)
    }
    fetch()
  }, [sortKey, sortAsc])

  const handleSort = (key: string) => {
    if (sortKey === key) setSortAsc(!sortAsc)
    else { setSortKey(key); setSortAsc(true) }
  }

  const SortIcon = ({ col }: { col: string }) => {
    if (sortKey !== col) return <span style={{ color: '#ccc', fontSize: '10px' }}>↕</span>
    return <span style={{ color: '#0070f3', fontSize: '10px' }}>{sortAsc ? '↑' : '↓'}</span>
  }

  const filtered = vehicles.filter(v => {
    const matchStatus = filterStatus === 'すべて' || v.status === filterStatus
    const matchMaker = !filterMaker || v.maker_id === filterMaker
    const matchSearch = !search ||
      (v.master_models?.name ?? '').includes(search) ||
      (v.master_makers?.name ?? '').includes(search) ||
      (v.db_number ?? '').includes(search) ||
      (v.chassis_number ?? '').includes(search) ||
      (v.car_number ?? '').includes(search)
    return matchStatus && matchMaker && matchSearch
  })

  const toggleExpand = (id: string) => {
    setExpandedId(prev => prev === id ? null : id)
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      {/* ヘッダー */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, margin: 0 }}>在庫一覧</h1>
          <p style={{ fontSize: '13px', color: '#888', margin: '4px 0 0' }}>{filtered.length}台表示 / 全{vehicles.length}台</p>
        </div>
        <Link href="/vehicles/new" style={{ padding: '10px 20px', background: '#0070f3', color: 'white', borderRadius: '8px', textDecoration: 'none', fontSize: '14px', fontWeight: 500 }}>
          ＋ 車両登録
        </Link>
      </div>

      {/* フィルター */}
      <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #eee', padding: '16px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
          {STATUSES.map(s => (
            <button key={s} onClick={() => setFilterStatus(s)} style={{
              padding: '6px 16px', borderRadius: '20px', border: 'none', fontSize: '13px', fontWeight: 500, cursor: 'pointer',
              background: filterStatus === s ? '#0070f3' : '#f1f3f4',
              color: filterStatus === s ? 'white' : '#555',
            }}>{s}</button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <input type="text" placeholder="車種名・管理番号・車台番号・車両ナンバーで検索" value={search} onChange={e => setSearch(e.target.value)}
            style={{ flex: 1, minWidth: '240px', border: '1px solid #ddd', borderRadius: '8px', padding: '8px 12px', fontSize: '13px', outline: 'none' }} />
          <select value={filterMaker} onChange={e => setFilterMaker(e.target.value)}
            style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '8px 12px', fontSize: '13px', outline: 'none', minWidth: '140px' }}>
            <option value="">メーカー：すべて</option>
            {makers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
          {(filterStatus !== 'すべて' || filterMaker || search) && (
            <button onClick={() => { setFilterStatus('すべて'); setFilterMaker(''); setSearch('') }}
              style={{ padding: '8px 16px', border: '1px solid #ddd', borderRadius: '8px', background: 'white', fontSize: '13px', cursor: 'pointer', color: '#888' }}>
              ✕ リセット
            </button>
          )}
        </div>
      </div>

      {/* テーブル */}
      <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #eee', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#aaa' }}>読み込み中...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#aaa' }}>車両データがありません</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8f9fa', borderBottom: '1px solid #eee' }}>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', color: '#888', fontWeight: 600, width: '80px' }}>画像</th>
                <th onClick={() => handleSort('db_number')} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', color: '#888', fontWeight: 600, cursor: 'pointer' }}>管理番号 <SortIcon col="db_number" /></th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', color: '#888', fontWeight: 600 }}>メーカー・車種</th>
                <th onClick={() => handleSort('year')} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', color: '#888', fontWeight: 600, cursor: 'pointer' }}>年式 <SortIcon col="year" /></th>
                <th onClick={() => handleSort('mileage')} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', color: '#888', fontWeight: 600, cursor: 'pointer' }}>走行距離 <SortIcon col="mileage" /></th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', color: '#888', fontWeight: 600 }}>色</th>
                <th onClick={() => handleSort('purchase_price')} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', color: '#888', fontWeight: 600, cursor: 'pointer' }}>仕入金額 <SortIcon col="purchase_price" /></th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', color: '#888', fontWeight: 600 }}>ステータス</th>
                <th style={{ padding: '12px 16px', width: '40px' }}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((v: any, i) => (
                <>
                  {/* メイン行 */}
                  <tr key={v.id}
                    onClick={() => toggleExpand(v.id)}
                    style={{
                      borderBottom: expandedId === v.id ? 'none' : '1px solid #f0f0f0',
                      cursor: 'pointer',
                      background: expandedId === v.id ? '#f8f9ff' : 'white',
                      transition: 'background 0.1s',
                    }}
                    onMouseEnter={e => { if (expandedId !== v.id) e.currentTarget.style.background = '#fafafa' }}
                    onMouseLeave={e => { if (expandedId !== v.id) e.currentTarget.style.background = 'white' }}
                  >
                    <td style={{ padding: '10px 16px' }}>
                      {v.image_urls?.length > 0 ? (
                        <img src={v.image_urls[0]} alt="" style={{ width: '72px', height: '54px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #eee', display: 'block' }} />
                      ) : (
                        <div style={{ width: '72px', height: '54px', background: '#f5f5f5', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>🚗</div>
                      )}
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '13px', color: '#888' }}>{v.db_number ?? '—'}</td>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ fontSize: '14px', fontWeight: 500, color: '#0070f3' }}>
                        {v.master_makers?.name && <span style={{ fontSize: '12px', color: '#888', marginRight: '4px' }}>{v.master_makers.name}</span>}
                        {v.master_models?.name ?? v.car_name ?? '—'}
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '13px' }}>{v.year ? v.year + '年' : '—'}</td>
                    <td style={{ padding: '14px 16px', fontSize: '13px' }}>{v.mileage ? v.mileage.toLocaleString() + ' km' : '—'}</td>
                    <td style={{ padding: '14px 16px', fontSize: '13px' }}>{v.master_colors?.name ?? v.color ?? '—'}</td>
                    <td style={{ padding: '14px 16px', fontSize: '13px' }}>{v.purchase_price ? '¥' + v.purchase_price.toLocaleString() : '—'}</td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '20px', fontWeight: 500, background: STATUS_COLOR[v.status]?.bg ?? '#f1f3f4', color: STATUS_COLOR[v.status]?.color ?? '#5f6368' }}>{v.status}</span>
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'center', fontSize: '16px', color: '#aaa' }}>
                      {expandedId === v.id ? '▲' : '▼'}
                    </td>
                  </tr>

                  {/* アコーディオン展開行 */}
                  {expandedId === v.id && (
                    <tr key={v.id + '-expand'} style={{ borderBottom: '1px solid #f0f0f0', background: '#f8f9ff' }}>
                      <td colSpan={9} style={{ padding: '0 16px 16px 16px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', paddingTop: '12px' }}>

                          {/* 物件情報 */}
                          <div style={{ background: 'white', borderRadius: '10px', border: '1px solid #eee', padding: '14px' }}>
                            <div style={{ fontSize: '12px', fontWeight: 600, color: '#555', marginBottom: '10px' }}>📋 物件情報</div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 16px' }}>
                              {[
                                ['車台番号', v.chassis_number],
                                ['車両ナンバー', v.car_number],
                                ['シフト', v.shift],
                                ['修復歴', v.repair_history ? 'あり' : 'なし'],
                                ['車検満了', v.inspection_date],
                                ['排気量', v.displacement ? v.displacement + 'cc' : null],
                              ].map(([label, value]) => (
                                <div key={label} style={{ display: 'flex', fontSize: '12px', padding: '4px 0', borderBottom: '1px solid #f5f5f5' }}>
                                  <span style={{ color: '#aaa', width: '80px', flexShrink: 0 }}>{label}</span>
                                  <span style={{ color: '#333' }}>{value ?? '—'}</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* WEB掲載＋チェック */}
                          <div style={{ background: 'white', borderRadius: '10px', border: '1px solid #eee', padding: '14px' }}>
                            <div style={{ fontSize: '12px', fontWeight: 600, color: '#555', marginBottom: '10px' }}>🌐 WEB掲載状況</div>
                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}>
                              {WEB_ITEMS.map(w => (
                                <span key={w.key} style={{
                                  fontSize: '11px', padding: '3px 10px', borderRadius: '20px', fontWeight: 500,
                                  background: v[w.key] ? '#e8f0fe' : '#f1f3f4',
                                  color: v[w.key] ? '#1a73e8' : '#aaa',
                                }}>
                                  {v[w.key] ? '✓ ' : ''}{w.label}
                                </span>
                              ))}
                            </div>
                            <div style={{ fontSize: '12px', fontWeight: 600, color: '#555', marginBottom: '8px' }}>✅ 入庫チェック</div>
                            <div style={{ display: 'flex', gap: '6px' }}>
                              {[
                                { key: 'entry_check', label: '入庫済' },
                                { key: 'car_wash_check', label: '洗車済' },
                                { key: 'photo_shoot_check', label: '撮影済' },
                              ].map(c => (
                                <span key={c.key} style={{
                                  fontSize: '11px', padding: '3px 10px', borderRadius: '20px', fontWeight: 500,
                                  background: v[c.key] ? '#e6f4ea' : '#f1f3f4',
                                  color: v[c.key] ? '#1e7e34' : '#aaa',
                                }}>
                                  {v[c.key] ? '✓ ' : ''}{c.label}
                                </span>
                              ))}
                            </div>
                            {/* 詳細リンク */}
                            <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
                              <Link href={`/vehicles/${v.id}`} onClick={e => e.stopPropagation()}
                                style={{ padding: '6px 16px', background: '#0070f3', color: 'white', borderRadius: '6px', textDecoration: 'none', fontSize: '12px', fontWeight: 500 }}>
                                詳細を見る →
                              </Link>
                              <Link href={`/vehicles/${v.id}/edit`} onClick={e => e.stopPropagation()}
                                style={{ padding: '6px 16px', background: '#f1f3f4', color: '#555', borderRadius: '6px', textDecoration: 'none', fontSize: '12px' }}>
                                編集
                              </Link>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}