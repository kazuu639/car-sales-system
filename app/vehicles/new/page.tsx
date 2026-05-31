'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function NewVehiclePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [images, setImages] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [form, setForm] = useState({
    db_number: '', car_name: '', year: '', mileage: '',
    shift: '', color: '', repair_history: false,
    inspection_date: '', chassis_number: '', stock_date: '',
    purchase_price: '', body_price: '', total_price: '',
    purchase_type: '買取', status: '在庫中',
  })

  const handleChange = (e: any) => {
    const { name, value, type, checked } = e.target
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
  }

  const handleImages = (e: any) => {
    const files = Array.from(e.target.files as FileList).slice(0, 10)
    setImages(files)
    setPreviews(files.map(f => URL.createObjectURL(f)))
  }

  const handleSubmit = async () => {
    setLoading(true)
    const { data: vehicle, error } = await supabase.from('vehicles').insert([{
      ...form,
      year: form.year ? parseInt(form.year) : null,
      mileage: form.mileage ? parseInt(form.mileage) : null,
      purchase_price: form.purchase_price ? parseInt(form.purchase_price) : null,
      body_price: form.body_price ? parseInt(form.body_price) : null,
      total_price: form.total_price ? parseInt(form.total_price) : null,
      inspection_date: form.inspection_date || null,
      stock_date: form.stock_date || null,
    }]).select().single()

    if (error || !vehicle) {
      alert('エラー: ' + error?.message)
      setLoading(false)
      return
    }

    const urls: string[] = []
    for (const file of images) {
      const path = `${vehicle.id}/${Date.now()}-${file.name}`
      const { error: uploadError } = await supabase.storage
        .from('vehicle-images')
        .upload(path, file)
      if (!uploadError) {
        const { data } = supabase.storage.from('vehicle-images').getPublicUrl(path)
        urls.push(data.publicUrl)
      }
    }

    if (urls.length > 0) {
      await supabase.from('vehicles').update({ image_urls: urls }).eq('id', vehicle.id)
    }

    setLoading(false)
    router.push('/vehicles')
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto' }}>
      <a href="/vehicles" style={{ fontSize: '13px', color: '#0070f3', textDecoration: 'none' }}>← 在庫一覧に戻る</a>
      <h1 style={{ fontSize: '22px', margin: '1rem 0 1.5rem' }}>車両登録</h1>

      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', fontSize: '13px', marginBottom: '8px', color: '#555', fontWeight: 500 }}>
          車両画像（最大10枚）
        </label>
        <input type="file" accept="image/*" multiple onChange={handleImages}
          style={{ fontSize: '13px', marginBottom: '10px' }} />
        {previews.length > 0 && (
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {previews.map((src, i) => (
              <img key={i} src={src} alt={`preview-${i}`}
                style={{ width: '80px', height: '60px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #eee' }} />
            ))}
          </div>
        )}
      </div>

      <div style={{ marginBottom: '12px' }}>
        <label style={{ display: 'block', fontSize: '13px', marginBottom: '4px', color: '#555' }}>仕入区分</label>
        <select name="purchase_type" value={form.purchase_type} onChange={handleChange}
          style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px' }}>
          <option>買取</option><option>AA</option><option>業者AA</option><option>業販</option><option>下取</option>
        </select>
      </div>

      {[
        ['管理番号', 'db_number', 'text'], ['車種', 'car_name', 'text'],
        ['年式', 'year', 'number'], ['走行距離 (km)', 'mileage', 'number'],
        ['シフト', 'shift', 'text'], ['色', 'color', 'text'],
        ['車台番号', 'chassis_number', 'text'], ['車検満了日', 'inspection_date', 'date'],
        ['入庫日', 'stock_date', 'date'], ['仕入金額', 'purchase_price', 'number'],
        ['車体価格', 'body_price', 'number'], ['支払総額', 'total_price', 'number'],
      ].map(([label, name, type]) => (
        <div key={name} style={{ marginBottom: '12px' }}>
          <label style={{ display: 'block', fontSize: '13px', marginBottom: '4px', color: '#555' }}>{label}</label>
          <input type={type} name={name} value={(form as any)[name]} onChange={handleChange}
            style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px' }} />
        </div>
      ))}

      <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <input type="checkbox" name="repair_history" checked={form.repair_history} onChange={handleChange} id="repair" />
        <label htmlFor="repair" style={{ fontSize: '14px' }}>修復歴あり</label>
      </div>

      <button onClick={handleSubmit} disabled={loading}
        style={{ width: '100%', padding: '12px', background: '#0070f3', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', cursor: 'pointer' }}>
        {loading ? '登録中...' : '登録する'}
      </button>
    </div>
  )
}