'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function ContractPage() {
  const { id } = useParams()
  const router = useRouter()
  const [negotiation, setNegotiation] = useState<any>(null)
  const [vehicle, setVehicle] = useState<any>(null)
  const [customer, setCustomer] = useState<any>(null)
  const [quote, setQuote] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const [form, setForm] = useState({
    contract_date: new Date().toISOString().split('T')[0],
    delivery_date: '',
    payment_type: '現金',
    down_payment: '',
    loan_company: '',
    notes: '',
  })

  useEffect(() => {
    const fetchAll = async () => {
      const { data: neg } = await supabase.from('negotiations')
        .select('*, customers(*), vehicles(*, master_makers(name), master_models(name))')
        .eq('id', id as string).single()
      setNegotiation(neg)
      setCustomer(neg?.customers)
      setVehicle(neg?.vehicles)

      const { data: q } = await supabase.from('quotes')
        .select('*')
        .eq('negotiation_id', id as string)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()
      setQuote(q)
      if (q?.payment_type) setForm(f => ({ ...f, payment_type: q.payment_type }))
    }
    fetchAll()
  }, [id])

  const handleSubmit = async () => {
    setLoading(true)
    const { data: contract, error } = await supabase.from('contracts').insert([{
      negotiation_id: id as string,
      quote_id: quote?.id || null,
      contract_date: form.contract_date,
      delivery_date: form.delivery_date || null,
      payment_type: form.payment_type,
      down_payment: parseInt(form.down_payment) || 0,
      loan_company: form.loan_company,
      status: '締結済',
      notes: form.notes,
    }]).select().single()

    if (error) { alert('エラー: ' + error.message); setLoading(false); return }

    await supabase.from('negotiations').update({ status: '成約' }).eq('id', id as string)

    const { data: delivery, error: de } = await supabase.from('deliveries').insert([{
      contract_id: contract.id,
      current_step: 1,
    }]).select().single()

    if (de) { alert('エラー: ' + de.message); setLoading(false); return }

    router.push(`/deliveries/${delivery.id}`)
  }

  if (!negotiation) return <div style={{ padding: '2rem' }}>読み込み中...</div>

  const grandTotal = quote?.grand_total ?? 0
  const fieldStyle: React.CSSProperties = { width: '100%', padding: '9px 12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }
  const labelStyle: React.CSSProperties = { fontSize: '13px', fontWeight: 500, color: '#444', marginBottom: '6px', display: 'block' }

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <Link href={`/negotiations/${id}`} style={{ fontSize: '13px', color: '#888', textDecoration: 'none' }}>← 商談に戻る</Link>
        <h1 style={{ fontSize: '22px', fontWeight: 700, margin: '8px 0 0' }}>契約書作成</h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
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
        <div style={{ background: '#1a1a2e', borderRadius: '12px', padding: '1rem' }}>
          <div style={{ fontSize: '11px', color: '#aaa', marginBottom: '4px' }}>支払総額</div>
          <div style={{ fontSize: '18px', fontWeight: 700, color: 'white' }}>¥{grandTotal.toLocaleString()}</div>
          <div style={{ fontSize: '11px', color: '#aaa' }}>見積番号 {quote?.quote_number}</div>
        </div>
      </div>

      <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #eee', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <label style={labelStyle}>契約日 <span style={{ color: 'red' }}>*</span></label>
            <input type="date" value={form.contract_date} onChange={e => setForm(f => ({ ...f, contract_date: e.target.value }))} style={fieldStyle} />
          </div>
          <div>
            <label style={labelStyle}>納車予定日</label>
            <input type="date" value={form.delivery_date} onChange={e => setForm(f => ({ ...f, delivery_date: e.target.value }))} style={fieldStyle} />
          </div>
        </div>

        <div>
          <label style={labelStyle}>支払方法</label>
          <div style={{ display: 'flex', gap: '8px' }}>
            {['現金', 'ローン', '頭金あり'].map(t => (
              <button key={t} onClick={() => setForm(f => ({ ...f, payment_type: t }))}
                style={{ padding: '8px 20px', borderRadius: '20px', border: '1.5px solid', fontSize: '13px', cursor: 'pointer', fontWeight: form.payment_type === t ? 600 : 400, background: form.payment_type === t ? '#1a1a2e' : 'white', color: form.payment_type === t ? 'white' : '#555', borderColor: form.payment_type === t ? '#1a1a2e' : '#ddd' }}>
                {t}
              </button>
            ))}
          </div>
        </div>

        {(form.payment_type === 'ローン' || form.payment_type === '頭金あり') && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={labelStyle}>頭金</label>
              <input type="text" value={form.down_payment}
                onChange={e => setForm(f => ({ ...f, down_payment: e.target.value.replace(/[^0-9]/g, '') }))}
                placeholder="0" style={{ ...fieldStyle, textAlign: 'right' }} />
            </div>
            <div>
              <label style={labelStyle}>ローン会社</label>
              <input type="text" value={form.loan_company}
                onChange={e => setForm(f => ({ ...f, loan_company: e.target.value }))}
                placeholder="〇〇ファイナンス" style={fieldStyle} />
            </div>
          </div>
        )}

        <div>
          <label style={labelStyle}>備考</label>
          <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3}
            style={{ ...fieldStyle, resize: 'vertical' }} placeholder="メモがあれば..." />
        </div>

        <button onClick={handleSubmit} disabled={loading}
          style={{ padding: '14px', background: '#00a86b', color: 'white', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
          {loading ? '作成中...' : '✅ 契約を締結して納車管理へ'}
        </button>
      </div>
    </div>
  )
}