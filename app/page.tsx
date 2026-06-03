'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function DashboardPage() {
  const [vehicles, setVehicles] = useState<any[]>([])
  const [negotiations, setNegotiations] = useState<any[]>([])
  const [deliveries, setDeliveries] = useState<any[]>([])

  useEffect(() => {
    Promise.all([
      supabase.from('vehicles').select('*, master_makers(name), master_models(name)').order('created_at', { ascending: false }),
      supabase.from('negotiations').select('*, customers(氏名), vehicles(master_makers(name), master_models(name))').order('created_at', { ascending: false }).limit(5),
      supabase.from('deliveries').select('*, contracts(*, negotiations(*, customers(氏名), vehicles(master_makers(name), master_models(name))))').order('created_at', { ascending: false }).limit(5),
    ]).then(([v, n, d]) => {
      setVehicles(v.data ?? [])
      setNegotiations(n.data ?? [])
      setDeliveries(d.data ?? [])
    })
  }, [])

  const total = vehicles.length
  const inStock = vehicles.filter(v => v.status === '在庫中').length
  const inDeal = vehicles.filter(v => v.status === '商談中').length
  const sold = vehicles.filter(v => v.status === '売約済' || v.status === '納車済').length
  const totalSales = vehicles
    .filter(v => v.status === '売約済' || v.status === '納車済')
    .reduce((sum, v) => sum + (v.body_price ?? 0), 0)

  const menus = [
    { label: '問合', href: '/inquiries', icon: '📨', color: '#e8f0fe' },
    { label: '商談', href: '/negotiations', icon: '📝', color: '#fff3e0' },
    { label: '在庫管理', href: '/vehicles', icon: '🚗', color: '#e6f4ea' },
    { label: '納車管理', href: '/deliveries', icon: '🚚', color: '#fce8e6' },
    { label: 'DATA BOX', href: '/databox', icon: '📁', color: '#f3e8fd' },
    { label: '顧客リスト', href: '/customers', icon: '👥', color: '#e8f4fd' },
    { label: '業者リスト', href: '/dealers', icon: '🏢', color: '#f5f5f5' },
    { label: '管理画面', href: '/admin', icon: '⚙️', color: '#f5f5f5' },
  ]

  const stepLabel = (step: number) => {
    const steps = ['契約締結', 'ローン申込', 'OK番号取得', '書類収集', '登録申請', '入金確認', '整備仕上', '納車完了']
    return steps[Math.min(step - 1, 7)] ?? '—'
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1100px', margin: '0 auto' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 700, margin: 0 }}>ダッシュボード</h1>
        <p style={{ fontSize: '13px', color: '#888', margin: '4px 0 0' }}>
          {new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '1.5rem' }}>
        {[
          { label: '在庫台数', value: `${inStock}台`, sub: `総登録 ${total}台`, color: '#e6f4ea', textColor: '#1e7e34' },
          { label: '商談中', value: `${inDeal}件`, sub: '進行中の商談', color: '#fff3e0', textColor: '#e65100' },
          { label: '今月の販売', value: `${sold}台`, sub: '売約済・納車済', color: '#e8f0fe', textColor: '#1a73e8' },
          { label: '売上合計', value: `¥${totalSales.toLocaleString()}`, sub: '車体価格ベース', color: '#f3e8fd', textColor: '#6a1b9a' },
        ].map((m, i) => (
          <div key={i} style={{ background: m.color, border: '1px solid #eee', borderRadius: '12px', padding: '16px' }}>
            <div style={{ fontSize: '12px', color: '#888', marginBottom: '8px' }}>{m.label}</div>
            <div style={{ fontSize: '22px', fontWeight: 700, color: m.textColor }}>{m.value}</div>
            <div style={{ fontSize: '11px', color: '#aaa', marginTop: '4px' }}>{m.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ background: 'white', border: '1px solid #eee', borderRadius: '12px', padding: '1.5rem', marginBottom: '1.5rem' }}>
        <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '1rem' }}>メニュー</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: '10px' }}>
          {menus.map((m, i) => (
            <Link key={i} href={m.href} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
              padding: '12px 8px', background: m.color, borderRadius: '10px',
              textDecoration: 'none', color: '#333', border: '1px solid #eee'
            }}>
              <span style={{ fontSize: '24px' }}>{m.icon}</span>
              <span style={{ fontSize: '11px', fontWeight: 500, textAlign: 'center' }}>{m.label}</span>
            </Link>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div style={{ background: 'white', border: '1px solid #eee', borderRadius: '12px', padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div style={{ fontSize: '14px', fontWeight: 600 }}>最近の商談</div>
            <Link href="/negotiations" style={{ fontSize: '12px', color: '#0070f3', textDecoration: 'none' }}>すべて見る →</Link>
          </div>
          {negotiations.length === 0 && <p style={{ fontSize: '13px', color: '#aaa', textAlign: 'center' }}>商談データがありません</p>}
          {negotiations.map((n, i) => (
            <Link key={i} href={`/negotiations/${n.id}`} style={{
              display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0',
              borderBottom: i < negotiations.length - 1 ? '1px solid #f0f0f0' : 'none', textDecoration: 'none'
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', fontWeight: 500, color: '#111' }}>{n.customers?.氏名 ?? '未設定'}</div>
                <div style={{ fontSize: '11px', color: '#888' }}>{n.vehicles?.master_makers?.name} {n.vehicles?.master_models?.name}</div>
              </div>
              <span style={{
                fontSize: '10px', padding: '2px 8px', borderRadius: '20px', flexShrink: 0,
                background: n.status === '商談中' ? '#fff3e0' : n.status === '成約' ? '#e6f4ea' : '#f1f3f4',
                color: n.status === '商談中' ? '#e65100' : n.status === '成約' ? '#1e7e34' : '#5f6368',
              }}>{n.status}</span>
            </Link>
          ))}
        </div>

        <div style={{ background: 'white', border: '1px solid #eee', borderRadius: '12px', padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div style={{ fontSize: '14px', fontWeight: 600 }}>納車管理</div>
            <Link href="/deliveries" style={{ fontSize: '12px', color: '#0070f3', textDecoration: 'none' }}>すべて見る →</Link>
          </div>
          {deliveries.length === 0 && <p style={{ fontSize: '13px', color: '#aaa', textAlign: 'center' }}>納車データがありません</p>}
          {deliveries.map((d, i) => {
            const neg = d.contracts?.negotiations
            const customer = neg?.customers
            const vehicle = neg?.vehicles
            return (
              <Link key={i} href={`/deliveries/${d.id}`} style={{
                display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0',
                borderBottom: i < deliveries.length - 1 ? '1px solid #f0f0f0' : 'none', textDecoration: 'none'
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px', fontWeight: 500, color: '#111' }}>{customer?.氏名 ?? '—'}</div>
                  <div style={{ fontSize: '11px', color: '#888' }}>{vehicle?.master_makers?.name} {vehicle?.master_models?.name}</div>
                </div>
                <span style={{
                  fontSize: '10px', padding: '2px 8px', borderRadius: '20px', flexShrink: 0,
                  background: d.current_step >= 8 ? '#e6f4ea' : '#fff3e0',
                  color: d.current_step >= 8 ? '#1e7e34' : '#e65100',
                }}>Step {d.current_step}　{stepLabel(d.current_step)}</span>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}