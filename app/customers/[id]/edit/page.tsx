'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function EditCustomerPage() {
  const { id } = useParams()
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

  useEffect(() => {
    supabase.from('customers').select('*').eq('id', id).single()
      .then(({ data }) => {
        if (data) setForm({
          氏名: data.氏名 ?? '',
          氏名カナ: data.氏名カナ ?? '',
          電話番号: data.電話番号 ?? '',
          メール: data.メール ?? '',
          住所: data.住所 ?? '',
          生年月日: data.生年月日 ?? '',
          免許証番号: data.免許証番号 ?? '',
          備考: data.備考 ?? '',
        })
      })
  }, [id])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async () => {
    if (!form.氏名) { alert('氏名は必須です'); return }
    setLoading(true)
    const { error } = await supabase.from('customers').update({
      ...form,
      生年月日: form.生年月日 || null,
      更新日時: new Date().toISOString(),
    }).eq('id', id)
    if (error) { alert('エラー: ' + error.message); setLoading(false); return }
    router.push(`/customers/${id}`)
  }

  const handleDelete = async () => {
    if (!confirm('この顧客を削除しますか？')) return
    const { error } = await supabase.from('customers').delete().eq('id', id)
    if (error) { alert('エラー: ' + error.message); return }
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
        <Link href={`/customers/${id}`} style={{ fontSize: '13px', color: '#888', textDecoration: 'none' }}>← 詳細に戻る</Link>
        <h1 style={{ fontSize: '22px', fontWeight: 700, margin: '8px 0 0' }}>顧客編集</h1>
      </div>
      <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #eee', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <label style={labelStyle}>氏名 <span style={{ color: 'red' }}>*</span></label>
            <input name="氏名" value={form.氏名} onChange={handleChange} style={fieldStyle} />
          </div>
          <div>
            <label style={labelStyle}>氏名カナ</label>
            <input name="氏名カナ" value={form.氏名カナ} onChange={handleChange} style={fieldStyle} />
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <label style={labelStyle}>電話番号</label>
            <input name="電話番号" value={form.電話番号} onChange={handleChange} style={fieldStyle} />
          </div>
          <div>
            <label style={labelStyle}>メール</label>
            <input name="メール" value={form.メール} onChange={handleChange} style={fieldStyle} />
          </div>
        </div>
        <div>
          <label style={labelStyle}>住所</label>
          <input name="住所" value={form.住所} onChange={handleChange} style={fieldStyle} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <label style={labelStyle}>生年月日</label>
            <input type="date" name="生年月日" value={form.生年月日} onChange={handleChange} style={fieldStyle} />
          </div>
          <div>
            <label style={labelStyle}>免許証番号</label>
            <input name="免許証番号" value={form.免許証番号} onChange={handleChange} style={fieldStyle} />
          </div>
        </div>
        <div>
          <label style={labelStyle}>備考</label>
          <textarea name="備考" value={form.備考} onChange={handleChange} rows={3} style={{ ...fieldStyle, resize: 'vertical' }} />
        </div>
        <button onClick={handleSubmit} disabled={loading} style={{ padding: '12px', background: '#0070f3', color: 'white', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
          {loading ? '保存中...' : '保存する'}
        </button>
        <button onClick={handleDelete} style={{ padding: '12px', background: 'white', color: '#e53e3e', border: '1px solid #e53e3e', borderRadius: '8px', fontSize: '14px', cursor: 'pointer' }}>
          この顧客を削除する
        </button>
      </div>
    </div>
  )
}