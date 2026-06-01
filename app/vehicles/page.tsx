'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function NewVehiclePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [images, setImages] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])

  const [countries, setCountries] = useState<any[]>([])
  const [makers, setMakers] = useState<any[]>([])
  const [models, setModels] = useState<any[]>([])
  const [colors, setColors] = useState<any[]>([])
  const [filteredMakers, setFilteredMakers] = useState<any[]>([])
  const [filteredModels, setFilteredModels] = useState<any[]>([])

  const [form, setForm] = useState({
    db_number: '', country_id: '', maker_id: '', model_id: '',
    year: '', mileage: '', shift: 'AT', color_id: '',
    repair_history: false, inspection_date: '', chassis_number: '',
    stock_date: '', purchase_price: '', body_price: '', total_price: '',
    purchase_type: '買取', status: '在庫中',
  })

  useEffect(() => {
    const fetchMasters = async () => {
      const [c, m, mo, col] = await Promise.all([
        supabase.from('master_countries').select('*').order('sort_order'),
        supabase.from('master_makers').select('*').order('sort_order'),
        supabase.from('master_models').select('*').order('sort_order'),
        supabase.from('master_colors').select('*').order('sort_order'),
      ])
      setCountries(c.data ?? [])
      setMakers(m.data ?? [])
      setModels(mo.data ?? [])
      setColors(col.data ?? [])
    }
    fetchMasters()
  }, [])

  const handleChange = (e: any) => {
    const { name, value, type, checked } = e.target
    const newForm = { ...form, [name]: type === 'checkbox' ? checked : value }

    if (name === 'country_id') {
      newForm.maker_id = ''
      newForm.model_id = ''
      setFilteredMakers(makers.filter(m => m.country_id === value))
      setFilteredModels([])
    }

    if (name === 'maker_id') {
      newForm.model_id = ''
      setFilteredModels(models.filter(m => m.maker_id === value))
    }

    setForm(newForm)
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
        .from('vehicle-images').upload(path, file)
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

  const selectStyle = { width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px' }
  const inputStyle = { width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px' }
  const labelStyle = { display: 'block', fontSize: '13px', marginBottom: '4px', color: '#555' }

  return (
    <div style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto' }}>
      <a href="/vehicles" style={{ fontSize: '13px', color: '#0070f3', textDecoration: 'none' }}>← 在庫一覧に戻る</a>
      <h1 style={{ fontSize: '22px', margin: '1rem 0 1.5rem' }}>車両登録</h1>

      <div style={{ marginBottom: '20px' }}>
        <label style={{ ...labelStyle, fontWeight: 500 }}>車両画像（最大10枚）</label>
        <input type="file" accept="image/*" multiple onChange={handleImages} style={{ fontSize: '13px', marginBottom: '10px' }} />
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
        <label style={labelStyle}>仕入区分</label>
        <select name="purchase_type" value={form.purchase_type} onChange={handleChange} style={selectStyle}>
          <option>買取</option><option>AA</option><option>業者AA</option><option>業販</option><option>下取</option>
        </select>
      </div>

      <div style={{ marginBottom: '12px' }}>
        <label style={labelStyle}>管理番号</label>
        <input type="text" name="db_number" value={form.db_number} onChange={handleChange} style={inputStyle} />
      </div>

      <div style={{ marginBottom: '12px' }}>
        <label style={labelStyle}>国</label>
        <select name="country_id" value={form.country_id} onChange={handleChange} style={selectStyle}>
          <option value="">選択してください</option>
          {countries.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      <div style={{ marginBottom: '12px' }}>
        <label style={labelStyle}>メーカー</label>
        <select name="maker_id" value={form.maker_id} onChange={handleChange} style={selectStyle} disabled={!form.country_id}>
          <option value="">国を選択してください</option>
          {filteredMakers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
      </div>

      <div style={{ marginBottom: '12px' }}>
        <label style={labelStyle}>車種</label>
        <select name="model_id" value={form.model_id} onChange={handleChange} style={selectStyle} disabled={!form.maker_id}>
          <option value="">メーカーを選択してください</option>
          {filteredModels.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
      </div>

      <div style={{ marginBottom: '12px' }}>
        <label style={labelStyle}>年式</label>
        <select name="year" value={form.year} onChange={handleChange} style={selectStyle}>
          <option value="">選択してください</option>
          {Array.from({ length: 36 }, (_, i) => 2025 - i).map(y => (
            <option key={y} value={y}>{y}年</option>
          ))}
        </select>
      </div>

      <div style={{ marginBottom: '12px' }}>
        <label style={labelStyle}>色</label>
        <select name="color_id" value={form.color_id} onChange={handleChange} style={selectStyle}>
          <option value="">選択してください</option>
          {colors.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      <div style={{ marginBottom: '12px' }}>
        <label style={labelStyle}>シフト</label>
        <select name="shift" value={form.shift} onChange={handleChange} style={selectStyle}>
          <option value="AT">AT</option>
          <option value="MT">MT</option>
          <option value="CVT">CVT</option>
          <option value="その他">その他</option>
        </select>
      </div>

      <div style={{ marginBottom: '12px' }}>
        <label style={labelStyle}>走行距離 (km)</label>
        <input type="number" name="mileage" value={form.mileage} onChange={handleChange} style={inputStyle} />
      </div>

      <div style={{ marginBottom: '12px' }}>
        <label style={labelStyle}>車台番号</label>
        <input type="text" name="chassis_number" value={form.chassis_number} onChange={handleChange} style={inputStyle} />
      </div>

      <div style={{ marginBottom: '12px' }}>
        <label style={labelStyle}>車検満了日</label>
        <input type="date" name="inspection_date" value={form.inspection_date} onChange={handleChange} style={inputStyle} />
      </div>

      <div style={{ marginBottom: '12px' }}>
        <label style={labelStyle}>入庫日</label>
        <input type="date" name="stock_date" value={form.stock_date} onChange={handleChange} style={inputStyle} />
      </div>

      <div style={{ marginBottom: '12px' }}>
        <label style={labelStyle}>仕入金額</label>
        <input type="number" name="purchase_price" value={form.purchase_price} onChange={handleChange} style={inputStyle} />
      </div>

      <div style={{ marginBottom: '12px' }}>
        <label style={labelStyle}>車体価格</label>
        <input type="number" name="body_price" value={form.body_price} onChange={handleChange} style={inputStyle} />
      </div>

      <div style={{ marginBottom: '16px' }}>
        <label style={labelStyle}>支払総額</label>
        <input type="number" name="total_price" value={form.total_price} onChange={handleChange} style={inputStyle} />
      </div>

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