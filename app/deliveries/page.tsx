'use client'
import { useEffect, useState, Fragment } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function DeliveriesPage() {
  const [deliveries, setDeliveries] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('active')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const { data } = await supabase
        .from('deliveries')
        .select('*, contracts(*, negotiations(*, customers(氏名, 電話番号), vehicles(id, db_number, master_makers(name), master_models(name))))')
        .order('created_at', { ascending: false })
      setDeliveries(data ?? [])
      setLoading(false)
    }
    load()
  }, [])

  const isPaymentOK = (d: any) => !!d.payment_confirmed
  const isDocsOK    = (d: any) => !!(d.doc_commission && d.doc_seal && d.doc_parking && d.registration_number)
  const isTasksOK   = (d: any) => !!(d.task_loan_apply && d.task_inspection && d.task_maintenance && d.task_cleaning)
  const isCompleted = (d: any) => d.current_step >= 8 || d.contracts?.status === '完了'
  const canDeliver  = (d: any) => isPaymentOK(d) && isDocsOK(d) && isTasksOK(d)

  const daysSince = (dateStr: string) => {
    if (!dateStr) return null
    return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000)
  }

  const pctOf = (contractDate: string) => {
    const days = daysSince(contractDate)
    if (days === null) return 0
    return Math.min(Math.round((days / 14) * 100), 100)
  }

  const filtered = deliveries.filter(d => {
    if (filterStatus === 'active') return !isCompleted(d)
    if (filterStatus === 'completed') return isCompleted(d)
    return true
  })

  const toggle = (id: string) => setExpandedId(prev => prev === id ? null : id)

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>

      {/* ヘッダー */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, margin: 0 }}>納車管理</h1>
          <p style={{ fontSize: '13px', color: '#888', margin: '4px 0 0' }}>{filtered.length}件</p>
        </div>
      </div>

      {/* フィルタータブ */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '16px', background: '#f1f3f4', borderRadius: '10px', padding: '4px', width: 'fit-content' }}>
        {[{ key: 'active', label: '進行中' }, { key: 'completed', label: '完了' }, { key: 'all', label: 'すべて' }].map(f => (
          <button key={f.key} onClick={() => setFilterStatus(f.key)} style={{
            padding: '7px 20px', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 500, cursor: 'pointer',
            background: filterStatus === f.key ? 'white' : 'transparent',
            color: filterStatus === f.key ? '#111' : '#888',
            boxShadow: filterStatus === f.key ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
          }}>{f.label}</button>
        ))}
      </div>

      {/* テーブル */}
      <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #eee', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#aaa' }}>読み込み中...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#aaa' }}>データがありません</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #f0f0f0' }}>
                {['', '顧客', '車両', '担当', '入金', '書類', '業務', '状況', ''].map((h, idx) => (
                  <th key={idx} style={{ padding: '11px 16px', textAlign: 'left', fontSize: '11px', color: '#9aa0a6', fontWeight: 600, letterSpacing: '0.03em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((d, i) => {
                const neg           = d.contracts?.negotiations
                const customer      = neg?.customers
                const vehicle       = neg?.vehicles
                const contractDate  = d.contracts?.contract_date
                const scheduledDate = d.delivery_scheduled_date || d.contracts?.delivery_date
                const days          = daysSince(contractDate)
                const pct           = pctOf(contractDate)
                const completed     = isCompleted(d)
                const ready         = canDeliver(d)
                const expanded      = expandedId === d.id
                const isLast        = i === filtered.length - 1

                return (
                  <Fragment key={d.id}>
                    {/* メイン行 */}
                    <tr
                      style={{ borderBottom: expanded ? 'none' : isLast ? 'none' : '1px solid #f4f4f4', background: expanded ? '#f0f4ff' : 'white', cursor: 'pointer' }}
                      onClick={() => toggle(d.id)}
                      onMouseEnter={e => { if (!expanded) e.currentTarget.style.background = '#fafbff' }}
                      onMouseLeave={e => { if (!expanded) e.currentTarget.style.background = 'white' }}
                    >
                      <td style={{ padding: '14px 8px 14px 16px', width: '20px' }}>
                        <span style={{ fontSize: '10px', color: '#aaa', display: 'inline-block', transform: expanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }}>▶</span>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontSize: '14px', fontWeight: 600, color: '#111' }}>{customer?.氏名 ?? '—'}</div>
                        {customer?.電話番号 && <div style={{ fontSize: '11px', color: '#bbb', marginTop: '1px' }}>{customer.電話番号}</div>}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontSize: '13px', fontWeight: 500, color: '#333' }}>{vehicle?.master_makers?.name} {vehicle?.master_models?.name}</div>
                        {vehicle?.db_number && <div style={{ fontSize: '11px', color: '#bbb', marginTop: '1px', fontFamily: 'monospace' }}>{vehicle.db_number}</div>}
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: '13px', color: '#666' }}>{d.assigned_to || '—'}</td>
                      <td style={{ padding: '14px 16px' }}><span style={{ fontSize: '14px' }}>{isPaymentOK(d) ? '✅' : '⬜'}</span></td>
                      <td style={{ padding: '14px 16px' }}><span style={{ fontSize: '14px' }}>{isDocsOK(d) ? '✅' : '⬜'}</span></td>
                      <td style={{ padding: '14px 16px' }}><span style={{ fontSize: '14px' }}>{isTasksOK(d) ? '✅' : '⬜'}</span></td>
                      <td style={{ padding: '14px 16px' }}>
                        {completed ? (
                          <span style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '20px', background: '#e6f4ea', color: '#1e7e34', fontWeight: 600 }}>✓ 完了</span>
                        ) : ready ? (
                          <span style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '20px', background: '#e8f0fe', color: '#1a73e8', fontWeight: 600 }}>🚗 準備OK</span>
                        ) : (
                          <span style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '20px', background: '#fff3e0', color: '#e65100', fontWeight: 600 }}>進行中</span>
                        )}
                      </td>
                      <td style={{ padding: '14px 16px' }}></td>
                    </tr>

                    {/* アコーディオン展開行 */}
                    {expanded && (
                      <tr style={{ borderBottom: isLast ? 'none' : '1px solid #e0e8ff' }}>
                        <td colSpan={9} style={{ padding: 0, background: '#f0f4ff' }}>
                          <div style={{ padding: '16px 24px 20px', borderTop: '1px solid #dde6ff' }}>

                            {/* 概要カード */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '10px', marginBottom: '14px' }}>
                              <div style={{ background: 'white', borderRadius: '8px', border: '1px solid #e8eeff', padding: '12px 14px' }}>
                                <div style={{ fontSize: '11px', color: '#9aa0a6', fontWeight: 600, marginBottom: '4px' }}>契約日</div>
                                <div style={{ fontSize: '14px', fontWeight: 600 }}>
                                  {contractDate ? new Date(contractDate).toLocaleDateString('ja-JP') : '—'}
                                </div>
                                {days !== null && <div style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>{days}日経過</div>}
                              </div>
                              <div style={{ background: 'white', borderRadius: '8px', border: '1px solid #e8eeff', padding: '12px 14px' }}>
                                <div style={{ fontSize: '11px', color: '#9aa0a6', fontWeight: 600, marginBottom: '4px' }}>納車予定日</div>
                                <div style={{ fontSize: '14px', fontWeight: 600 }}>
                                  {scheduledDate ? new Date(scheduledDate).toLocaleDateString('ja-JP') : '—'}
                                </div>
                              </div>
                              <div style={{ background: 'white', borderRadius: '8px', border: '1px solid #e8eeff', padding: '12px 14px' }}>
                                <div style={{ fontSize: '11px', color: '#9aa0a6', fontWeight: 600, marginBottom: '6px' }}>3軸チェック</div>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                  {[
                                    { label: '入金', ok: isPaymentOK(d) },
                                    { label: '書類', ok: isDocsOK(d) },
                                    { label: '業務', ok: isTasksOK(d) },
                                  ].map(s => (
                                    <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                      <span style={{ fontSize: '13px' }}>{s.ok ? '✅' : '⬜'}</span>
                                      <span style={{ fontSize: '11px', color: s.ok ? '#1e7e34' : '#888' }}>{s.label}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                              <div style={{ background: 'white', borderRadius: '8px', border: '1px solid #e8eeff', padding: '12px 14px' }}>
                                <div style={{ fontSize: '11px', color: '#9aa0a6', fontWeight: 600, marginBottom: '4px' }}>担当者</div>
                                <div style={{ fontSize: '14px', fontWeight: 600 }}>{d.assigned_to || '—'}</div>
                              </div>
                            </div>

                            {/* 進捗バー */}
                            {!completed && (
                              <div style={{ marginBottom: '14px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                                  <span style={{ fontSize: '12px', color: '#888' }}>進行メーター（目安 14日）</span>
                                  <span style={{ fontSize: '12px', fontWeight: 600, color: pct >= 100 ? '#e53e3e' : '#1a73e8' }}>{pct}%</span>
                                </div>
                                <div style={{ height: '8px', background: '#dde6ff', borderRadius: '4px' }}>
                                  <div style={{ width: `${pct}%`, height: '100%', background: pct >= 100 ? '#e53e3e' : pct >= 70 ? '#e65100' : '#1a73e8', borderRadius: '4px', transition: 'width 0.3s' }} />
                                </div>
                              </div>
                            )}

                            {/* 詳細ボタン */}
                            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                              {vehicle?.id ? (
                                <Link
                                  href={`/vehicles/${vehicle.id}?tab=契約&subtab=納車管理`}
                                  onClick={e => e.stopPropagation()}
                                  style={{ padding: '8px 20px', background: '#0070f3', color: 'white', borderRadius: '8px', textDecoration: 'none', fontSize: '13px', fontWeight: 600 }}
                                >
                                  納車管理を開く →
                                </Link>
                              ) : (
                                <span style={{ fontSize: '12px', color: '#ccc' }}>車両リンクなし</span>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
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
