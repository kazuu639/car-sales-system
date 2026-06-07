'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useProfile } from '@/hooks/useProfile'

// ─── カテゴリ定義 ───────────────────────────────────────────
const CATEGORY_MAP: Record<string, string[]> = {
  '売上':    ['車両販売', '頭金', 'ローン入金', '部品販売', '整備代', 'チューニング代'],
  '仕入':    ['車両仕入れ', 'オークション落札'],
  '経費':    ['広告費', '家賃', '人件費', '通信費', '店舗備品'],
  '車両経費': ['整備代', '名義登録', '陸送代'],
  '販売経費': ['整備代', '名義登録', '陸送代'],
  '税金':    ['消費税', '自動車税', '法人税'],
  'その他':  ['立替', '振替', '雑費'],
}

const CAT_COLOR: Record<string, { bg: string; color: string }> = {
  '売上':    { bg: '#e6f4ea', color: '#1e7e34' },
  '仕入':    { bg: '#fce8e6', color: '#c62828' },
  '経費':    { bg: '#fff3e0', color: '#e65100' },
  '車両経費': { bg: '#f3e8fd', color: '#7b1fa2' },
  '販売経費': { bg: '#e8f0fe', color: '#1a73e8' },
  '税金':    { bg: '#fce8e6', color: '#b71c1c' },
  'その他':  { bg: '#f1f3f4', color: '#5f6368' },
}

// ─── 型定義 ────────────────────────────────────────────────
type Account = {
  id: string; name: string; type: 'cash' | 'bank'
  bank_name: string | null; balance: number; is_active: boolean; sort_order: number
}

type TxRecord = {
  id: string; account_id: string; date: string
  type: 'in' | 'out'; amount: number
  category: string | null; subcategory: string | null
  note: string | null; vehicle_id: string | null
}

type TxSummary = { id: string; account_id: string; type: 'in' | 'out'; amount: number }

// ─── 月リスト生成 ─────────────────────────────────────────
const today = new Date().toISOString().split('T')[0]
const thisMonth = today.slice(0, 7)
const makeMonths = () => Array.from({ length: 24 }, (_, i) => {
  const d = new Date()
  d.setDate(1)
  d.setMonth(d.getMonth() - i)
  return d.toISOString().slice(0, 7)
})

