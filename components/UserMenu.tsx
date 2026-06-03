'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function UserMenu() {
  const router = useRouter()
  const [profile, setProfile] = useState<any>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(data)
    }
    fetchProfile()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  const roleLabel: any = {
    admin: '管理者',
    manager: '店長',
    staff: 'スタッフ',
    part: 'バイト・パート',
  }

  if (!profile) return null

  return (
    <div style={{ position: 'relative' }}>
      <button onClick={() => setOpen(!open)} style={{
        display: 'flex', alignItems: 'center', gap: '8px',
        background: 'none', border: '0.5px solid #eee', borderRadius: '20px',
        padding: '5px 12px 5px 6px', cursor: 'pointer', fontSize: '13px', color: '#333'
      }}>
        <div style={{
          width: '26px', height: '26px', borderRadius: '50%',
          background: '#0070f3', color: 'white', display: 'flex',
          alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 600
        }}>
          {profile.display_name?.charAt(0).toUpperCase()}
        </div>
        {profile.display_name}
        <span style={{ fontSize: '10px', color: '#888' }}>▼</span>
      </button>

      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 99 }} />
          <div style={{
            position: 'absolute', right: 0, top: '40px', width: '240px',
            background: 'white', border: '1px solid #eee', borderRadius: '12px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)', zIndex: 100, overflow: 'hidden'
          }}>
            <div style={{ padding: '16px', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '40px', height: '40px', borderRadius: '50%',
                background: '#0070f3', color: 'white', display: 'flex',
                alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: 600, flexShrink: 0
              }}>
                {profile.display_name?.charAt(0).toUpperCase()}
              </div>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 600 }}>{profile.display_name}</div>
                <div style={{ fontSize: '11px', color: '#888' }}>{profile.email}</div>
                <div style={{ fontSize: '11px', marginTop: '2px' }}>
                  <span style={{
                    background: profile.role === 'admin' ? '#fce8e6' : '#e8f0fe',
                    color: profile.role === 'admin' ? '#c62828' : '#1a73e8',
                    padding: '1px 6px', borderRadius: '10px', fontSize: '10px'
                  }}>
                    {roleLabel[profile.role] ?? profile.role}
                  </span>
                </div>
              </div>
            </div>

            <div style={{ padding: '8px' }}>
              <div style={{ fontSize: '11px', color: '#aaa', padding: '4px 8px' }}>
                入社日：{profile.join_date ? new Date(profile.join_date).toLocaleDateString('ja-JP') : '未設定'}
              </div>

              <button onClick={() => { setOpen(false); router.push('/profile') }}
                style={{ width: '100%', padding: '8px 12px', textAlign: 'left', background: 'none', border: 'none', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', color: '#333' }}>
                プロフィール編集
              </button>

              {(profile.role === 'admin' || profile.role === 'manager') && (
                <button onClick={() => { setOpen(false); router.push('/admin') }}
                  style={{ width: '100%', padding: '8px 12px', textAlign: 'left', background: 'none', border: 'none', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', color: '#0070f3' }}>
                  ⚙️ 管理画面
                </button>
              )}

              <div style={{ height: '1px', background: '#f0f0f0', margin: '4px 0' }} />

              <button onClick={handleLogout}
                style={{ width: '100%', padding: '8px 12px', textAlign: 'left', background: 'none', border: 'none', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', color: '#e00' }}>
                ログアウト
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}