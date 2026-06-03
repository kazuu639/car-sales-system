'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function VehicleDetailPage() {
  const { id } = useParams()
  const [v, setV] = useState<any>(null)
  const [mainImg, setMainImg] = useState(0)

  useEffect(() => {
    supabase.from('vehicles')
      .select('*, master_makers(name), master_models(name)')
      .eq('id', id as string).single()
      .then(({ data }) => setV(data))
  }, [id])

  if (!v) return <div style={{ padding: '2rem' }}>読み込み中...</div>

  const statusColor: any = {
    '在庫中': { bg: '#e6f4ea', color: '#1e7e34' },
    '商談中': { bg: '#fff3e0', color: '#e65100' },
    '売約済': { bg: '#e8f0fe', color: '#1a73e8' },
    '納車済': { bg: '#f1f3f4', color: '#5f6368' },
  }

  const cell = (label: string, value: any, bold = false) => (
    <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', borderBottom: '1px solid #f0f0f0', padding: '6px 8px', fontSize: '13px' }}>
      <span style={{ color: '#888' }}>{label}</span>
      <span style={{ fontWeight: bold ? 600 : 400 }}>{value ?? '—'}</span>
    </div>
  )

  const sectionTitle = (label: string) => (
    <div style={{ background: '#1a1a2e', color: 'white', padding: '4px 10px', fontSize: '12px', fontWeight: 600, marginBottom: '4px', borderRadius: '4px' }}>{label}</div>
  )

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto' }}>
      {/* ヘッダー */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div>
          <Link href="/vehicles" style={{ fontSize: '13px', color: '#888', textDecoration: 'none' }}>← 在庫一覧</Link>
          <h1 style={{ fontSize: '22px', fontWeight: 700, margin: '4px 0 0' }}>
            {v.master_makers?.name} {v.master_models?.name}
          </h1>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Link href={`/negotiations/new?vehicle=${v.id}`}
            style={{ padding: '8px 16px', background: '#00a86b', color: 'white', borderRadius: '8px', textDecoration: 'none', fontSize: '13px', fontWeight: 600 }}>
            📝 新規見積書
          </Link>
          <Link href={`/vehicles/${v.id}/edit`}
            style={{ padding: '8px 16px', background: '#0070f3', color: 'white', borderRadius: '8px', textDecoration: 'none', fontSize: '13px', fontWeight: 600 }}>
            🚗 車両情報編集
          </Link>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '1.5rem' }}>
        {/* 左カラム */}
        <div>
          {/* 画像 */}
          <div style={{ marginBottom: '1rem' }}>
            {v.image_urls?.length > 0 ? (
              <>
                <img src={v.image_urls[mainImg]} alt="メイン"
                  style={{ width: '100%', height: '220px', objectFit: 'cover', borderRadius: '10px', marginBottom: '8px', border: '1px solid #eee' }} />
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {v.image_urls.map((url: string, i: number) => (
                    <img key={i} src={url} alt={`img-${i}`} onClick={() => setMainImg(i)}
                      style={{ width: '60px', height: '46px', objectFit: 'cover', borderRadius: '6px', cursor: 'pointer', border: mainImg === i ? '2px solid #0070f3' : '1px solid #eee' }} />
                  ))}
                </div>
              </>
            ) : (
              <div style={{ width: '100%', height: '220px', background: '#f5f5f5', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '48px' }}>🚗</div>
            )}
          </div>

          {/* 管理番号・ステータス */}
          <div style={{ background: 'white', borderRadius: '10px', border: '1px solid #eee', padding: '1rem', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '13px', color: '#888' }}>管理番号</span>
              <span style={{ fontSize: '16px', fontWeight: 700 }}>{v.db_number ?? '—'}</span>
            </div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '20px', fontWeight: 600, background: statusColor[v.status]?.bg ?? '#f1f3f4', color: statusColor[v.status]?.color ?? '#555' }}>
                {v.status ?? '—'}
              </span>
              <span style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '20px', background: '#f1f3f4', color: '#555' }}>
                {v.purchase_type ?? '仕入区分未設定'}
              </span>
            </div>
          </div>

          {/* 価格 */}
          <div style={{ background: 'white', borderRadius: '10px', border: '1px solid #eee', padding: '1rem', marginBottom: '1rem' }}>
            {sectionTitle('💰 価格情報')}
            {cell('仕入金額', v.purchase_price ? '¥' + v.purchase_price.toLocaleString() : null)}
            {cell('車体価格', v.body_price ? '¥' + v.body_price.toLocaleString() : null, true)}
            {cell('支払総額', v.total_price ? '¥' + v.total_price.toLocaleString() : null)}
          </div>

          {/* 仕入情報 */}
          <div style={{ background: 'white', borderRadius: '10px', border: '1px solid #eee', padding: '1rem' }}>
            {sectionTitle('📦 仕入情報')}
            {cell('入庫日', v.stock_date)}
            {cell('仕入先', v.supplier_name)}
            {cell('掲載', v.listing_status ? '掲載中' : '非掲載')}
          </div>
        </div>

        {/* 右カラム */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          {/* 車両情報 */}
          <div style={{ background: 'white', borderRadius: '10px', border: '1px solid #eee', padding: '1rem' }}>
            {sectionTitle('🚗 車両情報')}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 1rem' }}>
              <div>
                {cell('車種', `${v.master_makers?.name ?? ''} ${v.master_models?.name ?? ''}`)}
                {cell('年式', v.year ? v.year + '年' : null)}
                {cell('初度登録', v.first_registration)}
                {cell('車台番号', v.chassis_number)}
                {cell('型式', v.model_type)}
                {cell('排気量', v.displacement ? v.displacement + 'cc' : null)}
              </div>
              <div>
                {cell('走行距離', v.mileage ? v.mileage.toLocaleString() + 'km' : null)}
                {cell('シフト', v.shift)}
                {cell('外装色', v.color)}
                {cell('修復歴', v.repair_history ? 'あり' : 'なし')}
                {cell('車検満了', v.inspection_date)}
                {cell('グレード', v.grade)}
              </div>
            </div>
          </div>

          {/* 各契約日 */}
          <div style={{ background: 'white', borderRadius: '10px', border: '1px solid #eee', padding: '1rem' }}>
            {sectionTitle('📅 各契約日・担当者')}
             <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0 1rem' }}>
               <div>
                 {cell('仕）契約日', v.purchase_contract_date)}
                 {cell('入庫日', v.stock_date)}
                 {cell('仕入担当', v.purchase_staff)}
               </div>
               <div>
                 {cell('販）契約日', v.contract_date)}
                 {cell('売上日', v.sale_date)}
                 {cell('販売担当', v.sales_staff)}
               </div>
               <div>
                 {cell('納車日', v.delivery_date)}
                 {cell('済車日', v.completion_date)}
               </div>
             </div>
          </div>

          {/* 財務情報 */}
          <div style={{ background: 'white', borderRadius: '10px', border: '1px solid #eee', padding: '1rem' }}>
            {sectionTitle('💴 財務情報')}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 1rem' }}>
              <div>
                {cell('仕入金額', v.purchase_price ? '¥' + v.purchase_price.toLocaleString() : null)}
                {cell('仕切金額', v.cut_price ? '¥' + v.cut_price.toLocaleString() : null)}
                {cell('在庫経費', v.stock_cost ? '¥' + v.stock_cost.toLocaleString() : null)}
              </div>
              <div>
                {cell('売上', v.body_price ? '¥' + v.body_price.toLocaleString() : null)}
                {cell('売上雑収入', v.misc_income ? '¥' + v.misc_income.toLocaleString() : null)}
                {cell('雑収入履歴', v.misc_income_history ? '¥' + v.misc_income_history.toLocaleString() : null)}
              </div>
            </div>
          </div>

          {/* 備考 */}
          {v.notes && (
            <div style={{ background: 'white', borderRadius: '10px', border: '1px solid #eee', padding: '1rem' }}>
              {sectionTitle('📝 備考')}
              <p style={{ fontSize: '13px', margin: 0, lineHeight: 1.6 }}>{v.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}