export default function AccountingPage() {
  const { profile, isAdmin } = useProfile()
  const [accounts,        setAccounts]        = useState<Account[]>([])
  const [transactions,    setTransactions]    = useState<TxRecord[]>([])
  const [allTxSummary,    setAllTxSummary]    = useState<TxSummary[]>([])
  const [vehicles,        setVehicles]        = useState<any[]>([])
  const [loading,         setLoading]         = useState(true)

  // フィルター
  const [month,           setMonth]           = useState(thisMonth)
  const [filterCategory,  setFilterCategory]  = useState('すべて')
  const [filterAccount,   setFilterAccount]   = useState('all')

  // モーダル
  const [showTxModal,     setShowTxModal]     = useState(false)
  const [showAccModal,    setShowAccModal]    = useState(false)

  // フォーム
  const [txForm, setTxForm] = useState({
    account_id: '', date: today,
    type: 'in' as 'in' | 'out',
    category: '', subcategory: '',
    amount: '', note: '', vehicle_id: '',
  })
  const [accForm, setAccForm] = useState({
    name: '', type: 'bank' as 'cash' | 'bank', bank_name: '', balance: '0',
  })

  // ─── データ取得 ──────────────────────────────────────────
  const fetchAll = async () => {
    setLoading(true)
    const [accRes, txRes, sumRes, vRes] = await Promise.all([
      supabase.from('accounts').select('*').eq('is_active', true).order('sort_order'),
      (() => {
        const [y, m] = month.split('-').map(Number)
        const lastDay = new Date(y, m, 0).toISOString().split('T')[0]
        return supabase.from('transactions')
          .select('*')
          .gte('date', month + '-01')
          .lte('date', lastDay)
          .order('created_at', { ascending: false })
      })(),
      supabase.from('transactions').select('id, account_id, type, amount'),
      supabase.from('vehicles').select('id, db_number')
        .is('deleted_at', null).order('created_at', { ascending: false }),
    ])
    const accs = (accRes.data ?? []) as Account[]
    setAccounts(accs)
    setTransactions((txRes.data ?? []) as TxRecord[])
    setAllTxSummary((sumRes.data ?? []) as unknown as TxSummary[])
    setVehicles(vRes.data ?? [])
    if (accs.length > 0 && !txForm.account_id) {
      setTxForm(f => ({ ...f, account_id: accs[0].id }))
    }
    setLoading(false)
  }

  useEffect(() => { fetchAll() }, [month])

  // ─── 残高計算（全期間） ─────────────────────────────────
  const accountBalance = (acc: Account) => {
    const txs = allTxSummary.filter(t => t.account_id === acc.id)
    const net = txs.reduce((s, t) => s + (t.type === 'in' ? t.amount : -t.amount), 0)
    return (acc.balance ?? 0) + net
  }

  // ─── フィルタ適用 ───────────────────────────────────────
  const filtered = transactions.filter(t => {
    const matchAcc = filterAccount === 'all' || t.account_id === filterAccount
    const matchCat = filterCategory === 'すべて' || t.category === filterCategory
    return matchAcc && matchCat
  })
  const totalIn  = filtered.filter(t => t.type === 'in').reduce((s, t) => s + t.amount, 0)
  const totalOut = filtered.filter(t => t.type === 'out').reduce((s, t) => s + t.amount, 0)

  // ─── 保存処理 ───────────────────────────────────────────
  const saveTx = async () => {
    console.log('profile:', profile)
    if (!txForm.account_id) return alert('口座を選択してください')
    if (!txForm.category) return alert('カテゴリーを選択してください')
    if (!txForm.amount) return alert('金額を入力してください')
    const payload = {
      company_id: profile?.company_id ?? null,
      account_id: txForm.account_id,
      date: txForm.date,
      type: txForm.type,
      amount: Number(txForm.amount),
      category: txForm.category || null,
      subcategory: txForm.subcategory || null,
      note: txForm.note || null,
      vehicle_id: txForm.vehicle_id || null,
    }
    console.log('[transactions insert payload]', payload)
    await supabase.from('transactions').insert({
      company_id: payload.company_id,
      account_id: payload.account_id,
      date: payload.date,
      type: payload.type,
      amount: payload.amount,
      category: payload.category,
      subcategory: payload.subcategory,
      note: payload.note,
      vehicle_id: payload.vehicle_id,
    })
    setShowTxModal(false)
    setTxForm(f => ({ ...f, amount: '', note: '', category: '', subcategory: '', vehicle_id: '' }))
    fetchAll()
  }

  const saveAccount = async () => {
    if (!accForm.name) return alert('口座名を入力してください')
    const maxOrder = accounts.reduce((m, a) => Math.max(m, a.sort_order ?? 0), 0)
    await supabase.from('accounts').insert({
      name: accForm.name, type: accForm.type,
      bank_name: accForm.bank_name || null,
      balance: parseInt(accForm.balance) || 0,
      is_active: true, sort_order: maxOrder + 1,
    })
    setShowAccModal(false)
    setAccForm({ name: '', type: 'bank', bank_name: '', balance: '0' })
    fetchAll()
  }

  const deleteTx = async (id: string) => {
    if (!confirm('この入出金記録を削除しますか？')) return
    await supabase.from('transactions').delete().eq('id', id)
    fetchAll()
  }

  const months = makeMonths()

  // ─── スタイル定数 ────────────────────────────────────────
  const inp: React.CSSProperties = {
    width: '100%', padding: '8px 12px', border: '1px solid #ddd',
    borderRadius: '8px', fontSize: '13px', boxSizing: 'border-box', outline: 'none',
  }
  const lbl: React.CSSProperties = {
    fontSize: '12px', color: '#888', fontWeight: 500, marginBottom: '4px', display: 'block',
  }

  // ─── JSX ────────────────────────────────────────────────
  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>

      {/* ===== ヘッダー ===== */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, margin: 0 }}>仮想BK</h1>
          <p style={{ fontSize: '13px', color: '#888', margin: '4px 0 0' }}>銀行・金庫の入出金管理</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => setShowAccModal(true)}
            style={{ padding: '9px 16px', background: '#f1f3f4', color: '#333', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}>
            ＋ 口座追加
          </button>
          <button onClick={() => setShowTxModal(true)}
            style={{ padding: '9px 20px', background: '#0070f3', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>
            ＋ 入出金登録
          </button>
        </div>
      </div>

      {/* ===== 口座カード ===== */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: '12px', marginBottom: '20px' }}>
        {/* 全口座サマリー */}
        <div onClick={() => setFilterAccount('all')}
          style={{
            background: filterAccount === 'all' ? '#1a1a2e' : 'white',
            borderRadius: '12px', border: `1.5px solid ${filterAccount === 'all' ? '#1a1a2e' : '#eee'}`,
            padding: '16px 18px', cursor: 'pointer',
          }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
            <span style={{ fontSize: '18px' }}>📊</span>
            <div style={{ fontSize: '13px', fontWeight: 600, color: filterAccount === 'all' ? 'white' : '#111' }}>全口座</div>
          </div>
          <div style={{ fontSize: '11px', color: filterAccount === 'all' ? '#aaa' : '#888', marginBottom: '3px' }}>
            {month.replace('-', '年')}月 収支
          </div>
          <div style={{ display: 'flex', gap: '16px' }}>
            <div>
              <div style={{ fontSize: '10px', color: '#aaa' }}>入金</div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: '#34a853' }}>
                ¥{transactions.filter(t => t.type === 'in').reduce((s, t) => s + t.amount, 0).toLocaleString()}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '10px', color: '#aaa' }}>出金</div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: '#ea4335' }}>
                ¥{transactions.filter(t => t.type === 'out').reduce((s, t) => s + t.amount, 0).toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        {/* 口座ごとのカード */}
        {accounts.map(a => {
          const bal = accountBalance(a)
          const isCash = a.type === 'cash'
          const active = filterAccount === a.id
          return (
            <div key={a.id} onClick={() => setFilterAccount(prev => prev === a.id ? 'all' : a.id)}
              style={{
                background: active ? (isCash ? '#fff3e0' : '#e8f0fe') : 'white',
                borderRadius: '12px',
                border: `1.5px solid ${active ? (isCash ? '#e65100' : '#1a73e8') : '#eee'}`,
                padding: '16px 18px', cursor: 'pointer', transition: 'all 0.15s',
              }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                <span style={{ fontSize: '18px' }}>{isCash ? '💰' : '🏦'}</span>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#111' }}>{a.name}</div>
                  {a.bank_name && <div style={{ fontSize: '11px', color: '#aaa' }}>{a.bank_name}</div>}
                </div>
                <span style={{ marginLeft: 'auto', fontSize: '10px', padding: '2px 7px', borderRadius: '10px', fontWeight: 600, background: isCash ? '#fff3e0' : '#e8f0fe', color: isCash ? '#e65100' : '#1a73e8' }}>
                  {isCash ? '金庫' : '銀行'}
                </span>
              </div>
              <div style={{ fontSize: '11px', color: '#888', marginBottom: '3px' }}>残高（累計）</div>
              <div style={{ fontSize: '22px', fontWeight: 700, color: bal >= 0 ? '#111' : '#e53e3e' }}>
                ¥{bal.toLocaleString()}
              </div>
            </div>
          )
        })}

        {accounts.length === 0 && !loading && (
          <div style={{ gridColumn: '1 / -1', padding: '2rem', textAlign: 'center', color: '#ccc', fontSize: '13px', border: '1px dashed #eee', borderRadius: '12px' }}>
            口座が登録されていません。「口座追加」から追加してください。
          </div>
        )}
      </div>

      {/* ===== 月間サマリー ===== */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '20px' }}>
        {[
          { label: '入金合計', value: totalIn,            color: '#1e7e34' },
          { label: '出金合計', value: totalOut,           color: '#e53e3e' },
          { label: '収支',     value: totalIn - totalOut, color: totalIn - totalOut >= 0 ? '#1a73e8' : '#e65100' },
        ].map(k => (
          <div key={k.label} style={{ background: 'white', borderRadius: '12px', border: '1px solid #eee', padding: '16px 20px' }}>
            <div style={{ fontSize: '12px', color: '#888', marginBottom: '6px' }}>
              {k.label}
              <span style={{ fontSize: '11px', color: '#bbb', marginLeft: '6px' }}>（{month.replace('-', '年')}月）</span>
            </div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: k.color }}>
              {k.label === '収支' && k.value > 0 ? '+' : ''}¥{k.value.toLocaleString()}
            </div>
          </div>
        ))}
      </div>

      {/* ===== フィルターバー ===== */}
      <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #eee', padding: '14px 16px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>

          {/* 月選択 */}
          <select value={month} onChange={e => setMonth(e.target.value)}
            style={{ border: '1px solid #e8e8e8', borderRadius: '8px', padding: '7px 12px', fontSize: '13px', outline: 'none', background: '#fafafa' }}>
            {months.map(m => <option key={m} value={m}>{m.replace('-', '年')}月</option>)}
          </select>

          {/* カテゴリタブ */}
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
            {['すべて', ...Object.keys(CATEGORY_MAP)].map(cat => {
              const cfg = CAT_COLOR[cat]
              const active = filterCategory === cat
              return (
                <button key={cat} onClick={() => setFilterCategory(cat)} style={{
                  display: 'flex', alignItems: 'center', gap: '4px',
                  padding: '5px 12px', borderRadius: '20px', border: 'none',
                  fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                  background: active ? (cfg?.color ?? '#111') : '#f1f3f4',
                  color: active ? 'white' : (cfg?.color ?? '#666'),
                  boxShadow: active ? `0 2px 6px ${cfg?.color ?? '#0003'}40` : 'none',
                }}>
                  {cat !== 'すべて' && (
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: active ? 'rgba(255,255,255,0.8)' : (cfg?.color ?? '#aaa'), flexShrink: 0 }} />
                  )}
                  {cat}
                </button>
              )
            })}
          </div>

          {(filterCategory !== 'すべて' || filterAccount !== 'all') && (
            <button onClick={() => { setFilterCategory('すべて'); setFilterAccount('all') }}
              style={{ padding: '5px 12px', border: '1px solid #ddd', borderRadius: '8px', background: 'white', fontSize: '12px', cursor: 'pointer', color: '#888' }}>
              ✕ リセット
            </button>
          )}
          <span style={{ fontSize: '13px', color: '#aaa', marginLeft: 'auto' }}>{filtered.length}件</span>
        </div>
      </div>

      {/* ===== 入出金履歴 ===== */}
      <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #eee', overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '14px', fontWeight: 600 }}>入出金履歴</span>
        </div>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#aaa' }}>読み込み中...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#aaa', fontSize: '14px' }}>
            <div style={{ fontSize: '28px', marginBottom: '8px' }}>💳</div>
            入出金データがありません
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #f0f0f0' }}>
                {['日付', '口座', '入出金', '金額', 'カテゴリ', 'サブカテゴリ', '備考・車両', ''].map((h, i) => (
                  <th key={i} style={{ padding: '11px 16px', textAlign: 'left', fontSize: '11px', color: '#9aa0a6', fontWeight: 600, letterSpacing: '0.03em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((t, i) => {
                const account = accounts.find(a => a.id === t.account_id)
                const cfg = CAT_COLOR[t.category ?? ''] ?? { bg: '#f1f3f4', color: '#888' }
                return (
                  <tr key={t.id}
                    style={{ borderBottom: i < filtered.length - 1 ? '1px solid #f4f4f4' : 'none', background: 'white' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#fafbff')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'white')}
                  >
                    <td style={{ padding: '12px 16px', fontSize: '13px', color: '#888', whiteSpace: 'nowrap' }}>
                      {t.date}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {account ? (
                        <span style={{ fontSize: '11px', padding: '3px 9px', borderRadius: '20px', fontWeight: 500, background: account.type === 'cash' ? '#fff3e0' : '#e8f0fe', color: account.type === 'cash' ? '#e65100' : '#1a73e8' }}>
                          {account.type === 'cash' ? '💰' : '🏦'} {account.name}
                        </span>
                      ) : <span style={{ color: '#ccc', fontSize: '12px' }}>—</span>}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ fontSize: '11px', padding: '3px 9px', borderRadius: '20px', fontWeight: 600, background: t.type === 'in' ? '#e6f4ea' : '#fce8e6', color: t.type === 'in' ? '#1e7e34' : '#e53e3e' }}>
                        {t.type === 'in' ? '入金' : '出金'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '15px', fontWeight: 700, color: t.type === 'in' ? '#1e7e34' : '#e53e3e', whiteSpace: 'nowrap' }}>
                      {t.type === 'in' ? '+' : '-'}¥{t.amount.toLocaleString()}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {t.category ? (
                        <span style={{ fontSize: '11px', padding: '3px 9px', borderRadius: '20px', fontWeight: 600, background: cfg.bg, color: cfg.color }}>
                          {t.category}
                        </span>
                      ) : <span style={{ color: '#ccc', fontSize: '12px' }}>—</span>}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '12px', color: '#666' }}>
                      {t.subcategory || '—'}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '13px', color: '#555' }}>
                      {t.note || '—'}
                      {t.vehicle_id && (
                        <Link href={`/vehicles/${t.vehicle_id}?tab=財務`}
                          style={{ display: 'block', marginTop: '4px', fontSize: '11px', color: '#0070f3', textDecoration: 'none' }}>
                          🚗 車両を見る
                        </Link>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {isAdmin && (
                        <button onClick={() => deleteTx(t.id)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ddd', fontSize: '14px' }}
                          onMouseEnter={e => (e.currentTarget.style.color = '#e53e3e')}
                          onMouseLeave={e => (e.currentTarget.style.color = '#ddd')}>×</button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ===== 入出金登録モーダル ===== */}
      {showTxModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: '1rem' }}>
          <div style={{ background: 'white', borderRadius: '16px', width: '100%', maxWidth: '540px', maxHeight: '90vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: 'white', zIndex: 1 }}>
              <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>入出金登録</h2>
              <button onClick={() => setShowTxModal(false)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#888' }}>×</button>
            </div>
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

              {/* 入出金切替 */}
              <div style={{ display: 'flex', gap: '6px' }}>
                {(['in', 'out'] as const).map(d => (
                  <button key={d} onClick={() => setTxForm(f => ({ ...f, type: d }))} style={{
                    flex: 1, padding: '10px', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer',
                    background: txForm.type === d ? (d === 'in' ? '#1e7e34' : '#e53e3e') : '#f1f3f4',
                    color: txForm.type === d ? 'white' : '#555',
                  }}>
                    {d === 'in' ? '💰 入金' : '💸 出金'}
                  </button>
                ))}
              </div>

              {/* 日付・金額 */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={lbl}>日付 *</label>
                  <input type="date" value={txForm.date} onChange={e => setTxForm(f => ({ ...f, date: e.target.value }))} style={inp} />
                </div>
                <div>
                  <label style={lbl}>金額（円）*</label>
                  <input type="number" value={txForm.amount} onChange={e => setTxForm(f => ({ ...f, amount: e.target.value }))} placeholder="0" style={inp} />
                </div>
              </div>

              {/* 口座 */}
              <div>
                <label style={lbl}>口座 *</label>
                <select value={txForm.account_id} onChange={e => setTxForm(f => ({ ...f, account_id: e.target.value }))} style={inp}>
                  <option value="">選択してください</option>
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.type === 'cash' ? '💰' : '🏦'} {a.name}</option>)}
                </select>
              </div>

              {/* カテゴリ */}
              <div>
                <label style={lbl}>カテゴリ</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                  {Object.keys(CATEGORY_MAP).map(cat => {
                    const cfg = CAT_COLOR[cat]
                    const active = txForm.category === cat
                    return (
                      <button key={cat}
                        onClick={() => setTxForm(f => ({ ...f, category: f.category === cat ? '' : cat, subcategory: '' }))}
                        style={{
                          padding: '5px 13px', borderRadius: '20px', border: 'none', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                          background: active ? cfg.color : cfg.bg,
                          color: active ? 'white' : cfg.color,
                          boxShadow: active ? `0 2px 6px ${cfg.color}40` : 'none',
                        }}>
                        {cat}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* サブカテゴリ */}
              {txForm.category && (
                <div>
                  <label style={lbl}>サブカテゴリ</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                    {(CATEGORY_MAP[txForm.category] ?? []).map(sub => (
                      <button key={sub}
                        onClick={() => setTxForm(f => ({ ...f, subcategory: f.subcategory === sub ? '' : sub }))}
                        style={{
                          padding: '5px 13px', borderRadius: '20px', fontSize: '12px', fontWeight: 500, cursor: 'pointer',
                          border: `1px solid ${txForm.subcategory === sub ? '#0070f3' : '#ddd'}`,
                          background: txForm.subcategory === sub ? '#e8f0fe' : 'white',
                          color: txForm.subcategory === sub ? '#0070f3' : '#555',
                        }}>
                        {sub}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 備考 */}
              <div>
                <label style={lbl}>備考</label>
                <input type="text" value={txForm.note} onChange={e => setTxForm(f => ({ ...f, note: e.target.value }))} placeholder="内容を入力" style={inp} />
              </div>

              {/* 車両紐付け */}
              <div>
                <label style={lbl}>車両紐付け（任意）</label>
                <select value={txForm.vehicle_id} onChange={e => setTxForm(f => ({ ...f, vehicle_id: e.target.value }))} style={inp}>
                  <option value="">紐付けなし</option>
                  {vehicles.map(v => (
                    <option key={v.id} value={v.id}>{v.db_number}</option>
                  ))}
                </select>
              </div>
            </div>
            <div style={{ padding: '16px 24px', borderTop: '1px solid #eee', display: 'flex', justifyContent: 'flex-end', gap: '8px', position: 'sticky', bottom: 0, background: 'white' }}>
              <button onClick={() => setShowTxModal(false)} style={{ padding: '10px 20px', background: '#f1f3f4', color: '#555', borderRadius: '8px', border: 'none', fontSize: '14px', cursor: 'pointer' }}>キャンセル</button>
              <button onClick={saveTx}
                disabled={!txForm.account_id || !txForm.category || !txForm.amount}
                style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', fontSize: '14px', fontWeight: 600, cursor: (!txForm.account_id || !txForm.category || !txForm.amount) ? 'not-allowed' : 'pointer', background: (!txForm.account_id || !txForm.category || !txForm.amount) ? '#ccc' : '#0070f3', color: 'white' }}>保存</button>
            </div>
          </div>
        </div>
      )}

      {/* ===== 口座追加モーダル ===== */}
      {showAccModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
          <div style={{ background: 'white', borderRadius: '16px', width: '100%', maxWidth: '400px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>口座追加</h2>
              <button onClick={() => setShowAccModal(false)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#888' }}>×</button>
            </div>
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>

              {/* 種別 */}
              <div>
                <label style={lbl}>種別</label>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {(['cash', 'bank'] as const).map(t => (
                    <button key={t} onClick={() => setAccForm(f => ({ ...f, type: t }))} style={{
                      flex: 1, padding: '9px', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                      background: accForm.type === t ? (t === 'cash' ? '#e65100' : '#1a73e8') : '#f1f3f4',
                      color: accForm.type === t ? 'white' : '#555',
                    }}>
                      {t === 'cash' ? '💰 金庫' : '🏦 銀行口座'}
                    </button>
                  ))}
                </div>
              </div>

              {/* 口座名 */}
              <div>
                <label style={lbl}>口座名 *</label>
                <input type="text" value={accForm.name}
                  onChange={e => setAccForm(f => ({ ...f, name: e.target.value }))}
                  placeholder={accForm.type === 'cash' ? '現金金庫' : '〇〇銀行 普通預金'}
                  style={inp} />
              </div>

              {/* 銀行名（銀行のみ） */}
              {accForm.type === 'bank' && (
                <div>
                  <label style={lbl}>銀行名</label>
                  <input type="text" value={accForm.bank_name}
                    onChange={e => setAccForm(f => ({ ...f, bank_name: e.target.value }))}
                    placeholder="〇〇銀行"
                    style={inp} />
                </div>
              )}

              {/* 初期残高 */}
              <div>
                <label style={lbl}>初期残高（円）</label>
                <input type="number" value={accForm.balance}
                  onChange={e => setAccForm(f => ({ ...f, balance: e.target.value }))}
                  placeholder="0"
                  style={inp} />
                <p style={{ fontSize: '11px', color: '#aaa', margin: '4px 0 0' }}>
                  システム利用開始時点の残高を入力してください
                </p>
              </div>
            </div>
            <div style={{ padding: '16px 24px', borderTop: '1px solid #eee', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button onClick={() => setShowAccModal(false)} style={{ padding: '10px 20px', background: '#f1f3f4', color: '#555', borderRadius: '8px', border: 'none', fontSize: '14px', cursor: 'pointer' }}>キャンセル</button>
              <button onClick={saveAccount} style={{ padding: '10px 20px', background: '#0070f3', color: 'white', borderRadius: '8px', border: 'none', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>保存</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
