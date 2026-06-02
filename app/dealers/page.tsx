'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function DealersPage() {
  const [dealers, setDealers] = useState<any[]>([])

  useEffect(() => {
    supabase.from('dealers').select('*').order('作成日時', { ascending: false })
      .then(({ data }) => setDealers(data ?? []))
  }, [])

  const typeColor: any = {
    '仕入先': { bg: '#e6f4ea', color: '#1e7e34' },
    '販売先': { bg: '#e8f0fe', color: '#1a73e8' },
    '両方': { bg: '#fff3e0', color: '#e65100' },
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1100px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, margin: 0 }}>業者一覧</h1>
          <p style={{ fontSize: '13px', color: '#888', margin: '4px 0 0' }}>{dealers.length}件</p>
        </div>
        <Link href="/dealers/new" style={{ padding: '10px 20px', background: '#0070f3', color: 'white', borderRadius: '8px', textDecoration: 'none', fontSize: '14px', fontWeight: 500 }}>+ 業者登録</Link>
      </div>
      <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #eee', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8f9fa', borderBottom: '1px solid #eee' }}>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', color: '#888', fontWeight: 600 }}>業者名</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', color: '#888', fontWeight: 600 }}>区分</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', color: '#888', fontWeight: 600 }}>担当者</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', color: '#888', fontWeight: 600 }}>電話番号</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', color: '#888', fontWeight: 600 }}>メール</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', color: '#888', fontWeight: 600 }}></th>
            </tr>
          </thead>
          <tbody>
            {dealers.length > 0 ? dealers.map((d: any, i: number) => (
              <tr key={d.id} style={{ borderBottom: i < dealers.length - 1 ? '1px solid #f0f0f0' : 'none' }}>
                <td style={{ padding: '14px 16px' }}>
                  <div style={{ fontSize: '14px', fontWeight: 500 }}>{d.業者名}</div>
                  <div style={{ fontSize: '12px', color: '#aaa' }}>{d.業者名カナ ?? ''}</div>
                </td>
                <td style={{ padding: '14px 16px' }}>
                  <span style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '20px', fontWeight: 500, background: typeColor[d.業者区分]?.bg ?? '#f1f3f4', color: typeColor[d.業者区分]?.color ?? '#555' }}>
                    {d.業者区分 ?? '—'}
                  </span>
                </td>
                <td style={{ padding: '14px 16px', fontSize: '13px' }}>{d.担当者名 ?? '—'}</td>
                <td style={{ padding: '14px 16px', fontSize: '13px' }}>{d.電話番号 ?? '—'}</td>
                <td style={{ padding: '14px 16px', fontSize: '13px', color: '#555' }}>{d.メール ?? '—'}</td>
                <td style={{ padding: '14px 16px' }}>
                  <Link href={`/dealers/${d.id}`} style={{ fontSize: '13px', color: '#0070f3', textDecoration: 'none' }}>詳細</Link>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: '#aaa', fontSize: '14px' }}>業者データがありません</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}