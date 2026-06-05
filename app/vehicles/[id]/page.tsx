'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

const CATEGORIES = [
  { value: '1-1', label: '仕入金額',     direction: 'out', color: '#e53e3e', bg: '#fff5f5' },
  { value: '2-1', label: '仕入経費',     direction: 'out', color: '#e65100', bg: '#fff3e0' },
  { value: '2-2', label: '在庫経費',     direction: 'out', color: '#e65100', bg: '#fff3e0' },
  { value: '2-3', label: '販売経費',     direction: 'out', color: '#e65100', bg: '#fff3e0' },
  { value: '3-1', label: '売上',         direction: 'in',  color: '#1e7e34', bg: '#e6f4ea' },
  { value: '3-2', label: '売上雑収入',   direction: 'in',  color: '#1e7e34', bg: '#e6f4ea' },
  { value: '4-1', label: '納車後入出金', direction: 'both',color: '#1a73e8', bg: '#e8f0fe' },
]
const CAT_MAP = Object.fromEntries(CATEGORIES.map(c => [c.value, c]))

type Transaction = {
  id: string
  vehicle_id: string
  category: string
  label: string | null
  amount: number
  direction: string
  payment_method: string | null
  transaction_date: string | null
  memo: string | null
}

const STATUS_COLOR: Record<string, { bg: string; color: string }> = {
  '在庫中': { bg: '#e6f4ea', color: '#1e7e34' },
  '商談中': { bg: '#fff3e0', color: '#e65100' },
  '売約済': { bg: '#e8f0fe', color: '#1a73e8' },
  '納車済': { bg: '#f1f3f4', color: '#5f6368' },
}

