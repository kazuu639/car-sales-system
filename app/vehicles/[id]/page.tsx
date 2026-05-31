import { supabase } from '@/lib/supabase'
import Link from 'next/link'

type Props = {
  params: Promise<{ id: string }>
}

export default async function VehicleDetailPage({ params }: Props) {
  const { id } = await params
  const { data: v } = await supabase
    .from('vehicles')
    .select('*')
    .eq('id', id)
    .single()

  if (!v) return <div style={{ padding: '2rem' }}>車両が見つかりません</div>

  const row = (label: string, value: any) => (
    <div style={{ display: 'flex', borderBottom: '1px solid #eee', padding: '10px 0' }}>
      <div style={{ width: '140px', color: '#888', fontSize: '13px', flexShrink: 0 }}>{label}</div>
      <div style={{ fontSize: '14px', fontWeight: 500 }}>{value ?? '—'}</div>
    </div>
  )

  return (
    <div style={{ padding: '2rem', maxWidth: '700px', margin: '0 auto' }}>
      <a href="/vehicles" style={{ fontSize: '13px', color: '#0070f3', textDecoration: 'none' }}>← 在庫一覧に戻る</a>
      <h1 style={{ fontSize: '22px', margin: '1rem 0 0.5rem' }}>{v.car_name}</h1>
      <span style={{
        display: 'inline-block', fontSize: '12px', padding: '3px 10px', borderRadius: '20px', marginBottom: '1.5rem',
        background: v.status === '在庫中' ? '#e6f4ea' : '#fff3e0',
        color: v.status === '在庫中' ? '#1e7e34' : '#e65100',
      }}>{v.status}</span>

      {v.image_urls && v.image_urls.length > 0 && (
        <div style={{ marginBottom: '1.5rem' }}>
          <img src={v.image_urls[0]} alt="メイン画像"
            style={{ width: '100%', height: '300px', objectFit: 'cover', borderRadius: '12px', marginBottom: '8px' }} />
          {v.image_urls.length > 1 && (
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {v.image_urls.slice(1).map((url: string, i: number) => (
                <img key={i} src={url} alt={`img-${i + 2}`}
                  style={{ width: '80px', height: '60px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #eee', cursor: 'pointer' }} />
              ))}
            </div>
          )}
        </div>
      )}

      <div style={{ background: 'white', border: '1px solid #eee', borderRadius: '12px', padding: '1rem 1.5rem', marginBottom: '1rem' }}>
        <div style={{ fontSize: '13px', fontWeight: 600, color: '#555', marginBottom: '8px' }}>仕入・在庫情報</div>
        {row('管理番号', v.db_number)}
        {row('仕入区分', v.purchase_type)}
        {row('入庫日', v.stock_date)}
        {row('掲載状況', v.listing_status ? '掲載中' : '非掲載')}
      </div>

      <div style={{ background: 'white', border: '1px solid #eee', borderRadius: '12px', padding: '1rem 1.5rem', marginBottom: '1rem' }}>
        <div style={{ fontSize: '13px', fontWeight: 600, color: '#555', marginBottom: '8px' }}>車両情報</div>
        {row('車種', v.car_name)}
        {row('年式', v.year ? v.year + '年' : null)}
        {row('走行距離', v.mileage ? v.mileage.toLocaleString() + ' km' : null)}
        {row('シフト', v.shift)}
        {row('色', v.color)}
        {row('修復歴', v.repair_history ? 'あり' : 'なし')}
        {row('車検満了日', v.inspection_date)}
        {row('車台番号', v.chassis_number)}
      </div>

      <div style={{ background: 'white', border: '1px solid #eee', borderRadius: '12px', padding: '1rem 1.5rem', marginBottom: '1rem' }}>
        <div style={{ fontSize: '13px', fontWeight: 600, color: '#555', marginBottom: '8px' }}>財務情報</div>
        {row('仕入金額', v.purchase_price ? '¥' + v.purchase_price.toLocaleString() : null)}
        {row('車体価格', v.body_price ? '¥' + v.body_price.toLocaleString() : null)}
        {row('支払総額', v.total_price ? '¥' + v.total_price.toLocaleString() : null)}
        {row('契約日', v.contract_date)}
        {row('納車日', v.delivery_date)}
      </div>

      <Link href={`/vehicles/${v.id}/edit`} style={{
        display: 'block', textAlign: 'center', padding: '12px', background: '#0070f3',
        color: 'white', borderRadius: '8px', textDecoration: 'none', fontSize: '15px'
      }}>編集する</Link>
    </div>
  )
}