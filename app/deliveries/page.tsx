'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function DeliveriesPage() {
  const [deliveries, setDeliveries] = useState<any[]>([])

  useEffect(() => {
    supabase.from('deliveries')
      .select(`*, contracts(*, negotiations(*, customers(氏名, 電話番号), vehicles(db_number, master_makers(name), master_models(name))))`)
      .order('created_at', { ascending: false })
      .then(({ data }) => setDeliveries(data ?? []))
  }, [])

  const stepLabel = (step: number) => {
    const steps = ['契約締結', 'ローン申込', 'OK番号取得', '書類収集', '登録申請', '入金確認', '整備仕上', '納車完了']
    return steps[step - 1] ?? '—'
  }

  const stepColor = (step: number) => {
    if (step >= 8) return { bg: '#e6f4ea', color: '#1e7e34' }
    if (step >= 5) return { bg: '#e8f0fe', color: '#1a73e8' }
    return { bg: '#fff3e0', color: '#e65100' }
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1100px', margin: '0 auto' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 700, margin: 0 }}>納車管理</h1>
        <p style={{ fontSize: '13px', color: '#888', margin: '4px 0 0' }}>{deliveries.length}件</p>
      </div>
      <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #eee', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8f9fa', borderBottom: '1px solid #eee' }}>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', color: '#888', fontWeight: 600 }}>顧客</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', color: '#888', fontWeight: 600 }}>車両</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', color: '#888', fontWeight: 600 }}>現在のステップ</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', color: '#888', fontWeight: 600 }}>契約日</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', color: '#888', fontWeight: 600 }}>納車予定日</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', color: '#888', fontWeight: 600 }}></th>
            </tr>
          </thead>
          <tbody>
            {deliveries.length > 0 ? deliveries.map((d: any, i: number) => {
              const neg = d.contracts?.negotiations
              const customer = neg?.customers
              const vehicle = neg?.vehicles
              const step = d.current_step ?? 1
              return (
                <tr key={d.id} style={{ borderBottom: i < deliveries.length - 1 ? '1px solid #f0f0f0' : 'none' }}>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ fontSize: '14px', fontWeight: 500 }}>{customer?.氏名 ?? '—'}</div>
                    <div style={{ fontSize: '12px', color: '#aaa' }}>{customer?.電話番号 ?? ''}</div>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ fontSize: '13px' }}>{vehicle?.master_makers?.name} {vehicle?.master_models?.name}</div>
                    <div style={{ fontSize: '12px', color: '#aaa' }}>{vehicle?.db_number}</div>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '20px', fontWeight: 500, background: stepColor(step).bg, color: stepColor(step).color }}>
                      Step {step}　{stepLabel(step)}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: '13px', color: '#555' }}>
                    {d.contracts?.contract_date ? new Date(d.contracts.contract_date).toLocaleDateString('ja-JP') : '—'}
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: '13px', color: '#555' }}>
                    {d.contracts?.delivery_date ? new Date(d.contracts.delivery_date).toLocaleDateString('ja-JP') : '—'}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <Link href={`/deliveries/${d.id}`} style={{ fontSize: '13px', color: '#0070f3', textDecoration: 'none' }}>詳細</Link>
                  </td>
                </tr>
              )
            }) : (
              <tr>
                <td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: '#aaa', fontSize: '14px' }}>納車管理データがありません</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}