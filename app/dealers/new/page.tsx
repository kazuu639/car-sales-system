'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, getCurrentUserScope } from '@/lib/supabase'
import Link from 'next/link'
import LoadingOverlay from '@/components/LoadingOverlay'

export default function NewDealerPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [loadingOverlay, setLoadingOverlay] = useState(false)
  const [loadingMessage, setLoadingMessage] = useState('処理中...')
  const [form, setForm] = useState({
    業者名: '',
    業者名カナ: '',
    担当者名: '',
    電話番号: '',
    メール: '',
    業者区分: '仕入先',
    備考: '',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async () => {
    if (!form.業者名) { alert('業者名は必須です'); return }
    setLoadingMessage('登録中...')
    setLoadingOverlay(true)
    setLoading(true)
    const scope = await getCurrentUserScope()
    if (!scope) { alert('ログイン情報の取得に失敗しました'); setLoadingOverlay(false); setLoading(false); return }
    const { error } = await supabase.from('dealers').insert([{
      ...form,
      company_id: scope.company_id,
      branch_id:  scope.branch_id,
    }])
    if (error) { alert('エラー: ' + error.message); setLoadingOverlay(false); setLoading(false); return }
    setLoadingOverlay(false)
    router.push('/dealers')
  }

  const fieldStyle = {
    width: '100%', padding: '9px 12px', border: '1px solid #ddd',
    borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' as const,
  }
  const labelStyle = { fontSize: '13px', fontWeight: 500, color: '#444', marginBottom: '6px', display: 'block' }

  return (
    <div style={{ padding: '2rem', maxWidth: '700px', margin: '0 auto' }}>
      {loadingOverlay && <LoadingOverlay message={loadingMessage} />}
      <div style={{ marginBottom: '1.5rem' }}>
        <Link href="/dealers" style={{ fontSize: '13px', color: '#888', textDecoration: 'none' }}>← 業者一覧に戻る</Link>
        <h1 style={{ fontSize: '22px', fontWeight: 700, margin: '8px 0 0' }}>業者登録</h1>
      </div>
      <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #eee', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <label style={labelStyle}>業者名 <span style={{ color: 'red' }}>*</span></label>
            <input name="業者名" value={form.業者名} onChange={handleChange} placeholder="株式会社〇〇" style={fieldStyle} />
          </div>
          <div>
            <label style={labelStyle}>業者名カナ</label>
            <input name="業者名カナ" value={form.業者名カナ} onChange={handleChange} placeholder="カブシキガイシャ〇〇" style={fieldStyle} />
          </div>
        </div>
        <div>
          <label style={labelStyle}>業者区分</label>
          <div style={{ display: 'flex', gap: '8px' }}>
            {['仕入先', '販売先', '両方'].map(t => (
              <button key={t} onClick={() => setForm({ ...form, 業者区分: t })}
                style={{ padding: '8px 20px', borderRadius: '20px', border: '1.5px solid', fontSize: '13px', cursor: 'pointer', fontWeight: form.業者区分 === t ? 600 : 400, background: form.業者区分 === t ? '#0070f3' : 'white', color: form.業者区分 === t ? 'white' : '#555', borderColor: form.業者区分 === t ? '#0070f3' : '#ddd' }}>
                {t}
              </button>
            ))}
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <label style={labelStyle}>担当者名</label>
            <input name="担当者名" value={form.担当者名} onChange={handleChange} placeholder="山田 太郎" style={fieldStyle} />
          </div>
          <div>
            <label style={labelStyle}>電話番号</label>
            <input name="電話番号" value={form.電話番号} onChange={handleChange} placeholder="03-0000-0000" style={fieldStyle} />
          </div>
        </div>
        <div>
          <label style={labelStyle}>メール</label>
          <input name="メール" value={form.メール} onChange={handleChange} placeholder="example@company.com" style={fieldStyle} />
        </div>
        <div>
          <label style={labelStyle}>備考</label>
          <textarea name="備考" value={form.備考} onChange={handleChange} rows={3} style={{ ...fieldStyle, resize: 'vertical' }} />
        </div>
        <button onClick={handleSubmit} disabled={loading} style={{ padding: '12px', background: '#0070f3', color: 'white', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
          {loading ? '保存中...' : '業者を登録する'}
        </button>
      </div>
    </div>
  )
}