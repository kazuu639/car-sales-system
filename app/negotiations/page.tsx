'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { useProfile } from '@/hooks/useProfile'

const SOURCE_MAP: any = {
  carsensor: 'カーセンサー', goo: 'グーネット', hp: 'HP', x: 'X',
  instagram: 'Instagram', youtube: 'YouTube', line: 'LINE',
  tel: '📞 電話', visit: '来店', referral: '紹介', other: 'その他'
}

const STATUS_COLOR: any = {
  '商談中': { bg: '#fff3e0', color: '#e65100' },
  '見積済': { bg: '#e8f0fe', color: '#1a73e8' },
  '成約':   { bg: '#e6f4ea', color: '#1e7e34' },
  '失注':   { bg: '#f1f3f4', color: '#5f6368' },
}

export default function NegotiationsPage() {
  const [negotiations, setNegotiations] = useState<any[]>([])
  const [filterStatus, setFilterStatus] = useState('all')
  const { isAdmin } = useProfile()

  const fetch = async () => {
    const { data } = await supabase.from('negotiations')
      .select('*, customers(氏名, 電話番号), vehicles(db_number, master_models(name), master_makers(name))')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
    setNegotiations(data ?? [])
  }

  useEffect(() => { fetch() }, [])

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`「${name}」の商談を削除BOXに移動しますか？\n関連する契約・納車情報も移動されます。`)) return
    await supabase.from('negotiations').update({ deleted_at: new Date().toISOString() }).eq('id', id)
    fetch()
  }

  const filtered = negotiations.filter(n =>
    filterStatus === 'all' || n.status === filterStatus
  )

  return (
    <div style={{ padding: '2rem', maxWidth: '1100px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, margin: 0 }}>商談一覧</h1>
          <p style={{ fontSize: '13px', color: '#888', margin: '4px 0 0' }}>{filtered.length}件</p>
        </div>
        <Link href="/negotiations/new" style={{ padding: '10px 20px', background: '#0070f3', color: 'white', borderRadius: '8px', textDecoration: 'none', fontSize: '14px', fontWeight: 500 }}>+ 商談登録</Link>
      </div>

      {/* フィルター */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        {['all', '商談中', '見積済', '成約', '失注'].map(s => (
          <button key={s} onClick={() => setFilterStatus(s)} style={{
            padding: '6px 16px', borderRadius: '20px', border: 'none', fontSize: '13px', fontWeight: 500, cursor: 'pointer',
            background: filterStatus === s ? '#0070f3' : '#f1f3f4',
            color: filterStatus === s ? 'white' : '#555',
          }}>{s === 'all' ? 'すべて' : s}</button>
        ))}
      </div>

      <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #eee', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8f9fa', borderBottom: '1px solid #eee' }}>
              {['顧客', '対象車両', '経路', 'ステータス', '登録日', ''].map(h => (
                <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', color: '#888', fontWeight: 600 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: '#aaa', fontSize: '14px' }}>商談データがありません</td></tr>
            ) : filtered.map((n, i) => (
              <tr key={n.id} style={{ borderBottom: i < filtered.length - 1 ? '1px solid #f0f0f0' : 'none' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#fafafa')}
                onMouseLeave={e => (e.currentTarget.style.background = 'white')}
              >
                <td style={{ padding: '14px 16px' }}>
                  <div style={{ fontSize: '14px', fontWeight: 500 }}>{n.customers?.氏名 ?? '未設定'}</div>
                  <div style={{ fontSize: '12px', color: '#aaa' }}>{n.customers?.電話番号 ?? ''}</div>
                </td>
                <td style={{ padding: '14px 16px', fontSize: '13px' }}>
                  {n.vehicles ? (
                    <div>
                      <div>{n.vehicles.master_makers?.name} {n.vehicles.master_models?.name}</div>
                      <div style={{ fontSize: '12px', color: '#aaa' }}>{n.vehicles.db_number}</div>
                    </div>
                  ) : '未選択'}
                </td>
                <td style={{ padding: '14px 16px', fontSize: '13px', color: '#555' }}>
                  {SOURCE_MAP[n.source] ?? n.inquiry_route ?? '—'}
                </td>
                <td style={{ padding: '14px 16px' }}>
                  <span style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '20px', fontWeight: 500, background: STATUS_COLOR[n.status]?.bg ?? '#f1f3f4', color: STATUS_COLOR[n.status]?.color ?? '#555' }}>
                    {n.status}
                  </span>
                </td>
                <td style={{ padding: '14px 16px', fontSize: '12px', color: '#aaa' }}>
                  {n.created_at ? new Date(n.created_at).toLocaleDateString('ja-JP') : '—'}
                </td>
                <td style={{ padding: '14px 16px' }}>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <Link href={`/negotiations/${n.id}`} style={{ fontSize: '13px', color: '#0070f3', textDecoration: 'none' }}>詳細</Link>
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