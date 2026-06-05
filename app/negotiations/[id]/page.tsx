'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { useProfile } from '@/hooks/useProfile'

const SOURCES = [
  { value: 'carsensor', label: 'カーセンサー', color: '#c0392b', bg: '#fde8e8' },
  { value: 'goo',       label: 'グーネット',   color: '#27ae60', bg: '#e8f8ef' },
  { value: 'hp',        label: 'HP',           color: '#2980b9', bg: '#e8f0fe' },
  { value: 'x',         label: 'X(Twitter)',   color: '#111',    bg: '#f0f0f0' },
  { value: 'instagram', label: 'Instagram',    color: '#8e44ad', bg: '#f3e8fd' },
  { value: 'youtube',   label: 'YouTube',      color: '#e74c3c', bg: '#fde8e8' },
  { value: 'line',      label: 'LINE',         color: '#27ae60', bg: '#e8f8ef' },
  { value: 'tel',       label: '電話',         color: '#e65100', bg: '#fff3e0' },
  { value: 'visit',     label: '来店',         color: '#1a73e8', bg: '#e8f0fe' },
  { value: 'referral',  label: '紹介',         color: '#6d4c41', bg: '#f5ede8' },
  { value: 'other',     label: 'その他',       color: '#5f6368', bg: '#f1f3f4' },
]
const SOURCE_MAP = Object.fromEntries(SOURCES.map(s => [s.value, s]))

