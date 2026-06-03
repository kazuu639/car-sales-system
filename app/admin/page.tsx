'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function AdminPage() {
  const [profiles, setProfiles] = useState<any[]>([])

  useEffect(() => {
    supabase.from('profiles').select('*').order('created_at', { ascending: true })
      .then(({ data }) => setProfiles(data ?? []))
  }, [])

  const menus = [
    { label: '会社情報設定', href: '/admin/company', icon: '🏢', desc: '会社名・住所・振込先など', color: '#e8f0fe' },
    { label: 'スタッフ管理', href: '/admin/staff', icon: '👥', desc: 'スタッフの追加・編集・権限', color: '#e6f4ea' },
    { label: 'マスター設定', href: '/admin/masters', icon: '⚙️', desc: 'メーカー・車種・色など', color: '#fff3e0' },
    { label: 'プロフィール設定', href: '/profile', icon: '👤', desc: '自分のプロフィール編集', color: '#f3e8fd' },
  ]

  const roleLabel: any = { admin: '管理者', manager: '店長', staff: 'スタッフ', part: 'バイト・パート' }
  const roleColor: any = {
    admin: { bg: '#fce8e6', color: '#c62828' },
    manager: { bg: '#fff3e0', color: '#e65100' },
    staff: { bg: '#e8f0fe', color: '#1a73e8' },
    part: { bg: '#f1f3f4', color: '#5f6368' },
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <Link href="/" style={{ fontSize: '13px', color: '#888', textDecoration: 'none' }}>← ホームに戻る</Link>
        <h1 style={{ fontSize: '22px', fontWeight: 700, margin: '8px 0 0' }}>管理画面</h1>
        <p style={{ fontSize: '13px', color: '#888', margin: '4px 0 0' }}>システム設定・スタッフ管理</p>
      </div>

      {/* メニュー */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '2rem' }}>
        {menus.map((m, i) => (
          <Link key={i} href={m.href} style={{
            background: m.color, borderRadius: '12px', border: '1px solid #eee',
            padding: '1.5rem 1rem', textDecoration: 'none', color: '#333',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', textAlign: 'center'
          }}>
            <span style={{ fontSize: '32px' }}>{m.icon}</span>
            <span style={{ fontSize: '14px', fontWeight: 600 }}>{m.label}</span>
            <span style={{ fontSize: '11px', color: '#888' }}>{m.desc}</span>
          </Link>
        ))}
      </div>

      {/* スタッフ一覧 */}
      <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #eee', overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.5rem', borderBottom: '1px solid #eee' }}>
          <div style={{ fontSize: '15px', fontWeight: 600 }}>スタッフ一覧</div>
          <Link href="/admin/new" style={{ padding: '8px 16px', background: '#0070f3', color: 'white', borderRadius: '8px', textDecoration: 'none', fontSize: '13px', fontWeight: 500 }}>
            ＋ スタッフ追加
          </Link>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8f9fa', borderBottom: '1px solid #eee' }}>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', color: '#888', fontWeight: 600 }}>名前</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', color: '#888', fontWeight: 600 }}>メールアドレス</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', color: '#888', fontWeight: 600 }}>権限</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', color: '#888', fontWeight: 600 }}>入社日</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', color: '#888', fontWeight: 600 }}>操作</th>
            </tr>
          </thead>
          <tbody>
            {profiles.map((p, i) => (
              <tr key={p.id} style={{ borderBottom: i < profiles.length - 1 ? '1px solid #f0f0f0' : 'none' }}>
                <td style={{ padding: '14px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#0070f3', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 600 }}>
                      {p.display_name?.charAt(0).toUpperCase()}
                    </div>
                    <span style={{ fontSize: '14px', fontWeight: 500 }}>{p.display_name}</span>
                  </div>
                </td>
                <td style={{ padding: '14px 16px', fontSize: '13px', color: '#888' }}>{p.email}</td>
                <td style={{ padding: '14px 16px' }}>
                  <span style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '20px', fontWeight: 500, background: roleColor[p.role]?.bg ?? '#f1f3f4', color: roleColor[p.role]?.color ?? '#5f6368' }}>
                    {roleLabel[p.role] ?? p.role}
                  </span>
                </td>
                <td style={{ padding: '14px 16px', fontSize: '13px', color: '#888' }}>
                  {p.join_date ? new Date(p.join_date).toLocaleDateString('ja-JP') : '未設定'}
                </td>
                <td style={{ padding: '14px 16px' }}>
                  <Link href={`/admin/${p.id}`} style={{ fontSize: '12px', padding: '5px 12px', border: '1px solid #ddd', borderRadius: '6px', textDecoration: 'none', color: '#555' }}>編集</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}