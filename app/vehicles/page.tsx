import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default async function VehiclesPage() {
  const { data: vehicles } = await supabase
    .from('vehicles')
    .select(`*, master_models(name), master_makers(name), master_colors(name)`)
    .order('created_at', { ascending: false })

  const statusColor: any = {
    '在庫中': { bg: '#e6f4ea', color: '#1e7e34' },
    '商談中': { bg: '#fff3e0', color: '#e65100' },
    '売約済': { bg: '#e8f0fe', color: '#1a73e8' },
    '納車済': { bg: '#f1f3f4', color: '#5f6368' },
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1100px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, margin: 0 }}>在庫一覧</h1>
          <p style={{ fontSize: '13px', color: '#888', margin: '4px 0 0' }}>{vehicles?.length ?? 0}台</p>
        </div>
        <Link href="/vehicles/new" style={{ padding: '10px 20px', background: '#0070f3', color: 'white', borderRadius: '8px', textDecoration: 'none', fontSize: '14px', fontWeight: 500 }}>＋ 車両登録</Link>
      </div>
      <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #eee', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8f9fa', borderBottom: '1px solid #eee' }}>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', color: '#888', fontWeight: 600, width: '80px' }}>画像</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', color: '#888', fontWeight: 600 }}>管理番号</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', color: '#888', fontWeight: 600 }}>メーカー・車種</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', color: '#888', fontWeight: 600 }}>年式</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', color: '#888', fontWeight: 600 }}>走行距離</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', color: '#888', fontWeight: 600 }}>色</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', color: '#888', fontWeight: 600 }}>仕入金額</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', color: '#888', fontWeight: 600 }}>ステータス</th>
            </tr>
          </thead>
          <tbody>
            {vehicles && vehicles.length > 0 ? vehicles.map((v: any, i) => (
              <tr key={v.id} style={{ borderBottom: i < vehicles.length - 1 ? '1px solid #f0f0f0' : 'none' }}>
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
                  <span style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '20px', fontWeight: 500, background: statusColor[v.status]?.bg ?? '#f1f3f4', color: statusColor[v.status]?.color ?? '#5f6368' }}>{v.status}</span>
                </td>
              </tr>
            )) : (
              <tr><td colSpan={8} style={{ padding: '3rem', textAlign: 'center', color: '#aaa', fontSize: '14px' }}>車両データがありません</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}