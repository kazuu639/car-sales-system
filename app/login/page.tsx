'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async () => {
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) {
      setError('メールアドレスまたはパスワードが間違っています')
    } else {
      window.location.href = '/vehicles'
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: '#f7f8fa'
    }}>
      <div style={{
        background: 'white', borderRadius: '16px', border: '1px solid #eee',
        padding: '2.5rem', width: '100%', maxWidth: '400px'
      }}>
        <h1 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '0.5rem', textAlign: 'center' }}>
          車販管理システム
        </h1>
        <p style={{ fontSize: '13px', color: '#888', textAlign: 'center', marginBottom: '2rem' }}>
          ログインしてください
        </p>

        {error && (
          <div style={{ background: '#fce8e6', color: '#c62828', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', marginBottom: '1rem' }}>
            {error}
          </div>
        )}

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '13px', color: '#555', marginBottom: '6px' }}>メールアドレス</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="example@email.com"
            style={{ width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }}
          />
        </div>

        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', fontSize: '13px', color: '#555', marginBottom: '6px' }}>パスワード</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            style={{ width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }}
          />
        </div>

        <button onClick={handleLogin} disabled={loading}
          style={{
            width: '100%', padding: '12px', background: '#0070f3', color: 'white',
            border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: 500, cursor: 'pointer'
          }}>
          {loading ? 'ログイン中...' : 'ログイン'}
        </button>
      </div>
    </div>
  )
}