'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function NegotiationDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const [negotiation, setNegotiation] = useState<any>(null)
  const [negVehicles, setNegVehicles] = useState<any[]>([])
  const [allVehicles, setAllVehicles] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [addingVehicle, setAddingVehicle] = useState(false)
  const [selectedVehicleId, setSelectedVehicleId] = useState('')

  const fetchData = async () => {
    const [neg, nv, av] = await Promise.all([
      supabase.from('negotiations')
        .select(`*, customers(氏名, 電話番号, メール)`)
        .eq('id', id).single(),
      supabase.from('negotiation_vehicles')
        .select(`*, vehicles(id, db_number, year, mileage, master_makers(name), master_models(name), body_price)`)
        .eq('negotiation_id', id),
      supabase.from('vehicles')
        .select(`*, master_makers(name), master_models(name)`)
        .eq('status', '在庫中'),
    ])
    setNegotiation(neg.data)
    setNegVehicles(nv.data ?? [])
    setAllVehicles(av.data ?? [])
  }

  useEffect(() => { fetchData() }, [id])

  const handleAddVehicle = async () => {
    if (!selectedVehicleId) { alert('車両を選択してください'); return }
    setLoading(true)
    await supabase.from('negotiation_vehicles').insert([{
      negotiation_id: id,
      vehicle_id: selectedVehicleId,
    }])
    setSelectedVehicleId('')
    setAddingVehicle(false)
    await fetchData()
    setLoading(false)
  }

  const handleVehicleStatus = async (nvId: string, status: string) => {
    await supabase.from('negotiation_vehicles').update({ status }).eq('id', nvId)
    if (status === '成約') {
      await supabase.from('negotiations').update({ status: '成約' }).eq('id', id)
    }
    await fetchData()
  }

  const handleStatusChange = async (status: string) => {
    setLoading(true)
    await supabase.from('negotiations').update({ status }).eq('id', id)
    setNegotiation({ ...negotiation, status })
    setLoading(false)
  }

  if (!negotiation) return <div style={{ padding: '2rem' }}>読み込み中...</div>

  const statusColor: any = {
    '商談中': { bg: '#fff3e0', color: '#e65100' },
    '見積済': { bg: '#e8f0fe', color: '#1a73e8' },
    '成約':   { bg: '#e6f4ea', color: '#1e7e34' },
    '失注':   { bg: '#f1f3f4', color: '#5f6368' },
  }

  const nvStatusColor: any = {
    '検討中': { bg: '#fff3e0', color: '#e65100' },
    '見積済': { bg: '#e8f0fe', color: '#1a73e8' },
    '成約':   { bg: '#e6f4ea', color: '#1e7e34' },
    '却下':   { bg: '#f1f3f4', color: '#5f6368' },
  }

  const row = (label: string, value: any) => (
    <div style={{ display: 'flex', borderBottom: '1px solid #f0f0f0', padding: '10px 0' }}>
      <div style={{ width: '130px', fontSize: '13px', color: '#888', flexShrink: 0 }}>{label}</div>
      <div style={{ fontSize: '14px' }}>{value ?? '—'}</div>
    </div>
  )

  const fieldStyle = { width: '100%', padding: '9px 12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' as const }

  return (
    <div style={{ padding: '2rem', maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <Link href="/negotiations" style={{ fontSize: '13px', color: '#888', textDecoration: 'none' }}>← 商談一覧に戻る</Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '8px' }}>
          <h1 style={{ fontSize: '22px', fontWeight: 700, margin: 0 }}>
            {negotiation.customers?.氏名 ?? '顧客未設定'} の商談
          </h1>
          <span style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '20px', fontWeight: 500, background: statusColor[negotiation.status]?.bg, color: statusColor[negotiation.status]?.color }}>
            {negotiation.status}
          </span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
        <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #eee', padding: '1.5rem' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 600, margin: '0 0 1rem' }}>👤 顧客情報</h2>
          {row('氏名', negotiation.customers?.氏名)}
          {row('電話番号', negotiation.customers?.電話番号)}
          {row('メール', negotiation.customers?.メール)}
          {negotiation.customer_id && (
            <Link href={`/customers/${negotiation.customer_id}`} style={{ fontSize: '12px', color: '#0070f3', textDecoration: 'none', display: 'block', marginTop: '8px' }}>顧客詳細を見る →</Link>
          )}
        </div>
        <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #eee', padding: '1.5rem' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 600, margin: '0 0 1rem' }}>📋 商談情報</h2>
          {row('問い合わせ経路', negotiation.inquiry_route)}
          {row('問い合わせ日', negotiation.inquiry_date ? new Date(negotiation.inquiry_date).toLocaleDateString('ja-JP') : null)}
          {row('備考', negotiation.notes)}
        </div>
      </div>

      {/* 検討車両リスト */}
      <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #eee', padding: '1.5rem', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 600, margin: 0 }}>🚗 検討車両</h2>
          <button onClick={() => setAddingVehicle(!addingVehicle)}
            style={{ padding: '6px 16px', background: '#0070f3', color: 'white', border: 'none', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}>
            + 車両を追加
          </button>
        </div>

        {addingVehicle && (
          <div style={{ background: '#f8f9fa', borderRadius: '8px', padding: '1rem', marginBottom: '1rem', display: 'flex', gap: '8px' }}>
            <select value={selectedVehicleId} onChange={e => setSelectedVehicleId(e.target.value)} style={{ ...fieldStyle, flex: 1 }}>
              <option value="">在庫車両を選択してください</option>
              {allVehicles.filter(v => !negVehicles.find(nv => nv.vehicle_id === v.id)).map(v => (
                <option key={v.id} value={v.id}>
                  {v.db_number}　{v.master_makers?.name} {v.master_models?.name}　{v.year ? v.year + '年' : ''}
                </option>
              ))}
            </select>
            <button onClick={handleAddVehicle} disabled={loading}
              style={{ padding: '9px 20px', background: '#0070f3', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
              追加
            </button>
            <button onClick={() => setAddingVehicle(false)}
              style={{ padding: '9px 16px', background: 'white', color: '#888', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px', cursor: 'pointer' }}>
              キャンセル
            </button>
          </div>
        )}

        {negVehicles.length === 0 ? (
          <p style={{ color: '#aaa', fontSize: '14px', textAlign: 'center', padding: '1rem 0' }}>車両が追加されていません</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {negVehicles.map(nv => (
              <div key={nv.id} style={{ border: '1px solid #eee', borderRadius: '10px', padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 500 }}>
                    {nv.vehicles?.master_makers?.name} {nv.vehicles?.master_models?.name}
                    <span style={{ fontSize: '12px', color: '#aaa', marginLeft: '8px' }}>{nv.vehicles?.db_number}</span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#888', marginTop: '2px' }}>
                    {nv.vehicles?.year ? nv.vehicles.year + '年' : ''}
                    {nv.vehicles?.mileage ? '　' + nv.vehicles.mileage.toLocaleString() + 'km' : ''}
                    {nv.vehicles?.body_price ? '　¥' + nv.vehicles.body_price.toLocaleString() : ''}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '20px', fontWeight: 500, background: nvStatusColor[nv.status]?.bg, color: nvStatusColor[nv.status]?.color }}>
                    {nv.status}
                  </span>
                  {nv.status === '検討中' && (
                    <Link href={`/negotiations/${id}/quote?nv=${nv.id}&vehicle=${nv.vehicle_id}`}
                      style={{ padding: '6px 14px', background: '#0070f3', color: 'white', borderRadius: '6px', textDecoration: 'none', fontSize: '12px' }}>
                      見積り
                    </Link>
                  )}
                  {nv.status === '見積済' && (
                    <button onClick={() => handleVehicleStatus(nv.id, '成約')}
                      style={{ padding: '6px 14px', background: '#00a86b', color: 'white', border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>
                      成約
                    </button>
                  )}
                  {nv.status !== '却下' && nv.status !== '成約' && (
                    <button onClick={() => handleVehicleStatus(nv.id, '却下')}
                      style={{ padding: '6px 14px', background: 'white', color: '#e53e3e', border: '1px solid #e53e3e', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>
                      却下
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {negotiation.status === '失注' && (
        <div style={{ background: '#fff3e0', borderRadius: '12px', border: '1px solid #ffe0b2', padding: '1.5rem' }}>
          <p style={{ margin: 0, fontSize: '14px', color: '#e65100' }}>❌ 失注済み　顧客ランクを更新してください</p>
          <div style={{ display: 'flex', gap: '8px', marginTop: '1rem', flexWrap: 'wrap' }}>
            {['A', 'B', 'C', 'D', 'E'].map(rank => (
              <button key={rank} onClick={async () => {
                await supabase.from('customers').update({ purchase_rank: rank }).eq('id', negotiation.customer_id)
                alert(`顧客ランクを${rank}に更新しました`)
              }} style={{ padding: '8px 20px', borderRadius: '20px', border: '1.5px solid #ddd', background: 'white', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>
                {rank}
              </button>
            ))}
          </div>
          <div style={{ fontSize: '12px', color: '#888', marginTop: '8px' }}>
            A:すぐ買う　B:1ヶ月以内　C:2〜3ヶ月　D:まだ先　E:買う気なし
          </div>
        </div>
      )}

      {negotiation.status === '成約' && (
        <div style={{ background: '#e6f4ea', borderRadius: '12px', border: '1px solid #a8d5b5', padding: '1.5rem' }}>
          <p style={{ margin: 0, fontSize: '14px', color: '#1e7e34' }}>✅ 成約済み</p>
          <Link href={`/deliveries`} style={{ display: 'inline-block', marginTop: '1rem', padding: '10px 20px', background: '#1e7e34', color: 'white', borderRadius: '8px', textDecoration: 'none', fontSize: '14px' }}>
            納車管理へ →
          </Link>
        </div>
      )}

      {negotiation.status === '商談中' && (
        <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem' }}>
          <button onClick={() => handleStatusChange('失注')} disabled={loading}
            style={{ padding: '10px 24px', background: 'white', color: '#e53e3e', border: '1px solid #e53e3e', borderRadius: '8px', fontSize: '14px', cursor: 'pointer' }}>
            ❌ 失注にする
          </button>
        </div>
      )}
    </div>
  )
}