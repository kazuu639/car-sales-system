'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

type Task = {
  id: string
  title: string
  due_date: string | null
  assigned_to: string | null
  is_shared: boolean
  is_done: boolean
  auto_type: string | null
  created_at: string
}

const STATUS_COLOR: Record<string, { bg: string; color: string }> = {
  '商談中': { bg: '#fff3e0', color: '#e65100' },
  '見積済': { bg: '#e8f0fe', color: '#1a73e8' },
  '成約':   { bg: '#e6f4ea', color: '#1e7e34' },
  '失注':   { bg: '#f1f3f4', color: '#5f6368' },
}

export default function DashboardPage() {
  const [vehicles, setVehicles] = useState<any[]>([])
  const [negotiations, setNegotiations] = useState<any[]>([])
  const [deliveries, setDeliveries] = useState<any[]>([])
  const [inquiries, setInquiries] = useState<any[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [newTask, setNewTask] = useState('')
  const [taskTab, setTaskTab] = useState<'my' | 'shared'>('my')
  const [addingTask, setAddingTask] = useState(false)

  const todayStr = new Date().toISOString().split('T')[0]

  const fetchTasks = async () => {
    const { data } = await supabase
      .from('tasks')
      .select('*')
      .or(`due_date.eq.${todayStr},due_date.is.null`)
      .order('is_done', { ascending: true })
      .order('created_at', { ascending: false })
    setTasks(data ?? [])
  }

  useEffect(() => {
    Promise.all([
      supabase.from('vehicles').select('*, master_makers(name), master_models(name)').order('created_at', { ascending: false }),
      supabase.from('negotiations').select('*, customers!customer_id(氏名), vehicles(master_makers(name), master_models(name))').order('created_at', { ascending: false }).limit(5),
      supabase.from('deliveries').select('*, contracts(*, negotiations(*, customers(氏名), vehicles(master_makers(name), master_models(name))))').order('created_at', { ascending: false }).limit(5),
      supabase.from('inquiries').select('*').eq('status', 'new').order('created_at', { ascending: false }).limit(5),
    ]).then(([v, n, d, i]) => {
      setVehicles(v.data ?? [])
      setNegotiations(n.data ?? [])
      setDeliveries(d.data ?? [])
      setInquiries(i.data ?? [])
      setLoading(false)
    })
    fetchTasks()
  }, [])

  const addTask = async () => {
    if (!newTask.trim()) return
    setAddingTask(true)
    await supabase.from('tasks').insert({
      title: newTask.trim(),
      due_date: todayStr,
      is_shared: taskTab === 'shared',
      is_done: false,
    })
    setNewTask('')
    setAddingTask(false)
    fetchTasks()
  }

  const toggleTask = async (task: Task) => {
    await supabase.from('tasks').update({ is_done: !task.is_done }).eq('id', task.id)
    fetchTasks()
  }

  const deleteTask = async (id: string) => {
    await supabase.from('tasks').delete().eq('id', id)
    fetchTasks()
  }

  const filteredTasks = tasks.filter(t =>
    taskTab === 'shared' ? t.is_shared : !t.is_shared
  )
  const doneTasks = filteredTasks.filter(t => t.is_done).length

  const inStock = vehicles.filter(v => v.status === '在庫中').length
  const inDeal  = vehicles.filter(v => v.status === '商談中').length
  const totalSales = vehicles
    .filter(v => v.status === '売約済' || v.status === '納車済')
    .reduce((sum, v) => sum + (v.body_price ?? 0), 0)

  const today = new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })

  const stepLabel = (step: number) => {
    const steps = ['契約締結', 'ローン申込', 'OK番号取得', '書類収集', '登録申請', '入金確認', '整備仕上', '納車完了']
    return steps[Math.min(step - 1, 7)] ?? '—'
  }

  const kpis = [
    { label: '在庫台数', value: `${inStock}`, unit: '台', sub: `総登録 ${vehicles.length}台`, icon: 'ti-car', color: '#1a73e8', bg: '#e8f0fe' },
    { label: '商談中', value: `${inDeal}`, unit: '件', sub: '進行中の商談', icon: 'ti-file-text', color: '#e65100', bg: '#fff3e0' },
    { label: '新規問合', value: `${inquiries.length}`, unit: '件', sub: '未対応の問合', icon: 'ti-message-circle', color: '#c5221f', bg: '#fce8e6' },
    { label: '売上合計', value: totalSales >= 10000 ? `${(totalSales / 10000).toFixed(0)}万` : totalSales.toLocaleString(), unit: '円', sub: '車体価格ベース', icon: 'ti-chart-bar', color: '#1e7e34', bg: '#e6f4ea' },
  ]

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>

      {/* ヘッダー */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 700, margin: 0, color: '#111' }}>ダッシュボード</h1>
        <p style={{ fontSize: '13px', color: '#888', margin: '4px 0 0' }}>{today}</p>
      </div>

      {/* KPI 4列 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '12px' }}>
        {kpis.map((k, i) => (
          <div key={i} style={{ background: 'white', border: '1px solid #eee', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '12px', color: '#888', fontWeight: 500 }}>{k.label}</span>
              <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: k.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className={`ti ${k.icon}`} style={{ fontSize: '14px', color: k.color }} />
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
              <span style={{ fontSize: '26px', fontWeight: 700, color: '#111', lineHeight: 1 }}>{loading ? '—' : k.value}</span>
              <span style={{ fontSize: '12px', color: '#888' }}>{k.unit}</span>
            </div>
            <div style={{ fontSize: '11px', color: '#aaa' }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* 中段：未対応の問合 ｜ 商談 ｜ 納車（3列） */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '12px' }}>

        {/* 未対応の問合 */}
        <div style={{ background: 'white', border: '1px solid #eee', borderRadius: '12px', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <i className="ti ti-message-circle" style={{ fontSize: '15px', color: '#c5221f' }} />
              <span style={{ fontSize: '14px', fontWeight: 600, color: '#111' }}>未対応の問合</span>
              <span style={{ fontSize: '11px', padding: '2px 7px', borderRadius: '20px', background: '#fce8e6', color: '#c5221f', fontWeight: 600 }}>{inquiries.length}件</span>
            </div>
            <Link href="/inquiries" style={{ fontSize: '12px', color: '#0070f3', textDecoration: 'none' }}>すべて →</Link>
          </div>
          {inquiries.length === 0 ? (
            <div style={{ padding: '1rem', textAlign: 'center', color: '#ccc', fontSize: '12px' }}>未対応の問合はありません ✓</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {inquiries.map((inq, i) => (
                <Link key={inq.id} href="/inquiries" style={{
                  display: 'block', padding: '8px 10px',
                  border: '1px solid #fce8e6', borderRadius: '8px',
                  textDecoration: 'none', background: '#fffafa',
                }}>
                  <div style={{ fontSize: '12px', fontWeight: 500, color: '#111', marginBottom: '2px' }}>{inq.customer_name}</div>
                  <div style={{ fontSize: '11px', color: '#aaa' }}>{inq.car_interest && `🚗 ${inq.car_interest}`}</div>
                  <div style={{ fontSize: '10px', color: '#bbb', marginTop: '2px' }}>{inq.inquiry_date}</div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* 最近の商談 */}
        <div style={{ background: 'white', border: '1px solid #eee', borderRadius: '12px', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <i className="ti ti-file-text" style={{ fontSize: '15px', color: '#888' }} />
              <span style={{ fontSize: '14px', fontWeight: 600, color: '#111' }}>最近の商談</span>
            </div>
            <Link href="/negotiations" style={{ fontSize: '12px', color: '#0070f3', textDecoration: 'none' }}>すべて →</Link>
          </div>
          {loading ? (
            <div style={{ padding: '1rem', textAlign: 'center', color: '#aaa', fontSize: '12px' }}>読み込み中...</div>
          ) : negotiations.length === 0 ? (
            <div style={{ padding: '1rem', textAlign: 'center', color: '#aaa', fontSize: '12px' }}>商談データがありません</div>
          ) : negotiations.map((n, i) => (
            <Link key={n.id} href={`/negotiations/${n.id}`} style={{
              display: 'flex', alignItems: 'center', gap: '8px', padding: '7px 0',
              borderBottom: i < negotiations.length - 1 ? '1px solid #f5f5f5' : 'none', textDecoration: 'none',
            }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 600, color: '#555', flexShrink: 0 }}>
                {(n.customers?.氏名 ?? '－')[0]}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '12px', fontWeight: 500, color: '#111', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.customers?.氏名 ?? '－'}</div>
                <div style={{ fontSize: '10px', color: '#aaa' }}>{n.vehicles?.master_makers?.name} {n.vehicles?.master_models?.name}</div>
              </div>
              <span style={{ fontSize: '10px', padding: '2px 7px', borderRadius: '20px', fontWeight: 500, whiteSpace: 'nowrap', background: STATUS_COLOR[n.status]?.bg ?? '#f1f3f4', color: STATUS_COLOR[n.status]?.color ?? '#555' }}>
                {n.status}
              </span>
            </Link>
          ))}
        </div>

        {/* 納車進捗 */}
        <div style={{ background: 'white', border: '1px solid #eee', borderRadius: '12px', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <i className="ti ti-truck" style={{ fontSize: '15px', color: '#888' }} />
              <span style={{ fontSize: '14px', fontWeight: 600, color: '#111' }}>納車進捗</span>
            </div>
            <Link href="/deliveries" style={{ fontSize: '12px', color: '#0070f3', textDecoration: 'none' }}>すべて →</Link>
          </div>
          {loading ? (
            <div style={{ padding: '1rem', textAlign: 'center', color: '#aaa', fontSize: '12px' }}>読み込み中...</div>
          ) : deliveries.length === 0 ? (
            <div style={{ padding: '1rem', textAlign: 'center', color: '#aaa', fontSize: '12px' }}>納車データがありません</div>
          ) : deliveries.map((d, i) => {
            const neg = d.contracts?.negotiations
            const customer = neg?.customers
            const vehicle = neg?.vehicles
            const done = d.current_step >= 8
            return (
              <Link key={d.id} href={`/deliveries/${d.id}`} style={{
                display: 'flex', alignItems: 'center', gap: '8px', padding: '7px 0',
                borderBottom: i < deliveries.length - 1 ? '1px solid #f5f5f5' : 'none', textDecoration: 'none',
              }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: done ? '#e6f4ea' : '#fff3e0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <i className={`ti ${done ? 'ti-check' : 'ti-clock'}`} style={{ fontSize: '13px', color: done ? '#1e7e34' : '#e65100' }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '12px', fontWeight: 500, color: '#111', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{customer?.氏名 ?? '—'}</div>
                  <div style={{ fontSize: '10px', color: '#aaa' }}>{vehicle?.master_makers?.name} {vehicle?.master_models?.name}</div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: '10px', color: '#aaa' }}>Step {d.current_step}</div>
                  <div style={{ fontSize: '11px', color: done ? '#1e7e34' : '#e65100', fontWeight: 500 }}>{stepLabel(d.current_step)}</div>
                </div>
              </Link>
            )
          })}
        </div>
      </div>

      {/* 下段：今日のタスク（横長） */}
      <div style={{ background: 'white', border: '1px solid #eee', borderRadius: '12px', padding: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <i className="ti ti-checkbox" style={{ fontSize: '15px', color: '#888' }} />
            <span style={{ fontSize: '14px', fontWeight: 600, color: '#111' }}>今日のタスク</span>
            <span style={{ fontSize: '11px', color: '#aaa' }}>{doneTasks}/{filteredTasks.length}完了</span>
          </div>
          <div style={{ display: 'flex', gap: '4px' }}>
            {(['my', 'shared'] as const).map(t => (
              <button key={t} onClick={() => setTaskTab(t)} style={{
                padding: '3px 12px', border: 'none', borderRadius: '5px', fontSize: '11px',
                cursor: 'pointer', fontWeight: 500,
                background: taskTab === t ? '#0070f3' : '#f1f3f4',
                color: taskTab === t ? 'white' : '#555',
              }}>
                {t === 'my' ? '個人' : '全体'}
              </button>
            ))}
          </div>
        </div>

        {/* タスク入力 */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
          <input
            type="text"
            value={newTask}
            onChange={e => setNewTask(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addTask()}
            placeholder="タスクを追加... (Enterでも追加)"
            style={{ flex: 1, border: '1px solid #ddd', borderRadius: '8px', padding: '7px 12px', fontSize: '13px', outline: 'none' }}
          />
          <button onClick={addTask} disabled={addingTask || !newTask.trim()} style={{
            padding: '7px 20px', background: '#0070f3', color: 'white', border: 'none',
            borderRadius: '8px', fontSize: '13px', cursor: 'pointer', fontWeight: 500,
            opacity: !newTask.trim() ? 0.5 : 1,
          }}>追加</button>
        </div>

        {/* タスク一覧（横並びグリッド） */}
        {filteredTasks.length === 0 ? (
          <div style={{ padding: '1rem', textAlign: 'center', color: '#ccc', fontSize: '13px' }}>タスクがありません</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '6px' }}>
            {filteredTasks.map(task => (
              <div key={task.id} style={{
                display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px',
                borderRadius: '7px', border: '1px solid #f0f0f0',
                background: task.is_done ? '#fafafa' : 'white',
              }}>
                <input type="checkbox" checked={task.is_done} onChange={() => toggleTask(task)}
                  style={{ width: '14px', height: '14px', cursor: 'pointer', flexShrink: 0 }} />
                <span style={{
                  flex: 1, fontSize: '13px', color: task.is_done ? '#aaa' : '#111',
                  textDecoration: task.is_done ? 'line-through' : 'none',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {task.auto_type && '🔔 '}{task.title}
                </span>
                <button onClick={() => deleteTask(task.id)} style={{
                  background: 'none', border: 'none', cursor: 'pointer', color: '#ddd', fontSize: '14px', lineHeight: 1,
                }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#e53e3e')}
                  onMouseLeave={e => (e.currentTarget.style.color = '#ddd')}
                >×</button>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  )
}