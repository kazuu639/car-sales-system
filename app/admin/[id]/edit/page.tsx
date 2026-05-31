'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'

export default function EditStaffPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const [loading, setLoading] = useState(false)
  const [profile, setProfile] = useState<any>(null)

  useEffect(() => {
    supabase.from('profiles').select('*').eq('id', id).single()
      .then(({ data }) => setProfile(data))
  }, [id])

  const handleSubmit = async () => {
    setLoading(true)
    await supabase.from('profiles').update({
      display_name: profile.display_name,
      role: profile.role,
      join_date: profile.join_date || null,
    }).eq('id', id)
    setLoading(false)
    router.push('/admin')
  }

  const handleDelete = async () => {
    if (!confirm('このスタッフを削除しますか？')) return
    await supabase.from('profiles').delete().eq('id', id)
    router.push('/admin')
  }

  if (!profile) return <div style={{ padding: '2rem' }}>読み込み中...</div>

  return (
    <div style={{ padding: '2rem', maxWidth: '500px', margin: '0 auto' }}>
      <a href="/admin" style={{ fontSize: '13px', color: '#0070f3', textDecoration: 'none' }}>← スタッフ管理に戻る</a>
      <h1 style={{ fontSize: '22px', margin: '1rem 0 1.5rem' }}>スタッフ編集</h1>

      <div style={{ marginBottom: '14px' }}>
        <label style={{ display: 'block', fontSize: '13px', marginBottom: '4px', color: '#555' }}>メールアドレス</label>
        <input type="email" value={profile.email ?? ''} disabled
          style={{ width: '100%', padding: '9px 12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px', background: '#f5f5f5', boxSizing: 'border-box' }} />
      </div>

      <div style={{ marginBottom: '14px' }}>
        <label style={{ display: 'block', fontSize: '13px', marginBottom: '4px', color: '#555' }}>表示名</label>
        <input type="text" value={profile.display_name ?? ''}
          onChange={e => setProfile({ ...profile, display_name: e.target.value })}
          style={{ width: '100%', padding: '9px 12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }} />
      </div>

      <div style={{ marginBottom: '14px' }}>
        <label style={{ display: 'block', fontSize: '13px', marginBottom: '4px', color: '#555' }}>権限</label>
        <select value={profile.role ?? 'staff'}
          onChange={e => setProfile({ ...profile, role: e.target.value })}
          style={{ width: '100%', padding: '9px 12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px' }}>
          <option value="admin">管理者</option>
          <option value="manager">店長</option>
          <option value="staff">スタッフ</option>
          <option value="part">バイト・パート</option>
        </select>
      </div>

      <div style={{ marginBottom: '24px' }}>
        <label style={{ display: 'block', fontSize: '13px', marginBottom: '4px', color: '#555' }}>入社日</label>
        <input type="date" value={profile.join_date ?? ''}
          onChange={e => setProfile({ ...profile, join_date: e.target.value })}
          style={{ width: '100%', padding: '9px 12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }} />
      </div>

      <button onClick={handleSubmit} disabled={loading}
        style={{ width: '100%', padding: '12px', background: '#0070f3', color: 'white', border: 'none', borderRadius: '8px', fontSize: '15px', cursor: 'pointer', marginBottom: '12px' }}>
        {loading ? '保存中...' : '保存する'}
      </button>

      <button onClick={handleDelete}
        style={{ width: '100%', padding: '12px', background: 'white', color: '#e00', border: '1px solid #e00', borderRadius: '8px', fontSize: '15px', cursor: 'pointer' }}>
        このスタッフを削除する
      </button>
    </div>
  )
}