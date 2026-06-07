'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'

export default function EditVehiclePage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState<any>(null)

  useEffect(() => {
    supabase.from('vehicles').select('*').eq('id', id).single()
      .then(({ data }) => setForm(data))
  }, [id])

  const handleChange = (e: any) => {
    const { name, value, type, checked } = e.target
    setForm((prev: any) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
  }

  const handleSubmit = async () => {
    setLoading(true)
    const { error } = await supabase.from('vehicles').update({
      status: form.status,
      purchase_type: form.purchase_type,
      db_number: form.db_number,
      car_name: form.car_name,
      year: form.year ? parseInt(form.year) : null,
      mileage: form.mileage ? parseInt(form.mileage) : null,
      shift: form.shift,
      color: form.color,
      chassis_number: form.chassis_number,
      car_number: form.car_number,
      inspection_date: form.inspection_date || null,
      stock_date: form.stock_date || null,
      contract_date: form.contract_date || null,
      delivery_date: form.delivery_date || null,
      purchase_price: form.purchase_price ? parseInt(form.purchase_price) : null,
      body_price: form.body_price ? parseInt(form.body_price) : null,
      total_price: form.total_price ? parseInt(form.total_price) : null,
      repair_history: form.repair_history ?? false,
    }).eq('id', id)
    setLoading(false)
    if (!error) router.push(`/vehicles/${id}`)
    else alert('エラー: ' + error.message)
  }

  const handleDelete = async () => {
    if (!confirm('この車両を削除しますか？')) return
    await supabase.from('vehicles').delete().eq('id', id)
    router.push('/vehicles')
  }

  if (!form) return <div style={{ padding: '2rem' }}>読み込み中...</div>

  return (
    <div style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto' }}>
      <Link href={`/vehicles/${id}`} style={{ fontSize: '13px', color: '#0070f3', textDecoration: 'none' }}>← 詳細に戻る</Link>
      <h1 style={{ fontSize: '22px', margin: '1rem 0 1.5rem' }}>車両編集</h1>

      {/* 画像は詳細ページで管理 */}
      <div style={{ marginBottom: '20px', padding: '14px 16px', background: '#f0f7ff', borderRadius: '8px', border: '1px solid #c8e0fa', fontSize: '13px', color: '#1a73e8' }}>
        📷 写真の追加・並び替え・削除は{' '}
        <Link href={`/vehicles/${id}?tab=在庫`} style={{ color: '#1a73e8', fontWeight: 600 }}>
          車両詳細ページ → 在庫タブ →「写真を編集」
        </Link>
        {' '}から行ってください。
      </div>

      <div style={{ marginBottom: '12px' }}>
        <label style={{ display: 'block', fontSize: '13px', marginBottom: '4px', color: '#555' }}>ステータス</label>
        <select name="status" value={form.status ?? ''} onChange={handleChange}
          style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px' }}>
          <option>在庫中</option><option>商談中</option><option>売約済</option><option>納車済</option>
        </select>
      </div>

      <div style={{ marginBottom: '12px' }}>
        <label style={{ display: 'block', fontSize: '13px', marginBottom: '4px', color: '#555' }}>仕入区分</label>
        <select name="purchase_type" value={form.purchase_type ?? ''} onChange={handleChange}
          style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px' }}>
          <option>買取</option><option>AA</option><option>業者AA</option><option>業販</option><option>下取</option>
        </select>
      </div>

      {([
        ['管理番号', 'db_number', 'text'], ['車種', 'car_name', 'text'],
        ['年式', 'year', 'number'], ['走行距離 (km)', 'mileage', 'number'],
        ['シフト', 'shift', 'text'], ['色', 'color', 'text'],
        ['車台番号', 'chassis_number', 'text'], ['車両ナンバー', 'car_number', 'text'],
        ['車検満了日', 'inspection_date', 'date'], ['入庫日', 'stock_date', 'date'],
        ['契約日', 'contract_date', 'date'], ['納車日', 'delivery_date', 'date'],
        ['仕入金額', 'purchase_price', 'number'], ['車体価格', 'body_price', 'number'],
        ['支払総額', 'total_price', 'number'],
      ] as const).map(([label, name, type]) => (
        <div key={name} style={{ marginBottom: '12px' }}>
          <label style={{ display: 'block', fontSize: '13px', marginBottom: '4px', color: '#555' }}>{label}</label>
          <input type={type} name={name} value={form[name] ?? ''}
            onChange={handleChange}
            style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }} />
        </div>
      ))}

      <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <input type="checkbox" name="repair_history" checked={form.repair_history ?? false} onChange={handleChange} id="repair" />
        <label htmlFor="repair" style={{ fontSize: '14px' }}>修復歴あり</label>
      </div>

      <button onClick={handleSubmit} disabled={loading}
        style={{ width: '100%', padding: '12px', background: '#0070f3', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, marginBottom: '12px' }}>
        {loading ? '保存中...' : '保存する'}
      </button>

      <button onClick={handleDelete}
        style={{ width: '100%', padding: '12px', background: 'white', color: '#e00', border: '1px solid #e00', borderRadius: '8px', fontSize: '16px', cursor: 'pointer' }}>
        この車両を削除する
      </button>
    </div>
  )
}
