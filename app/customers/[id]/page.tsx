'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function CustomerDetailPage() {
  const { id } = useParams()
  const [customer, setCustomer] = useState<any>(null)

  useEffect(() => {
    supabase.from('customers').select('*').eq('id', id).single()
      .then(({ data }) => setCustomer(data))
  }, [id])

  if (!customer) return <div style={{ padding: '2rem' }}>読み込み中...</div>

  const row = (label: string, value: any) => (
    <div style={{ display: 'flex', borderBottom: '1px solid #f0f0f0', padding: '12px 0' }}>
      <div style={{ width: '140px', fontSize: '13px', color: '#888', flexShrink: 0 }}>{label}</div>
      <div style={{ fontSize: '14px' }}>{value ?? '—'}</div>
    </div>
  )

  return (
    <div style={{ padding: '2rem', maxWidth: '700px', margin: '0 auto' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <Link href="/customers" style={{ fontSize: '13px', color: '#888', textDecoration: 'none' }}>← 顧客一覧に戻る</Link>
        <h1 style={{ fontSize: '22px', fontWeight: 700, margin: '8px 0 0' }}>{customer.氏名}</h1>
        <p style={{ fontSize: '13px', color: '#aaa', margin: '4px 0 0' }}>{customer.氏名カナ}</p>
      </div>
      <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #eee', padding: '1.5rem' }}>
        {row('電話番号', customer.電話番号)}
        {row('メール', customer.メール)}
        {row('住所', customer.住所)}
        {row('生年月日', customer.生年月日)}
        {row('免許証番号', customer.免許証番号)}
        {row('備考', customer.備考)}
        {row('登録日', customer.作成日時 ? new Date(customer.作成日時).toLocaleDateString('ja-JP') : null)}
      </div>
      <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem' }}>
        <Link href={`/customers/${id}/edit`} style={{ padding: '10px 20px', background: '#0070f3', color: 'white', borderRadius: '8px', textDecoration: 'none', fontSize: '14px' }}>編集</Link>
      </div>
    </div>
  )
}