export default function NegotiationDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const { isAdmin } = useProfile()
  const [negotiation, setNegotiation] = useState<any>(null)
  const [negVehicles, setNegVehicles] = useState<any[]>([])
  const [allVehicles, setAllVehicles] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [addingVehicle, setAddingVehicle] = useState(false)
  const [selectedVehicleId, setSelectedVehicleId] = useState('')
  const [editingInfo, setEditingInfo] = useState(false)
  const [infoForm, setInfoForm] = useState({ assigned_to: '', source: '', visit_date: '', notes: '' })

  const fetchData = async () => {
    const [neg, nv, av] = await Promise.all([
      supabase.from('negotiations').select('*, customers(氏名, 電話番号, メール)').eq('id', id).single(),
      supabase.from('negotiation_vehicles').select('*, vehicles(id, db_number, year, mileage, master_makers(name), master_models(name), body_price, image_urls)').eq('negotiation_id', id),
      supabase.from('vehicles').select('*, master_makers(name), master_models(name)').eq('status', '在庫中'),
    ])
    setNegotiation(neg.data)
    setNegVehicles(nv.data ?? [])
    setAllVehicles(av.data ?? [])
    if (neg.data) {
      setInfoForm({
        assigned_to: neg.data.assigned_to ?? '',
        source: neg.data.source ?? '',
        visit_date: neg.data.visit_date ?? '',
        notes: neg.data.notes ?? '',
      })
    }
  }

  useEffect(() => { fetchData() }, [id])

  const handleAddVehicle = async () => {
    if (!selectedVehicleId) { alert('車両を選択してください'); return }
    setLoading(true)
    await supabase.from('negotiation_vehicles').insert([{ negotiation_id: id, vehicle_id: selectedVehicleId }])
    setSelectedVehicleId(''); setAddingVehicle(false)
    await fetchData(); setLoading(false)
  }

  const handleVehicleStatus = async (nvId: string, status: string) => {
    await supabase.from('negotiation_vehicles').update({ status }).eq('id', nvId)
    if (status === '成約') await supabase.from('negotiations').update({ status: '成約' }).eq('id', id)
    await fetchData()
  }

  const handleStatusChange = async (status: string) => {
    setLoading(true)
    await supabase.from('negotiations').update({ status }).eq('id', id)
    setNegotiation({ ...negotiation, status })
    setLoading(false)
  }

  const handleSaveInfo = async () => {
    await supabase.from('negotiations').update({
      assigned_to: infoForm.assigned_to || null,
      source: infoForm.source || null,
      visit_date: infoForm.visit_date || null,
      notes: infoForm.notes || null,
    }).eq('id', id as string)
    setEditingInfo(false)
    fetchData()
  }

  if (!negotiation) return <div style={{ padding: '2rem' }}>読み込み中...</div>

  const STATUS_COLOR: any = {
    '商談中': { bg: '#fff3e0', color: '#e65100' },
    '見積済': { bg: '#e8f0fe', color: '#1a73e8' },
    '成約':   { bg: '#e6f4ea', color: '#1e7e34' },
    '失注':   { bg: '#f1f3f4', color: '#5f6368' },
  }
  const NV_STATUS_COLOR: any = {
    '検討中': { bg: '#fff3e0', color: '#e65100' },
    '見積済': { bg: '#e8f0fe', color: '#1a73e8' },
    '成約':   { bg: '#e6f4ea', color: '#1e7e34' },
    '却下':   { bg: '#f1f3f4', color: '#5f6368' },
  }

  const src = SOURCE_MAP[negotiation.source]

  return (
    <div style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
      {/* ヘッダー */}
      <div style={{ marginBottom: '1.5rem' }}>
        <Link href="/negotiations" style={{ fontSize: '13px', color: '#888', textDecoration: 'none' }}>← 商談一覧に戻る</Link>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: '#e8f0fe', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 700, color: '#1a73e8' }}>
              {(negotiation.customers?.氏名 ?? '?')[0]}
            </div>
            <div>
              <h1 style={{ fontSize: '22px', fontWeight: 700, margin: 0 }}>{negotiation.customers?.氏名 ?? '顧客未設定'}</h1>
              <div style={{ display: 'flex', gap: '8px', marginTop: '4px', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '20px', fontWeight: 600, background: STATUS_COLOR[negotiation.status]?.bg, color: STATUS_COLOR[negotiation.status]?.color }}>
                  {negotiation.status}
                </span>
                {src && (
                  <span style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '20px', fontWeight: 600, background: src.bg, color: src.color }}>
                    {src.label}
                  </span>
                )}
                {negotiation.assigned_to && (
                  <span style={{ fontSize: '12px', color: '#888' }}>担当: {negotiation.assigned_to}</span>
                )}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {negotiation.status === '商談中' && (
              <button onClick={() => handleStatusChange('失注')} disabled={loading}
                style={{ padding: '8px 16px', background: 'white', color: '#e53e3e', border: '1px solid #e53e3e', borderRadius: '8px', fontSize: '13px', cursor: 'pointer' }}>
                失注
              </button>
            )}
            {isAdmin && (
              <button onClick={async () => {
                if (!confirm('この商談を削除BOXに移動しますか？')) return
                await supabase.from('negotiations').update({ deleted_at: new Date().toISOString() }).eq('id', id as string)
                window.location.href = '/negotiations'
              }} style={{ padding: '8px 16px', background: '#fff5f5', color: '#e53e3e', borderRadius: '8px', border: '1px solid #fce8e6', fontSize: '13px', cursor: 'pointer' }}>
                🗑 削除
              </button>
            )}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>

        {/* 顧客情報 */}
        <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #eee', padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '14px', fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <i className="ti ti-user" style={{ fontSize: '15px', color: '#888' }} /> 顧客情報
            </h2>
            {negotiation.customer_id && (
              <Link href={`/customers/${negotiation.customer_id}`} style={{ fontSize: '12px', color: '#0070f3', textDecoration: 'none' }}>詳細 →</Link>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[
              ['氏名', negotiation.customers?.氏名],
              ['電話番号', negotiation.customers?.電話番号],
              ['メール', negotiation.customers?.メール],
            ].map(([label, value]) => (
              <div key={label} style={{ display: 'flex', fontSize: '13px', borderBottom: '1px solid #f5f5f5', paddingBottom: '8px' }}>
                <span style={{ width: '80px', color: '#888', flexShrink: 0 }}>{label}</span>
                <span>{value ?? '—'}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 商談情報 */}
        <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #eee', padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '14px', fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <i className="ti ti-file-text" style={{ fontSize: '15px', color: '#888' }} /> 商談情報
            </h2>
            <button onClick={() => setEditingInfo(!editingInfo)} style={{ fontSize: '12px', color: '#0070f3', background: 'none', border: 'none', cursor: 'pointer' }}>
              {editingInfo ? 'キャンセル' : '編集'}
            </button>
          </div>

          {editingInfo ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '11px', color: '#888', fontWeight: 500 }}>流入経路</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '6px' }}>
                  {SOURCES.map(s => (
                    <button key={s.value} onClick={() => setInfoForm(f => ({ ...f, source: f.source === s.value ? '' : s.value }))}
                      style={{ padding: '4px 10px', borderRadius: '20px', border: 'none', fontSize: '11px', fontWeight: 500, cursor: 'pointer', background: infoForm.source === s.value ? s.color : s.bg, color: infoForm.source === s.value ? 'white' : s.color }}>
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <label style={{ fontSize: '11px', color: '#888', fontWeight: 500 }}>担当者</label>
                  <input type="text" value={infoForm.assigned_to} onChange={e => setInfoForm(f => ({ ...f, assigned_to: e.target.value }))}
                    placeholder="山田" style={{ width: '100%', border: '1px solid #ddd', borderRadius: '6px', padding: '6px 10px', fontSize: '12px', marginTop: '4px', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: '#888', fontWeight: 500 }}>来店日</label>
                  <input type="date" value={infoForm.visit_date} onChange={e => setInfoForm(f => ({ ...f, visit_date: e.target.value }))}
                    style={{ width: '100%', border: '1px solid #ddd', borderRadius: '6px', padding: '6px 10px', fontSize: '12px', marginTop: '4px', boxSizing: 'border-box' }} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: '11px', color: '#888', fontWeight: 500 }}>備考</label>
                <textarea value={infoForm.notes} onChange={e => setInfoForm(f => ({ ...f, notes: e.target.value }))} rows={2}
                  style={{ width: '100%', border: '1px solid #ddd', borderRadius: '6px', padding: '6px 10px', fontSize: '12px', marginTop: '4px', boxSizing: 'border-box', resize: 'none' }} />
              </div>
              <button onClick={handleSaveInfo} style={{ padding: '8px', background: '#0070f3', color: 'white', border: 'none', borderRadius: '6px', fontSize: '13px', cursor: 'pointer', fontWeight: 500 }}>保存</button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                ['流入経路', src ? <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', fontWeight: 600, background: src.bg, color: src.color }}>{src.label}</span> : '—'],
                ['担当者', negotiation.assigned_to],
                ['来店日', negotiation.visit_date],
                ['問合日', negotiation.inquiry_date ? new Date(negotiation.inquiry_date).toLocaleDateString('ja-JP') : null],
                ['備考', negotiation.notes],
              ].map(([label, value]: any) => (
                <div key={label} style={{ display: 'flex', fontSize: '13px', borderBottom: '1px solid #f5f5f5', paddingBottom: '8px', alignItems: 'center' }}>
                  <span style={{ width: '80px', color: '#888', flexShrink: 0 }}>{label}</span>
                  <span>{value ?? '—'}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 検討車両 */}
      <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #eee', padding: '20px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '14px', fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <i className="ti ti-car" style={{ fontSize: '15px', color: '#888' }} /> 検討車両
          </h2>
          <button onClick={() => setAddingVehicle(!addingVehicle)}
            style={{ padding: '7px 16px', background: '#0070f3', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', fontWeight: 500 }}>
            ＋ 車両を追加
          </button>
        </div>

        {addingVehicle && (
          <div style={{ background: '#f8f9fa', borderRadius: '8px', padding: '12px', marginBottom: '16px', display: 'flex', gap: '8px' }}>
            <select value={selectedVehicleId} onChange={e => setSelectedVehicleId(e.target.value)}
              style={{ flex: 1, border: '1px solid #ddd', borderRadius: '8px', padding: '8px 12px', fontSize: '13px', outline: 'none' }}>
              <option value="">在庫車両を選択してください</option>
              {allVehicles.filter(v => !negVehicles.find(nv => nv.vehicle_id === v.id)).map(v => (
                <option key={v.id} value={v.id}>{v.db_number}　{v.master_makers?.name} {v.master_models?.name}　{v.year ? v.year + '年' : ''}</option>
              ))}
            </select>
            <button onClick={handleAddVehicle} disabled={loading}
              style={{ padding: '8px 20px', background: '#0070f3', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', fontWeight: 500 }}>追加</button>
            <button onClick={() => setAddingVehicle(false)}
              style={{ padding: '8px 14px', background: 'white', color: '#888', border: '1px solid #ddd', borderRadius: '8px', fontSize: '13px', cursor: 'pointer' }}>×</button>
          </div>
        )}

        {negVehicles.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#aaa', fontSize: '14px' }}>車両が追加されていません</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {negVehicles.map(nv => (
              <div key={nv.id} style={{ border: '1px solid #eee', borderRadius: '10px', padding: '14px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                {nv.vehicles?.image_urls?.[0] ? (
                  <img src={nv.vehicles.image_urls[0]} alt="" style={{ width: '72px', height: '54px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #eee', flexShrink: 0 }} />
                ) : (
                  <div style={{ width: '72px', height: '54px', background: '#f5f5f5', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', flexShrink: 0 }}>🚗</div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '14px', fontWeight: 500 }}>
                    {nv.vehicles?.master_makers?.name} {nv.vehicles?.master_models?.name}
                    <span style={{ fontSize: '12px', color: '#aaa', marginLeft: '8px' }}>{nv.vehicles?.db_number}</span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#888', marginTop: '3px' }}>
                    {nv.vehicles?.year ? nv.vehicles.year + '年' : ''}
                    {nv.vehicles?.mileage ? '　' + nv.vehicles.mileage.toLocaleString() + 'km' : ''}
                    {nv.vehicles?.body_price ? '　¥' + nv.vehicles.body_price.toLocaleString() : ''}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                  <span style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '20px', fontWeight: 500, background: NV_STATUS_COLOR[nv.status]?.bg, color: NV_STATUS_COLOR[nv.status]?.color }}>
                    {nv.status}
                  </span>
                  <Link href={`/vehicles/${nv.vehicle_id}`} style={{ fontSize: '12px', color: '#0070f3', textDecoration: 'none' }}>詳細</Link>
                  {nv.status === '検討中' && (
                    <Link href={`/negotiations/${id}/quote?nv=${nv.id}&vehicle=${nv.vehicle_id}`}
                      style={{ padding: '5px 12px', background: '#0070f3', color: 'white', borderRadius: '6px', textDecoration: 'none', fontSize: '12px', fontWeight: 500 }}>
                      見積り
                    </Link>
                  )}
                  {nv.status === '見積済' && (
                    <button onClick={() => handleVehicleStatus(nv.id, '成約')}
                      style={{ padding: '5px 12px', background: '#00a86b', color: 'white', border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', fontWeight: 500 }}>
                      成約
                    </button>
                  )}
                  {nv.status !== '却下' && nv.status !== '成約' && (
                    <button onClick={() => handleVehicleStatus(nv.id, '却下')}
                      style={{ padding: '5px 12px', background: 'white', color: '#e53e3e', border: '1px solid #e53e3e', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>
                      却下
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 失注・成約時 */}
      {negotiation.status === '失注' && (
        <div style={{ background: '#fff3e0', borderRadius: '12px', border: '1px solid #ffe0b2', padding: '20px' }}>
          <p style={{ margin: '0 0 12px', fontSize: '14px', color: '#e65100', fontWeight: 500 }}>❌ 失注済み　顧客ランクを更新してください</p>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
            {['A', 'B', 'C', 'D', 'E'].map(rank => (
              <button key={rank} onClick={async () => {
                await supabase.from('customers').update({ purchase_rank: rank }).eq('id', negotiation.customer_id)
                alert(`顧客ランクを${rank}に更新しました`)
              }} style={{ padding: '8px 20px', borderRadius: '20px', border: '1.5px solid #ddd', background: 'white', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>
                {rank}
              </button>
            ))}
          </div>
          <div style={{ fontSize: '12px', color: '#888' }}>A:すぐ買う　B:1ヶ月以内　C:2〜3ヶ月　D:まだ先　E:買う気なし</div>
        </div>
      )}

      {negotiation.status === '成約' && (
        <div style={{ background: '#e6f4ea', borderRadius: '12px', border: '1px solid #a8d5b5', padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <p style={{ margin: 0, fontSize: '14px', color: '#1e7e34', fontWeight: 500 }}>✅ 成約済み</p>
          <Link href="/deliveries" style={{ padding: '10px 20px', background: '#1e7e34', color: 'white', borderRadius: '8px', textDecoration: 'none', fontSize: '14px', fontWeight: 500 }}>
            納車管理へ →
          </Link>
        </div>
      )}
    </div>
  )
}