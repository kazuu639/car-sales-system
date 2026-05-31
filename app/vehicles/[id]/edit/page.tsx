'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'

export default function EditVehiclePage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState<any>(null)
  const [images, setImages] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])

  useEffect(() => {
    supabase.from('vehicles').select('*').eq('id', id).single()
      .then(({ data }) => setForm(data))
  }, [id])

  const handleChange = (e: any) => {
    const { name, value, type, checked } = e.target
    setForm((prev: any) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
  }

  const handleImages = (e: any) => {
    const files = Array.from(e.target.files as FileList).slice(0, 10)
    setImages(files)
    setPreviews(files.map(f => URL.createObjectURL(f)))
  }

  const handleSubmit = async () => {
    setLoading(true)

    let imageUrls = form.image_urls ?? []

    if (images.length > 0) {
      const urls: string[] = []
      for (const file of images) {
        const path = `${id}/${Date.now()}-${file.name}`
        const { error: uploadError } = await supabase.storage
          .from('vehicle-images')
          .upload(path, file)
        if (!uploadError) {
          const { data } = supabase.storage.from('vehicle-images').getPublicUrl(path)
          urls.push(data.publicUrl)
        }
      }
      imageUrls = [...imageUrls, ...urls]
    }

    const { error } = await supabase.from('vehicles').update({
      ...form,
      year: form.year ? parseInt(form.year) : null,
      mileage: form.mileage ? parseInt(form.mileage) : null,
      purchase_price: form.purchase_price ? parseInt(form.purchase_price) : null,
      body_price: form.body_price ? parseInt(form.body_price) : null,
      total_price: form.total_price ? parseInt(form.total_price) : null,
      inspection_date: form.inspection_date || null,
      stock_date: form.stock_date || null,
      contract_date: form.contract_date || null,
      delivery_date: form.delivery_date || null,
      image_urls: imageUrls,
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
      <a href={`/vehicles/${id}`} style={{ fontSize: '13px', color: '#0070f3', textDecoration: 'none' }}>← 詳細に戻る</a>
      <h1 style={{ fontSize: '22px', margin: '1rem 0 1.5rem' }}>車両編集</h1>

      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', fontSize: '13px', marginBottom: '8px', color: '#555', fontWeight: 500 }}>
          現在の画像（{form.image_urls?.length ?? 0}枚）
        </label>
        {form.image_urls && form.image_urls.length > 0 && (
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '10px' }}>
            {form.image_urls.map((url: string, i: number) => (
              <img key={i} src={url} alt={`img-${i}`}
                style={{ width: '80px', height: '60px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #eee' }} />
            ))}
          </div>
        )}
        <label style={{ display: 'block', fontSize: '13px', marginBottom: '6px', color: '#555' }}>
          画像を追加（最大10枚まで）
        </label>
        <input type="file" accept="image/*" multiple onChange={handleImages}
          style={{ fontSize: '13px', marginBottom: '8px' }} />
        {previews.length > 0 && (
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {previews.map((src, i) => (
              <img key={i} src={src} alt={`preview-${i}`}
                style={{ width: '80px', height: '60px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #0070f3' }} />
            ))}
          </div>
        )}
      </div>

      <div style={{ marginBottom: '12px' }}>
        <label style={{ display: 'block', fontSize: '13px', marginBottom: '4px', color: '#555' }}>ステータス</label>
        <select name="status" value={form.status} onChange={handleChange}
          style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px' }}>
          <option>在庫中</option><option>商談中</option><option>売約済</option><option>納車済</option>
        </select>
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
        ['入庫日', 'stock_date', 'date'], ['契約日', 'contract_date', 'date'],
        ['納車日', 'delivery_date', 'date'], ['仕入金額', 'purchase_price', 'number'],
        ['車体価格', 'body_price', 'number'], ['支払総額', 'total_price', 'number'],
      ].map(([label, name, type]) => (
        <div key={name} style={{ marginBottom: '12px' }}>
          <label style={{ display: 'block', fontSize: '13px', marginBottom: '4px', color: '#555' }}>{label}</label>
          <input type={type} name={name} value={form[name] ?? ''}
            onChange={handleChange}
            style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px' }} />
        </div>
      ))}

      <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <input type="checkbox" name="repair_history" checked={form.repair_history ?? false} onChange={handleChange} id="repair" />
        <label htmlFor="repair" style={{ fontSize: '14px' }}>修復歴あり</label>
      </div>

      <button onClick={handleSubmit} disabled={loading}
        style={{ width: '100%', padding: '12px', background: '#0070f3', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', cursor: 'pointer', marginBottom: '12px' }}>
        {loading ? '保存中...' : '保存する'}
      </button>

      <button onClick={handleDelete}
        style={{ width: '100%', padding: '12px', background: 'white', color: '#e00', border: '1px solid #e00', borderRadius: '8px', fontSize: '16px', cursor: 'pointer' }}>
        この車両を削除する
      </button>
    </div>
  )
}