'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function NewCustomerPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    氏名: '',
    氏名カナ: '',
    電話番号: '',
    メール: '',
    住所: '',
    生年月日: '',
    免許証番号: '',
    備考: '',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async () => {
    if (!form.氏名) { alert('氏名は必須です'); return }
    setLoading(true)
    const { error } = await supabase.from('customers').insert([{
      ...form,
      生年月日: form.生年月日 || null,
      company_id: '00000000-0000-0000-0000-000000000001',
    }])
    if (error) { alert('エラー: ' + error.message); setLoading(false); return }
    router.push('/customers')
  }

  const fieldStyle = {
    width: '100%', padding: '9px 12px', border: '1px solid #ddd',
    borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' as const,
  }
  const labelStyle = { fontSize: '13px', fontWeight: 500, color: '#444', marginBottom: '6px', display: 'block' }

  return (
    <div style={{ padding: '2rem', maxWidth: '700px', margin: '0 auto' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <Link href="/customers" style={{ fontSize: '13px', color: '#888', textDecoration: 'none' }}>← 顧客一覧に戻る</Link>
        <h1 style={{ fontSize: '22px', fontWeight: 700, margin: '8px 0 0' }}>顧客登録</h1>
      </div>
      <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #eee', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <label style={labelStyle}>氏名 <span style={{ color: 'red' }}>*</span></label>
            <input name="氏名" value={form.氏名} onChange={handleChange} placeholder="山田 太郎" style={fieldStyle} />
          </div>
          <div>
            <label style={labelStyle}>氏名カナ</label>
            <input name="氏名カナ" value={form.氏名カナ} onChange={handleChange} placeholder="ヤマダ タロウ" style={fieldStyle} />
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <label style={labelStyle}>電話番号</label>
            <input name="電話番号" value={form.電話番号} onChange={handleChange} placeholder="090-0000-0000" style={fieldStyle} />
          </div>
          <div>
            <label style={labelStyle}>メール</label>
            <input name="メール" value={form.メール} onChange={handleChange} placeholder="example@mail.com" style={fieldStyle} />
          </div>
        </div>
        <div>
          <label style={labelStyle}>住所</label>
          <input name="住所" value={form.住所} onChange={handleChange} placeholder="東京都渋谷区..." style={fieldStyle} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <label style={labelStyle}>生年月日</label>
            <input type="date" name="生年月日" value={form.生年月日} onChange={handleChange} style={fieldStyle} />
          </div>
          <div>
            <label style={labelStyle}>免許証番号</label>
            <input name="免許証番号" value={form.免許証番号} onChange={handleChange} placeholder="123456789012" style={fieldStyle} />
          </div>
        </div>
        <div>
          <label style={labelStyle}>備考</label>
          <textarea name="備考" value={form.備考} onChange={handleChange} rows={3} placeholder="メモがあれば..." style={{ ...fieldStyle, resize: 'vertical' }} />
        </div>
        <button onClick={handleSubmit} disabled={loading} style={{ padding: '12px', background: '#0070f3', color: 'white', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
          {loading ? '保存中...' : '顧客を登録する'}
        </button>
      </div>
    </div>
  )
}