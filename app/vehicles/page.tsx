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

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('すべて')
  const [filterMaker, setFilterMaker] = useState('')
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState('created_at')
  const [sortAsc, setSortAsc] = useState(false)
  const [makers, setMakers] = useState<any[]>([])

  useEffect(() => {
    const fetch = async () => {
      setLoading(true)
      const { data } = await supabase
        .from('vehicles')
        .select('*, master_models(name), master_makers(name), master_colors(name)')
        .order(sortKey, { ascending: sortAsc })
      setVehicles(data ?? [])
      // メーカー一覧を抽出
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
        <Link href="/vehicles/new" style={{ padding: '10px 20px', background: '#0070f3', color: 'white', borderRadius: '8px', textDecoration: 'none', fontSize: '14px', fontWeight: 500 }}>
          ＋ 車両登録
        </Link>
      </div>

      {/* フィルターエリア */}
      <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #eee', padding: '16px', marginBottom: '16px' }}>
        {/* ステータスフィルター */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
          {STATUSES.map(s => (
            <button key={s} onClick={() => setFilterStatus(s)} style={{
              padding: '6px 16px', borderRadius: '20px', border: 'none', fontSize: '13px',
              fontWeight: 500, cursor: 'pointer', transition: 'all 0.15s',
              background: filterStatus === s ? '#0070f3' : '#f1f3f4',
              color: filterStatus === s ? 'white' : '#555',
            }}>{s}</button>
          ))}
        </div>
        {/* 検索・メーカーフィルター */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="車種名・管理番号・車台番号・車両ナンバーで検索"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ flex: 1, minWidth: '240px', border: '1px solid #ddd', borderRadius: '8px', padding: '8px 12px', fontSize: '13px', outline: 'none' }}
          />
          <select
            value={filterMaker}
            onChange={e => setFilterMaker(e.target.value)}
            style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '8px 12px', fontSize: '13px', outline: 'none', minWidth: '140px' }}
          >
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
          <div style={{ padding: '3rem', textAlign: 'center', color: '#aaa', fontSize: '14px' }}>読み込み中...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#aaa', fontSize: '14px' }}>車両データがありません</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8f9fa', borderBottom: '1px solid #eee' }}>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', color: '#888', fontWeight: 600, width: '80px' }}>画像</th>
                <th onClick={() => handleSort('db_number')} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', color: '#888', fontWeight: 600, cursor: 'pointer', userSelect: 'none' }}>
                  管理番号 <SortIcon col="db_number" />
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', color: '#888', fontWeight: 600 }}>メーカー・車種</th>
                <th onClick={() => handleSort('year')} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', color: '#888', fontWeight: 600, cursor: 'pointer', userSelect: 'none' }}>
                  年式 <SortIcon col="year" />
                </th>
                <th onClick={() => handleSort('mileage')} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', color: '#888', fontWeight: 600, cursor: 'pointer', userSelect: 'none' }}>
                  走行距離 <SortIcon col="mileage" />
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', color: '#888', fontWeight: 600 }}>色</th>
                <th onClick={() => handleSort('purchase_price')} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', color: '#888', fontWeight: 600, cursor: 'pointer', userSelect: 'none' }}>
                  仕入金額 <SortIcon col="purchase_price" />
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', color: '#888', fontWeight: 600 }}>ステータス</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((v: any, i) => (
                <tr key={v.id} style={{ borderBottom: i < filtered.length - 1 ? '1px solid #f0f0f0' : 'none' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#fafafa')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'white')}
                >
                  <td style={{ padding: '10px 16px' }}>
                    {v.image_urls && v.image_urls.length > 0 ? (
                      <img src={v.image_urls[0]} alt="" style={{ width: '72px', height: '54px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #eee' }} />
                    ) : (
                      <div style={{ width: '72px', height: '54px', background: '#f5f5f5', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>🚗</div>
                    )}
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: '13px', color: '#888' }}>{v.db_number ?? '—'}</td>
                  <td style={{ padding: '14px 16px' }}>
                    <Link href={`/vehicles/${v.id}`} style={{ fontSize: '14px', fontWeight: 500, color: '#0070f3', textDecoration: 'none' }}>
                      {v.master_makers?.name && <span style={{ fontSize: '12px', color: '#888', marginRight: '4px' }}>{v.master_makers.name}</span>}
                      {v.master_models?.name ?? v.car_name ?? '—'}
                    </Link>
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: '13px' }}>{v.year ? v.year + '年' : '—'}</td>
                  <td style={{ padding: '14px 16px', fontSize: '13px' }}>{v.mileage ? v.mileage.toLocaleString() + ' km' : '—'}</td>
                  <td style={{ padding: '14px 16px', fontSize: '13px' }}>{v.master_colors?.name ?? v.color ?? '—'}</td>
                  <td style={{ padding: '14px 16px', fontSize: '13px' }}>{v.purchase_price ? '¥' + v.purchase_price.toLocaleString() : '—'}</td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '20px', fontWeight: 500, background: STATUS_COLOR[v.status]?.bg ?? '#f1f3f4', color: STATUS_COLOR[v.status]?.color ?? '#5f6368' }}>
                      {v.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}