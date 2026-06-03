'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const STEPS = ['基本情報', '仕入先', '金額', '画像・確認']

export default function NewVehiclePage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [images, setImages] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])

  const [countries, setCountries] = useState<any[]>([])
  const [makers, setMakers] = useState<any[]>([])
  const [models, setModels] = useState<any[]>([])
  const [colors, setColors] = useState<any[]>([])
  const [filteredMakers, setFilteredMakers] = useState<any[]>([])
  const [filteredModels, setFilteredModels] = useState<any[]>([])
  const [customers, setCustomers] = useState<any[]>([])
  const [dealers, setDealers] = useState<any[]>([])
  const [auctionVenues, setAuctionVenues] = useState<any[]>([])

  const [form, setForm] = useState({
    db_number: '', country_id: '', maker_id: '', model_id: '',
    year: '', mileage: '', shift: 'AT', color_id: '',
    repair_history: false, inspection_date: '', chassis_number: '', car_number: '',
    stock_date: '', purchase_type: '買取', status: '在庫中',
    customer_id: '', dealer_id: '', auction_venue_id: '',
    purchase_price: '', body_price: '', total_price: '',
  })

  useEffect(() => {
    const fetchAll = async () => {
      const [c, m, mo, col, cu, d, av] = await Promise.all([
        supabase.from('master_countries').select('*').order('sort_order'),
        supabase.from('master_makers').select('*').order('sort_order'),
        supabase.from('master_models').select('*').order('sort_order'),
        supabase.from('master_colors').select('*').order('sort_order'),
        supabase.from('customers').select('*').order('作成日時', { ascending: false }),
        supabase.from('dealers').select('*').order('作成日時', { ascending: false }),
        supabase.from('auction_venues').select('*').order('作成日時', { ascending: false }),
      ])
      setCountries(c.data ?? [])
      setMakers(m.data ?? [])
      setModels(mo.data ?? [])
      setColors(col.data ?? [])
      setCustomers(cu.data ?? [])
      setDealers(d.data ?? [])
      setAuctionVenues(av.data ?? [])
      // 管理番号自動生成
      const { data: lastVehicle } = await supabase
        .from('vehicles')
        .select('db_number')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()
      
      let nextNumber = 1
      if (lastVehicle?.db_number) {
        const match = lastVehicle.db_number.match(/V-(\d+)/)
        if (match) nextNumber = parseInt(match[1]) + 1
      }
      const autoNumber = `V-${String(nextNumber).padStart(3, '0')}`
      setForm(prev => ({ ...prev, db_number: autoNumber }))
    }
    fetchAll()
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
      db_number: form.db_number,
      country_id: form.country_id || null,
      maker_id: form.maker_id || null,
      model_id: form.model_id || null,
      year: form.year ? parseInt(form.year) : null,
      mileage: form.mileage ? parseInt(form.mileage) : null,
      shift: form.shift,
      color_id: form.color_id || null,
      repair_history: form.repair_history,
      inspection_date: form.inspection_date || null,
      chassis_number: form.chassis_number,
      stock_date: form.stock_date || null,
      purchase_type: form.purchase_type,
      status: form.status,
      customer_id: form.customer_id || null,
      dealer_id: form.dealer_id || null,
      auction_venue_id: form.auction_venue_id || null,
      purchase_price: form.purchase_price ? parseInt(form.purchase_price) : null,
      body_price: form.body_price ? parseInt(form.body_price) : null,
      total_price: form.total_price ? parseInt(form.total_price) : null,
    }]).select().single()

    if (error || !vehicle) {
      alert('エラー: ' + error?.message)
      setLoading(false)
      return
    }

    const urls: string[] = []
    for (const file of images) {
      const ext = file.name.split('.').pop()
      const path = `${vehicle.id}/${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage.from('vehicle-images').upload(path, file)
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

  const sel = { width: '100%', padding: '9px 12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' as const }
  const inp = { width: '100%', padding: '9px 12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' as const }
  const lbl = { fontSize: '13px', fontWeight: 500, color: '#444', marginBottom: '6px', display: 'block' }
  const grid2 = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }

  const purchaseTypeCustomer = ['買取', '下取'].includes(form.purchase_type)
  const purchaseTypeDealer = ['業者AA', '業販'].includes(form.purchase_type)
  const purchaseTypeAuction = form.purchase_type === 'AA'

  return (
    <div style={{ padding: '2rem', maxWidth: '640px', margin: '0 auto' }}>
      <a href="/vehicles" style={{ fontSize: '13px', color: '#888', textDecoration: 'none' }}>← 在庫一覧に戻る</a>
      <h1 style={{ fontSize: '22px', fontWeight: 700, margin: '8px 0 1.5rem' }}>車両登録</h1>

      {/* ステップバー */}
      <div style={{ display: 'flex', marginBottom: '2rem', gap: '4px' }}>
        {STEPS.map((s, i) => (
          <div key={i} style={{ flex: 1, textAlign: 'center' }}>
            <div style={{
              height: '4px', borderRadius: '2px', marginBottom: '6px',
              background: i <= step ? '#0070f3' : '#eee',
              transition: 'background 0.3s'
            }} />
            <span style={{ fontSize: '11px', color: i === step ? '#0070f3' : '#aaa', fontWeight: i === step ? 600 : 400 }}>{s}</span>
          </div>
        ))}
      </div>

      <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #eee', padding: '2rem' }}>

        {/* Step 0: 基本情報 */}
        {step === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={grid2}>
              <div>
                <label style={lbl}>管理番号</label>
                <input name="db_number" value={form.db_number} onChange={handleChange} style={inp} placeholder="A-001" />
              </div>
              <div>
                <label style={lbl}>入庫日</label>
                <input type="date" name="stock_date" value={form.stock_date} onChange={handleChange} style={inp} />
              </div>
            </div>
            <div>
              <label style={lbl}>国</label>
              <select name="country_id" value={form.country_id} onChange={handleChange} style={sel}>
                <option value="">選択してください</option>
                {countries.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>メーカー</label>
              <select name="maker_id" value={form.maker_id} onChange={handleChange} style={sel} disabled={!form.country_id}>
                <option value="">国を選択してください</option>
                {filteredMakers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>車種</label>
              <select name="model_id" value={form.model_id} onChange={handleChange} style={sel} disabled={!form.maker_id}>
                <option value="">メーカーを選択してください</option>
                {filteredModels.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
            <div style={grid2}>
              <div>
                <label style={lbl}>年式</label>
                <select name="year" value={form.year} onChange={handleChange} style={sel}>
                  <option value="">選択</option>
                  {Array.from({ length: 36 }, (_, i) => 2025 - i).map(y => (
                    <option key={y} value={y}>{y}年</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={lbl}>シフト</label>
                <select name="shift" value={form.shift} onChange={handleChange} style={sel}>
                  <option>AT</option><option>MT</option><option>CVT</option><option>その他</option>
                </select>
              </div>
            </div>
            <div style={grid2}>
              <div>
                <label style={lbl}>走行距離 (km)</label>
                <input type="number" name="mileage" value={form.mileage} onChange={handleChange} style={inp} />
              </div>
              <div>
                <label style={lbl}>色</label>
                <select name="color_id" value={form.color_id} onChange={handleChange} style={sel}>
                  <option value="">選択</option>
                  {colors.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>
            <div style={grid2}>
                <div>
                  <label style={lbl}>車台番号</label>
                  <input name="chassis_number" value={form.chassis_number} onChange={handleChange} style={inp} />
                </div>
                <div>
                  <label style={lbl}>車検満了日</label>
                  <input type="date" name="inspection_date" value={form.inspection_date} onChange={handleChange} style={inp} />
                </div>
              </div>
              <div>
                <label style={lbl}>車両ナンバー</label>
                <input name="car_number" value={form.car_number} onChange={handleChange} style={inp} placeholder="品川 300 あ 1234" />
              </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input type="checkbox" name="repair_history" checked={form.repair_history} onChange={handleChange} id="repair" />
              <label htmlFor="repair" style={{ fontSize: '14px' }}>修復歴あり</label>
            </div>
          </div>
        )}
        {/* Step 1: 仕入先 */}
        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={lbl}>仕入区分</label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {['買取', 'AA', '業者AA', '業販', '下取'].map(t => (
                  <button key={t} onClick={() => setForm({ ...form, purchase_type: t, customer_id: '', dealer_id: '', auction_venue_id: '' })}
                    style={{ padding: '8px 16px', borderRadius: '20px', border: '1.5px solid', fontSize: '13px', cursor: 'pointer', fontWeight: form.purchase_type === t ? 600 : 400, background: form.purchase_type === t ? '#0070f3' : 'white', color: form.purchase_type === t ? 'white' : '#555', borderColor: form.purchase_type === t ? '#0070f3' : '#ddd' }}>
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {purchaseTypeCustomer && (
              <div>
                <label style={lbl}>{form.purchase_type === '買取' ? '買取先（顧客）' : '下取先（顧客）'}</label>
                <select name="customer_id" value={form.customer_id} onChange={handleChange} style={sel}>
                  <option value="">顧客を選択してください</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.氏名}　{c.電話番号 ?? ''}</option>)}
                </select>
                <p style={{ fontSize: '12px', color: '#aaa', marginTop: '6px' }}>
                  顧客が未登録の場合は先に<a href="/customers/new" target="_blank" style={{ color: '#0070f3' }}>顧客登録</a>してください
                </p>
              </div>
            )}

            {purchaseTypeDealer && (
              <div>
                <label style={lbl}>仕入業者</label>
                <select name="dealer_id" value={form.dealer_id} onChange={handleChange} style={sel}>
                  <option value="">業者を選択してください</option>
                  {dealers.map(d => <option key={d.id} value={d.id}>{d.業者名}　{d.担当者名 ?? ''}</option>)}
                </select>
                <p style={{ fontSize: '12px', color: '#aaa', marginTop: '6px' }}>
                  業者が未登録の場合は先に<a href="/dealers/new" target="_blank" style={{ color: '#0070f3' }}>業者登録</a>してください
                </p>
              </div>
            )}

            {purchaseTypeAuction && (
              <div>
                <label style={lbl}>オークション会場</label>
                <select name="auction_venue_id" value={form.auction_venue_id} onChange={handleChange} style={sel}>
                  <option value="">会場を選択してください</option>
                  {auctionVenues.map(a => <option key={a.id} value={a.id}>{a.会場名}　{a.地域 ?? ''}</option>)}
                </select>
              </div>
            )}
          </div>
        )}

        {/* Step 2: 金額 */}
        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={lbl}>仕入金額（円）</label>
              <input type="number" name="purchase_price" value={form.purchase_price} onChange={handleChange} style={inp} placeholder="0" />
            </div>
            <div>
              <label style={lbl}>車体価格（円）</label>
              <input type="number" name="body_price" value={form.body_price} onChange={handleChange} style={inp} placeholder="0" />
            </div>
            <div>
              <label style={lbl}>支払総額（円）</label>
              <input type="number" name="total_price" value={form.total_price} onChange={handleChange} style={inp} placeholder="0" />
            </div>
          </div>
        )}

        {/* Step 3: 画像・確認 */}
        {step === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
            <div>
              <label style={lbl}>車両画像（最大10枚）</label>
              <input type="file" accept="image/*" multiple onChange={handleImages} style={{ fontSize: '13px' }} />
              {previews.length > 0 && (
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '10px' }}>
                  {previews.map((src, i) => (
                    <img key={i} src={src} alt="" style={{ width: '80px', height: '60px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #eee' }} />
                  ))}
                </div>
              )}
            </div>
            <div style={{ background: '#f8f9fa', borderRadius: '8px', padding: '1rem', fontSize: '13px', lineHeight: '2' }}>
              <div><span style={{ color: '#888' }}>仕入区分：</span>{form.purchase_type}</div>
              <div><span style={{ color: '#888' }}>年式：</span>{form.year ? form.year + '年' : '—'}</div>
              <div><span style={{ color: '#888' }}>走行距離：</span>{form.mileage ? parseInt(form.mileage).toLocaleString() + ' km' : '—'}</div>
              <div><span style={{ color: '#888' }}>仕入金額：</span>{form.purchase_price ? '¥' + parseInt(form.purchase_price).toLocaleString() : '—'}</div>
              <div><span style={{ color: '#888' }}>車体価格：</span>{form.body_price ? '¥' + parseInt(form.body_price).toLocaleString() : '—'}</div>
              <div><span style={{ color: '#888' }}>支払総額：</span>{form.total_price ? '¥' + parseInt(form.total_price).toLocaleString() : '—'}</div>
            </div>
          </div>
        )}

        {/* ナビボタン */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2rem' }}>
          {step > 0 ? (
            <button onClick={() => setStep(step - 1)} style={{ padding: '10px 24px', border: '1px solid #ddd', borderRadius: '8px', background: 'white', fontSize: '14px', cursor: 'pointer' }}>← 戻る</button>
          ) : <div />}
          {step < STEPS.length - 1 ? (
            <button onClick={() => setStep(step + 1)} style={{ padding: '10px 24px', background: '#0070f3', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>次へ →</button>
          ) : (
            <button onClick={handleSubmit} disabled={loading} style={{ padding: '10px 24px', background: '#00a86b', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
              {loading ? '登録中...' : '✓ 登録する'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}