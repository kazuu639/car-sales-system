'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function DashboardPage() {
  const [vehicles, setVehicles] = useState<any[]>([])
  const [negotiations, setNegotiations] = useState<any[]>([])
  const [deliveries, setDeliveries] = useState<any[]>([])
  const [inquiries, setInquiries] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      supabase.from('vehicles').select('*, master_makers(name), master_models(name)').order('created_at', { ascending: false }),
      supabase.from('negotiations').select('*, customers(氏名), vehicles(master_makers(name), master_models(name))').order('created_at', { ascending: false }).limit(5),
      supabase.from('deliveries').select('*, contracts(*, negotiations(*, customers(氏名), vehicles(master_makers(name), master_models(name))))').order('created_at', { ascending: false }).limit(5),
      supabase.from('inquiries').select('*').eq('status', 'new').order('created_at', { ascending: false }).limit(5),
    ]).then(([v, n, d, i]) => {
      setVehicles(v.data ?? [])
      setNegotiations(n.data ?? [])
      setDeliveries(d.data ?? [])
      setInquiries(i.data ?? [])
      setLoading(false)
    })
  }, [])

  const inStock = vehicles.filter(v => v.status === '在庫中').length
  const inDeal  = vehicles.filter(v => v.status === '商談中').length
  const sold    = vehicles.filter(v => v.status === '売約済' || v.status === '納車済').length
  const totalSales = vehicles
    .filter(v => v.status === '売約済' || v.status === '納車済')
    .reduce((sum, v) => sum + (v.body_price ?? 0), 0)
  const newInquiries = inquiries.length

  const today = new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })

  const stepLabel = (step: number) => {
    const steps = ['契約締結', 'ローン申込', 'OK番号取得', '書類収集', '登録申請', '入金確認', '整備仕上', '納車完了']
    return steps[Math.min(step - 1, 7)] ?? '—'
  }

  const statusBadge = (status: string) => {
    const map: Record<string, { bg: string; color: string }> = {
      '商談中': { bg: '#fff3e0', color: '#e65100' },
      '見積済': { bg: '#e8f0fe', color: '#1a73e8' },
      '成約':   { bg: '#e6f4ea', color: '#1e7e34' },
      '失注':   { bg: '#f1f3f4', color: '#5f6368' },
    }
    const s = map[status] ?? { bg: '#f1f3f4', color: '#5f6368' }
    return (
      <span style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '20px', fontWeight: 500, background: s.bg, color: s.color, whiteSpace: 'nowrap' }}>
        {status}
      </span>
    )
  }

  const kpis = [
    {
      label: '在庫台数',
      value: `${inStock}`,
      unit: '台',
      sub: `総登録 ${vehicles.length}台`,
      icon: 'ti-car',
      color: '#1a73e8',
      bg: '#e8f0fe',
    },
    {
      label: '商談中',
      value: `${inDeal}`,
      unit: '件',
      sub: '進行中の商談',
      icon: 'ti-file-text',
      color: '#e65100',
      bg: '#fff3e0',
    },
    {
      label: '新規問合',
      value: `${newInquiries}`,
      unit: '件',
      sub: '未対応の問合',
      icon: 'ti-message-circle',
      color: '#c5221f',
      bg: '#fce8e6',
    },
    {
      label: '売上合計',
      value: totalSales >= 10000 ? `${(totalSales / 10000).toFixed(0)}万` : totalSales.toLocaleString(),
      unit: totalSales >= 10000 ? '円' : '円',
      sub: '車体価格ベース',
      icon: 'ti-chart-bar',
      color: '#1e7e34',
      bg: '#e6f4ea',
    },
  ]

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>

      {/* ヘッダー */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 700, margin: 0, color: '#111' }}>ダッシュボード</h1>
        <p style={{ fontSize: '13px', color: '#888', margin: '4px 0 0' }}>{today}</p>
      </div>

      {/* KPIカード */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '2rem' }}>
        {kpis.map((k, i) => (
          <div key={i} style={{ background: 'white', border: '1px solid #eee', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '13px', color: '#888', fontWeight: 500 }}>{k.label}</span>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: k.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className={`ti ${k.icon}`} style={{ fontSize: '16px', color: k.color }} aria-hidden="true" />
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
              <span style={{ fontSize: '28px', fontWeight: 700, color: '#111', lineHeight: 1 }}>{loading ? '—' : k.value}</span>
              <span style={{ fontSize: '13px', color: '#888' }}>{k.unit}</span>
            </div>
            <div style={{ fontSize: '12px', color: '#aaa' }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* メインコンテンツ */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>

        {/* 最近の商談 */}
        <div style={{ background: 'white', border: '1px solid #eee', borderRadius: '12px', padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <i className="ti ti-file-text" style={{ fontSize: '16px', color: '#888' }} aria-hidden="true" />
              <span style={{ fontSize: '14px', fontWeight: 600, color: '#111' }}>最近の商談</span>
            </div>
            <Link href="/negotiations" style={{ fontSize: '12px', color: '#0070f3', textDecoration: 'none' }}>すべて見る →</Link>
          </div>
          {loading ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#aaa', fontSize: '13px' }}>読み込み中...</div>
          ) : negotiations.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#aaa', fontSize: '13px' }}>商談データがありません</div>
          ) : negotiations.map((n, i) => (
            <Link key={n.id} href={`/negotiations/${n.id}`} style={{
              display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0',
              borderBottom: i < negotiations.length - 1 ? '1px solid #f5f5f5' : 'none', textDecoration: 'none',
            }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 600, color: '#555', flexShrink: 0 }}>
                {(n.customers?.氏名 ?? '?')[0]}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '13px', fontWeight: 500, color: '#111', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.customers?.氏名 ?? '未設定'}</div>
                <div style={{ fontSize: '11px', color: '#aaa', marginTop: '2px' }}>{n.vehicles?.master_makers?.name} {n.vehicles?.master_models?.name}</div>
              </div>
              {statusBadge(n.status)}
            </Link>
          ))}
        </div>

        {/* 納車進捗 */}
        <div style={{ background: 'white', border: '1px solid #eee', borderRadius: '12px', padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <i className="ti ti-truck" style={{ fontSize: '16px', color: '#888' }} aria-hidden="true" />
              <span style={{ fontSize: '14px', fontWeight: 600, color: '#111' }}>納車進捗</span>
            </div>
            <Link href="/deliveries" style={{ fontSize: '12px', color: '#0070f3', textDecoration: 'none' }}>すべて見る →</Link>
          </div>
          {loading ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#aaa', fontSize: '13px' }}>読み込み中...</div>
          ) : deliveries.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#aaa', fontSize: '13px' }}>納車データがありません</div>
          ) : deliveries.map((d, i) => {
            const neg = d.contracts?.negotiations
            const customer = neg?.customers
            const vehicle = neg?.vehicles
            const done = d.current_step >= 8
            return (
              <Link key={d.id} href={`/deliveries/${d.id}`} style={{
                display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0',
                borderBottom: i < deliveries.length - 1 ? '1px solid #f5f5f5' : 'none', textDecoration: 'none',
              }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: done ? '#e6f4ea' : '#fff3e0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <i className={`ti ${done ? 'ti-check' : 'ti-clock'}`} style={{ fontSize: '14px', color: done ? '#1e7e34' : '#e65100' }} aria-hidden="true" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: 500, color: '#111', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{customer?.氏名 ?? '—'}</div>
                  <div style={{ fontSize: '11px', color: '#aaa', marginTop: '2px' }}>{vehicle?.master_makers?.name} {vehicle?.master_models?.name}</div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: '10px', color: '#aaa' }}>Step {d.current_step}</div>
                  <div style={{ fontSize: '11px', color: done ? '#1e7e34' : '#e65100', fontWeight: 500 }}>{stepLabel(d.current_step)}</div>
                </div>
              </Link>
            )
          })}
        </div>
      </div>

      {/* 新規問合 */}
      {inquiries.length > 0 && (
        <div style={{ background: 'white', border: '1px solid #eee', borderRadius: '12px', padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <i className="ti ti-message-circle" style={{ fontSize: '16px', color: '#c5221f' }} aria-hidden="true" />
              <span style={{ fontSize: '14px', fontWeight: 600, color: '#111' }}>未対応の問合</span>
              <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', background: '#fce8e6', color: '#c5221f', fontWeight: 600 }}>{inquiries.length}件</span>
            </div>
            <Link href="/inquiries" style={{ fontSize: '12px', color: '#0070f3', textDecoration: 'none' }}>すべて見る →</Link>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '10px' }}>
            {inquiries.map(inq => (
              <Link key={inq.id} href="/inquiries" style={{
                display: 'block', padding: '12px', border: '1px solid #fce8e6', borderRadius: '8px',
                textDecoration: 'none', background: '#fffafa',
              }}>
                <div style={{ fontSize: '13px', fontWeight: 500, color: '#111', marginBottom: '4px' }}>{inq.customer_name}</div>
                <div style={{ fontSize: '11px', color: '#aaa' }}>{inq.car_interest && `🚗 ${inq.car_interest}`}</div>
                <div style={{ fontSize: '11px', color: '#aaa', marginTop: '2px' }}>{inq.inquiry_date}</div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}