export default function VehicleDetailPage() {
  const { id } = useParams()
  const [v, setV] = useState<any>(null)
  const [mainImg, setMainImg] = useState(0)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [tab, setTab] = useState<'仕入' | '在庫' | '契約' | '登録' | '財務'>('在庫')
  const [showTxModal, setShowTxModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [txForm, setTxForm] = useState({
    category: '1-1', label: '', amount: '', direction: 'out',
    payment_method: 'bank', transaction_date: new Date().toISOString().split('T')[0], memo: '',
  })

  const fetchVehicle = async () => {
    const { data } = await supabase.from('vehicles')
      .select('*, master_makers(name), master_models(name), master_colors(name)')
      .eq('id', id as string).single()
    setV(data)
  }

  const fetchTransactions = async () => {
    const { data } = await supabase.from('vehicle_transactions').select('*')
      .eq('vehicle_id', id as string).order('transaction_date', { ascending: true })
    setTransactions(data || [])
  }

  useEffect(() => { fetchVehicle(); fetchTransactions() }, [id])

  const updateVehicle = async (fields: Record<string, any>) => {
    setSaving(true)
    await supabase.from('vehicles').update(fields).eq('id', id as string)
    await fetchVehicle()
    setSaving(false)
  }

  const toggleCheck = (key: string) => updateVehicle({ [key]: !v[key] })

  const handleSaveTx = async () => {
    if (!txForm.amount) return alert('金額を入力してください')
    await supabase.from('vehicle_transactions').insert({
      vehicle_id: id as string,
      category: txForm.category,
      label: txForm.label || CAT_MAP[txForm.category]?.label,
      amount: parseInt(txForm.amount),
      direction: txForm.direction,
      payment_method: txForm.payment_method,
      transaction_date: txForm.transaction_date || null,
      memo: txForm.memo || null,
    })
    setShowTxModal(false)
    setTxForm({ category: '1-1', label: '', amount: '', direction: 'out', payment_method: 'bank', transaction_date: new Date().toISOString().split('T')[0], memo: '' })
    fetchTransactions()
  }

  const deleteTx = async (txId: string) => {
    if (!confirm('削除しますか？')) return
    await supabase.from('vehicle_transactions').delete().eq('id', txId)
    fetchTransactions()
  }

  const totalIn = transactions.filter(t => t.direction === 'in').reduce((s, t) => s + t.amount, 0)
  const totalOut = transactions.filter(t => t.direction === 'out').reduce((s, t) => s + t.amount, 0)
  const grossProfit = totalIn - totalOut

  if (!v) return <div style={{ padding: '2rem' }}>読み込み中...</div>

  const cell = (label: string, value: any) => (
    <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', borderBottom: '1px solid #f5f5f5', padding: '7px 0', fontSize: '13px' }}>
      <span style={{ color: '#888' }}>{label}</span>
      <span>{value ?? '—'}</span>
    </div>
  )

  const CheckBadge = ({ label, checked, onToggle }: { label: string; checked: boolean; onToggle: () => void }) => (
    <button onClick={onToggle} style={{
      padding: '4px 12px', borderRadius: '20px', border: 'none', fontSize: '11px', fontWeight: 600, cursor: 'pointer',
      background: checked ? '#e6f4ea' : '#f1f3f4',
      color: checked ? '#1e7e34' : '#888',
    }}>
      {checked ? '✓ ' : ''}{label}
    </button>
  )

  const WebBadge = ({ label, key2, icon }: { label: string; key2: string; icon: string }) => (
    <button onClick={() => toggleCheck(key2)} style={{
      padding: '6px 14px', borderRadius: '8px', border: `1px solid ${v[key2] ? '#1a73e8' : '#ddd'}`, fontSize: '12px', fontWeight: 500, cursor: 'pointer',
      background: v[key2] ? '#e8f0fe' : 'white',
      color: v[key2] ? '#1a73e8' : '#888',
    }}>
      {icon} {label} {v[key2] ? '✓' : ''}
    </button>
  )

  const TABS = ['仕入', '在庫', '契約', '登録', '財務'] as const

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto' }}>

      {/* ===== 上部統一ヘッダー ===== */}
      <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #eee', padding: '16px 20px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          {/* 左：車両情報 */}
          <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
            {/* サムネイル */}
            <div style={{ width: '100px', height: '75px', borderRadius: '8px', overflow: 'hidden', flexShrink: 0, border: '1px solid #eee', background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px' }}>
              {v.image_urls?.length > 0
                ? <img src={v.image_urls[0]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : '🚗'}
            </div>
            <div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '4px' }}>
                <span style={{ fontSize: '13px', color: '#888', fontWeight: 500 }}>{v.db_number}</span>
                <span style={{ fontSize: '11px', padding: '2px 10px', borderRadius: '20px', fontWeight: 600, background: STATUS_COLOR[v.status]?.bg ?? '#f1f3f4', color: STATUS_COLOR[v.status]?.color ?? '#555' }}>
                  {v.status}
                </span>
                <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', background: '#f1f3f4', color: '#555' }}>{v.purchase_type}</span>
              </div>
              <h1 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 4px' }}>
                {v.master_makers?.name} {v.master_models?.name}
              </h1>
              <div style={{ display: 'flex', gap: '16px', fontSize: '13px', color: '#555' }}>
                {v.year && <span>{v.year}年</span>}
                {v.mileage && <span>{v.mileage.toLocaleString()}km</span>}
                {v.chassis_number && <span>車台: {v.chassis_number}</span>}
                {v.car_number && <span>ナンバー: {v.car_number}</span>}
              </div>
            </div>
          </div>

          {/* 右：アクション */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <Link href="/vehicles" style={{ padding: '7px 14px', background: '#f1f3f4', color: '#555', borderRadius: '8px', textDecoration: 'none', fontSize: '13px' }}>← 一覧</Link>
            <Link href={`/negotiations/new?vehicle=${v.id}`} style={{ padding: '7px 14px', background: '#00a86b', color: 'white', borderRadius: '8px', textDecoration: 'none', fontSize: '13px', fontWeight: 500 }}>商談登録</Link>
            <Link href={`/vehicles/${v.id}/edit`} style={{ padding: '7px 14px', background: '#0070f3', color: 'white', borderRadius: '8px', textDecoration: 'none', fontSize: '13px', fontWeight: 500 }}>編集</Link>
          </div>
        </div>

        {/* 仕入ステータスバー */}
        <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #f0f0f0' }}>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', color: '#888', fontWeight: 600 }}>仕入</span>
            <CheckBadge label="入庫済" checked={v.entry_check} onToggle={() => toggleCheck('entry_check')} />
            <CheckBadge label="洗車済" checked={v.car_wash_check} onToggle={() => toggleCheck('car_wash_check')} />
            <CheckBadge label="撮影済" checked={v.photo_shoot_check} onToggle={() => toggleCheck('photo_shoot_check')} />
            <span style={{ fontSize: '11px', color: '#888', fontWeight: 600, marginLeft: '8px' }}>WEB掲載</span>
            <CheckBadge label="カーセンサー" checked={v.web_carsensor} onToggle={() => toggleCheck('web_carsensor')} />
            <CheckBadge label="グーネット" checked={v.web_goo} onToggle={() => toggleCheck('web_goo')} />
            <CheckBadge label="HP" checked={v.web_hp} onToggle={() => toggleCheck('web_hp')} />
            <CheckBadge label="X" checked={v.web_x} onToggle={() => toggleCheck('web_x')} />
            <CheckBadge label="LINE" checked={v.web_line} onToggle={() => toggleCheck('web_line')} />
          </div>
        </div>
      </div>

      {/* ===== タブ ===== */}
      <div style={{ display: 'flex', gap: '2px', marginBottom: '16px', background: '#f1f3f4', borderRadius: '10px', padding: '4px', width: 'fit-content' }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '7px 20px', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 500, cursor: 'pointer',
            background: tab === t ? 'white' : 'transparent',
            color: tab === t ? '#111' : '#888',
            boxShadow: tab === t ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
          }}>{t}</button>
        ))}
      </div>

      {/* ===== 仕入情報タブ ===== */}
      {tab === '仕入' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #eee', padding: '20px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, margin: '0 0 16px', color: '#111' }}>仕入顧客情報</h3>
            {cell('仕入区分', v.purchase_type)}
            {cell('仕入契約日', v.purchase_contract_date)}
            {cell('入庫日', v.stock_date)}
            {cell('仕入担当', v.purchase_staff)}
            {cell('仕入金額', v.purchase_price ? '¥' + v.purchase_price.toLocaleString() : null)}
          </div>
          <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #eee', padding: '20px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, margin: '0 0 16px', color: '#111' }}>仕入写真・書類</h3>
            {v.image_urls?.length > 0 ? (
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {v.image_urls.map((url: string, i: number) => (
                  <img key={i} src={url} alt="" style={{ width: '80px', height: '60px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #eee', cursor: 'pointer' }}
                    onClick={() => setMainImg(i)} />
                ))}
              </div>
            ) : (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#ccc', fontSize: '13px', background: '#fafafa', borderRadius: '8px' }}>写真なし</div>
            )}
          </div>
        </div>
      )}

      {/* ===== 在庫情報タブ ===== */}
      {tab === '在庫' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* 物件情報 */}
          <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #eee', padding: '20px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, margin: '0 0 16px', color: '#111' }}>物件情報</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0 24px' }}>
              <div>
                {cell('メーカー', v.master_makers?.name)}
                {cell('車種', v.master_models?.name)}
                {cell('年式', v.year ? v.year + '年' : null)}
                {cell('走行距離', v.mileage ? v.mileage.toLocaleString() + 'km' : null)}
              </div>
              <div>
                {cell('車台番号', v.chassis_number)}
                {cell('車両ナンバー', v.car_number)}
                {cell('シフト', v.shift)}
                {cell('外装色', v.master_colors?.name ?? v.color)}
              </div>
              <div>
                {cell('修復歴', v.repair_history ? 'あり' : 'なし')}
                {cell('車検満了', v.inspection_date)}
                {cell('排気量', v.displacement ? v.displacement + 'cc' : null)}
              </div>
            </div>
          </div>

          {/* 販売価格 */}
          <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #eee', padding: '20px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, margin: '0 0 16px', color: '#111' }}>販売価格（デフォルト見積）</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
              {[
                { label: '車体価格', key: 'list_price', value: v.list_price ?? v.body_price },
                { label: '諸費用', key: 'misc_fee', value: v.misc_fee },
                { label: '支払総額', key: 'total_payment', value: v.total_payment ?? v.total_price },
              ].map(f => (
                <div key={f.key} style={{ background: '#f8f9fa', borderRadius: '8px', padding: '14px' }}>
                  <div style={{ fontSize: '12px', color: '#888', marginBottom: '6px' }}>{f.label}</div>
                  <div style={{ fontSize: '20px', fontWeight: 700, color: '#111' }}>
                    {f.value ? '¥' + f.value.toLocaleString() : '—'}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* WEB用写真 */}
          <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #eee', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 600, margin: 0, color: '#111' }}>WEB用写真</h3>
              <Link href={`/vehicles/${v.id}/edit`} style={{ fontSize: '12px', color: '#0070f3', textDecoration: 'none' }}>写真を編集 →</Link>
            </div>
            {v.image_urls?.length > 0 ? (
              <div>
                <img src={v.image_urls[mainImg]} alt="メイン" style={{ width: '100%', height: '280px', objectFit: 'cover', borderRadius: '10px', marginBottom: '10px', border: '1px solid #eee' }} />
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {v.image_urls.map((url: string, i: number) => (
                    <img key={i} src={url} alt="" onClick={() => setMainImg(i)}
                      style={{ width: '72px', height: '54px', objectFit: 'cover', borderRadius: '6px', cursor: 'pointer', border: mainImg === i ? '2px solid #0070f3' : '1px solid #eee' }} />
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ padding: '3rem', textAlign: 'center', color: '#ccc', fontSize: '13px', background: '#fafafa', borderRadius: '8px' }}>
                写真が登録されていません
                <div style={{ marginTop: '8px' }}>
                  <Link href={`/vehicles/${v.id}/edit`} style={{ fontSize: '13px', color: '#0070f3', textDecoration: 'none' }}>写真を追加する →</Link>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== 契約情報タブ ===== */}
      {tab === '契約' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #eee', padding: '20px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, margin: '0 0 16px', color: '#111' }}>販売契約情報</h3>
            {cell('販売担当', v.sales_staff)}
            {cell('販売契約日', v.contract_date)}
            {cell('売上日', v.sale_date)}
            {cell('納車日', v.delivery_date)}
            {cell('済車日', v.completion_date)}
            {cell('車体価格', v.body_price ? '¥' + v.body_price.toLocaleString() : null)}
            {cell('支払総額', v.total_price ? '¥' + v.total_price.toLocaleString() : null)}
          </div>
          <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #eee', padding: '20px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, margin: '0 0 16px', color: '#111' }}>仕入契約情報</h3>
            {cell('仕入担当', v.purchase_staff)}
            {cell('仕入契約日', v.purchase_contract_date)}
            {cell('入庫日', v.stock_date)}
            {cell('仕入金額', v.purchase_price ? '¥' + v.purchase_price.toLocaleString() : null)}
            {cell('仕入区分', v.purchase_type)}
          </div>
        </div>
      )}

      {/* ===== 登録情報タブ ===== */}
      {tab === '登録' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {[
            { title: '仕入時 車検証情報', desc: '仕入れた時点の車検証情報' },
            { title: '在庫時 車検証情報', desc: '在庫期間中の車検証情報' },
            { title: '販売後 車検証情報', desc: '名義変更後の車検証情報' },
          ].map((sec, i) => (
            <div key={i} style={{ background: 'white', borderRadius: '12px', border: '1px solid #eee', padding: '20px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 600, margin: '0 0 4px', color: '#111' }}>{sec.title}</h3>
              <p style={{ fontSize: '12px', color: '#aaa', margin: '0 0 16px' }}>{sec.desc}</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
                {cell('車台番号', v.chassis_number)}
                {cell('車両ナンバー', v.car_number)}
                {cell('型式', v.model_type)}
                {cell('車検満了日', v.inspection_date)}
              </div>
              <div style={{ marginTop: '12px', padding: '12px', background: '#f8f9fa', borderRadius: '8px', textAlign: 'center', color: '#ccc', fontSize: '12px' }}>
                車検証写真アップロード機能（開発予定）
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ===== 財務タブ ===== */}
      {tab === '財務' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* 粗利サマリー */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
            {[
              { label: '総入金', value: totalIn, color: '#1e7e34', bg: '#e6f4ea' },
              { label: '総出金', value: totalOut, color: '#e53e3e', bg: '#fce8e6' },
              { label: '確定粗利', value: grossProfit, color: grossProfit >= 0 ? '#1a73e8' : '#e65100', bg: grossProfit >= 0 ? '#e8f0fe' : '#fff3e0' },
            ].map(k => (
              <div key={k.label} style={{ background: 'white', borderRadius: '12px', border: '1px solid #eee', padding: '20px', textAlign: 'center' }}>
                <div style={{ fontSize: '12px', color: '#888', marginBottom: '8px' }}>{k.label}</div>
                <div style={{ fontSize: '24px', fontWeight: 700, color: k.color }}>
                  {k.label === '確定粗利' && k.value > 0 ? '+' : ''}¥{k.value.toLocaleString()}
                </div>
              </div>
            ))}
          </div>

          {/* 明細 */}
          <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #eee', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 600, margin: 0 }}>入出金明細</h3>
              <button onClick={() => {
                setTxForm({ category: '1-1', label: '仕入金額', amount: '', direction: 'out', payment_method: 'bank', transaction_date: new Date().toISOString().split('T')[0], memo: '' })
                setShowTxModal(true)
              }} style={{ padding: '7px 16px', background: '#0070f3', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', fontWeight: 500 }}>
                ＋ 明細追加
              </button>
            </div>
            {transactions.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#ccc', fontSize: '13px' }}>明細がありません</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr style={{ background: '#f8f9fa', borderBottom: '1px solid #eee' }}>
                    {['日付', '区分', '内容', '入出金', '金額', '支払方法', 'メモ', ''].map(h => (
                      <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: '#888', fontWeight: 600 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx, i) => (
                    <tr key={tx.id} style={{ borderBottom: i < transactions.length - 1 ? '1px solid #f0f0f0' : 'none' }}>
                      <td style={{ padding: '10px 12px', color: '#888' }}>{tx.transaction_date || '—'}</td>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', fontWeight: 600, background: CAT_MAP[tx.category]?.bg, color: CAT_MAP[tx.category]?.color }}>{tx.category}</span>
                      </td>
                      <td style={{ padding: '10px 12px' }}>{tx.label || CAT_MAP[tx.category]?.label}</td>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', background: tx.direction === 'in' ? '#e6f4ea' : '#fce8e6', color: tx.direction === 'in' ? '#1e7e34' : '#e53e3e', fontWeight: 600 }}>
                          {tx.direction === 'in' ? '入金' : '出金'}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px', fontWeight: 600, color: tx.direction === 'in' ? '#1e7e34' : '#e53e3e' }}>
                        {tx.direction === 'in' ? '+' : '-'}¥{tx.amount.toLocaleString()}
                      </td>
                      <td style={{ padding: '10px 12px', color: '#888' }}>{tx.payment_method === 'cash' ? '現金' : '銀行'}</td>
                      <td style={{ padding: '10px 12px', color: '#888' }}>{tx.memo || '—'}</td>
                      <td style={{ padding: '10px 12px' }}>
                        <button onClick={() => deleteTx(tx.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ddd', fontSize: '14px' }}
                          onMouseEnter={e => (e.currentTarget.style.color = '#e53e3e')}
                          onMouseLeave={e => (e.currentTarget.style.color = '#ddd')}>×</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ===== 明細追加モーダル ===== */}
      {showTxModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
          <div style={{ background: 'white', borderRadius: '16px', width: '100%', maxWidth: '480px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>明細追加</h2>
              <button onClick={() => setShowTxModal(false)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#888' }}>×</button>
            </div>
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', color: '#888', fontWeight: 500 }}>区分</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                  {CATEGORIES.map(c => (
                    <button key={c.value} onClick={() => {
                      const cat = CAT_MAP[c.value]
                      setTxForm(f => ({ ...f, category: c.value, direction: cat.direction === 'both' ? 'out' : cat.direction, label: c.label }))
                    }} style={{ padding: '5px 12px', borderRadius: '20px', border: 'none', fontSize: '12px', fontWeight: 500, cursor: 'pointer', background: txForm.category === c.value ? c.color : c.bg, color: txForm.category === c.value ? 'white' : c.color }}>
                      {c.value} {c.label}
                    </button>
                  ))}
                </div>
              </div>
              {CAT_MAP[txForm.category]?.direction === 'both' && (
                <div style={{ display: 'flex', gap: '6px' }}>
                  {['in', 'out'].map(d => (
                    <button key={d} onClick={() => setTxForm(f => ({ ...f, direction: d }))} style={{ flex: 1, padding: '7px', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 500, cursor: 'pointer', background: txForm.direction === d ? (d === 'in' ? '#1e7e34' : '#e53e3e') : '#f1f3f4', color: txForm.direction === d ? 'white' : '#555' }}>
                      {d === 'in' ? '入金' : '出金'}
                    </button>
                  ))}
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: '#888', fontWeight: 500 }}>内容</label>
                  <input type="text" value={txForm.label} onChange={e => setTxForm(f => ({ ...f, label: e.target.value }))} placeholder={CAT_MAP[txForm.category]?.label}
                    style={{ width: '100%', border: '1px solid #ddd', borderRadius: '8px', padding: '8px 12px', fontSize: '13px', marginTop: '4px', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: '#888', fontWeight: 500 }}>金額（円）*</label>
                  <input type="number" value={txForm.amount} onChange={e => setTxForm(f => ({ ...f, amount: e.target.value }))} placeholder="0"
                    style={{ width: '100%', border: '1px solid #ddd', borderRadius: '8px', padding: '8px 12px', fontSize: '13px', marginTop: '4px', boxSizing: 'border-box' }} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: '#888', fontWeight: 500 }}>日付</label>
                  <input type="date" value={txForm.transaction_date} onChange={e => setTxForm(f => ({ ...f, transaction_date: e.target.value }))}
                    style={{ width: '100%', border: '1px solid #ddd', borderRadius: '8px', padding: '8px 12px', fontSize: '13px', marginTop: '4px', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: '#888', fontWeight: 500 }}>支払方法</label>
                  <select value={txForm.payment_method} onChange={e => setTxForm(f => ({ ...f, payment_method: e.target.value }))}
                    style={{ width: '100%', border: '1px solid #ddd', borderRadius: '8px', padding: '8px 12px', fontSize: '13px', marginTop: '4px', boxSizing: 'border-box' }}>
                    <option value="bank">銀行（仮想BK）</option>
                    <option value="cash">現金金庫</option>
                  </select>
                </div>
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#888', fontWeight: 500 }}>メモ</label>
                <input type="text" value={txForm.memo} onChange={e => setTxForm(f => ({ ...f, memo: e.target.value }))} placeholder="備考など"
                  style={{ width: '100%', border: '1px solid #ddd', borderRadius: '8px', padding: '8px 12px', fontSize: '13px', marginTop: '4px', boxSizing: 'border-box' }} />
              </div>
            </div>
            <div style={{ padding: '16px 24px', borderTop: '1px solid #eee', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button onClick={() => setShowTxModal(false)} style={{ padding: '10px 20px', background: '#f1f3f4', color: '#555', borderRadius: '8px', border: 'none', fontSize: '14px', cursor: 'pointer' }}>キャンセル</button>
              <button onClick={handleSaveTx} style={{ padding: '10px 20px', background: '#0070f3', color: 'white', borderRadius: '8px', border: 'none', fontSize: '14px', fontWeight: 500, cursor: 'pointer' }}>保存</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}