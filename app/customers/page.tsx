'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function CustomersPage() {
  const [customers, setCustomers] = useState<any[]>([])

  useEffect(() => {
    supabase.from('customers').select('*').order('作成日時', { ascending: false })
      .then(({ data }) => setCustomers(data ?? []))
  }, [])

  return (
    <div style={{ padding: '2rem', maxWidth: '1100px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, margin: 0 }}>顧客一覧</h1>
          <p style={{ fontSize: '13px', color: '#888', margin: '4px 0 0' }}>{customers.length}件</p>
        </div>
        <Link href="/customers/new" style={{ padding: '10px 20px', background: '#0070f3', color: 'white', borderRadius: '8px', textDecoration: 'none', fontSize: '14px', fontWeight: 500 }}>+ 顧客登録</Link>
      </div>
      <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #eee', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8f9fa', borderBottom: '1px solid #eee' }}>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', color: '#888', fontWeight: 600 }}>氏名</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', color: '#888', fontWeight: 600 }}>電話番号</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', color: '#888', fontWeight: 600 }}>メール</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', color: '#888', fontWeight: 600 }}>住所</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', color: '#888', fontWeight: 600 }}>登録日</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', color: '#888', fontWeight: 600 }}></th>
            </tr>
          </thead>
          <tbody>
            {customers.length > 0 ? customers.map((c: any, i: number) => (
              <tr key={c.id} style={{ borderBottom: i < customers.length - 1 ? '1px solid #f0f0f0' : 'none' }}>
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
                  <Link href={`/customers/${c.id}`} style={{ fontSize: '13px', color: '#0070f3', textDecoration: 'none' }}>詳細</Link>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: '#aaa', fontSize: '14px' }}>顧客データがありません</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}