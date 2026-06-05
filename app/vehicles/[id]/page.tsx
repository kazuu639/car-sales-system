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

export default function VehicleDetailPage() {
  const { id } = useParams()
  const [v, setV] = useState<any>(null)
  const [mainImg, setMainImg] = useState(0)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [showTxModal, setShowTxModal] = useState(false)
  const [txForm, setTxForm] = useState({
    category: '1-1',
    label: '',
    amount: '',
    direction: 'out',
    payment_method: 'bank',
    transaction_date: new Date().toISOString().split('T')[0],
    memo: '',
  })

  useEffect(() => {
    supabase.from('vehicles')
      .select('*, master_makers(name), master_models(name)')
      .eq('id', id as string).single()
      .then(({ data }) => setV(data))
    fetchTransactions()
  }, [id])

  const fetchTransactions = async () => {
    const { data } = await supabase
      .from('vehicle_transactions')
      .select('*')
      .eq('vehicle_id', id as string)
      .order('transaction_date', { ascending: true })
    setTransactions(data || [])
  }

  const handleCategoryChange = (cat: string) => {
    const c = CAT_MAP[cat]
    setTxForm(f => ({
      ...f,
      category: cat,
      direction: c.direction === 'both' ? 'out' : c.direction,
      label: c.label,
    }))
  }

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
    setTxForm({
      category: '1-1', label: '', amount: '', direction: 'out',
      payment_method: 'bank', transaction_date: new Date().toISOString().split('T')[0], memo: '',
    })
    fetchTransactions()
  }

  const deleteTx = async (txId: string) => {
    if (!confirm('この明細を削除しますか？')) return
    await supabase.from('vehicle_transactions').delete().eq('id', txId)
    fetchTransactions()
  }

  // 財務サマリー計算
  const totalIn  = transactions.filter(t => t.direction === 'in').reduce((s, t) => s + t.amount, 0)
  const totalOut = transactions.filter(t => t.direction === 'out').reduce((s, t) => s + t.amount, 0)
  const grossProfit = totalIn - totalOut

  if (!v) return <div style={{ padding: '2rem' }}>読み込み中...</div>

  const statusColor: any = {
    '在庫中': { bg: '#e6f4ea', color: '#1e7e34' },
    '商談中': { bg: '#fff3e0', color: '#e65100' },
    '売約済': { bg: '#e8f0fe', color: '#1a73e8' },
    '納車済': { bg: '#f1f3f4', color: '#5f6368' },
  }

  const cell = (label: string, value: any, bold = false) => (
    <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', borderBottom: '1px solid #f0f0f0', padding: '6px 8px', fontSize: '13px' }}>
      <span style={{ color: '#888' }}>{label}</span>
      <span style={{ fontWeight: bold ? 600 : 400 }}>{value ?? '—'}</span>
    </div>
  )

  const sectionTitle = (label: string) => (
    <div style={{ background: '#1a1a2e', color: 'white', padding: '4px 10px', fontSize: '12px', fontWeight: 600, marginBottom: '4px', borderRadius: '4px' }}>{label}</div>
  )

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto' }}>
      {/* ヘッダー */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div>
          <Link href="/vehicles" style={{ fontSize: '13px', color: '#888', textDecoration: 'none' }}>← 在庫一覧</Link>
          <h1 style={{ fontSize: '22px', fontWeight: 700, margin: '4px 0 0' }}>
            {v.master_makers?.name} {v.master_models?.name}
          </h1>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Link href={`/negotiations/new?vehicle=${v.id}`}
            style={{ padding: '8px 16px', background: '#00a86b', color: 'white', borderRadius: '8px', textDecoration: 'none', fontSize: '13px', fontWeight: 600 }}>
            📝 新規見積書
          </Link>
          <Link href={`/vehicles/${v.id}/edit`}
            style={{ padding: '8px 16px', background: '#0070f3', color: 'white', borderRadius: '8px', textDecoration: 'none', fontSize: '13px', fontWeight: 600 }}>
            🚗 車両情報編集
          </Link>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '1.5rem' }}>
        {/* 左カラム */}
        <div>
          {/* 画像 */}
          <div style={{ marginBottom: '1rem' }}>
            {v.image_urls?.length > 0 ? (
              <>
                <img src={v.image_urls[mainImg]} alt="メイン"
                  style={{ width: '100%', height: '220px', objectFit: 'cover', borderRadius: '10px', marginBottom: '8px', border: '1px solid #eee' }} />
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {v.image_urls.map((url: string, i: number) => (
                    <img key={i} src={url} alt={`img-${i}`} onClick={() => setMainImg(i)}
                      style={{ width: '60px', height: '46px', objectFit: 'cover', borderRadius: '6px', cursor: 'pointer', border: mainImg === i ? '2px solid #0070f3' : '1px solid #eee' }} />
                  ))}
                </div>
              </>
            ) : (
              <div style={{ width: '100%', height: '220px', background: '#f5f5f5', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '48px' }}>🚗</div>
            )}
          </div>

          {/* 管理番号・ステータス */}
          <div style={{ background: 'white', borderRadius: '10px', border: '1px solid #eee', padding: '1rem', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '13px', color: '#888' }}>管理番号</span>
              <span style={{ fontSize: '16px', fontWeight: 700 }}>{v.db_number ?? '—'}</span>
            </div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '20px', fontWeight: 600, background: statusColor[v.status]?.bg ?? '#f1f3f4', color: statusColor[v.status]?.color ?? '#555' }}>
                {v.status ?? '—'}
              </span>
              <span style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '20px', background: '#f1f3f4', color: '#555' }}>
                {v.purchase_type ?? '仕入区分未設定'}
              </span>
            </div>
          </div>

          {/* 仕入情報 */}
          <div style={{ background: 'white', borderRadius: '10px', border: '1px solid #eee', padding: '1rem' }}>
            {sectionTitle('📦 仕入情報')}
            {cell('入庫日', v.stock_date)}
            {cell('仕入先', v.supplier_name)}
          </div>
        </div>

        {/* 右カラム */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          {/* 車両情報 */}
          <div style={{ background: 'white', borderRadius: '10px', border: '1px solid #eee', padding: '1rem' }}>
            {sectionTitle('🚗 車両情報')}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 1rem' }}>
              <div>
                {cell('車種', `${v.master_makers?.name ?? ''} ${v.master_models?.name ?? ''}`)}
                {cell('年式', v.year ? v.year + '年' : null)}
                {cell('車台番号', v.chassis_number)}
                {cell('車両ナンバー', v.car_number)}
                {cell('排気量', v.displacement ? v.displacement + 'cc' : null)}
              </div>
              <div>
                {cell('走行距離', v.mileage ? v.mileage.toLocaleString() + 'km' : null)}
                {cell('シフト', v.shift)}
                {cell('外装色', v.color)}
                {cell('修復歴', v.repair_history ? 'あり' : 'なし')}
                {cell('車検満了', v.inspection_date)}
              </div>
            </div>
          </div>

          {/* 各契約日・担当者 */}
          <div style={{ background: 'white', borderRadius: '10px', border: '1px solid #eee', padding: '1rem' }}>
            {sectionTitle('📅 各契約日・担当者')}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0 1rem' }}>
              <div>
                {cell('仕）契約日', v.purchase_contract_date)}
                {cell('入庫日', v.stock_date)}
                {cell('仕入担当', v.purchase_staff)}
              </div>
              <div>
                {cell('販）契約日', v.contract_date)}
                {cell('売上日', v.sale_date)}
                {cell('販売担当', v.sales_staff)}
              </div>
              <div>
                {cell('納車日', v.delivery_date)}
                {cell('済車日', v.completion_date)}
              </div>
            </div>
          </div>

          {/* 財務情報 */}
          <div style={{ background: 'white', borderRadius: '10px', border: '1px solid #eee', padding: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              {sectionTitle('💴 財務情報')}
              <button onClick={() => {
                setTxForm({ category: '1-1', label: '仕入金額', amount: '', direction: 'out', payment_method: 'bank', transaction_date: new Date().toISOString().split('T')[0], memo: '' })
                setShowTxModal(true)
              }} style={{ padding: '5px 14px', background: '#0070f3', color: 'white', border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', fontWeight: 500, marginBottom: '4px' }}>
                ＋ 明細追加
              </button>
            </div>

            {/* 粗利サマリー */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '12px' }}>
              <div style={{ background: '#e6f4ea', borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
                <div style={{ fontSize: '11px', color: '#1e7e34', marginBottom: '4px' }}>総入金</div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: '#1e7e34' }}>¥{totalIn.toLocaleString()}</div>
              </div>
              <div style={{ background: '#fce8e6', borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
                <div style={{ fontSize: '11px', color: '#e53e3e', marginBottom: '4px' }}>総出金</div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: '#e53e3e' }}>¥{totalOut.toLocaleString()}</div>
              </div>
              <div style={{ background: grossProfit >= 0 ? '#e8f0fe' : '#fff3e0', borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
                <div style={{ fontSize: '11px', color: grossProfit >= 0 ? '#1a73e8' : '#e65100', marginBottom: '4px' }}>確定粗利</div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: grossProfit >= 0 ? '#1a73e8' : '#e65100' }}>
                  {grossProfit >= 0 ? '+' : ''}¥{grossProfit.toLocaleString()}
                </div>
              </div>
            </div>

            {/* 明細一覧 */}
            {transactions.length === 0 ? (
              <div style={{ padding: '1.5rem', textAlign: 'center', color: '#ccc', fontSize: '13px' }}>明細がありません。「＋ 明細追加」から登録してください。</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr style={{ background: '#f8f9fa', borderBottom: '1px solid #eee' }}>
                    {['日付', '区分', '内容', '入出金', '金額', '支払方法', 'メモ', ''].map(h => (
                      <th key={h} style={{ padding: '8px 10px', textAlign: 'left', color: '#888', fontWeight: 600 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx, i) => (
                    <tr key={tx.id} style={{ borderBottom: i < transactions.length - 1 ? '1px solid #f0f0f0' : 'none' }}>
                      <td style={{ padding: '8px 10px', color: '#888' }}>{tx.transaction_date || '—'}</td>
                      <td style={{ padding: '8px 10px' }}>
                        <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', fontWeight: 600, background: CAT_MAP[tx.category]?.bg ?? '#f1f3f4', color: CAT_MAP[tx.category]?.color ?? '#555' }}>
                          {tx.category}
                        </span>
                      </td>
                      <td style={{ padding: '8px 10px' }}>{tx.label || CAT_MAP[tx.category]?.label}</td>
                      <td style={{ padding: '8px 10px' }}>
                        <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', background: tx.direction === 'in' ? '#e6f4ea' : '#fce8e6', color: tx.direction === 'in' ? '#1e7e34' : '#e53e3e', fontWeight: 600 }}>
                          {tx.direction === 'in' ? '入金' : '出金'}
                        </span>
                      </td>
                      <td style={{ padding: '8px 10px', fontWeight: 600, color: tx.direction === 'in' ? '#1e7e34' : '#e53e3e' }}>
                        {tx.direction === 'in' ? '+' : '-'}¥{tx.amount.toLocaleString()}
                      </td>
                      <td style={{ padding: '8px 10px', color: '#888' }}>
                        {tx.payment_method === 'cash' ? '現金' : tx.payment_method === 'bank' ? '銀行' : tx.payment_method}
                      </td>
                      <td style={{ padding: '8px 10px', color: '#888' }}>{tx.memo || '—'}</td>
                      <td style={{ padding: '8px 10px' }}>
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

          {/* 備考 */}
          {v.notes && (
            <div style={{ background: 'white', borderRadius: '10px', border: '1px solid #eee', padding: '1rem' }}>
              {sectionTitle('📝 備考')}
              <p style={{ fontSize: '13px', margin: 0, lineHeight: 1.6 }}>{v.notes}</p>
            </div>
          )}
        </div>
      </div>

      {/* 明細追加モーダル */}
      {showTxModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
          <div style={{ background: 'white', borderRadius: '16px', width: '100%', maxWidth: '480px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>明細追加</h2>
              <button onClick={() => setShowTxModal(false)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#888' }}>×</button>
            </div>
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>

              {/* 区分選択 */}
              <div>
                <label style={{ fontSize: '12px', color: '#888', fontWeight: 500 }}>区分</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                  {CATEGORIES.map(c => (
                    <button key={c.value} onClick={() => handleCategoryChange(c.value)} style={{
                      padding: '5px 12px', borderRadius: '20px', border: 'none', fontSize: '12px', fontWeight: 500, cursor: 'pointer',
                      background: txForm.category === c.value ? c.color : c.bg,
                      color: txForm.category === c.value ? 'white' : c.color,
                    }}>
                      {c.value} {c.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 入出金 */}
              {CAT_MAP[txForm.category]?.direction === 'both' && (
                <div>
                  <label style={{ fontSize: '12px', color: '#888', fontWeight: 500 }}>入出金</label>
                  <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                    {['in', 'out'].map(d => (
                      <button key={d} onClick={() => setTxForm(f => ({ ...f, direction: d }))} style={{
                        flex: 1, padding: '7px', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 500, cursor: 'pointer',
                        background: txForm.direction === d ? (d === 'in' ? '#1e7e34' : '#e53e3e') : '#f1f3f4',
                        color: txForm.direction === d ? 'white' : '#555',
                      }}>
                        {d === 'in' ? '入金' : '出金'}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 内容・金額 */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: '#888', fontWeight: 500 }}>内容</label>
                  <input type="text" value={txForm.label} onChange={e => setTxForm(f => ({ ...f, label: e.target.value }))}
                    placeholder={CAT_MAP[txForm.category]?.label}
                    style={{ width: '100%', border: '1px solid #ddd', borderRadius: '8px', padding: '8px 12px', fontSize: '13px', marginTop: '4px', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: '#888', fontWeight: 500 }}>金額（円）*</label>
                  <input type="number" value={txForm.amount} onChange={e => setTxForm(f => ({ ...f, amount: e.target.value }))}
                    placeholder="0"
                    style={{ width: '100%', border: '1px solid #ddd', borderRadius: '8px', padding: '8px 12px', fontSize: '13px', marginTop: '4px', boxSizing: 'border-box' }} />
                </div>
              </div>

              {/* 日付・支払方法 */}
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

              {/* メモ */}
              <div>
                <label style={{ fontSize: '12px', color: '#888', fontWeight: 500 }}>メモ</label>
                <input type="text" value={txForm.memo} onChange={e => setTxForm(f => ({ ...f, memo: e.target.value }))}
                  placeholder="備考など"
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