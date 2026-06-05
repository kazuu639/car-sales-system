'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export function useProfile() {
  const [profile, setProfile] = useState<any>(null)
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) supabase.from('profiles').select('*').eq('id', user.id).single()
        .then(({ data }) => setProfile(data))
    })
  }, [])
  const isAdmin = profile?.role === 'admin' || profile?.role === 'manager'
  return { profile, isAdmin }
}
