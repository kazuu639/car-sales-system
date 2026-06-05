'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function DeliveryDetailPage() {
  const { id } = useParams()
  const [delivery, setDelivery] = useState<any>(null)
  const [contract, setContract] = useState<any>(null)
  const [vehicle, setVehicle] = useState<any>(null)
  const [customer, setCustomer] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [actualDeliveryDate, setActualDeliveryDate] = useState('')

  const fetchAll = async () => {
    const { data: d } = await supabase.from('deliveries').select('*').eq('id', id as string).single()
    setDelivery(d)
    setActualDeliveryDate(d?.actual_delivery_date ?? '')
    const { data: c } = await supabase.from('contracts')
      .select('*, negotiations(*, customers(*), vehicles(*, master_makers(name), master_models(name)))')
      .eq('id', d?.contract_id).single()
    setContract(c)
    setCustomer(c?.negotiations?.customers)
    setVehicle(c?.negotiations?.vehicles)
  }

  useEffect(() => { fetchAll() }, [id])

  const update = async (fields: Record<string, any>) => {
    setLoading(true)
    await supabase.from('deliveries').update(fields).eq('id', id as string)
    await fetchAll()
    setLoading(false)
  }

  const toggle = (key: string) => update({ [key]: !delivery[key] })

  const completeDelivery = async () => {
    if (!actualDeliveryDate) { alert('納車日を入力してください'); return }
    if (!canDeliver) { alert('3つの条件が全て完了していません'); return }
    setLoading(true)
    await supabase.from('deliveries').update({ actual_delivery_date: actualDeliveryDate, current_step: 8 }).eq('id', id as string)
    await supabase.from('contracts').update({ status: '完了' }).eq('id', delivery.contract_id)
    await supabase.from('vehicles').update({ status: '納車済' }).eq('id', vehicle?.id)
    await fetchAll()
    setLoading(false)
  }

  if (!delivery || !contract) return <div style={{ padding: '2rem' }}>読み込み中...</div>

  const isCompleted = contract.status === '完了'
  const days = contract.contract_date ? Math.floor((Date.now() - new Date(contract.contract_date).getTime()) / 86400000) : null
  const pct = days !== null ? Math.min(Math.round((days / 14) * 100), 100) : 0

  // 3軸の完了判定
  const paymentOK = delivery.payment_confirmed
  const docsOK = delivery.doc_commission && delivery.doc_seal && delivery.doc_parking && delivery.registration_number
  const tasksOK = delivery.task_loan_apply && delivery.task_inspection && delivery.task_maintenance && delivery.task_cleaning
  const canDeliver = paymentOK && docsOK && tasksOK

  const CheckItem = ({ label, checked, onToggle, disabled = false, children }: any) => (
    <div style={{ padding: '10px 12px', borderRadius: '8px', background: checked ? '#e6f4ea' : '#f8f9fa', border: `1px solid ${checked ? '#a8d5b5' : '#eee'}`, marginBottom: '8px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <button onClick={onToggle} disabled={disabled || isCompleted}
          style={{ width: '22px', height: '22px', borderRadius: '50%', border: `2px solid ${checked ? '#1e7e34' : '#ddd'}`, background: checked ? '#1e7e34' : 'white', cursor: isCompleted ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '12px', color: 'white', fontWeight: 700 }}>
          {checked ? '✓' : ''}
        </button>
        <span style={{ fontSize: '13px', fontWeight: 500, color: checked ? '#1e7e34' : '#555', flex: 1 }}>{label}</span>
      </div>
      {children}
    </div>
  )

  const SectionHeader = ({ num, label, ok }: { num: string; label: string; ok: boolean }) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: ok ? '#1e7e34' : '#0070f3', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700 }}>
          {num}
        </div>
        <span style={{ fontSize: '15px', fontWeight: 600 }}>{label}</span>
      </div>
      <span style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '20px', fontWeight: 600, background: ok ? '#e6f4ea' : '#f1f3f4', color: ok ? '#1e7e34' : '#888' }}>
        {ok ? '✓ 完了' : '進行中'}
      </span>
    </div>
  )

  return (
    <div style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
      {/* ヘッダー */}
      <div style={{ marginBottom: '1.5rem' }}>
        <Link href="/deliveries" style={{ fontSize: '13px', color: '#888', textDecoration: 'none' }}>← 納車管理一覧</Link>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '8px' }}>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: 700, margin: 0 }}>{customer?.氏名} 様の納車</h1>
            <p style={{ fontSize: '13px', color: '#888', margin: '4px 0 0' }}>{vehicle?.master_makers?.name} {vehicle?.master_models?.name}　{vehicle?.db_number}</p>
          </div>
          {isCompleted ? (
            <span style={{ fontSize: '14px', padding: '8px 20px', borderRadius: '20px', background: '#e6f4ea', color: '#1e7e34', fontWeight: 700 }}>✓ 納車完了</span>
          ) : canDeliver ? (
            <span style={{ fontSize: '14px', padding: '8px 20px', borderRadius: '20px', background: '#e8f0fe', color: '#1a73e8', fontWeight: 700 }}>🚗 納車可能！</span>
          ) : (
            <span style={{ fontSize: '14px', padding: '8px 20px', borderRadius: '20px', background: '#fff3e0', color: '#e65100', fontWeight: 700 }}>進行中</span>
          )}
        </div>
      </div>

      {/* 進行メーター */}
      <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #eee', padding: '16px 20px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <div style={{ display: 'flex', gap: '24px', fontSize: '13px' }}>
            <span>契約日: <strong>{contract.contract_date ? new Date(contract.contract_date).toLocaleDateString('ja-JP') : '—'}</strong></span>
            <span>納車予定: <strong>{delivery.delivery_scheduled_date ? new Date(delivery.delivery_scheduled_date).toLocaleDateString('ja-JP') : contract.delivery_date ? new Date(contract.delivery_date).toLocaleDateString('ja-JP') : '—'}</strong></span>
            {days !== null && <span style={{ color: pct >= 100 ? '#e53e3e' : '#888' }}>契約から <strong>{days}日目</strong>（2週間ベース）</span>}
          </div>
          <span style={{ fontSize: '13px', fontWeight: 600, color: pct >= 100 ? '#e53e3e' : '#1a73e8' }}>{pct}%</span>
        </div>
        <div style={{ height: '8px', background: '#f0f0f0', borderRadius: '4px' }}>
          <div style={{ width: `${pct}%`, height: '100%', background: pct >= 100 ? '#e53e3e' : pct >= 70 ? '#e65100' : '#1a73e8', borderRadius: '4px', transition: 'width 0.3s' }} />
        </div>

        {/* 3軸サマリー */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginTop: '12px' }}>
          {[
            { label: '① 入金確認', ok: paymentOK },
            { label: '② 書類・名変', ok: docsOK },
            { label: '③ 契約業務', ok: tasksOK },
          ].map(s => (
            <div key={s.label} style={{ padding: '8px 12px', borderRadius: '8px', background: s.ok ? '#e6f4ea' : '#f8f9fa', border: `1px solid ${s.ok ? '#a8d5b5' : '#eee'}`, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '14px' }}>{s.ok ? '✅' : '⬜'}</span>
              <span style={{ fontSize: '12px', fontWeight: 500, color: s.ok ? '#1e7e34' : '#888' }}>{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>

        {/* ① 入金確認 */}
        <div style={{ background: 'white', borderRadius: '12px', border: `1px solid ${paymentOK ? '#a8d5b5' : '#eee'}`, padding: '20px' }}>
          <SectionHeader num="1" label="入金確認" ok={paymentOK} />

          <div style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '12px', color: '#888', fontWeight: 500 }}>支払方法</label>
            <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
              {['現金', 'ローン'].map(t => (
                <button key={t} onClick={() => !isCompleted && update({ payment_type: t })}
                  style={{ flex: 1, padding: '6px', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 500, cursor: isCompleted ? 'default' : 'pointer', background: delivery.payment_type === t ? '#0070f3' : '#f1f3f4', color: delivery.payment_type === t ? 'white' : '#555' }}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          {delivery.payment_type === 'ローン' && (
            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '12px', color: '#888', fontWeight: 500 }}>OK番号</label>
              <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                <input type="text" defaultValue={delivery.ok_number_value ?? ''} id="ok-number"
                  placeholder="OK番号を入力"
                  style={{ flex: 1, border: '1px solid #ddd', borderRadius: '6px', padding: '6px 10px', fontSize: '12px' }} />
                <button onClick={() => {
                  const val = (document.getElementById('ok-number') as HTMLInputElement)?.value
                  update({ ok_number_value: val })
                }} style={{ padding: '6px 12px', background: '#0070f3', color: 'white', border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>保存</button>
              </div>
              {delivery.ok_number_value && <div style={{ fontSize: '11px', color: '#1e7e34', marginTop: '4px' }}>OK番号: {delivery.ok_number_value}</div>}
            </div>
          )}

          <CheckItem label="入金確認済み" checked={delivery.payment_confirmed} onToggle={() => toggle('payment_confirmed')}>
            {delivery.payment_type === 'ローン' && !delivery.ok_number_value && (
              <div style={{ fontSize: '11px', color: '#e65100', marginTop: '4px', marginLeft: '32px' }}>⚠ OK番号を先に入力してください</div>
            )}
          </CheckItem>
        </div>

        {/* ② 名義変更・書類 */}
        <div style={{ background: 'white', borderRadius: '12px', border: `1px solid ${docsOK ? '#a8d5b5' : '#eee'}`, padding: '20px' }}>
          <SectionHeader num="2" label="書類・名義変更" ok={docsOK} />

          <CheckItem label="委任状　受取済" checked={delivery.doc_commission} onToggle={() => toggle('doc_commission')} />
          <CheckItem label="印鑑証明　受取済" checked={delivery.doc_seal} onToggle={() => toggle('doc_seal')} />
          <CheckItem label="車庫証明　受取済" checked={delivery.doc_parking} onToggle={() => toggle('doc_parking')} />

          <div style={{ marginTop: '12px' }}>
            <label style={{ fontSize: '12px', color: '#888', fontWeight: 500 }}>登録済み車検証番号</label>
            <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
              <input type="text" defaultValue={delivery.registration_number ?? ''} id="reg-number"
                placeholder="車検証番号を入力"
                style={{ flex: 1, border: '1px solid #ddd', borderRadius: '6px', padding: '6px 10px', fontSize: '12px' }} />
              <button onClick={() => {
                const val = (document.getElementById('reg-number') as HTMLInputElement)?.value
                update({ registration_number: val })
              }} style={{ padding: '6px 12px', background: '#0070f3', color: 'white', border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>保存</button>
            </div>
            {delivery.registration_number && (
              <div style={{ fontSize: '11px', color: '#1e7e34', marginTop: '4px' }}>✓ {delivery.registration_number}</div>
            )}
          </div>
        </div>

        {/* ③ 契約業務 */}
        <div style={{ background: 'white', borderRadius: '12px', border: `1px solid ${tasksOK ? '#a8d5b5' : '#eee'}`, padding: '20px' }}>
          <SectionHeader num="3" label="契約業務" ok={tasksOK} />

          <CheckItem label="ローン申込　完了" checked={delivery.task_loan_apply} onToggle={() => toggle('task_loan_apply')} />
          <CheckItem label="車検・登録　完了" checked={delivery.task_inspection} onToggle={() => toggle('task_inspection')} />
          <CheckItem label="整備・仕上　完了" checked={delivery.task_maintenance} onToggle={() => toggle('task_maintenance')} />
          <CheckItem label="クリーニング　完了" checked={delivery.task_cleaning} onToggle={() => toggle('task_cleaning')} />

          <div style={{ marginTop: '8px' }}>
            <label style={{ fontSize: '12px', color: '#888', fontWeight: 500 }}>担当者</label>
            <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
              <input type="text" defaultValue={delivery.assigned_to ?? ''} id="assigned"
                placeholder="担当者名"
                style={{ flex: 1, border: '1px solid #ddd', borderRadius: '6px', padding: '6px 10px', fontSize: '12px' }} />
              <button onClick={() => {
                const val = (document.getElementById('assigned') as HTMLInputElement)?.value
                update({ assigned_to: val })
              }} style={{ padding: '6px 12px', background: '#0070f3', color: 'white', border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>保存</button>
            </div>
          </div>
        </div>
      </div>

      {/* 納車完了 */}
      {!isCompleted ? (
        <div style={{ background: canDeliver ? '#e8f0fe' : '#f8f9fa', borderRadius: '12px', border: `1px solid ${canDeliver ? '#93b4f0' : '#eee'}`, padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 600, color: canDeliver ? '#1a73e8' : '#888', marginBottom: '4px' }}>
              {canDeliver ? '🚗 納車準備完了！納車日を入力してください' : '納車には3つの条件をすべて完了させてください'}
            </div>
            {!canDeliver && (
              <div style={{ fontSize: '12px', color: '#aaa' }}>
                {!paymentOK && '① 入金確認 '}
                {!docsOK && '② 書類・名変 '}
                {!tasksOK && '③ 契約業務 '}
                が未完了です
              </div>
            )}
          </div>
          {canDeliver && (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input type="date" value={actualDeliveryDate} onChange={e => setActualDeliveryDate(e.target.value)}
                style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '8px 12px', fontSize: '13px' }} />
              <button onClick={completeDelivery} disabled={loading}
                style={{ padding: '10px 24px', background: '#00a86b', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}>
                🎉 納車完了
              </button>
            </div>
          )}
        </div>
      ) : (
        <div style={{ background: '#e6f4ea', borderRadius: '12px', border: '1px solid #a8d5b5', padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 700, color: '#1e7e34' }}>✅ 納車完了</div>
            {delivery.actual_delivery_date && (
              <div style={{ fontSize: '13px', color: '#1e7e34', marginTop: '4px' }}>
                納車日: {new Date(delivery.actual_delivery_date).toLocaleDateString('ja-JP')}
              </div>
            )}
          </div>
          <Link href="/deliveries" style={{ padding: '10px 20px', background: '#1e7e34', color: 'white', borderRadius: '8px', textDecoration: 'none', fontSize: '14px', fontWeight: 500 }}>
            一覧に戻る
          </Link>
        </div>
      )}

      {/* 契約情報 */}
      <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #eee', padding: '20px', marginTop: '16px' }}>
        <h2 style={{ fontSize: '14px', fontWeight: 600, margin: '0 0 12px' }}>契約情報</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
          {[
            ['契約日', contract.contract_date ? new Date(contract.contract_date).toLocaleDateString('ja-JP') : '—'],
            ['納車予定日', contract.delivery_date ? new Date(contract.delivery_date).toLocaleDateString('ja-JP') : '—'],
            ['支払方法', contract.payment_type || '—'],
            ['ローン会社', contract.loan_company || '—'],
            ['頭金', contract.down_payment > 0 ? '¥' + contract.down_payment?.toLocaleString() : '—'],
          ].map(([label, value]) => (
            <div key={label} style={{ display: 'flex', borderBottom: '1px solid #f0f0f0', padding: '8px 0', fontSize: '13px' }}>
              <span style={{ width: '100px', color: '#888', flexShrink: 0 }}>{label}</span>
              <span>{value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}