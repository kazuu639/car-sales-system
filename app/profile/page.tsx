'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import LoadingOverlay from '@/components/LoadingOverlay'

export default function ProfilePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [loadingOverlay, setLoadingOverlay] = useState(false)
  const [loadingMessage, setLoadingMessage] = useState('処理中...')
  const [profile, setProfile] = useState<any>(null)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(data)
    }
    fetchProfile()
  }, [])

  const handleAvatarChange = (e: any) => {
    const file = e.target.files[0]
    if (!file) return
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  const handleSubmit = async () => {
    setLoadingMessage('保存中...')
    setLoadingOverlay(true)
    setLoadingMessage('保存中...')
    setLoadingOverlay(true)
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    let avatarUrl = profile.avatar_url

    if (avatarFile) {
      const path = `avatars/${user.id}`
      const { error: uploadError } = await supabase.storage
        .from('vehicle-images')
        .upload(path, avatarFile, { upsert: true })
      if (!uploadError) {
        const { data } = supabase.storage.from('vehicle-images').getPublicUrl(path)
        avatarUrl = data.publicUrl
      }
    }

    await supabase.from('profiles').update({
      display_name: profile.display_name,
      join_date: profile.join_date || null,
      avatar_url: avatarUrl,
    }).eq('id', user.id)

    setLoadingOverlay(false)
    setLoading(false)
    router.push('/')
  }

  const roleLabel: any = {
    admin: '管理者',
    manager: '店長',
    staff: 'スタッフ',
    part: 'バイト・パート',
  }

  if (!profile) return <div style={{ padding: '2rem' }}>読み込み中...</div>

  return (
    <div style={{ padding: '2rem', maxWidth: '500px', margin: '0 auto' }}>
      {loadingOverlay && <LoadingOverlay message={loadingMessage} />}
      <a href="/" style={{ fontSize: '13px', color: '#0070f3', textDecoration: 'none' }}>← ホームに戻る</a>
      <h1 style={{ fontSize: '22px', margin: '1rem 0 1.5rem' }}>プロフィール編集</h1>

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px', padding: '16px', background: 'white', borderRadius: '12px', border: '1px solid #eee' }}>
        <div style={{ position: 'relative' }}>
          {avatarPreview || profile.avatar_url ? (
            <img src={avatarPreview ?? profile.avatar_url}
              style={{ width: '64px', height: '64px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #eee' }} alt="avatar" />
          ) : (
            <div style={{
              width: '64px', height: '64px', borderRadius: '50%',
              background: '#0070f3', color: 'white', display: 'flex',
              alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: 600
            }}>
              {profile.display_name?.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <div>
          <div style={{ fontSize: '15px', fontWeight: 600 }}>{profile.display_name}</div>
          <div style={{ fontSize: '12px', color: '#888', marginTop: '2px' }}>{profile.email}</div>
          <div style={{ fontSize: '11px', marginTop: '4px' }}>
            <span style={{
              background: profile.role === 'admin' ? '#fce8e6' : '#e8f0fe',
              color: profile.role === 'admin' ? '#c62828' : '#1a73e8',
              padding: '1px 8px', borderRadius: '10px'
            }}>
              {roleLabel[profile.role] ?? profile.role}
            </span>
          </div>
        </div>
      </div>

      <div style={{ marginBottom: '14px' }}>
        <label style={{ display: 'block', fontSize: '13px', marginBottom: '4px', color: '#555' }}>アバター画像</label>
        <input type="file" accept="image/*" onChange={handleAvatarChange}
          style={{ fontSize: '13px' }} />
      </div>

      <div style={{ marginBottom: '14px' }}>
        <label style={{ display: 'block', fontSize: '13px', marginBottom: '4px', color: '#555' }}>表示名</label>
        <input type="text" value={profile.display_name ?? ''}
          onChange={e => setProfile({ ...profile, display_name: e.target.value })}
          style={{ width: '100%', padding: '9px 12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }} />
      </div>

      <div style={{ marginBottom: '14px' }}>
        <label style={{ display: 'block', fontSize: '13px', marginBottom: '4px', color: '#555' }}>メールアドレス</label>
        <input type="email" value={profile.email ?? ''} disabled
          style={{ width: '100%', padding: '9px 12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px', background: '#f5f5f5', boxSizing: 'border-box' }} />
      </div>

      <div style={{ marginBottom: '24px' }}>
        <label style={{ display: 'block', fontSize: '13px', marginBottom: '4px', color: '#555' }}>入社日</label>
        <input type="date" value={profile.join_date ?? ''}
          onChange={e => setProfile({ ...profile, join_date: e.target.value })}
          style={{ width: '100%', padding: '9px 12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }} />
      </div>

      <button onClick={handleSubmit} disabled={loading}
        style={{ width: '100%', padding: '12px', background: '#0070f3', color: 'white', border: 'none', borderRadius: '8px', fontSize: '15px', cursor: 'pointer' }}>
        {loading ? '保存中...' : '保存する'}
      </button>
    </div>
  )
}