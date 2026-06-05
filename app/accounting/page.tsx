'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Account = {
  id: string
  name: string
  type: string
  bank_name: string | null
  account_number: string | null
  is_active: boolean
  sort_order: number
}

type Transaction = {
  id: string
  account_id: string
  transaction_date: string
  direction: string
  amount: number
  category: string | null
  description: string | null
  vehicle_id: string | null
  created_by: string | null
  vehicles?: { db_number: string; master_makers: { name: string } | null; master_models: { name: string } | null } | null
}

const CATEGORIES = ['車両仕入', '車両売上', '経費', '給与', '税金', 'ローン返済', 'その他']

export default function AccountingPage() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [selectedAccount, setSelectedAccount] = useState<string>('all')
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7))
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({
    account_id: '',
    transaction_date: new Date().toISOString().split('T')[0],
    direction: 'out',
    amount: '',
    category: '',
    description: '',
    created_by: '',
  })

  const fetchAll = async () => {
    setLoading(true)
    const [a, t] = await Promise.all([
      supabase.from('accounts').select('*').eq('is_active', true).order('sort_order'),
      supabase.from('account_transactions').select('*, vehicles(db_number, master_makers(name), master_models(name))')
        .gte('transaction_date', month + '-01')
        .lte('transaction_date', month + '-31')
        .order('transaction_date', { ascending: false }),
    ])
    setAccounts(a.data ?? [])
    setTransactions(t.data ?? [])
    if (a.data && a.data.length > 0 && !form.account_id) {
      setForm(f => ({ ...f, account_id: a.data[0].id }))
    }
    setLoading(false)
  }

  useEffect(() => { fetchAll() }, [month])

  const handleSave = async () => {
    if (!form.amount || !form.account_id) return alert('口座と金額を入力してください')
    await supabase.from('account_transactions').insert({
      account_id: form.account_id,
      transaction_date: form.transaction_date,
      direction: form.direction,
      amount: parseInt(form.amount),
      category: form.category || null,
      description: form.description || null,
      created_by: form.created_by || null,
    })
    setShowModal(false)
    setForm(f => ({ ...f, amount: '', description: '', category: '' }))
    fetchAll()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('削除しますか？')) return
    await supabase.from('account_transactions').delete().eq('id', id)
    fetchAll()
  }

  // フィルター
  const filtered = transactions.filter(t =>
    selectedAccount === 'all' || t.account_id === selectedAccount
  )

  // 集計
  const totalIn = filtered.filter(t => t.direction === 'in').reduce((s, t) => s + t.amount, 0)
  const totalOut = filtered.filter(t => t.direction === 'out').reduce((s, t) => s + t.amount, 0)

  // 口座ごとの集計
  const accountSummary = accounts.map(a => {
    const acTx = transactions.filter(t => t.account_id === a.id)
    const inAmt = acTx.filter(t => t.direction === 'in').reduce((s, t) => s + t.amount, 0)
    const outAmt = acTx.filter(t => t.direction === 'out').reduce((s, t) => s + t.amount, 0)
    return { ...a, inAmt, outAmt, net: inAmt - outAmt }
  })

  const inp = { width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '13px', boxSizing: 'border-box' as const, outline: 'none' }
  const lbl = { fontSize: '12px', color: '#888', fontWeight: 500 as const, marginBottom: '4px', display: 'block' as const }

  const currentYear = new Date().getFullYear()
  const months = Array.from({ length: 24 }, (_, i) => {
    const d = new Date(currentYear, new Date().getMonth() - i, 1)
    return d.toISOString().slice(0, 7)
  })

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      {/* ヘッダー */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, margin: 0 }}>会計</h1>
          <p style={{ fontSize: '13px', color: '#888', margin: '4px 0 0' }}>金庫・銀行の入出金管理</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <select value={month} onChange={e => setMonth(e.target.value)}
            style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '8px 12px', fontSize: '13px', outline: 'none' }}>
            {months.map(m => <option key={m} value={m}>{m.replace('-', '年')}月</option>)}
          </select>
          <button onClick={() => setShowModal(true)} style={{ padding: '10px 20px', background: '#0070f3', color: 'white', borderRadius: '8px', border: 'none', fontSize: '14px', fontWeight: 500, cursor: 'pointer' }}>
            ＋ 入出金登録
          </button>
        </div>
      </div>

      {/* 口座カード */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px', marginBottom: '16px' }}>
        {/* 全体サマリー */}
        <div onClick={() => setSelectedAccount('all')}
          style={{ background: selectedAccount === 'all' ? '#1a1a2e' : 'white', borderRadius: '12px', border: `1px solid ${selectedAccount === 'all' ? '#1a1a2e' : '#eee'}`, padding: '16px', cursor: 'pointer' }}>
          <div style={{ fontSize: '12px', color: selectedAccount === 'all' ? '#aaa' : '#888', marginBottom: '8px' }}>📊 全口座</div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <div>
              <div style={{ fontSize: '10px', color: selectedAccount === 'all' ? '#aaa' : '#aaa' }}>入金</div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: '#1e7e34' }}>¥{totalIn.toLocaleString()}</div>
            </div>
            <div>
              <div style={{ fontSize: '10px', color: selectedAccount === 'all' ? '#aaa' : '#aaa' }}>出金</div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: '#e53e3e' }}>¥{totalOut.toLocaleString()}</div>
            </div>
          </div>
        </div>

        {accountSummary.map(a => (
          <div key={a.id} onClick={() => setSelectedAccount(a.id)}
            style={{ background: selectedAccount === a.id ? (a.type === 'cash' ? '#fff3e0' : '#e8f0fe') : 'white', borderRadius: '12px', border: `1px solid ${selectedAccount === a.id ? (a.type === 'cash' ? '#e65100' : '#1a73e8') : '#eee'}`, padding: '16px', cursor: 'pointer' }}>
            <div style={{ fontSize: '12px', color: '#888', marginBottom: '6px' }}>
              {a.type === 'cash' ? '💰 ' : '🏦 '}{a.name}
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <div>
                <div style={{ fontSize: '10px', color: '#aaa' }}>入金</div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#1e7e34' }}>¥{a.inAmt.toLocaleString()}</div>
              </div>
              <div>
                <div style={{ fontSize: '10px', color: '#aaa' }}>出金</div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#e53e3e' }}>¥{a.outAmt.toLocaleString()}</div>
              </div>
            </div>
            <div style={{ marginTop: '6px', fontSize: '12px', fontWeight: 600, color: a.net >= 0 ? '#1a73e8' : '#e65100' }}>
              収支: {a.net >= 0 ? '+' : ''}¥{a.net.toLocaleString()}
            </div>
          </div>
        ))}
      </div>

      {/* 月間サマリー */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '16px' }}>
        {[
          { label: '入金合計', value: totalIn, color: '#1e7e34', bg: '#e6f4ea' },
          { label: '出金合計', value: totalOut, color: '#e53e3e', bg: '#fce8e6' },
          { label: '収支', value: totalIn - totalOut, color: totalIn - totalOut >= 0 ? '#1a73e8' : '#e65100', bg: totalIn - totalOut >= 0 ? '#e8f0fe' : '#fff3e0' },
        ].map(k => (
          <div key={k.label} style={{ background: 'white', borderRadius: '12px', border: '1px solid #eee', padding: '16px', textAlign: 'center' }}>
            <div style={{ fontSize: '12px', color: '#888', marginBottom: '6px' }}>{k.label}</div>
            <div style={{ fontSize: '22px', fontWeight: 700, color: k.color }}>
              {k.label === '収支' && k.value > 0 ? '+' : ''}¥{k.value.toLocaleString()}
            </div>
          </div>
        ))}
      </div>

      {/* 入出金一覧 */}
      <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #eee', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '14px', fontWeight: 600 }}>入出金履歴</span>
          <span style={{ fontSize: '13px', color: '#888' }}>{filtered.length}件</span>
        </div>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#aaa' }}>読み込み中...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#aaa' }}>入出金データがありません</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8f9fa', borderBottom: '1px solid #eee' }}>
                {['日付', '口座', '入出金', '金額', 'カテゴリ', '内容', '担当', ''].map(h => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: '12px', color: '#888', fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((t, i) => {
                const account = accounts.find(a => a.id === t.account_id)
                return (
                  <tr key={t.id} style={{ borderBottom: i < filtered.length - 1 ? '1px solid #f0f0f0' : 'none' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#fafafa')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'white')}
                  >
                    <td style={{ padding: '12px 16px', fontSize: '13px', color: '#888' }}>{t.transaction_date}</td>
                    <td style={{ padding: '12px 16px', fontSize: '13px' }}>
                      <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', background: account?.type === 'cash' ? '#fff3e0' : '#e8f0fe', color: account?.type === 'cash' ? '#e65100' : '#1a73e8', fontWeight: 500 }}>
                        {account?.type === 'cash' ? '💰' : '🏦'} {account?.name}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', fontWeight: 600, background: t.direction === 'in' ? '#e6f4ea' : '#fce8e6', color: t.direction === 'in' ? '#1e7e34' : '#e53e3e' }}>
                        {t.direction === 'in' ? '入金' : '出金'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: 600, color: t.direction === 'in' ? '#1e7e34' : '#e53e3e' }}>
                      {t.direction === 'in' ? '+' : '-'}¥{t.amount.toLocaleString()}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '12px', color: '#555' }}>{t.category || '—'}</td>
                    <td style={{ padding: '12px 16px', fontSize: '13px', color: '#555' }}>
                      {t.description || '—'}
                      {t.vehicles && <span style={{ fontSize: '11px', color: '#aaa', marginLeft: '6px' }}>🚗 {t.vehicles.db_number}</span>}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '12px', color: '#888' }}>{t.created_by || '—'}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <button onClick={() => handleDelete(t.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ddd', fontSize: '14px' }}
                        onMouseEnter={e => (e.currentTarget.style.color = '#e53e3e')}
                        onMouseLeave={e => (e.currentTarget.style.color = '#ddd')}>×</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* 入出金登録モーダル */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
          <div style={{ background: 'white', borderRadius: '16px', width: '100%', maxWidth: '480px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>入出金登録</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#888' }}>×</button>
            </div>
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>

              {/* 入出金切替 */}
              <div style={{ display: 'flex', gap: '6px' }}>
                {['in', 'out'].map(d => (
                  <button key={d} onClick={() => setForm(f => ({ ...f, direction: d }))} style={{
                    flex: 1, padding: '10px', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer',
                    background: form.direction === d ? (d === 'in' ? '#1e7e34' : '#e53e3e') : '#f1f3f4',
                    color: form.direction === d ? 'white' : '#555',
                  }}>
                    {d === 'in' ? '💰 入金' : '💸 出金'}
                  </button>
                ))}
              </div>

              {/* 口座選択 */}
              <div>
                <label style={lbl}>口座 *</label>
                <select value={form.account_id} onChange={e => setForm(f => ({ ...f, account_id: e.target.value }))} style={inp}>
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.type === 'cash' ? '💰' : '🏦'} {a.name}</option>)}
                </select>
              </div>

              {/* 日付・金額 */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={lbl}>日付 *</label>
                  <input type="date" value={form.transaction_date} onChange={e => setForm(f => ({ ...f, transaction_date: e.target.value }))} style={inp} />
                </div>
                <div>
                  <label style={lbl}>金額（円）*</label>
                  <input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="0" style={inp} />
                </div>
              </div>

              {/* カテゴリ */}
              <div>
                <label style={lbl}>カテゴリ</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
                  {CATEGORIES.map(c => (
                    <button key={c} onClick={() => setForm(f => ({ ...f, category: f.category === c ? '' : c }))}
                      style={{ padding: '4px 12px', borderRadius: '20px', border: 'none', fontSize: '12px', fontWeight: 500, cursor: 'pointer', background: form.category === c ? '#0070f3' : '#f1f3f4', color: form.category === c ? 'white' : '#555' }}>
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              {/* 内容・担当 */}
              <div>
                <label style={lbl}>内容</label>
                <input type="text" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="内容を入力" style={inp} />
              </div>
              <div>
                <label style={lbl}>担当者</label>
                <input type="text" value={form.created_by} onChange={e => setForm(f => ({ ...f, created_by: e.target.value }))} placeholder="山田" style={inp} />
              </div>
            </div>
            <div style={{ padding: '16px 24px', borderTop: '1px solid #eee', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button onClick={() => setShowModal(false)} style={{ padding: '10px 20px', background: '#f1f3f4', color: '#555', borderRadius: '8px', border: 'none', fontSize: '14px', cursor: 'pointer' }}>キャンセル</button>
              <button onClick={handleSave} style={{ padding: '10px 20px', background: '#0070f3', color: 'white', borderRadius: '8px', border: 'none', fontSize: '14px', fontWeight: 500, cursor: 'pointer' }}>保存</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}