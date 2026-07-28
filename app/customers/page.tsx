'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { useProfile } from '@/hooks/useProfile'

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

export default function CustomersPage() {
  const [customers, setCustomers]   = useState<any[]>([])
  const [negMap, setNegMap]         = useState<Record<string, any[]>>({})
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const { isAdmin, profile } = useProfile()

  const load = async () => {
    if (!profile?.company_id) return
    setLoading(true)
    const [cRes, nRes] = await Promise.all([
      supabase.from('customers').select('*')
        .eq('company_id', profile.company_id)
        .is('deleted_at', null)
        .order('作成日時', { ascending: false }),
      supabase.from('negotiations')
        .select('id, customer_id, category, status, assigned_to, created_at, purchase_model, vehicles(id, db_number, car_name, grade, year, mileage, status, image_urls, master_models(name))')
        .eq('company_id', profile.company_id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false }),
    ])
    setCustomers(cRes.data ?? [])
    // customer_id でグルーピング
    const map: Record<string, any[]> = {}
    for (const n of (nRes.data ?? [])) {
      if (!n.customer_id) continue
      if (!map[n.customer_id]) map[n.customer_id] = []
      map[n.customer_id].push(n)
    }
    setNegMap(map)
    setLoading(false)
  }

  useEffect(() => { if (profile?.company_id) load() }, [profile])

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`「${name}」を削除BOXに移動しますか？\n関連する商談も削除BOXに移動されます。`)) return
    await supabase.from('customers').update({ deleted_at: new Date().toISOString() }).eq('id', id)
    await supabase.from('negotiations').update({ deleted_at: new Date().toISOString() }).eq('customer_id', id)
    load()
  }

  const filtered = customers.filter(c =>
    !search ||
    (c.氏名      ?? '').includes(search) ||
    (c.氏名カナ  ?? '').includes(search) ||
    (c.電話番号  ?? '').includes(search) ||
    (c.メール    ?? '').includes(search)
  )

  const avatarColor = (name: string) => {
    const colors    = ['#e8f0fe','#e6f4ea','#fff3e0','#fce8e6','#f3e8fd']
    const textColors = ['#1a73e8','#1e7e34','#e65100','#c62828','#8e44ad']
    const i = (name?.charCodeAt(0) ?? 0) % colors.length
    return { bg: colors[i], color: textColors[i] }
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1100px', margin: '0 auto' }}>

      {/* ヘッダー */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, margin: 0 }}>顧客一覧</h1>
          <p style={{ fontSize: '13px', color: '#888', margin: '4px 0 0' }}>{filtered.length}件表示 / 全{customers.length}件</p>
        </div>
        <Link href="/customers/new" style={{ padding: '10px 20px', background: '#0070f3', color: 'white', borderRadius: '8px', textDecoration: 'none', fontSize: '14px', fontWeight: 600 }}>
          ＋ 顧客登録
        </Link>
      </div>

      {/* フィルターバー */}
      <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #eee', padding: '14px 16px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1, maxWidth: '360px' }}>
            <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#bbb', fontSize: '14px', pointerEvents: 'none' }}>🔍</span>
            <input type="text" placeholder="氏名・電話番号・メールで検索" value={search} onChange={e => setSearch(e.target.value)}
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
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>👤</div>
            {search ? '検索条件に一致する顧客がいません' : '顧客データがありません'}
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #f0f0f0' }}>
                {['氏名', '電話番号', 'メール', '住所', '関連', '登録日', ''].map(h => (
                  <th key={h} style={{ padding: '11px 16px', textAlign: 'left', fontSize: '11px', color: '#9aa0a6', fontWeight: 600, letterSpacing: '0.03em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => {
                const av   = avatarColor(c.氏名 ?? '')
                const negs = negMap[c.id] ?? []
                const vehicleMap = new Map<string, any>()
                negs.forEach(n => { if (n.vehicles) vehicleMap.set(n.vehicles.id, n.vehicles) })
                const vehicles  = Array.from(vehicleMap.values())
                const isOpen    = expandedId === c.id

                return (
                  <>
                    {/* メイン行 */}
                    <tr key={c.id}
                      style={{ borderTop: '1px solid #f4f4f4', background: isOpen ? '#f8fbff' : 'white', cursor: 'pointer' }}
                      onClick={() => setExpandedId(isOpen ? null : c.id)}
                      onMouseEnter={e => { if (!isOpen) e.currentTarget.style.background = '#fafbff' }}
                      onMouseLeave={e => { if (!isOpen) e.currentTarget.style.background = 'white' }}
                    >
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: av.bg, color: av.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700, flexShrink: 0 }}>
                            {(c.氏名 ?? '?')[0]}
                          </div>
                          <div>
                            <div style={{ fontSize: '14px', fontWeight: 600, color: '#111' }}>{c.氏名}</div>
                            {c.氏名カナ && <div style={{ fontSize: '11px', color: '#bbb', marginTop: '1px' }}>{c.氏名カナ}</div>}
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '13px', color: '#444' }}>{c.電話番号 ?? '—'}</td>
                      <td style={{ padding: '12px 16px', fontSize: '13px', color: '#666' }}>{c.メール ?? '—'}</td>
                      <td style={{ padding: '12px 16px', fontSize: '12px', color: '#888', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.住所 ?? '—'}</td>
                      {/* 件数サマリー */}
                      <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '10px', background: vehicles.length > 0 ? '#e8f0fe' : '#f1f3f4', color: vehicles.length > 0 ? '#1a73e8' : '#aaa', fontWeight: 600 }}>
                            車両 {vehicles.length}台
                          </span>
                          <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '10px', background: negs.length > 0 ? '#e6f4ea' : '#f1f3f4', color: negs.length > 0 ? '#1e7e34' : '#aaa', fontWeight: 600 }}>
                            商談 {negs.length}件
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '12px', color: '#bbb', whiteSpace: 'nowrap' }}>
                        {c.作成日時 ? new Date(c.作成日時).toLocaleDateString('ja-JP') : '—'}
                      </td>
                      <td style={{ padding: '12px 16px' }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                          <Link href={`/customers/${c.id}`}
                            style={{ padding: '5px 14px', background: '#e8f0fe', color: '#1a73e8', borderRadius: '6px', textDecoration: 'none', fontSize: '12px', fontWeight: 600 }}>
                            詳細
                          </Link>
                          {isAdmin && (
                            <button onClick={() => handleDelete(c.id, c.氏名)}
                              style={{ padding: '5px 12px', background: 'none', border: '1px solid #f0f0f0', color: '#e53e3e', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>
                              削除
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>

                    {/* アコーディオン展開行 */}
                    {isOpen && (
                      <tr key={`${c.id}-detail`}>
                        <td colSpan={7} style={{ padding: 0, background: '#f4f8ff', borderTop: '1px solid #dbeafe', borderBottom: '2px solid #bfdbfe' }}>
                          <div style={{ padding: '16px 20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>

                            {/* 関連車両 */}
                            <div>
                              <div style={{ fontSize: '12px', fontWeight: 700, color: '#1a73e8', marginBottom: '8px', letterSpacing: '0.04em' }}>関連車両（{vehicles.length}台）</div>
                              {vehicles.length === 0 ? (
                                <div style={{ fontSize: '12px', color: '#aaa', padding: '8px 0' }}>関連する車両がありません</div>
                              ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                  {vehicles.map(v => (
                                    <div key={v.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'white', borderRadius: '8px', padding: '8px 12px', border: '1px solid #e0ecff' }}>
                                      <div style={{ width: '38px', height: '30px', borderRadius: '5px', overflow: 'hidden', background: '#f5f5f5', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>
                                        {v.image_urls?.[0] ? <img src={v.image_urls[0]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '🚗'}
                                      </div>
                                      <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontSize: '12px', fontWeight: 600, color: '#111', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                          {v.car_name ?? v.master_models?.name ?? '—'}
                                          {v.grade ? <span style={{ fontWeight: 400, color: '#888' }}> {v.grade}</span> : null}
                                        </div>
                                        <div style={{ fontSize: '11px', color: '#aaa' }}>
                                          {v.db_number} {v.year ? `・${v.year}年` : ''}{v.mileage ? `・${v.mileage.toLocaleString()}km` : ''}
                                        </div>
                                      </div>
                                      <Link href={`/vehicles/${v.id}`} onClick={e => e.stopPropagation()}
                                        style={{ fontSize: '11px', color: '#0070f3', textDecoration: 'none', fontWeight: 600, whiteSpace: 'nowrap' }}>詳細 →</Link>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* 関連商談 */}
                            <div>
                              <div style={{ fontSize: '12px', fontWeight: 700, color: '#1e7e34', marginBottom: '8px', letterSpacing: '0.04em' }}>商談履歴（{negs.length}件）</div>
                              {negs.length === 0 ? (
                                <div style={{ fontSize: '12px', color: '#aaa', padding: '8px 0' }}>商談履歴がありません</div>
                              ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                  {negs.map(n => {
                                    const cat = CAT_CONFIG[n.category] ?? CAT_CONFIG.other
                                    const st  = NEG_STATUS[n.status] ?? { bg: '#f1f3f4', color: '#555' }
                                    const vName = n.vehicles?.car_name ?? n.vehicles?.master_models?.name ?? n.purchase_model ?? '—'
                                    return (
                                      <div key={n.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'white', borderRadius: '8px', padding: '8px 12px', border: '1px solid #e0f0e8' }}>
                                        <span style={{ fontSize: '10px', padding: '2px 7px', borderRadius: '10px', background: cat.bg, color: cat.color, fontWeight: 700, flexShrink: 0 }}>{cat.label}</span>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                          <div style={{ fontSize: '12px', fontWeight: 500, color: '#222', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{vName}</div>
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
