'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function NewNegotiationPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [customers, setCustomers] = useState<any[]>([])
  const [vehicles, setVehicles] = useState<any[]>([])
  const [form, setForm] = useState({
    customer_id: '',
    vehicle_id: '',
    inquiry_route: '電話',
    inquiry_date: new Date().toISOString().split('T')[0],
    notes: '',
  })

  useEffect(() => {
    Promise.all([
      supabase.from('customers').select('*').order('作成日時', { ascending: false }),
      supabase.from('vehicles').select(`*, master_makers(name), master_models(name)`).eq('status', '在庫中').order('created_at', { ascending: false }),
    ]).then(([c, v]) => {
      setCustomers(c.data ?? [])
      setVehicles(v.data ?? [])
    })
  }, [])

  const handleChange = (e: any) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async () => {
    setLoading(true)
    const { data, error } = await supabase.from('negotiations').insert([{
      customer_id: form.customer_id || null,
      vehicle_id: form.vehicle_id || null,
      inquiry_route: form.inquiry_route,
      inquiry_date: form.inquiry_date,
      notes: form.notes,
      status: '商談中',
      company_id: '00000000-0000-0000-0000-000000000001',
    }]).select().single()
    if (error) { alert('エラー: ' + error.message); setLoading(false); return }
    router.push(`/negotiations/${data.id}`)
  }

  const fieldStyle = {
    width: '100%', padding: '9px 12px', border: '1px solid #ddd',
    borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' as const,
  }
  const labelStyle = { fontSize: '13px', fontWeight: 500, color: '#444', marginBottom: '6px', display: 'block' }

  return (
    <div style={{ padding: '2rem', maxWidth: '700px', margin: '0 auto' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <Link href="/negotiations" style={{ fontSize: '13px', color: '#888', textDecoration: 'none' }}>← 商談一覧に戻る</Link>
        <h1 style={{ fontSize: '22px', fontWeight: 700, margin: '8px 0 0' }}>商談登録</h1>
      </div>
      <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #eee', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
        <div>
          <label style={labelStyle}>問い合わせ経路</label>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {['HP', '電話', 'LINE', 'メール', 'その他'].map(r => (
              <button key={r} onClick={() => setForm({ ...form, inquiry_route: r })}
                style={{ padding: '8px 16px', borderRadius: '20px', border: '1.5px solid', fontSize: '13px', cursor: 'pointer', fontWeight: form.inquiry_route === r ? 600 : 400, background: form.inquiry_route === r ? '#0070f3' : 'white', color: form.inquiry_route === r ? 'white' : '#555', borderColor: form.inquiry_route === r ? '#0070f3' : '#ddd' }}>
                {r}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label style={labelStyle}>問い合わせ日</label>
          <input type="date" name="inquiry_date" value={form.inquiry_date} onChange={handleChange} style={fieldStyle} />
        </div>

        <div>
          <label style={labelStyle}>顧客</label>
          <select name="customer_id" value={form.customer_id} onChange={handleChange} style={fieldStyle}>
            <option value="">顧客を選択してください</option>
            {customers.map(c => <option key={c.id} value={c.id}>{c.氏名}　{c.電話番号 ?? ''}</option>)}
          </select>
          <p style={{ fontSize: '12px', color: '#aaa', marginTop: '4px' }}>
            未登録の場合は<a href="/customers/new" target="_blank" style={{ color: '#0070f3' }}>顧客登録</a>してから選択してください
          </p>
        </div>

        <div>
          <label style={labelStyle}>対象車両（在庫中）</label>
          <select name="vehicle_id" value={form.vehicle_id} onChange={handleChange} style={fieldStyle}>
            <option value="">車両を選択してください</option>
            {vehicles.map(v => (
              <option key={v.id} value={v.id}>
                {v.db_number}　{v.master_makers?.name} {v.master_models?.name}　{v.year ? v.year + '年' : ''}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label style={labelStyle}>備考</label>
          <textarea name="notes" value={form.notes} onChange={handleChange} rows={3} style={{ ...fieldStyle, resize: 'vertical' }} placeholder="メモがあれば..." />
        </div>

        <button onClick={handleSubmit} disabled={loading} style={{ padding: '12px', background: '#0070f3', color: 'white', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
          {loading ? '登録中...' : '商談を登録する'}
        </button>
      </div>
    </div>
  )
}