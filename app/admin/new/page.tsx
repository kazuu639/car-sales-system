'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import LoadingOverlay from '@/components/LoadingOverlay'

export default function NewStaffPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [loadingOverlay, setLoadingOverlay] = useState(false)
  const [loadingMessage, setLoadingMessage] = useState('処理中...')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [role, setRole] = useState('staff')
  const [joinDate, setJoinDate] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    setLoadingMessage('登録中...')
    setLoadingOverlay(true)
    setLoading(true)
    setError('')

    const res = await fetch('/api/admin/create-staff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, displayName, role, joinDate }),
    })

    const data = await res.json()
    setLoadingOverlay(false)
    setLoading(false)

    if (!res.ok) {
      setError(data.error ?? 'エラーが発生しました')
    } else {
      router.push('/admin')
    }
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '500px', margin: '0 auto' }}>
      {loadingOverlay && <LoadingOverlay message={loadingMessage} />}
      <a href="/admin" style={{ fontSize: '13px', color: '#0070f3', textDecoration: 'none' }}>← スタッフ管理に戻る</a>
      <h1 style={{ fontSize: '22px', margin: '1rem 0 1.5rem' }}>スタッフ追加</h1>

      {error && (
        <div style={{ background: '#fce8e6', color: '#c62828', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      {[
        ['表示名', displayName, setDisplayName, 'text', '例：田中 太郎'],
        ['メールアドレス', email, setEmail, 'email', 'example@email.com'],
        ['パスワード', password, setPassword, 'password', '8文字以上'],
        ['入社日', joinDate, setJoinDate, 'date', ''],
      ].map(([label, value, setter, type, placeholder]: any) => (
        <div key={label} style={{ marginBottom: '14px' }}>
          <label style={{ display: 'block', fontSize: '13px', marginBottom: '4px', color: '#555' }}>{label}</label>
          <input type={type} value={value} onChange={e => setter(e.target.value)}
            placeholder={placeholder}
            style={{ width: '100%', padding: '9px 12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }} />
        </div>
      ))}

      <div style={{ marginBottom: '24px' }}>
        <label style={{ display: 'block', fontSize: '13px', marginBottom: '4px', color: '#555' }}>権限</label>
        <select value={role} onChange={e => setRole(e.target.value)}
          style={{ width: '100%', padding: '9px 12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px' }}>
          <option value="admin">管理者</option>
          <option value="manager">店長</option>
          <option value="staff">スタッフ</option>
          <option value="part">バイト・パート</option>
        </select>
      </div>

      <button onClick={handleSubmit} disabled={loading}
        style={{ width: '100%', padding: '12px', background: '#0070f3', color: 'white', border: 'none', borderRadius: '8px', fontSize: '15px', cursor: 'pointer' }}>
        {loading ? '追加中...' : 'スタッフを追加する'}
      </button>
    </div>
  )
}