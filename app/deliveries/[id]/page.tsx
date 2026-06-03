'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

const STEPS = [
  { label: '契約締結', key: null },
  { label: 'ローン申込', key: 'loan_applied' },
  { label: 'OK番号取得', key: 'ok_number' },
  { label: '書類収集', key: 'docs_collected' },
  { label: '登録申請', key: 'registered' },
  { label: '入金確認', key: 'payment_confirmed' },
  { label: '整備仕上', key: 'maintenance_done' },
  { label: '納車', key: null },
]

export default function DeliveryPage() {
  const { id } = useParams()
  const [delivery, setDelivery] = useState<any>(null)
  const [contract, setContract] = useState<any>(null)
  const [vehicle, setVehicle] = useState<any>(null)
  const [customer, setCustomer] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [okNumber, setOkNumber] = useState('')
  const [actualDeliveryDate, setActualDeliveryDate] = useState('')

  const fetchAll = async () => {
    const { data: d } = await supabase.from('deliveries').select('*').eq('id', id as string).single()
    setDelivery(d)
    setOkNumber(d?.ok_number ?? '')
    setActualDeliveryDate(d?.actual_delivery_date ?? '')

    const { data: c } = await supabase.from('contracts')
      .select('*, negotiations(*, customers(*), vehicles(*, master_makers(name), master_models(name)))')
      .eq('id', d?.contract_id).single()
    setContract(c)
    setCustomer(c?.negotiations?.customers)
    setVehicle(c?.negotiations?.vehicles)
  }

  useEffect(() => { fetchAll() }, [id])

  const updateStep = async (key: string, value: boolean) => {
    setLoading(true)
    const nextStep = delivery.current_step + (value ? 1 : -1)
    await supabase.from('deliveries').update({
      [key]: value,
      current_step: Math.max(1, Math.min(8, nextStep)),
    }).eq('id', id as string)
    await fetchAll()
    setLoading(false)
  }

  const saveOkNumber = async () => {
    await supabase.from('deliveries').update({ ok_number: okNumber }).eq('id', id as string)
    alert('OK番号を保存しました')
  }

  const completeDelivery = async () => {
    if (!actualDeliveryDate) { alert('納車日を入力してください'); return }
    setLoading(true)
    await supabase.from('deliveries').update({
      actual_delivery_date: actualDeliveryDate,
      current_step: 8,
    }).eq('id', id as string)
    await supabase.from('contracts').update({ status: '完了' }).eq('id', delivery.contract_id)
    await supabase.from('vehicles').update({ status: '納車済' }).eq('id', vehicle?.id)
    await fetchAll()
    setLoading(false)
    alert('納車完了しました！')
  }

  if (!delivery || !contract) return <div style={{ padding: '2rem' }}>読み込み中...</div>

  const currentStep = delivery.current_step ?? 1
  const isCompleted = contract.status === '完了'

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <Link href="/deliveries" style={{ fontSize: '13px', color: '#888', textDecoration: 'none' }}>← 納車管理一覧</Link>
        <h1 style={{ fontSize: '22px', fontWeight: 700, margin: '8px 0 0' }}>納車管理</h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #eee', padding: '1rem' }}>
          <div style={{ fontSize: '11px', color: '#888', marginBottom: '4px' }}>顧客</div>
          <div style={{ fontSize: '15px', fontWeight: 600 }}>{customer?.氏名}　様</div>
          <div style={{ fontSize: '12px', color: '#aaa' }}>{customer?.電話番号}</div>
        </div>
        <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #eee', padding: '1rem' }}>
          <div style={{ fontSize: '11px', color: '#888', marginBottom: '4px' }}>車両</div>
          <div style={{ fontSize: '14px', fontWeight: 600 }}>{vehicle?.master_makers?.name} {vehicle?.master_models?.name}</div>
          <div style={{ fontSize: '12px', color: '#aaa' }}>{vehicle?.db_number}　{vehicle?.year}年</div>
        </div>
      </div>

      <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #eee', padding: '1.5rem', marginBottom: '1rem' }}>
        <h2 style={{ fontSize: '15px', fontWeight: 600, margin: '0 0 1.5rem' }}>納車進捗</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {STEPS.map((step, i) => {
            const stepNum = i + 1
            const isDone = currentStep > stepNum
            const isCurrent = currentStep === stepNum
            const isFuture = currentStep < stepNum

            return (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: '1rem',
                padding: '12px 16px', borderRadius: '10px',
                background: isDone ? '#e6f4ea' : isCurrent ? '#e8f0fe' : '#f8f9fa',
                border: `1px solid ${isDone ? '#a8d5b5' : isCurrent ? '#93b4f0' : '#eee'}`,
                opacity: isFuture ? 0.6 : 1,
              }}>
                <div style={{
                  width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: isDone ? '#00a86b' : isCurrent ? '#0070f3' : '#ddd',
                  color: 'white', fontSize: '14px', fontWeight: 700,
                }}>
                  {isDone ? '✓' : stepNum}
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: isDone ? '#1e7e34' : isCurrent ? '#0070f3' : '#555' }}>
                    {step.label}
                  </div>

                  {isCurrent && stepNum === 3 && (
                    <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                      <input type="text" value={okNumber} onChange={e => setOkNumber(e.target.value)}
                        placeholder="OK番号を入力"
                        style={{ flex: 1, padding: '6px 10px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '13px' }} />
                      <button onClick={saveOkNumber}
                        style={{ padding: '6px 14px', background: '#0070f3', color: 'white', border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>
                        保存
                      </button>
                    </div>
                  )}
                  {isDone && stepNum === 3 && delivery.ok_number && (
                    <div style={{ fontSize: '12px', color: '#1e7e34', marginTop: '4px' }}>OK番号: {delivery.ok_number}</div>
                  )}

                  {isCurrent && stepNum === 8 && (
                    <div style={{ display: 'flex', gap: '8px', marginTop: '8px', alignItems: 'center' }}>
                      <input type="date" value={actualDeliveryDate} onChange={e => setActualDeliveryDate(e.target.value)}
                        style={{ padding: '6px 10px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '13px' }} />
                      <button onClick={completeDelivery} disabled={loading}
                        style={{ padding: '6px 16px', background: '#00a86b', color: 'white', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                        🎉 納車完了
                      </button>
                    </div>
                  )}
                  {isDone && stepNum === 8 && delivery.actual_delivery_date && (
                    <div style={{ fontSize: '12px', color: '#1e7e34', marginTop: '4px' }}>
                      納車日: {new Date(delivery.actual_delivery_date).toLocaleDateString('ja-JP')}
                    </div>
                  )}
                </div>

                {step.key && isCurrent && !isCompleted && (
                  <button onClick={() => updateStep(step.key!, true)} disabled={loading}
                    style={{ padding: '8px 16px', background: '#0070f3', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                    完了 →
                  </button>
                )}
                {step.key && isDone && !isCompleted && (
                  <button onClick={() => updateStep(step.key!, false)} disabled={loading}
                    style={{ padding: '8px 16px', background: 'white', color: '#888', border: '1px solid #ddd', borderRadius: '8px', fontSize: '12px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                    戻す
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #eee', padding: '1.5rem' }}>
        <h2 style={{ fontSize: '15px', fontWeight: 600, margin: '0 0 1rem' }}>契約情報</h2>
        {[
          { label: '契約日', value: contract.contract_date ? new Date(contract.contract_date).toLocaleDateString('ja-JP') : '—' },
          { label: '納車予定日', value: contract.delivery_date ? new Date(contract.delivery_date).toLocaleDateString('ja-JP') : '—' },
          { label: '支払方法', value: contract.payment_type },
          { label: 'ローン会社', value: contract.loan_company || '—' },
          { label: '頭金', value: contract.down_payment > 0 ? '¥' + contract.down_payment.toLocaleString() : '—' },
        ].map((r, i) => (
          <div key={i} style={{ display: 'flex', borderBottom: '1px solid #f0f0f0', padding: '8px 0' }}>
            <div style={{ width: '120px', fontSize: '13px', color: '#888' }}>{r.label}</div>
            <div style={{ fontSize: '14px' }}>{r.value}</div>
          </div>
        ))}
      </div>
    </div>
  )
}