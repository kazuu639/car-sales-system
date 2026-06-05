'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function DeliveriesPage() {
  const [deliveries, setDeliveries] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('active')

  useEffect(() => {
    const fetch = async () => {
      setLoading(true)
      const { data } = await supabase
        .from('deliveries')
        .select('*, contracts(*, negotiations(*, customers(氏名, 電話番号), vehicles(db_number, master_makers(name), master_models(name))))')
        .order('created_at', { ascending: false })
      setDeliveries(data ?? [])
      setLoading(false)
    }
    fetch()
  }, [])

  // 3軸の完了判定
  const isPaymentOK = (d: any) => d.payment_confirmed
  const isDocsOK = (d: any) => d.doc_commission && d.doc_seal && d.doc_parking && d.registration_number
  const isTasksOK = (d: any) => d.task_loan_apply && d.task_inspection && d.task_maintenance && d.task_cleaning
  const isCompleted = (d: any) => d.current_step >= 8 || d.contracts?.status === '完了'
  const canDeliver = (d: any) => isPaymentOK(d) && isDocsOK(d) && isTasksOK(d)

  // 契約からの経過日数
  const daysSince = (dateStr: string) => {
    if (!dateStr) return null
    const diff = Date.now() - new Date(dateStr).getTime()
    return Math.floor(diff / (1000 * 60 * 60 * 24))
  }

  // 進行メーター（2週間=14日ベース）
  const progressPct = (contractDate: string) => {
    const days = daysSince(contractDate)
    if (days === null) return 0
    return Math.min(Math.round((days / 14) * 100), 100)
  }

  const filtered = deliveries.filter(d => {
    if (filterStatus === 'active') return !isCompleted(d)
    if (filterStatus === 'completed') return isCompleted(d)
    return true
  })

  const StatusDot = ({ ok }: { ok: boolean }) => (
    <div style={{ width: '20px', height: '20px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: ok ? '#e6f4ea' : '#f1f3f4', fontSize: '11px' }}>
      {ok ? <span style={{ color: '#1e7e34' }}>✓</span> : <span style={{ color: '#ccc' }}>—</span>}
    </div>
  )

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      {/* ヘッダー */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, margin: 0 }}>納車管理</h1>
          <p style={{ fontSize: '13px', color: '#888', margin: '4px 0 0' }}>{filtered.length}件</p>
        </div>
      </div>

      {/* フィルター */}
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
              <tr style={{ background: '#f8f9fa', borderBottom: '1px solid #eee' }}>
                {['顧客', '車両', '担当', '入金', '書類', '業務', '進行メーター', ''].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', color: '#888', fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((d, i) => {
                const neg = d.contracts?.negotiations
                const customer = neg?.customers
                const vehicle = neg?.vehicles
                const contractDate = d.contracts?.contract_date
                const scheduledDate = d.delivery_scheduled_date || d.contracts?.delivery_date
                const days = daysSince(contractDate)
                const pct = progressPct(contractDate)
                const completed = isCompleted(d)
                const ready = canDeliver(d)

                return (
                  <tr key={d.id} style={{ borderBottom: i < filtered.length - 1 ? '1px solid #f0f0f0' : 'none' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#fafafa')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'white')}
                  >
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ fontSize: '14px', fontWeight: 500 }}>{customer?.氏名 ?? '—'}</div>
                      <div style={{ fontSize: '11px', color: '#aaa' }}>{customer?.電話番号}</div>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ fontSize: '13px' }}>{vehicle?.master_makers?.name} {vehicle?.master_models?.name}</div>
                      <div style={{ fontSize: '11px', color: '#aaa' }}>{vehicle?.db_number}</div>
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '13px', color: '#555' }}>
                      {d.assigned_to || '—'}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <StatusDot ok={isPaymentOK(d)} />
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <StatusDot ok={isDocsOK(d)} />
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <StatusDot ok={isTasksOK(d)} />
                    </td>
                    <td style={{ padding: '14px 16px', minWidth: '160px' }}>
                      {completed ? (
                        <span style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '20px', background: '#e6f4ea', color: '#1e7e34', fontWeight: 600 }}>✓ 納車完了</span>
                      ) : ready ? (
                        <span style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '20px', background: '#e8f0fe', color: '#1a73e8', fontWeight: 600 }}>🚗 納車可能！</span>
                      ) : (
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                            <div style={{ flex: 1, height: '6px', background: '#f0f0f0', borderRadius: '3px' }}>
                              <div style={{ width: `${pct}%`, height: '100%', background: pct >= 100 ? '#e53e3e' : pct >= 70 ? '#e65100' : '#1a73e8', borderRadius: '3px', transition: 'width 0.3s' }} />
                            </div>
                            <span style={{ fontSize: '11px', color: '#888', whiteSpace: 'nowrap' }}>{days !== null ? `${days}日目` : '—'}</span>
                          </div>
                          {scheduledDate && (
                            <div style={{ fontSize: '10px', color: '#aaa' }}>
                              予定: {new Date(scheduledDate).toLocaleDateString('ja-JP')}
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <Link href={`/deliveries/${d.id}`} style={{ fontSize: '13px', color: '#0070f3', textDecoration: 'none' }}>詳細</Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}