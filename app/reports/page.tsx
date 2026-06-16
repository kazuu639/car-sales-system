'use client'
import { useEffect, useState } from 'react'
import { supabase, getCurrentUserScope } from '@/lib/supabase'

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1)
const SOURCES = [
  { value: 'carsensor', label: 'カーセンサー' },
  { value: 'goo',       label: 'グーネット' },
  { value: 'hp',        label: 'HP' },
  { value: 'x',         label: 'X(Twitter)' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'youtube',   label: 'YouTube' },
  { value: 'line',      label: 'LINE' },
  { value: 'tel',       label: '電話' },
  { value: 'visit',     label: '来店' },
  { value: 'referral',  label: '紹介' },
  { value: 'other',     label: 'その他' },
]

export default function ReportsPage() {
  const currentYear = new Date().getFullYear()
  const [year, setYear] = useState(currentYear)
  const [tab, setTab] = useState<'sales' | 'inquiry' | 'staff'>('sales')

  const [vehicles, setVehicles] = useState<any[]>([])
  const [transactions, setTransactions] = useState<any[]>([])
  const [inquiries, setInquiries] = useState<any[]>([])
  const [negotiations, setNegotiations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetch = async () => {
      setLoading(true)
      const scope = await getCurrentUserScope()
      if (!scope) { setLoading(false); return }
      const [v, tx, inq, neg] = await Promise.all([
        supabase.from('vehicles').select('*, master_makers(name), master_models(name)').eq('company_id', scope.company_id),
        supabase.from('transactions').select('*, vehicles(sale_date, contract_date)').eq('company_id', scope.company_id),
        supabase.from('inquiries').select('*').eq('company_id', scope.company_id),
        supabase.from('negotiations').select('*, customers(氏名), vehicles(master_makers(name), master_models(name))').eq('company_id', scope.company_id),
      ])
      setVehicles(v.data ?? [])
      setTransactions(tx.data ?? [])
      setInquiries(inq.data ?? [])
      setNegotiations(neg.data ?? [])
      setLoading(false)
    }
    fetch()
  }, [])

  // 月別売上・粗利計算
  const monthlySales = MONTHS.map(month => {
    const monthStr = `${year}-${String(month).padStart(2, '0')}`
    // その月に売上が立った車両
    const soldVehicles = vehicles.filter(v => v.sale_date?.startsWith(monthStr) || v.contract_date?.startsWith(monthStr))
    const vehicleIds = soldVehicles.map(v => v.id)

    const monthTx = transactions.filter(tx => vehicleIds.includes(tx.vehicle_id))
    const totalIn  = monthTx.filter(t => t.type === 'in').reduce((s, t) => s + t.amount, 0)
    const totalOut = monthTx.filter(t => t.type === 'out').reduce((s, t) => s + t.amount, 0)
    const grossProfit = totalIn - totalOut

    // 車体価格ベースの売上（transactionsがない場合の補完）
    const bodyPriceTotal = soldVehicles.reduce((s, v) => s + (v.body_price ?? 0), 0)

    return {
      month,
      count: soldVehicles.length,
      sales: totalIn > 0 ? totalIn : bodyPriceTotal,
      cost: totalOut,
      profit: totalIn > 0 ? grossProfit : 0,
    }
  })

  const yearTotal = {
    count: monthlySales.reduce((s, m) => s + m.count, 0),
    sales: monthlySales.reduce((s, m) => s + m.sales, 0),
    cost:  monthlySales.reduce((s, m) => s + m.cost, 0),
    profit: monthlySales.reduce((s, m) => s + m.profit, 0),
  }

  // 問合経路別集計
  const sourceStats = SOURCES.map(s => {
    const total = inquiries.filter(i => i.source === s.value).length
    const thisYear = inquiries.filter(i => i.source === s.value && i.inquiry_date?.startsWith(String(year))).length
    // 成約数（問合から商談→成約になったもの・簡易版）
    return { ...s, total, thisYear }
  }).filter(s => s.total > 0)

  const totalInquiries = inquiries.filter(i => i.inquiry_date?.startsWith(String(year))).length

  // スタッフ別成績
  const staffMap: Record<string, { inquiries: number; negotiations: number; closed: number; sales: number }> = {}
  inquiries.filter(i => i.assigned_to && i.inquiry_date?.startsWith(String(year))).forEach(i => {
    if (!staffMap[i.assigned_to]) staffMap[i.assigned_to] = { inquiries: 0, negotiations: 0, closed: 0, sales: 0 }
    staffMap[i.assigned_to].inquiries++
    if (i.status === 'closed') staffMap[i.assigned_to].closed++
  })
  negotiations.filter(n => n.assigned_to).forEach(n => {
    if (!staffMap[n.assigned_to]) staffMap[n.assigned_to] = { inquiries: 0, negotiations: 0, closed: 0, sales: 0 }
    staffMap[n.assigned_to].negotiations++
    if (n.status === '成約') staffMap[n.assigned_to].sales++
  })
  vehicles.filter(v => v.sales_staff && v.sale_date?.startsWith(String(year))).forEach(v => {
    if (!staffMap[v.sales_staff]) staffMap[v.sales_staff] = { inquiries: 0, negotiations: 0, closed: 0, sales: 0 }
    staffMap[v.sales_staff].sales++
  })
  const staffStats = Object.entries(staffMap).map(([name, s]) => ({
    name, ...s,
    closeRate: s.inquiries > 0 ? Math.round(s.closed / s.inquiries * 100) : 0,
    contractRate: s.negotiations > 0 ? Math.round(s.sales / s.negotiations * 100) : 0,
  }))

  // CSVダウンロード（月別売上）
  const downloadSalesCSV = () => {
    const headers = ['月', '販売台数', '売上', '原価・経費', '粗利']
    const rows = monthlySales.map(m => [
      `${year}年${m.month}月`, m.count, m.sales, m.cost, m.profit
    ])
    rows.push(['合計', yearTotal.count, yearTotal.sales, yearTotal.cost, yearTotal.profit])
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `売上レポート_${year}.csv`
    a.click()
  }

  const fmt = (n: number) => n >= 10000 ? `${(n / 10000).toFixed(0)}万` : n.toLocaleString()

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      {/* ヘッダー */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, margin: 0 }}>レポート</h1>
          <p style={{ fontSize: '13px', color: '#888', margin: '4px 0 0' }}>経営分析・実績管理</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <select value={year} onChange={e => setYear(Number(e.target.value))}
            style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '8px 12px', fontSize: '14px', fontWeight: 600, outline: 'none' }}>
            {[currentYear - 1, currentYear, currentYear + 1].map(y => (
              <option key={y} value={y}>{y}年</option>
            ))}
          </select>
          {tab === 'sales' && (
            <button onClick={downloadSalesCSV} style={{ padding: '8px 16px', background: '#f1f3f4', color: '#555', borderRadius: '8px', border: 'none', fontSize: '13px', cursor: 'pointer', fontWeight: 500 }}>
              ⬇ CSV
            </button>
          )}
        </div>
      </div>

      {/* タブ */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', background: '#f1f3f4', borderRadius: '10px', padding: '4px', width: 'fit-content' }}>
        {[
          { key: 'sales',   label: '📊 売上・粗利' },
          { key: 'inquiry', label: '📣 問合経路' },
          { key: 'staff',   label: '👤 スタッフ別' },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key as any)} style={{
            padding: '8px 20px', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 500, cursor: 'pointer',
            background: tab === t.key ? 'white' : 'transparent',
            color: tab === t.key ? '#111' : '#888',
            boxShadow: tab === t.key ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
          }}>{t.label}</button>
        ))}
      </div>

      {loading ? (
        <div style={{ padding: '4rem', textAlign: 'center', color: '#aaa' }}>読み込み中...</div>
      ) : (
        <>
          {/* ① 売上・粗利タブ */}
          {tab === 'sales' && (
            <>
              {/* 年間サマリー */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}>
                {[
                  { label: '年間販売台数', value: `${yearTotal.count}台`, color: '#1a73e8', bg: '#e8f0fe' },
                  { label: '年間売上',     value: `¥${fmt(yearTotal.sales)}`, color: '#1e7e34', bg: '#e6f4ea' },
                  { label: '年間原価・経費', value: `¥${fmt(yearTotal.cost)}`, color: '#e53e3e', bg: '#fce8e6' },
                  { label: '年間粗利',     value: `¥${fmt(yearTotal.profit)}`, color: yearTotal.profit >= 0 ? '#1a73e8' : '#e65100', bg: yearTotal.profit >= 0 ? '#e8f0fe' : '#fff3e0' },
                ].map((k, i) => (
                  <div key={i} style={{ background: 'white', border: '1px solid #eee', borderRadius: '12px', padding: '16px' }}>
                    <div style={{ fontSize: '12px', color: '#888', marginBottom: '8px' }}>{k.label}</div>
                    <div style={{ fontSize: '22px', fontWeight: 700, color: k.color }}>{k.value}</div>
                  </div>
                ))}
              </div>

              {/* 月別テーブル */}
              <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #eee', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f8f9fa', borderBottom: '1px solid #eee' }}>
                      {['月', '販売台数', '売上', '原価・経費', '粗利', '粗利率'].map(h => (
                        <th key={h} style={{ padding: '12px 16px', textAlign: h === '月' ? 'left' : 'right', fontSize: '12px', color: '#888', fontWeight: 600 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {monthlySales.map((m, i) => {
                      const profitRate = m.sales > 0 ? Math.round(m.profit / m.sales * 100) : 0
                      const isCurrentMonth = m.month === new Date().getMonth() + 1 && year === currentYear
                      return (
                        <tr key={m.month} style={{
                          borderBottom: '1px solid #f0f0f0',
                          background: isCurrentMonth ? '#f8f9ff' : 'white',
                        }}>
                          <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: isCurrentMonth ? 700 : 400 }}>
                            {year}年{m.month}月
                            {isCurrentMonth && <span style={{ fontSize: '10px', marginLeft: '6px', color: '#1a73e8', background: '#e8f0fe', padding: '1px 6px', borderRadius: '10px' }}>今月</span>}
                          </td>
                          <td style={{ padding: '12px 16px', fontSize: '13px', textAlign: 'right', fontWeight: 500 }}>
                            {m.count > 0 ? `${m.count}台` : '—'}
                          </td>
                          <td style={{ padding: '12px 16px', fontSize: '13px', textAlign: 'right', color: '#1e7e34', fontWeight: 500 }}>
                            {m.sales > 0 ? `¥${m.sales.toLocaleString()}` : '—'}
                          </td>
                          <td style={{ padding: '12px 16px', fontSize: '13px', textAlign: 'right', color: '#e53e3e' }}>
                            {m.cost > 0 ? `¥${m.cost.toLocaleString()}` : '—'}
                          </td>
                          <td style={{ padding: '12px 16px', fontSize: '13px', textAlign: 'right', fontWeight: 600, color: m.profit > 0 ? '#1a73e8' : m.profit < 0 ? '#e65100' : '#aaa' }}>
                            {m.profit !== 0 ? `${m.profit > 0 ? '+' : ''}¥${m.profit.toLocaleString()}` : '—'}
                          </td>
                          <td style={{ padding: '12px 16px', fontSize: '13px', textAlign: 'right', color: '#888' }}>
                            {profitRate !== 0 ? `${profitRate}%` : '—'}
                          </td>
                        </tr>
                      )
                    })}
                    {/* 合計行 */}
                    <tr style={{ background: '#f8f9fa', borderTop: '2px solid #eee', fontWeight: 700 }}>
                      <td style={{ padding: '12px 16px', fontSize: '13px' }}>年間合計</td>
                      <td style={{ padding: '12px 16px', fontSize: '13px', textAlign: 'right' }}>{yearTotal.count}台</td>
                      <td style={{ padding: '12px 16px', fontSize: '13px', textAlign: 'right', color: '#1e7e34' }}>¥{yearTotal.sales.toLocaleString()}</td>
                      <td style={{ padding: '12px 16px', fontSize: '13px', textAlign: 'right', color: '#e53e3e' }}>¥{yearTotal.cost.toLocaleString()}</td>
                      <td style={{ padding: '12px 16px', fontSize: '13px', textAlign: 'right', color: yearTotal.profit >= 0 ? '#1a73e8' : '#e65100' }}>
                        {yearTotal.profit > 0 ? '+' : ''}¥{yearTotal.profit.toLocaleString()}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '13px', textAlign: 'right', color: '#888' }}>
                        {yearTotal.sales > 0 ? `${Math.round(yearTotal.profit / yearTotal.sales * 100)}%` : '—'}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* ② 問合経路タブ */}
          {tab === 'inquiry' && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '20px' }}>
                <div style={{ background: 'white', border: '1px solid #eee', borderRadius: '12px', padding: '16px' }}>
                  <div style={{ fontSize: '12px', color: '#888', marginBottom: '8px' }}>年間問合総数</div>
                  <div style={{ fontSize: '28px', fontWeight: 700, color: '#111' }}>{totalInquiries}<span style={{ fontSize: '14px', color: '#888', marginLeft: '4px' }}>件</span></div>
                </div>
                <div style={{ background: 'white', border: '1px solid #eee', borderRadius: '12px', padding: '16px' }}>
                  <div style={{ fontSize: '12px', color: '#888', marginBottom: '8px' }}>経路登録済み</div>
                  <div style={{ fontSize: '28px', fontWeight: 700, color: '#111' }}>{sourceStats.reduce((s, x) => s + x.thisYear, 0)}<span style={{ fontSize: '14px', color: '#888', marginLeft: '4px' }}>件</span></div>
                </div>
                <div style={{ background: 'white', border: '1px solid #eee', borderRadius: '12px', padding: '16px' }}>
                  <div style={{ fontSize: '12px', color: '#888', marginBottom: '8px' }}>最多経路</div>
                  <div style={{ fontSize: '20px', fontWeight: 700, color: '#1a73e8' }}>
                    {sourceStats.sort((a, b) => b.thisYear - a.thisYear)[0]?.label ?? '—'}
                  </div>
                </div>
              </div>

              <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #eee', overflow: 'hidden' }}>
                {sourceStats.length === 0 ? (
                  <div style={{ padding: '3rem', textAlign: 'center', color: '#aaa', fontSize: '14px' }}>
                    問合に流入経路が登録されていません
                  </div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#f8f9fa', borderBottom: '1px solid #eee' }}>
                        {['流入経路', `${year}年`, '累計', '割合', ''].map(h => (
                          <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', color: '#888', fontWeight: 600 }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[...sourceStats].sort((a, b) => b.thisYear - a.thisYear).map((s, i) => {
                        const pct = totalInquiries > 0 ? Math.round(s.thisYear / totalInquiries * 100) : 0
                        return (
                          <tr key={s.value} style={{ borderBottom: '1px solid #f0f0f0' }}>
                            <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: 500 }}>{s.label}</td>
                            <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: 700, color: '#1a73e8' }}>{s.thisYear}件</td>
                            <td style={{ padding: '12px 16px', fontSize: '13px', color: '#888' }}>{s.total}件</td>
                            <td style={{ padding: '12px 16px', fontSize: '13px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{ flex: 1, height: '6px', background: '#f0f0f0', borderRadius: '3px', minWidth: '80px' }}>
                                  <div style={{ width: `${pct}%`, height: '100%', background: '#1a73e8', borderRadius: '3px' }} />
                                </div>
                                <span style={{ fontSize: '12px', color: '#888', minWidth: '32px' }}>{pct}%</span>
                              </div>
                            </td>
                            <td style={{ padding: '12px 16px' }} />
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          )}

          {/* ③ スタッフ別タブ */}
          {tab === 'staff' && (
            <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #eee', overflow: 'hidden' }}>
              {staffStats.length === 0 ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: '#aaa', fontSize: '14px' }}>
                  担当者データがありません。問合・商談・車両に担当者を登録してください。
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f8f9fa', borderBottom: '1px solid #eee' }}>
                      {['担当者', '問合対応', '商談数', '成約数', '成約率', '販売台数'].map(h => (
                        <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', color: '#888', fontWeight: 600 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {staffStats.sort((a, b) => b.sales - a.sales).map((s, i) => (
                      <tr key={s.name} style={{ borderBottom: '1px solid #f0f0f0' }}>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: '#e8f0fe', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, color: '#1a73e8' }}>
                              {s.name[0]}
                            </div>
                            <span style={{ fontSize: '14px', fontWeight: 500 }}>{s.name}</span>
                          </div>
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: '13px' }}>{s.inquiries}件</td>
                        <td style={{ padding: '12px 16px', fontSize: '13px' }}>{s.negotiations}件</td>
                        <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: 600, color: '#1e7e34' }}>{s.sales}件</td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ fontSize: '13px', padding: '3px 10px', borderRadius: '20px', fontWeight: 600, background: s.contractRate >= 30 ? '#e6f4ea' : '#f1f3f4', color: s.contractRate >= 30 ? '#1e7e34' : '#555' }}>
                            {s.contractRate}%
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: 700, color: '#1a73e8' }}>{s.sales}台</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}