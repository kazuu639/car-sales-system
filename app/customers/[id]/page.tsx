'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { useProfile } from '@/hooks/useProfile'

const CATEGORY_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  purchase: { label: '買取',   bg: '#e6f4ea', color: '#1e7e34' },
  sales:    { label: '販売',   bg: '#e8f0fe', color: '#1a73e8' },
  other:    { label: 'その他', bg: '#f1f3f4', color: '#5f6368' },
}

const NEG_STATUS_CONFIG: Record<string, { bg: string; color: string }> = {
  '商談中': { bg: '#fff3e0', color: '#e65100' },
  '見積済': { bg: '#e8f0fe', color: '#1a73e8' },
  '成約':   { bg: '#e6f4ea', color: '#1e7e34' },
  '失注':   { bg: '#fce8e6', color: '#c62828' },
}

export default function CustomerDetailPage() {
  const { id } = useParams()
  const { isAdmin } = useProfile()
  const [customer, setCustomer]       = useState<any>(null)
  const [negotiations, setNegotiations] = useState<any[]>([])
  const [loading, setLoading]         = useState(true)
  const [openVehicles, setOpenVehicles]   = useState(true)
  const [openNegotiations, setOpenNegotiations] = useState(true)

  useEffect(() => {
    const fetch = async () => {
      setLoading(true)
      const [cRes, nRes] = await Promise.all([
        supabase.from('customers').select('*').eq('id', id as string).single(),
        supabase.from('negotiations')
          .select('*, vehicles(id, db_number, car_name, grade, model_type, year, mileage, status, image_urls, master_makers(name), master_models(name))')
          .eq('customer_id', id as string)
          .is('deleted_at', null)
          .order('created_at', { ascending: false }),
      ])
      setCustomer(cRes.data)
      setNegotiations(nRes.data ?? [])
      setLoading(false)
    }
    fetch()
  }, [id])

  if (loading) return <div style={{ padding: '2rem', color: '#aaa' }}>読み込み中...</div>
  if (!customer) return <div style={{ padding: '2rem', color: '#aaa' }}>顧客が見つかりません</div>

  // 商談経由で車両を収集（重複排除）
  const vehicleMap = new Map<string, any>()
  negotiations.forEach(n => {
    if (n.vehicles) vehicleMap.set(n.vehicles.id, n.vehicles)
  })
  const relatedVehicles = Array.from(vehicleMap.values())

  const row = (label: string, value: React.ReactNode) => value ? (
    <div style={{ display: 'flex', gap: '12px', padding: '8px 0', borderBottom: '1px solid #f5f5f5', alignItems: 'baseline' }}>
      <span style={{ width: '100px', flexShrink: 0, fontSize: '12px', color: '#999', fontWeight: 500 }}>{label}</span>
      <span style={{ fontSize: '13px', color: '#222' }}>{value}</span>
    </div>
  ) : null

  const AccordionHeader = ({ title, count, open, onToggle }: { title: string; count: number; open: boolean; onToggle: () => void }) => (
    <button onClick={onToggle} style={{ width: '100%', background: 'none', border: 'none', padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', textAlign: 'left' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{ fontSize: '15px', fontWeight: 700, color: '#111' }}>{title}</span>
        <span style={{ fontSize: '12px', background: '#f1f3f4', color: '#666', borderRadius: '12px', padding: '2px 10px', fontWeight: 600 }}>{count}件</span>
      </div>
      <span style={{ color: '#aaa', fontSize: '18px', lineHeight: 1 }}>{open ? '▲' : '▼'}</span>
    </button>
  )

  return (
    <div style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto' }}>

      {/* ヘッダー */}
      <div style={{ marginBottom: '1.5rem' }}>
        <Link href="/customers" style={{ fontSize: '13px', color: '#888', textDecoration: 'none' }}>← 顧客一覧に戻る</Link>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '8px' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 700, margin: 0 }}>{customer.氏名}</h1>
            {customer.氏名カナ && <div style={{ fontSize: '13px', color: '#aaa', marginTop: '2px' }}>{customer.氏名カナ}</div>}
          </div>
          <Link href={`/negotiations/new?customer=${id}`} style={{ padding: '9px 18px', background: '#0070f3', color: 'white', borderRadius: '8px', textDecoration: 'none', fontSize: '13px', fontWeight: 600 }}>
            ＋ 商談を作成
          </Link>
        </div>
      </div>

      {/* 基本情報 */}
      <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #eee', padding: '20px', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '14px', fontWeight: 700, color: '#555', margin: '0 0 12px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>基本情報</h2>
        {row('電話番号', customer.電話番号)}
        {row('メール', customer.メール)}
        {row('住所', customer.住所)}
        {row('登録日', customer.作成日時 ? new Date(customer.作成日時).toLocaleDateString('ja-JP') : null)}
        {customer.備考 && (
          <div style={{ marginTop: '12px', padding: '10px 14px', background: '#f8f9fa', borderRadius: '8px', fontSize: '13px', color: '#555', lineHeight: 1.7 }}>
            {customer.備考}
          </div>
        )}
      </div>

      {/* 関連車両 アコーディオン */}
      <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #eee', marginBottom: '16px', overflow: 'hidden' }}>
        <AccordionHeader title="関連車両" count={relatedVehicles.length} open={openVehicles} onToggle={() => setOpenVehicles(o => !o)} />
        {openVehicles && (
          <div style={{ borderTop: '1px solid #f0f0f0' }}>
            {relatedVehicles.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: '#bbb', fontSize: '13px' }}>関連する車両がありません</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8f9fa' }}>
                    {['', '管理番号', '車名', '年式', '走行距離', 'ステータス', ''].map(h => (
                      <th key={h} style={{ padding: '9px 12px', textAlign: 'left', fontSize: '11px', color: '#9aa0a6', fontWeight: 600 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {relatedVehicles.map(v => {
                    const thumb = v.image_urls?.[0]
                    return (
                      <tr key={v.id} style={{ borderTop: '1px solid #f4f4f4' }}>
                        <td style={{ padding: '10px 12px', width: '48px' }}>
                          <div style={{ width: '44px', height: '34px', borderRadius: '6px', overflow: 'hidden', background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>
                            {thumb ? <img src={thumb} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '🚗'}
                          </div>
                        </td>
                        <td style={{ padding: '10px 12px', fontSize: '12px', color: '#555', fontWeight: 600 }}>{v.db_number ?? '—'}</td>
                        <td style={{ padding: '10px 12px' }}>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: '#111' }}>{v.car_name ?? v.master_models?.name ?? '—'}</div>
                          {v.grade && <div style={{ fontSize: '11px', color: '#aaa', marginTop: '1px' }}>{v.grade}</div>}
                        </td>
                        <td style={{ padding: '10px 12px', fontSize: '12px', color: '#555' }}>{v.year ? `${v.year}年` : '—'}</td>
                        <td style={{ padding: '10px 12px', fontSize: '12px', color: '#555' }}>{v.mileage ? `${v.mileage.toLocaleString()} km` : '—'}</td>
                        <td style={{ padding: '10px 12px' }}>
                          <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '12px', background: '#f1f3f4', color: '#555', fontWeight: 600 }}>{v.status}</span>
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <Link href={`/vehicles/${v.id}`} style={{ fontSize: '12px', color: '#0070f3', textDecoration: 'none', fontWeight: 500 }}>詳細 →</Link>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* 商談履歴 アコーディオン */}
      <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #eee', marginBottom: '16px', overflow: 'hidden' }}>
        <AccordionHeader title="商談履歴" count={negotiations.length} open={openNegotiations} onToggle={() => setOpenNegotiations(o => !o)} />
        {openNegotiations && (
          <div style={{ borderTop: '1px solid #f0f0f0' }}>
            {negotiations.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: '#bbb', fontSize: '13px' }}>商談履歴がありません</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8f9fa' }}>
                    {['区分', '関連車両', 'ステータス', '担当', '登録日', ''].map(h => (
                      <th key={h} style={{ padding: '9px 12px', textAlign: 'left', fontSize: '11px', color: '#9aa0a6', fontWeight: 600 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {negotiations.map(n => {
                    const cat = CATEGORY_CONFIG[n.category] ?? CATEGORY_CONFIG.other
                    const st  = NEG_STATUS_CONFIG[n.status] ?? { bg: '#f1f3f4', color: '#555' }
                    const vName = n.vehicles
                      ? (n.vehicles.car_name ?? n.vehicles.master_models?.name ?? n.vehicles.db_number ?? '—')
                      : (n.category === 'purchase' ? n.purchase_model || '—' : '—')
                    return (
                      <tr key={n.id} style={{ borderTop: '1px solid #f4f4f4' }}>
                        <td style={{ padding: '10px 12px' }}>
                          <span style={{ fontSize: '11px', padding: '2px 10px', borderRadius: '12px', background: cat.bg, color: cat.color, fontWeight: 700 }}>{cat.label}</span>
                        </td>
                        <td style={{ padding: '10px 12px', fontSize: '13px', color: '#222', fontWeight: 500 }}>{vName}</td>
                        <td style={{ padding: '10px 12px' }}>
                          <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '12px', background: st.bg, color: st.color, fontWeight: 600 }}>{n.status ?? '—'}</span>
                        </td>
                        <td style={{ padding: '10px 12px', fontSize: '12px', color: '#666' }}>{n.assigned_to ?? '—'}</td>
                        <td style={{ padding: '10px 12px', fontSize: '12px', color: '#aaa', whiteSpace: 'nowrap' }}>
                          {n.created_at ? new Date(n.created_at).toLocaleDateString('ja-JP') : '—'}
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <Link href={`/negotiations/${n.id}`} style={{ fontSize: '12px', color: '#0070f3', textDecoration: 'none', fontWeight: 500 }}>詳細 →</Link>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* 削除ボタン */}
      {isAdmin && (
        <div style={{ marginTop: '8px', paddingTop: '16px', borderTop: '1px solid #eee' }}>
          <button onClick={async () => {
            if (!confirm(`「${customer.氏名}」を削除BOXに移動しますか？`)) return
            await supabase.from('customers').update({ deleted_at: new Date().toISOString() }).eq('id', id as string)
            window.location.href = '/customers'
          }} style={{ padding: '9px 18px', background: '#fff5f5', color: '#e53e3e', borderRadius: '8px', border: '1px solid #fce8e6', fontSize: '13px', cursor: 'pointer', fontWeight: 500 }}>
            🗑 この顧客を削除BOXに移動する
          </button>
        </div>
      )}
    </div>
  )
}
