'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function DealerDetailPage() {
  const { id } = useParams()
  const [dealer, setDealer] = useState<any>(null)

  useEffect(() => {
    supabase.from('dealers').select('*').eq('id', id).single()
      .then(({ data }) => setDealer(data))
  }, [id])

  if (!dealer) return <div style={{ padding: '2rem' }}>読み込み中...</div>

  const typeColor: any = {
    '仕入先': { bg: '#e6f4ea', color: '#1e7e34' },
    '販売先': { bg: '#e8f0fe', color: '#1a73e8' },
    '両方': { bg: '#fff3e0', color: '#e65100' },
  }

  const row = (label: string, value: any) => (
    <div style={{ display: 'flex', borderBottom: '1px solid #f0f0f0', padding: '12px 0' }}>
      <div style={{ width: '140px', fontSize: '13px', color: '#888', flexShrink: 0 }}>{label}</div>
      <div style={{ fontSize: '14px' }}>{value ?? '—'}</div>
    </div>
  )

  return (
    <div style={{ padding: '2rem', maxWidth: '700px', margin: '0 auto' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <Link href="/dealers" style={{ fontSize: '13px', color: '#888', textDecoration: 'none' }}>← 業者一覧に戻る</Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '8px' }}>
          <h1 style={{ fontSize: '22px', fontWeight: 700, margin: 0 }}>{dealer.業者名}</h1>
          <span style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '20px', fontWeight: 500, background: typeColor[dealer.業者区分]?.bg ?? '#f1f3f4', color: typeColor[dealer.業者区分]?.color ?? '#555' }}>
            {dealer.業者区分}
          </span>
        </div>
        <p style={{ fontSize: '13px', color: '#aaa', margin: '4px 0 0' }}>{dealer.業者名カナ}</p>
      </div>
      <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #eee', padding: '1.5rem' }}>
        {row('担当者名', dealer.担当者名)}
        {row('電話番号', dealer.電話番号)}
        {row('メール', dealer.メール)}
        {row('備考', dealer.備考)}
        {row('登録日', dealer.作成日時 ? new Date(dealer.作成日時).toLocaleDateString('ja-JP') : null)}
      </div>
      <div style={{ marginTop: '1rem' }}>
        <Link href={`/dealers/${id}/edit`} style={{ padding: '10px 20px', background: '#0070f3', color: 'white', borderRadius: '8px', textDecoration: 'none', fontSize: '14px' }}>編集</Link>
      </div>
    </div>
  )
}