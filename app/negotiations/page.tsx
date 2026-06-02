'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function NegotiationsPage() {
  const [negotiations, setNegotiations] = useState<any[]>([])

  useEffect(() => {
    supabase.from('negotiations')
      .select(`*, customers(氏名, 電話番号), vehicles(db_number, master_models(name), master_makers(name))`)
      .order('created_at', { ascending: false })
      .then(({ data }) => setNegotiations(data ?? []))
  }, [])

  const statusColor: any = {
    '商談中': { bg: '#fff3e0', color: '#e65100' },
    '見積済': { bg: '#e8f0fe', color: '#1a73e8' },
    '成約':   { bg: '#e6f4ea', color: '#1e7e34' },
    '失注':   { bg: '#f1f3f4', color: '#5f6368' },
  }

  const routeIcon: any = {
    'HP': '🌐', '電話': '📞', 'LINE': '💬', 'メール': '📧', 'その他': '📝'
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1100px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, margin: 0 }}>商談一覧</h1>
          <p style={{ fontSize: '13px', color: '#888', margin: '4px 0 0' }}>{negotiations.length}件</p>
        </div>
        <Link href="/negotiations/new" style={{ padding: '10px 20px', background: '#0070f3', color: 'white', borderRadius: '8px', textDecoration: 'none', fontSize: '14px', fontWeight: 500 }}>+ 商談登録</Link>
      </div>
      <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #eee', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8f9fa', borderBottom: '1px solid #eee' }}>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', color: '#888', fontWeight: 600 }}>顧客</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', color: '#888', fontWeight: 600 }}>対象車両</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', color: '#888', fontWeight: 600 }}>経路</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', color: '#888', fontWeight: 600 }}>ステータス</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', color: '#888', fontWeight: 600 }}>登録日</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', color: '#888', fontWeight: 600 }}></th>
            </tr>
          </thead>
          <tbody>
            {negotiations.length > 0 ? negotiations.map((n: any, i: number) => (
              <tr key={n.id} style={{ borderBottom: i < negotiations.length - 1 ? '1px solid #f0f0f0' : 'none' }}>
                <td style={{ padding: '14px 16px' }}>
                  <div style={{ fontSize: '14px', fontWeight: 500 }}>{n.customers?.氏名 ?? '未設定'}</div>
                  <div style={{ fontSize: '12px', color: '#aaa' }}>{n.customers?.電話番号 ?? ''}</div>
                </td>
                <td style={{ padding: '14px 16px', fontSize: '13px' }}>
                  {n.vehicles ? (
                    <div>
                      <div style={{ fontSize: '13px' }}>{n.vehicles.master_makers?.name} {n.vehicles.master_models?.name}</div>
                      <div style={{ fontSize: '12px', color: '#aaa' }}>{n.vehicles.db_number}</div>
                    </div>
                  ) : '未選択'}
                </td>
                <td style={{ padding: '14px 16px', fontSize: '14px' }}>
                  {routeIcon[n.inquiry_route] ?? ''} {n.inquiry_route ?? '—'}
                </td>
                <td style={{ padding: '14px 16px' }}>
                  <span style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '20px', fontWeight: 500, background: statusColor[n.status]?.bg ?? '#f1f3f4', color: statusColor[n.status]?.color ?? '#555' }}>
                    {n.status}
                  </span>
                </td>
                <td style={{ padding: '14px 16px', fontSize: '12px', color: '#aaa' }}>
                  {n.created_at ? new Date(n.created_at).toLocaleDateString('ja-JP') : '—'}
                </td>
                <td style={{ padding: '14px 16px' }}>
                  <Link href={`/negotiations/${n.id}`} style={{ fontSize: '13px', color: '#0070f3', textDecoration: 'none' }}>詳細</Link>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: '#aaa', fontSize: '14px' }}>商談データがありません</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}