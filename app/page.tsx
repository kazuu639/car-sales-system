import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default async function DashboardPage() {
  const { data: vehicles } = await supabase.from('vehicles').select('*')

  const total = vehicles?.length ?? 0
  const inStock = vehicles?.filter(v => v.status === '在庫中').length ?? 0
  const inDeal = vehicles?.filter(v => v.status === '商談中').length ?? 0
  const sold = vehicles?.filter(v => v.status === '売約済' || v.status === '納車済').length ?? 0
  const totalSales = vehicles
    ?.filter(v => v.status === '売約済' || v.status === '納車済')
    ?.reduce((sum, v) => sum + (v.body_price ?? 0), 0) ?? 0

  const menus = [
    { label: '在庫一覧', href: '/vehicles', icon: '🚗' },
    { label: '車両登録', href: '/vehicles/new', icon: '➕' },
    { label: '商談管理', href: '/deals', icon: '📝' },
    { label: '顧客リスト', href: '/customers', icon: '👥' },
    { label: '納車管理', href: '/delivery', icon: '🚚' },
    { label: '税務カレンダー', href: '/finance', icon: '📅' },
    { label: '売上レポート', href: '/reports', icon: '📊' },
    { label: '設定', href: '/settings', icon: '⚙️' },
  ]

  return (
    <div style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 700, margin: 0 }}>ダッシュボード</h1>
        <p style={{ fontSize: '13px', color: '#888', margin: '4px 0 0' }}>
          {new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
        {[
          { label: '在庫台数', value: `${inStock}台`, sub: `総登録 ${total}台` },
          { label: '商談中', value: `${inDeal}件`, sub: '進行中の商談' },
          { label: '今月の販売', value: `${sold}台`, sub: '売約済・納車済' },
          { label: '売上合計', value: `¥${totalSales.toLocaleString()}`, sub: '車体価格ベース' },
        ].map((m, i) => (
          <div key={i} style={{ background: 'white', border: '1px solid #eee', borderRadius: '12px', padding: '16px' }}>
            <div style={{ fontSize: '12px', color: '#888', marginBottom: '8px' }}>{m.label}</div>
            <div style={{ fontSize: '22px', fontWeight: 700, color: '#111' }}>{m.value}</div>
            <div style={{ fontSize: '11px', color: '#aaa', marginTop: '4px' }}>{m.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div style={{ background: 'white', border: '1px solid #eee', borderRadius: '12px', padding: '16px' }}>
          <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '16px' }}>メニュー</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
            {menus.map((m, i) => (
              <Link key={i} href={m.href} style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
                padding: '12px 8px', background: '#f8f9fa', borderRadius: '10px',
                textDecoration: 'none', color: '#333'
              }}>
                <span style={{ fontSize: '22px' }}>{m.icon}</span>
                <span style={{ fontSize: '11px', fontWeight: 500, textAlign: 'center' }}>{m.label}</span>
              </Link>
            ))}
          </div>
        </div>

        <div style={{ background: 'white', border: '1px solid #eee', borderRadius: '12px', padding: '16px' }}>
          <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px' }}>在庫状況</div>
          {vehicles && vehicles.slice(0, 5).map((v, i) => (
            <Link key={i} href={`/vehicles/${v.id}`} style={{
              display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0',
              borderBottom: i < 4 ? '1px solid #f0f0f0' : 'none', textDecoration: 'none'
            }}>
              {v.image_urls?.[0] ? (
                <img src={v.image_urls[0]} alt={v.car_name}
                  style={{ width: '50px', height: '38px', objectFit: 'cover', borderRadius: '6px', flexShrink: 0 }} />
              ) : (
                <div style={{ width: '50px', height: '38px', background: '#f5f5f5', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>🚗</div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '13px', fontWeight: 500, color: '#111', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.car_name ?? '—'}</div>
                <div style={{ fontSize: '11px', color: '#888' }}>{v.year ? v.year + '年' : '—'} / {v.mileage ? v.mileage.toLocaleString() + 'km' : '—'}</div>
              </div>
              <span style={{
                fontSize: '10px', padding: '2px 8px', borderRadius: '20px', flexShrink: 0,
                background: v.status === '在庫中' ? '#e6f4ea' : v.status === '商談中' ? '#fff3e0' : '#e8f0fe',
                color: v.status === '在庫中' ? '#1e7e34' : v.status === '商談中' ? '#e65100' : '#1a73e8',
              }}>{v.status}</span>
            </Link>
          ))}
          <Link href="/vehicles" style={{ display: 'block', textAlign: 'center', fontSize: '13px', color: '#0070f3', textDecoration: 'none', marginTop: '12px' }}>
            すべて見る →
          </Link>
        </div>
      </div>
    </div>
  )
}