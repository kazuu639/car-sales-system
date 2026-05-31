'use client'

import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function LogoutButton() {
  const router = useRouter()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <button onClick={handleLogout} style={{
      padding: '6px 14px', background: 'white', color: '#555',
      border: '1px solid #ddd', borderRadius: '6px', fontSize: '13px', cursor: 'pointer'
    }}>
      ログアウト
    </button>
  )
}