'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { useProfile } from '@/hooks/useProfile'

const STATUS_CONFIG: Record<string, { bg: string; color: string; dot: string }> = {
  '在庫中': { bg: '#e6f4ea', color: '#1e7e34', dot: '#34a853' },
  '商談中': { bg: '#fff3e0', color: '#e65100', dot: '#fb8c00' },
  '売約済': { bg: '#e8f0fe', color: '#1a73e8', dot: '#4285f4' },
  '納車済': { bg: '#f1f3f4', color: '#5f6368', dot: '#9aa0a6' },
}
const CAT_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  purchase: { label: '買取', bg: '#e6f4ea', color: '#1e7e34' },
  sales:    { label: '販売', bg: '#e8f0fe', color: '#1a73e8' },
  other:    { label: 'その他', bg: '#f1f3f4', color: '#5f6368' },
}
const NEG_STATUS: Record<string, { bg: string; color: string }> = {
  '商談中': { bg: '#fff3e0', color: '#e65100' },
  '見積済': { bg: '#e8f0fe', color: '#1a73e8' },
  '成約':   { bg: '#e6f4ea', color: '#1e7e34' },
  '失注':   { bg: '#fce8e6', color: '#c62828' },
}

export default function VehicleDirectoryPage() {
  const [vehicles, setVehicles]     = useState<any[]>([])
  const [negMap, setNegMap]         = useState<Record<string, any[]>>({})
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const { profile } = useProfile()

  const load = async () => {
    if (!profile?.company_id) return
    setLoading(true)
    const [vRes, nRes] = await Promise.all([
      supabase.from('vehicles')
        .select('*, master_models(name), master_makers(name), master_colors(name)')
        .eq('company_id', profile.company_id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false }),
      supabase.from('negotiations')
        .select('id, vehicle_id, customer_id, category, status, assigned_to, created_at, customers(*)')
        .eq('company_id', profile.company_id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false }),
    ])
    setVehicles(vRes.data ?? [])
    const map: Record<string, any[]> = {}
    for (const n of (nRes.data ?? [])) {
      if (!n.vehicle_id) continue
      if (!map[n.vehicle_id]) map[n.vehicle_id] = []
      map[n.vehicle_id].push(n)
    }
    setNegMap(map)
    setLoading(false)
  }

  useEffect(() => { if (profile?.company_id) load() }, [profile])

  const filtered = vehicles.filter(v =>
    !search ||
    (v.car_name            ?? '').includes(search) ||
    (v.grade               ?? '').includes(search) ||
    (v.master_models?.name ?? '').includes(search) ||
    (v.master_makers?.name ?? '').includes(search) ||
    (v.db_number           ?? '').includes(search) ||
    (v.chassis_number      ?? '').includes(search) ||
    (v.car_number          ?? '').includes(search)
  )

  return (
    <div style={{ padding: '2rem', maxWidth: '1100px', margin: '0 auto' }}>

      {/* ヘッダー */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, margin: 0 }}>車両</h1>
          <p style={{ fontSize: '13px', color: '#888', margin: '4px 0 0' }}>
            {filtered.length}台表示 / 全{vehicles.length}台　顧客・商談との紐付きを確認できます
          </p>
        </div>
        <Link href="/vehicles" style={{ padding: '10px 20px', background: '#666', color: 'white', borderRadius: '8px', textDecoration: 'none', fontSize: '14px', fontWeight: 600 }}>
          在庫一覧へ
        </Link>
      </div>

      {/* フィルターバー */}
      <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #eee', padding: '14px 16px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
            <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#bbb', fontSize: '14px', pointerEvents: 'none' }}>🔍</span>
            <input type="text" placeholder="車種名・管理番号・車台番号で検索" value={search} onChange={e => setSearch(e.target.value)}
              style={{ width: '100%', border: '1px solid #e8e8e8', borderRadius: '8px', padding: '8px 12px 8px 32px', fontSize: '13px', outline: 'none', background: '#fafafa', boxSizing: 'border-box' }} />
          </div>
          {search && (
            <button onClick={() => setSearch('')} style={{ padding: '8px 14px', border: '1px solid #ddd', borderRadius: '8px', background: 'white', fontSize: '12px', cursor: 'pointer', color: '#888' }}>
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
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>🚗</div>
            {search ? '検索条件に一致する車両がありません' : '車両データがありません'}
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #f0f0f0' }}>
                {['車両', 'ステータス', '年式 / 走行距離', '入庫日', '関連', ''].map(h => (
                  <th key={h} style={{ padding: '11px 16px', textAlign: 'left', fontSize: '11px', color: '#9aa0a6', fontWeight: 600, letterSpacing: '0.03em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((v) => {
                const negs = negMap[v.id] ?? []
                const custMap = new Map<string, any>()
                negs.forEach((n: any) => { if (n.customers) custMap.set(n.customers.id, n.customers) })
                const custs   = Array.from(custMap.values())
                const aaCount = (v.purchase_type === 'AA' && v.auction_venue_id ? 1 : 0) + (v.purchase_type === '業者AA' && v.dealer_id ? 1 : 0)
                const isOpen  = expandedId === v.id
                const cfg     = STATUS_CONFIG[v.status]

                return (
                  <>
                    {/* メイン行 */}
                    <tr key={v.id}
                      style={{ borderTop: '1px solid #f4f4f4', background: isOpen ? '#f8fbff' : 'white', cursor: 'pointer' }}
                      onClick={() => setExpandedId(isOpen ? null : v.id)}
                      onMouseEnter={e => { if (!isOpen) e.currentTarget.style.background = '#fafbff' }}
                      onMouseLeave={e => { if (!isOpen) e.currentTarget.style.background = 'white' }}
                    >
                      {/* 車両 */}
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ width: '48px', height: '38px', borderRadius: '6px', overflow: 'hidden', background: '#f5f5f5', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', border: '1px solid #eee' }}>
                            {v.image_urls?.[0]
                              ? <img src={v.image_urls[0]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              : '🚗'}
                          </div>
                          <div>
                            <div style={{ fontSize: '14px', fontWeight: 600, color: '#111' }}>
                              {v.car_name ?? v.master_models?.name ?? '—'}
                            </div>
                            <div style={{ fontSize: '11px', color: '#bbb', marginTop: '1px' }}>
                              {[v.db_number, v.grade].filter(Boolean).join(' · ')}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* ステータス */}
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: '4px',
                          fontSize: '11px', padding: '3px 8px', borderRadius: '20px', fontWeight: 600,
                          background: cfg?.bg ?? '#f1f3f4', color: cfg?.color ?? '#5f6368',
                        }}>
                          <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: cfg?.dot ?? '#aaa', flexShrink: 0 }} />
                          {v.status ?? '—'}
                        </span>
                      </td>

                      {/* 年式 / 走行距離 */}
                      <td style={{ padding: '12px 16px', fontSize: '13px', color: '#444' }}>
                        {v.year ? `${v.year}年` : '—'}
                        {v.mileage ? <span style={{ color: '#888', marginLeft: '8px' }}>{v.mileage.toLocaleString()} km</span> : null}
                      </td>

                      {/* 入庫日 */}
                      <td style={{ padding: '12px 16px', fontSize: '12px', color: '#bbb', whiteSpace: 'nowrap' }}>
                        {v.stock_date ?? '—'}
                      </td>

                      {/* 件数サマリー */}
                      <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '10px', background: custs.length > 0 ? '#e8f0fe' : '#f1f3f4', color: custs.length > 0 ? '#1a73e8' : '#aaa', fontWeight: 600 }}>
                            顧客 {custs.length}件
                          </span>
                          <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '10px', background: negs.length > 0 ? '#e6f4ea' : '#f1f3f4', color: negs.length > 0 ? '#1e7e34' : '#aaa', fontWeight: 600 }}>
                            商談 {negs.length}件
                          </span>
                          <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '10px', background: aaCount > 0 ? '#fff3e0' : '#f1f3f4', color: aaCount > 0 ? '#e65100' : '#aaa', fontWeight: 600 }}>
                            AA {aaCount}件
                          </span>
                        </div>
                      </td>

                      {/* 詳細リンク */}
                      <td style={{ padding: '12px 16px' }} onClick={e => e.stopPropagation()}>
                        <Link href={`/vehicles/${v.id}`}
                          style={{ padding: '5px 14px', background: '#e8f0fe', color: '#1a73e8', borderRadius: '6px', textDecoration: 'none', fontSize: '12px', fontWeight: 600 }}>
                          詳細
                        </Link>
                      </td>
                    </tr>

                    {/* アコーディオン展開行 */}
                    {isOpen && (
                      <tr key={`${v.id}-detail`}>
                        <td colSpan={6} style={{ padding: 0, background: '#f4f8ff', borderTop: '1px solid #dbeafe', borderBottom: '2px solid #bfdbfe' }}>
                          <div style={{ padding: '16px 20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>

                            {/* 関連顧客 */}
                            <div>
                              <div style={{ fontSize: '12px', fontWeight: 700, color: '#1a73e8', marginBottom: '8px', letterSpacing: '0.04em' }}>関連顧客（{custs.length}件）</div>
                              {custs.length === 0 ? (
                                <div style={{ fontSize: '12px', color: '#aaa', padding: '8px 0' }}>関連する顧客がいません</div>
                              ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                  {custs.map((c: any) => (
                                    <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'white', borderRadius: '8px', padding: '8px 12px', border: '1px solid #e0ecff' }}>
                                      <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#e8f0fe', color: '#1a73e8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, flexShrink: 0 }}>
                                        {(c['氏名'] ?? '?')[0]}
                                      </div>
                                      <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontSize: '13px', fontWeight: 600, color: '#111' }}>{c['氏名'] ?? '—'}</div>
                                        {c['電話番号'] && <div style={{ fontSize: '11px', color: '#aaa' }}>{c['電話番号']}</div>}
                                      </div>
                                      <Link href={`/customers/${c.id}`} onClick={e => e.stopPropagation()}
                                        style={{ fontSize: '11px', color: '#0070f3', textDecoration: 'none', fontWeight: 600, whiteSpace: 'nowrap' }}>詳細 →</Link>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* 商談履歴 */}
                            <div>
                              <div style={{ fontSize: '12px', fontWeight: 700, color: '#1e7e34', marginBottom: '8px', letterSpacing: '0.04em' }}>商談履歴（{negs.length}件）</div>
                              {negs.length === 0 ? (
                                <div style={{ fontSize: '12px', color: '#aaa', padding: '8px 0' }}>商談履歴がありません</div>
                              ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                  {negs.map((n: any) => {
                                    const cat = CAT_CONFIG[n.category] ?? CAT_CONFIG.other
                                    const st  = NEG_STATUS[n.status]  ?? { bg: '#f1f3f4', color: '#555' }
                                    return (
                                      <div key={n.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'white', borderRadius: '8px', padding: '8px 12px', border: '1px solid #e0f0e8' }}>
                                        <span style={{ fontSize: '10px', padding: '2px 7px', borderRadius: '10px', background: cat.bg, color: cat.color, fontWeight: 700, flexShrink: 0 }}>{cat.label}</span>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                          <div style={{ fontSize: '12px', fontWeight: 500, color: '#222', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {n.customers?.['氏名'] ?? '顧客不明'}
                                          </div>
                                          <div style={{ fontSize: '11px', color: '#aaa' }}>{n.created_at ? new Date(n.created_at).toLocaleDateString('ja-JP') : ''}</div>
                                        </div>
                                        <span style={{ fontSize: '10px', padding: '2px 7px', borderRadius: '10px', background: st.bg, color: st.color, fontWeight: 600, flexShrink: 0 }}>{n.status ?? '—'}</span>
                                        <Link href={`/negotiations/${n.id}`} onClick={e => e.stopPropagation()}
                                          style={{ fontSize: '11px', color: '#0070f3', textDecoration: 'none', fontWeight: 600, whiteSpace: 'nowrap' }}>詳細 →</Link>
                                      </div>
                                    )
                                  })}
                                </div>
                              )}
                            </div>

                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
