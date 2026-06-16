'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { useProfile } from '@/hooks/useProfile'

export default function CustomersPage() {
  const [customers, setCustomers] = useState<any[]>([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const { isAdmin, profile } = useProfile()

  const load = async () => {
    if (!profile?.company_id) return
    setLoading(true)
    const { data } = await supabase.from('customers').select('*')
      .eq('company_id', profile.company_id)
      .is('deleted_at', null)
      .order('作成日時', { ascending: false })
    setCustomers(data ?? [])
    setLoading(false)
  }

  useEffect(() => { if (profile?.company_id) load() }, [profile])

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`「${name}」を削除BOXに移動しますか？\n関連する商談も削除BOXに移動されます。`)) return
    await supabase.from('customers').update({ deleted_at: new Date().toISOString() }).eq('id', id)
    await supabase.from('negotiations').update({ deleted_at: new Date().toISOString() }).eq('customer_id', id)
    load()
  }

  const filtered = customers.filter(c =>
    !search ||
    (c.氏名      ?? '').includes(search) ||
    (c.氏名カナ  ?? '').includes(search) ||
    (c.電話番号  ?? '').includes(search) ||
    (c.メール    ?? '').includes(search)
  )

  const avatarColor = (name: string) => {
    const colors = ['#e8f0fe','#e6f4ea','#fff3e0','#fce8e6','#f3e8fd']
    const textColors = ['#1a73e8','#1e7e34','#e65100','#c62828','#8e44ad']
    const i = (name?.charCodeAt(0) ?? 0) % colors.length
    return { bg: colors[i], color: textColors[i] }
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1100px', margin: '0 auto' }}>

      {/* ヘッダー */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, margin: 0 }}>顧客一覧</h1>
          <p style={{ fontSize: '13px', color: '#888', margin: '4px 0 0' }}>
            {filtered.length}件表示 / 全{customers.length}件
          </p>
        </div>
        <Link href="/customers/new" style={{ padding: '10px 20px', background: '#0070f3', color: 'white', borderRadius: '8px', textDecoration: 'none', fontSize: '14px', fontWeight: 600 }}>
          ＋ 顧客登録
        </Link>
      </div>

      {/* フィルターバー */}
      <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #eee', padding: '14px 16px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1, maxWidth: '360px' }}>
            <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#bbb', fontSize: '14px', pointerEvents: 'none' }}>🔍</span>
            <input
              type="text"
              placeholder="氏名・電話番号・メールで検索"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ width: '100%', border: '1px solid #e8e8e8', borderRadius: '8px', padding: '8px 12px 8px 32px', fontSize: '13px', outline: 'none', background: '#fafafa', boxSizing: 'border-box' }}
            />
          </div>
          {search && (
            <button onClick={() => setSearch('')}
              style={{ padding: '8px 14px', border: '1px solid #ddd', borderRadius: '8px', background: 'white', fontSize: '12px', cursor: 'pointer', color: '#888' }}>
              ✕ リセット
            </button>
          )}
          <span style={{ fontSize: '13px', color: '#aaa', marginLeft: 'auto' }}>{filtered.length}件</span>
        </div>
      </div>

      {/* テーブル */}
      <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #eee', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '4rem', textAlign: 'center', color: '#bbb', fontSize: '14px' }}>読み込み中...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '4rem', textAlign: 'center', color: '#bbb', fontSize: '14px' }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>👤</div>
            {search ? '検索条件に一致する顧客がいません' : '顧客データがありません'}
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #f0f0f0' }}>
                {['氏名', '電話番号', 'メール', '住所', '登録日', ''].map(h => (
                  <th key={h} style={{ padding: '11px 16px', textAlign: 'left', fontSize: '11px', color: '#9aa0a6', fontWeight: 600, letterSpacing: '0.03em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((c, i) => {
                const av = avatarColor(c.氏名 ?? '')
                return (
                  <tr key={c.id}
                    style={{ borderBottom: i < filtered.length - 1 ? '1px solid #f4f4f4' : 'none', background: 'white' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#fafbff')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'white')}
                  >
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: av.bg, color: av.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700, flexShrink: 0 }}>
                          {(c.氏名 ?? '?')[0]}
                        </div>
                        <div>
                          <div style={{ fontSize: '14px', fontWeight: 600, color: '#111' }}>{c.氏名}</div>
                          {c.氏名カナ && <div style={{ fontSize: '11px', color: '#bbb', marginTop: '1px' }}>{c.氏名カナ}</div>}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '13px', color: '#444' }}>{c.電話番号 ?? '—'}</td>
                    <td style={{ padding: '14px 16px', fontSize: '13px', color: '#666' }}>{c.メール ?? '—'}</td>
                    <td style={{ padding: '14px 16px', fontSize: '12px', color: '#888', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {c.住所 ?? '—'}
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '12px', color: '#bbb', whiteSpace: 'nowrap' }}>
                      {c.作成日時 ? new Date(c.作成日時).toLocaleDateString('ja-JP') : '—'}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <Link href={`/customers/${c.id}`}
                          style={{ padding: '5px 14px', background: '#e8f0fe', color: '#1a73e8', borderRadius: '6px', textDecoration: 'none', fontSize: '12px', fontWeight: 600 }}>
                          詳細
                        </Link>
                        {isAdmin && (
                          <button onClick={() => handleDelete(c.id, c.氏名)}
                            style={{ padding: '5px 12px', background: 'none', border: '1px solid #f0f0f0', color: '#e53e3e', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>
                            削除
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
