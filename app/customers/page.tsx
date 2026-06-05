'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { useProfile } from '@/hooks/useProfile'

export default function CustomersPage() {
  const [customers, setCustomers] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const { isAdmin } = useProfile()

  const fetch = async () => {
    const { data } = await supabase.from('customers').select('*')
      .is('deleted_at', null)
      .order('作成日時', { ascending: false })
    setCustomers(data ?? [])
  }

  useEffect(() => { fetch() }, [])

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`「${name}」を削除BOXに移動しますか？\n関連する商談も削除BOXに移動されます。`)) return
    await supabase.from('customers').update({ deleted_at: new Date().toISOString() }).eq('id', id)
    // 関連商談も論理削除
    await supabase.from('negotiations').update({ deleted_at: new Date().toISOString() }).eq('customer_id', id)
    fetch()
  }

  const filtered = customers.filter(c =>
    !search ||
    (c.氏名 ?? '').includes(search) ||
    (c.氏名カナ ?? '').includes(search) ||
    (c.電話番号 ?? '').includes(search) ||
    (c.メール ?? '').includes(search)
  )

  return (
    <div style={{ padding: '2rem', maxWidth: '1100px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, margin: 0 }}>顧客一覧</h1>
          <p style={{ fontSize: '13px', color: '#888', margin: '4px 0 0' }}>{filtered.length}件</p>
        </div>
        <Link href="/customers/new" style={{ padding: '10px 20px', background: '#0070f3', color: 'white', borderRadius: '8px', textDecoration: 'none', fontSize: '14px', fontWeight: 500 }}>+ 顧客登録</Link>
      </div>

      {/* 検索 */}
      <div style={{ marginBottom: '16px' }}>
        <input type="text" placeholder="氏名・電話番号・メールで検索" value={search} onChange={e => setSearch(e.target.value)}
          style={{ width: '300px', border: '1px solid #ddd', borderRadius: '8px', padding: '8px 12px', fontSize: '13px', outline: 'none' }} />
      </div>

      <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #eee', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8f9fa', borderBottom: '1px solid #eee' }}>
              {['氏名', '電話番号', 'メール', '住所', '登録日', ''].map(h => (
                <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', color: '#888', fontWeight: 600 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: '#aaa', fontSize: '14px' }}>顧客データがありません</td></tr>
            ) : filtered.map((c, i) => (
              <tr key={c.id} style={{ borderBottom: i < filtered.length - 1 ? '1px solid #f0f0f0' : 'none' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#fafafa')}
                onMouseLeave={e => (e.currentTarget.style.background = 'white')}
              >
                <td style={{ padding: '14px 16px' }}>
                  <div style={{ fontSize: '14px', fontWeight: 500 }}>{c.氏名}</div>
                  <div style={{ fontSize: '12px', color: '#aaa' }}>{c.氏名カナ ?? ''}</div>
                </td>
                <td style={{ padding: '14px 16px', fontSize: '13px' }}>{c.電話番号 ?? '—'}</td>
                <td style={{ padding: '14px 16px', fontSize: '13px', color: '#555' }}>{c.メール ?? '—'}</td>
                <td style={{ padding: '14px 16px', fontSize: '13px', color: '#555' }}>{c.住所 ?? '—'}</td>
                <td style={{ padding: '14px 16px', fontSize: '12px', color: '#aaa' }}>
                  {c.作成日時 ? new Date(c.作成日時).toLocaleDateString('ja-JP') : '—'}
                </td>
                <td style={{ padding: '14px 16px' }}>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <Link href={`/customers/${c.id}`} style={{ fontSize: '13px', color: '#0070f3', textDecoration: 'none' }}>詳細</Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}