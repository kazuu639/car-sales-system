'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function CustomerDetailPage() {
  const { id } = useParams()
  const [customer, setCustomer] = useState<any>(null)
  const [negotiations, setNegotiations] = useState<any[]>([])
  const [vehicles, setVehicles] = useState<any[]>([])
  const [tab, setTab] = useState<'info' | 'negotiations' | 'vehicles'>('info')

  useEffect(() => {
    supabase.from('customers').select('*').eq('id', id).single()
      .then(({ data }) => setCustomer(data))
    supabase.from('negotiations')
      .select('*, vehicles(db_number, master_makers(name), master_models(name), image_urls)')
      .eq('customer_id', id)
      .order('created_at', { ascending: false })
      .then(({ data }) => setNegotiations(data ?? []))
    supabase.from('vehicles')
      .select('*, master_makers(name), master_models(name)')
      .eq('customer_id', id)
      .order('created_at', { ascending: false })
      .then(({ data }) => setVehicles(data ?? []))
  }, [id])

  if (!customer) return <div style={{ padding: '2rem' }}>読み込み中...</div>

  const STATUS_COLOR: Record<string, { bg: string; color: string }> = {
    '商談中': { bg: '#fff3e0', color: '#e65100' },
    '見積済': { bg: '#e8f0fe', color: '#1a73e8' },
    '成約':   { bg: '#e6f4ea', color: '#1e7e34' },
    '失注':   { bg: '#f1f3f4', color: '#5f6368' },
  }

  const row = (label: string, value: any) => (
    <div style={{ display: 'flex', borderBottom: '1px solid #f0f0f0', padding: '12px 0' }}>
      <div style={{ width: '140px', fontSize: '13px', color: '#888', flexShrink: 0 }}>{label}</div>
      <div style={{ fontSize: '14px' }}>{value ?? '—'}</div>
    </div>
  )

  const initial = (customer.氏名 ?? '?')[0]

  return (
    <div style={{ padding: '2rem', maxWidth: '900px', margin: '0 auto' }}>

      {/* ヘッダー */}
      <div style={{ marginBottom: '1.5rem' }}>
        <Link href="/customers" style={{ fontSize: '13px', color: '#888', textDecoration: 'none' }}>← 顧客一覧に戻る</Link>
      </div>

      {/* プロフィールカード */}
      <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #eee', padding: '24px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '20px' }}>
        <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#e8f0fe', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: 700, color: '#1a73e8', flexShrink: 0 }}>
          {initial}
        </div>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: '22px', fontWeight: 700, margin: 0, color: '#111' }}>{customer.氏名}</h1>
          <p style={{ fontSize: '13px', color: '#aaa', margin: '4px 0 0' }}>{customer.氏名カナ}</p>
          <div style={{ display: 'flex', gap: '12px', marginTop: '8px', flexWrap: 'wrap' }}>
            {customer.電話番号 && (
              <span style={{ fontSize: '13px', color: '#555' }}>📞 {customer.電話番号}</span>
            )}
            {customer.メール && (
              <span style={{ fontSize: '13px', color: '#555' }}>✉ {customer.メール}</span>
            )}
            {customer.住所 && (
              <span style={{ fontSize: '13px', color: '#555' }}>📍 {customer.住所}</span>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Link href={`/customers/${id}/edit`} style={{ padding: '8px 16px', background: '#0070f3', color: 'white', borderRadius: '8px', textDecoration: 'none', fontSize: '13px', fontWeight: 500 }}>
            編集
          </Link>
        </div>
      </div>

      {/* タブ */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '16px', background: '#f1f3f4', borderRadius: '10px', padding: '4px', width: 'fit-content' }}>
        {[
          { key: 'info',         label: '👤 基本情報' },
          { key: 'negotiations', label: `🤝 商談履歴 ${negotiations.length}件` },
          { key: 'vehicles',     label: `🚗 購入車両 ${vehicles.length}台` },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key as any)} style={{
            padding: '7px 16px', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 500, cursor: 'pointer',
            background: tab === t.key ? 'white' : 'transparent',
            color: tab === t.key ? '#111' : '#888',
            boxShadow: tab === t.key ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
          }}>{t.label}</button>
        ))}
      </div>

      {/* 基本情報タブ */}
      {tab === 'info' && (
        <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #eee', padding: '1.5rem' }}>
          {row('電話番号', customer.電話番号)}
          {row('メール', customer.メール)}
          {row('住所', customer.住所)}
          {row('生年月日', customer.生年月日)}
          {row('免許証番号', customer.免許証番号)}
          {row('備考', customer.備考)}
          {row('登録日', customer.作成日時 ? new Date(customer.作成日時).toLocaleDateString('ja-JP') : null)}
        </div>
      )}

      {/* 商談履歴タブ */}
      {tab === 'negotiations' && (
        <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #eee', overflow: 'hidden' }}>
          {negotiations.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#aaa', fontSize: '14px' }}>商談履歴がありません</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8f9fa', borderBottom: '1px solid #eee' }}>
                  {['対象車両', 'ステータス', '経路', '登録日', ''].map(h => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', color: '#888', fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {negotiations.map((n, i) => (
                  <tr key={n.id} style={{ borderBottom: i < negotiations.length - 1 ? '1px solid #f0f0f0' : 'none' }}>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {n.vehicles?.image_urls?.[0] ? (
                          <img src={n.vehicles.image_urls[0]} alt="" style={{ width: '48px', height: '36px', objectFit: 'cover', borderRadius: '4px', border: '1px solid #eee' }} />
                        ) : (
                          <div style={{ width: '48px', height: '36px', background: '#f5f5f5', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>🚗</div>
                        )}
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 500 }}>{n.vehicles?.master_makers?.name} {n.vehicles?.master_models?.name}</div>
                          <div style={{ fontSize: '11px', color: '#aaa' }}>{n.vehicles?.db_number}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '20px', fontWeight: 500, background: STATUS_COLOR[n.status]?.bg ?? '#f1f3f4', color: STATUS_COLOR[n.status]?.color ?? '#555' }}>
                        {n.status}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '13px', color: '#555' }}>{n.inquiry_route || '—'}</td>
                    <td style={{ padding: '14px 16px', fontSize: '12px', color: '#aaa' }}>
                      {n.created_at ? new Date(n.created_at).toLocaleDateString('ja-JP') : '—'}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <Link href={`/negotiations/${n.id}`} style={{ fontSize: '12px', color: '#0070f3', textDecoration: 'none' }}>詳細 →</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* 購入車両タブ */}
      {tab === 'vehicles' && (
        <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #eee', overflow: 'hidden' }}>
          {vehicles.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#aaa', fontSize: '14px' }}>購入車両がありません</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8f9fa', borderBottom: '1px solid #eee' }}>
                  {['車両', '管理番号', '年式', 'ステータス', '仕入金額', ''].map(h => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', color: '#888', fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {vehicles.map((v, i) => (
                  <tr key={v.id} style={{ borderBottom: i < vehicles.length - 1 ? '1px solid #f0f0f0' : 'none' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {v.image_urls?.[0] ? (
                          <img src={v.image_urls[0]} alt="" style={{ width: '60px', height: '45px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #eee' }} />
                        ) : (
                          <div style={{ width: '60px', height: '45px', background: '#f5f5f5', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>🚗</div>
                        )}
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 500 }}>{v.master_makers?.name} {v.master_models?.name}</div>
                          <div style={{ fontSize: '11px', color: '#aaa' }}>{v.chassis_number}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '13px', color: '#888' }}>{v.db_number || '—'}</td>
                    <td style={{ padding: '12px 16px', fontSize: '13px' }}>{v.year ? v.year + '年' : '—'}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '20px', fontWeight: 500, background: '#f1f3f4', color: '#555' }}>
                        {v.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '13px' }}>{v.purchase_price ? '¥' + v.purchase_price.toLocaleString() : '—'}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <Link href={`/vehicles/${v.id}`} style={{ fontSize: '12px', color: '#0070f3', textDecoration: 'none' }}>詳細 →</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}