'use client'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import LoadingOverlay from '@/components/LoadingOverlay'

type CalendarEvent = {
  id: string
  title: string
  event_date: string
  start_time: string | null
  end_time: string | null
  event_type: string
  assigned_to: string | null
  customer_name: string | null
  memo: string | null
}

const EVENT_TYPE_COLOR: Record<string, { bg: string; color: string; border: string; label: string }> = {
  personal: { bg: '#e8f0fe', color: '#1a73e8', border: '#1a73e8', label: '個人' },
  shared:   { bg: '#e6f4ea', color: '#1e7e34', border: '#1e7e34', label: '全体' },
  delivery: { bg: '#fff3e0', color: '#e65100', border: '#e65100', label: '納車' },
  visit:    { bg: '#fce8e6', color: '#c5221f', border: '#c5221f', label: '来店' },
}

const DAYS = ['日', '月', '火', '水', '木', '金', '土']
const HOUR_HEIGHT = 60 // 1時間の高さ(px)
const START_HOUR = 7   // 表示開始時間
const END_HOUR = 22    // 表示終了時間
const HOURS = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => i + START_HOUR)

const emptyForm = {
  title: '', event_date: '', start_time: '', end_time: '',
  event_type: 'personal', assigned_to: '', customer_name: '', memo: '',
}

// 時間文字列 "HH:MM" → 分数
const timeToMinutes = (t: string) => {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

export default function CalendarPage() {
  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]

  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [weekStart, setWeekStart] = useState(() => {
    const d = new Date(today)
    d.setDate(d.getDate() - d.getDay())
    return d
  })
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month')
  const [tab, setTab] = useState<'personal' | 'all' | 'shared'>('personal')
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [showModal, setShowModal] = useState(false)
  const [loadingOverlay, setLoadingOverlay] = useState(false)
  const [loadingMessage, setLoadingMessage] = useState('処理中...')
  const [editTarget, setEditTarget] = useState<CalendarEvent | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [selectedDate, setSelectedDate] = useState<string | null>(todayStr)
  const weekScrollRef = useRef<HTMLDivElement>(null)

  const fetchEvents = async () => {
    const { data } = await supabase.from('calendar_events').select('*')
      .order('event_date').order('start_time')
    setEvents(data ?? [])
  }

  useEffect(() => { fetchEvents() }, [])

  // 週表示に切り替えたら8時にスクロール
  useEffect(() => {
    if (viewMode === 'week' && weekScrollRef.current) {
      setTimeout(() => {
        if (weekScrollRef.current)
          weekScrollRef.current.scrollTop = (8 - START_HOUR) * HOUR_HEIGHT
      }, 50)
    }
  }, [viewMode])

  const filteredEvents = events.filter(e =>
    tab === 'all' ? true
    : tab === 'shared' ? ['shared', 'delivery', 'visit'].includes(e.event_type)
    : e.event_type === 'personal'
  )

  // 月移動
  const prevMonth = () => { if (month === 0) { setYear(y => y - 1); setMonth(11) } else setMonth(m => m - 1) }
  const nextMonth = () => { if (month === 11) { setYear(y => y + 1); setMonth(0) } else setMonth(m => m + 1) }

  // 週移動
  const moveWeek = (dir: number) => {
    const d = new Date(weekStart); d.setDate(d.getDate() + dir * 7); setWeekStart(d)
  }
  const goThisWeek = () => {
    const d = new Date(today); d.setDate(d.getDate() - d.getDay()); setWeekStart(d)
  }

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart); d.setDate(d.getDate() + i); return d
  })

  const openNew = (date?: string, time?: string) => {
    setEditTarget(null)
    setForm({ ...emptyForm, event_date: date ?? '', start_time: time ?? '', event_type: tab === 'shared' ? 'shared' : 'personal' })
    setShowModal(true)
  }
  const openEdit = (ev: CalendarEvent) => {
    setEditTarget(ev)
    setForm({ title: ev.title, event_date: ev.event_date, start_time: ev.start_time ?? '', end_time: ev.end_time ?? '', event_type: ev.event_type, assigned_to: ev.assigned_to ?? '', customer_name: ev.customer_name ?? '', memo: ev.memo ?? '' })
    setShowModal(true)
  }
  const handleSave = async () => {
    setLoadingMessage('保存中...')
    setLoadingOverlay(true)
    if (!form.title) return alert('タイトルを入力してください')
    if (!form.event_date) return alert('日付を入力してください')
    const payload = { title: form.title, event_date: form.event_date, start_time: form.start_time || null, end_time: form.end_time || null, event_type: form.event_type, assigned_to: form.assigned_to || null, customer_name: form.customer_name || null, memo: form.memo || null }
    if (editTarget) await supabase.from('calendar_events').update(payload).eq('id', editTarget.id)
    else await supabase.from('calendar_events').insert(payload)
    setShowModal(false)
    setLoadingOverlay(false)
    fetchEvents()
  }
  const handleDelete = async (id: string) => {
    if (!confirm('削除しますか？')) return
    await supabase.from('calendar_events').delete().eq('id', id)
    setShowModal(false); fetchEvents()
  }

  const getEventsForDate = (dateStr: string) => filteredEvents.filter(e => e.event_date === dateStr)

  // 月カレンダー
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`
  const selectedEvents = selectedDate ? getEventsForDate(selectedDate) : []

  // 週リスト（右パネル）
  const weekEvents = filteredEvents.filter(e => {
    const ws = weekDays[0].toISOString().split('T')[0]
    const we = weekDays[6].toISOString().split('T')[0]
    return e.event_date >= ws && e.event_date <= we
  })

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      {/* ヘッダー */}
      {loadingOverlay && <LoadingOverlay message={loadingMessage} />}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, margin: 0 }}>カレンダー</h1>
          <p style={{ fontSize: '13px', color: '#888', margin: '4px 0 0' }}>スケジュール管理</p>
        </div>
        <button onClick={() => openNew()} style={{ padding: '10px 20px', background: '#0070f3', color: 'white', borderRadius: '8px', border: 'none', fontSize: '14px', fontWeight: 500, cursor: 'pointer' }}>
          ＋ イベント追加
        </button>
      </div>

      {/* タブ＋表示切替 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div style={{ display: 'flex', gap: '4px', background: '#f1f3f4', borderRadius: '10px', padding: '4px' }}>
          {[{ key: 'personal', label: '👤 個人' }, { key: 'all', label: '👥 全体' }, { key: 'shared', label: '🏢 会社' }].map(t => (
            <button key={t.key} onClick={() => setTab(t.key as any)} style={{ padding: '7px 18px', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 500, cursor: 'pointer', background: tab === t.key ? 'white' : 'transparent', color: tab === t.key ? '#111' : '#888', boxShadow: tab === t.key ? '0 1px 4px rgba(0,0,0,0.1)' : 'none' }}>{t.label}</button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '4px', background: '#f1f3f4', borderRadius: '10px', padding: '4px' }}>
          {(['month', 'week'] as const).map(v => (
            <button key={v} onClick={() => setViewMode(v)} style={{ padding: '7px 20px', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 500, cursor: 'pointer', background: viewMode === v ? 'white' : 'transparent', color: viewMode === v ? '#111' : '#888', boxShadow: viewMode === v ? '0 1px 4px rgba(0,0,0,0.1)' : 'none' }}>
              {v === 'month' ? '月' : '週'}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: '16px' }}>

        {/* ===== 月表示 ===== */}
        {viewMode === 'month' && (
          <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #eee', overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <button onClick={prevMonth} style={{ background: 'none', border: '1px solid #eee', borderRadius: '6px', width: '30px', height: '30px', cursor: 'pointer', fontSize: '16px' }}>‹</button>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '17px', fontWeight: 700 }}>{year}年{month + 1}月</span>
                <button onClick={() => { setYear(today.getFullYear()); setMonth(today.getMonth()) }} style={{ padding: '3px 10px', border: '1px solid #ddd', borderRadius: '6px', background: 'white', fontSize: '12px', cursor: 'pointer', color: '#555' }}>今月</button>
              </div>
              <button onClick={nextMonth} style={{ background: 'none', border: '1px solid #eee', borderRadius: '6px', width: '30px', height: '30px', cursor: 'pointer', fontSize: '16px' }}>›</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid #eee' }}>
              {DAYS.map((d, i) => <div key={d} style={{ padding: '8px', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: i === 0 ? '#e53e3e' : i === 6 ? '#1a73e8' : '#888' }}>{d}</div>)}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
              {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} style={{ minHeight: '88px', borderBottom: '1px solid #f5f5f5', borderRight: '1px solid #f5f5f5' }} />)}
              {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                const dayEvents = getEventsForDate(dateStr)
                const isToday = dateStr === todayStr
                const isSelected = dateStr === selectedDate
                const dow = (firstDay + day - 1) % 7
                return (
                  <div key={day} onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                    style={{ minHeight: '88px', padding: '4px', borderBottom: '1px solid #f5f5f5', borderRight: '1px solid #f5f5f5', cursor: 'pointer', background: isSelected ? '#f0f7ff' : 'white' }}
                    onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = '#fafafa' }}
                    onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'white' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                      <span style={{ width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', fontSize: '12px', fontWeight: isToday ? 700 : 400, background: isToday ? '#0070f3' : 'transparent', color: isToday ? 'white' : dow === 0 ? '#e53e3e' : dow === 6 ? '#1a73e8' : '#111' }}>{day}</span>
                      <button onClick={e => { e.stopPropagation(); openNew(dateStr) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ccc', fontSize: '16px', lineHeight: 1 }} onMouseEnter={e => (e.currentTarget.style.color = '#0070f3')} onMouseLeave={e => (e.currentTarget.style.color = '#ccc')}>+</button>
                    </div>
                    {dayEvents.slice(0, 3).map(ev => (
                      <div key={ev.id} onClick={e => { e.stopPropagation(); openEdit(ev) }}
                        style={{ fontSize: '10px', padding: '1px 5px', borderRadius: '3px', marginBottom: '1px', cursor: 'pointer', background: EVENT_TYPE_COLOR[ev.event_type]?.bg, color: EVENT_TYPE_COLOR[ev.event_type]?.color, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', borderLeft: `2px solid ${EVENT_TYPE_COLOR[ev.event_type]?.border}` }}>
                        {ev.start_time && <span style={{ marginRight: '3px' }}>{ev.start_time.slice(0, 5)}</span>}{ev.title}
                      </div>
                    ))}
                    {dayEvents.length > 3 && <div style={{ fontSize: '10px', color: '#888', paddingLeft: '4px' }}>+{dayEvents.length - 3}</div>}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ===== 週表示（Googleカレンダー風） ===== */}
        {viewMode === 'week' && (
          <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #eee', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            {/* 週ナビ */}
            <div style={{ padding: '14px 20px', borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <button onClick={() => moveWeek(-1)} style={{ background: 'none', border: '1px solid #eee', borderRadius: '6px', width: '30px', height: '30px', cursor: 'pointer', fontSize: '16px' }}>‹</button>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '15px', fontWeight: 700 }}>{weekDays[0].getMonth() + 1}/{weekDays[0].getDate()} 〜 {weekDays[6].getMonth() + 1}/{weekDays[6].getDate()}</span>
                <button onClick={goThisWeek} style={{ padding: '3px 10px', border: '1px solid #ddd', borderRadius: '6px', background: 'white', fontSize: '12px', cursor: 'pointer', color: '#555' }}>今週</button>
              </div>
              <button onClick={() => moveWeek(1)} style={{ background: 'none', border: '1px solid #eee', borderRadius: '6px', width: '30px', height: '30px', cursor: 'pointer', fontSize: '16px' }}>›</button>
            </div>

            {/* 曜日ヘッダー */}
            <div style={{ display: 'grid', gridTemplateColumns: '48px repeat(7, 1fr)', borderBottom: '1px solid #eee', flexShrink: 0 }}>
              <div />
              {weekDays.map((d, i) => {
                const ds = d.toISOString().split('T')[0]
                const isToday = ds === todayStr
                return (
                  <div key={i} style={{ padding: '8px 4px', textAlign: 'center', borderLeft: '1px solid #f0f0f0' }}>
                    <div style={{ fontSize: '11px', color: i === 0 ? '#e53e3e' : i === 6 ? '#1a73e8' : '#888' }}>{DAYS[i]}</div>
                    <div style={{ width: '28px', height: '28px', margin: '2px auto 0', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 700, background: isToday ? '#0070f3' : 'transparent', color: isToday ? 'white' : i === 0 ? '#e53e3e' : i === 6 ? '#1a73e8' : '#111', cursor: 'pointer' }}
                      onClick={() => setSelectedDate(ds)}>
                      {d.getDate()}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* 時間軸 + イベント */}
            <div ref={weekScrollRef} style={{ overflowY: 'auto', flex: 1, maxHeight: '560px', position: 'relative' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '48px repeat(7, 1fr)', position: 'relative' }}>
                {/* 時間ラベル列 */}
                <div>
                  {HOURS.map(hour => (
                    <div key={hour} style={{ height: `${HOUR_HEIGHT}px`, display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end', paddingRight: '6px', paddingTop: '2px' }}>
                      <span style={{ fontSize: '10px', color: '#aaa' }}>{String(hour).padStart(2, '0')}:00</span>
                    </div>
                  ))}
                </div>

                {/* 各曜日の列 */}
                {weekDays.map((d, di) => {
                  const ds = d.toISOString().split('T')[0]
                  const dayEvs = getEventsForDate(ds)
                  const totalH = HOURS.length * HOUR_HEIGHT

                  return (
                    <div key={di} style={{ borderLeft: '1px solid #f0f0f0', position: 'relative', height: `${totalH}px` }}>
                      {/* 時間グリッド線 */}
                      {HOURS.map(hour => (
                        <div key={hour} style={{ position: 'absolute', top: `${(hour - START_HOUR) * HOUR_HEIGHT}px`, left: 0, right: 0, height: `${HOUR_HEIGHT}px`, borderTop: '1px solid #f5f5f5', cursor: 'pointer' }}
                          onClick={() => openNew(ds, `${String(hour).padStart(2, '0')}:00`)}
                          onMouseEnter={e => (e.currentTarget.style.background = '#fafafa')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                        />
                      ))}

                      {/* イベントブロック（Googleカレンダー風） */}
                      {dayEvs.map(ev => {
                        if (!ev.start_time) return null
                        const startMin = timeToMinutes(ev.start_time)
                        const endMin = ev.end_time ? timeToMinutes(ev.end_time) : startMin + 60
                        const topPx = ((startMin / 60) - START_HOUR) * HOUR_HEIGHT
                        const heightPx = Math.max(((endMin - startMin) / 60) * HOUR_HEIGHT, 24)
                        const c = EVENT_TYPE_COLOR[ev.event_type]

                        return (
                          <div key={ev.id} onClick={e => { e.stopPropagation(); openEdit(ev) }}
                            style={{
                              position: 'absolute',
                              top: `${topPx}px`,
                              left: '2px', right: '2px',
                              height: `${heightPx - 2}px`,
                              background: c?.bg,
                              borderLeft: `3px solid ${c?.border}`,
                              borderRadius: '4px',
                              padding: '2px 4px',
                              cursor: 'pointer',
                              zIndex: 10,
                              overflow: 'hidden',
                              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                            }}
                            onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
                            onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                          >
                            <div style={{ fontSize: '11px', fontWeight: 600, color: c?.color, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.title}</div>
                            {heightPx > 36 && (
                              <div style={{ fontSize: '10px', color: c?.color, opacity: 0.8 }}>
                                {ev.start_time.slice(0, 5)}{ev.end_time && ` 〜 ${ev.end_time.slice(0, 5)}`}
                              </div>
                            )}
                            {heightPx > 52 && ev.customer_name && (
                              <div style={{ fontSize: '10px', color: c?.color, opacity: 0.7 }}>👤 {ev.customer_name}</div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* 右サイドパネル */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {selectedDate && (
            <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #eee', padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ fontSize: '14px', fontWeight: 600 }}>
                  {new Date(selectedDate + 'T00:00:00').toLocaleDateString('ja-JP', { month: 'long', day: 'numeric', weekday: 'short' })}
                </span>
                <button onClick={() => openNew(selectedDate)} style={{ padding: '4px 10px', background: '#0070f3', color: 'white', border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>＋</button>
              </div>
              {selectedEvents.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#ccc', fontSize: '12px', padding: '1rem' }}>予定なし</div>
              ) : selectedEvents.map(ev => (
                <div key={ev.id} onClick={() => openEdit(ev)}
                  style={{ padding: '8px', borderRadius: '8px', marginBottom: '6px', background: EVENT_TYPE_COLOR[ev.event_type]?.bg, cursor: 'pointer', borderLeft: `3px solid ${EVENT_TYPE_COLOR[ev.event_type]?.border}` }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: EVENT_TYPE_COLOR[ev.event_type]?.color }}>{ev.title}</div>
                  {ev.start_time && <div style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>{ev.start_time.slice(0, 5)}{ev.end_time && ` 〜 ${ev.end_time.slice(0, 5)}`}</div>}
                  {ev.customer_name && <div style={{ fontSize: '11px', color: '#888' }}>👤 {ev.customer_name}</div>}
                </div>
              ))}
            </div>
          )}

          <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #eee', padding: '16px' }}>
            <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px' }}>
              {viewMode === 'month' ? '今月の予定' : '今週の予定'}
            </div>
            {(viewMode === 'week' ? weekEvents : filteredEvents.filter(e => e.event_date.startsWith(monthStr))).length === 0 ? (
              <div style={{ textAlign: 'center', color: '#ccc', fontSize: '12px', padding: '1rem' }}>予定がありません</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '400px', overflowY: 'auto' }}>
                {(viewMode === 'week' ? weekEvents : filteredEvents.filter(e => e.event_date.startsWith(monthStr))).map(ev => (
                  <div key={ev.id} onClick={() => openEdit(ev)}
                    style={{ display: 'flex', gap: '8px', padding: '8px', borderRadius: '8px', cursor: 'pointer', border: '1px solid #f0f0f0', borderLeft: `3px solid ${EVENT_TYPE_COLOR[ev.event_type]?.border}` }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#fafafa')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'white')}
                  >
                    <div style={{ width: '32px', textAlign: 'center', flexShrink: 0 }}>
                      <div style={{ fontSize: '16px', fontWeight: 700, color: '#111', lineHeight: 1 }}>{parseInt(ev.event_date.split('-')[2])}</div>
                      <div style={{ fontSize: '10px', color: '#aaa' }}>{DAYS[new Date(ev.event_date + 'T00:00:00').getDay()]}</div>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '12px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: EVENT_TYPE_COLOR[ev.event_type]?.color }}>{ev.title}</div>
                      {ev.start_time && <div style={{ fontSize: '10px', color: '#888' }}>{ev.start_time.slice(0, 5)}{ev.end_time && ` 〜 ${ev.end_time.slice(0, 5)}`}</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* モーダル */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: '1rem' }}>
          <div style={{ background: 'white', borderRadius: '16px', width: '100%', maxWidth: '480px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>{editTarget ? 'イベント編集' : 'イベント追加'}</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#888' }}>×</button>
            </div>
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', color: '#888', fontWeight: 500 }}>タイトル *</label>
                <input type="text" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="予定のタイトル"
                  style={{ width: '100%', border: '1px solid #ddd', borderRadius: '8px', padding: '8px 12px', fontSize: '13px', marginTop: '4px', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#888', fontWeight: 500 }}>種別</label>
                <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                  {Object.entries(EVENT_TYPE_COLOR).map(([key, val]) => (
                    <button key={key} onClick={() => setForm({ ...form, event_type: key })} style={{ flex: 1, padding: '6px', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: 500, cursor: 'pointer', background: form.event_type === key ? val.color : val.bg, color: form.event_type === key ? 'white' : val.color }}>{val.label}</button>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#888', fontWeight: 500 }}>日付 *</label>
                <input type="date" value={form.event_date} onChange={e => setForm({ ...form, event_date: e.target.value })}
                  style={{ width: '100%', border: '1px solid #ddd', borderRadius: '8px', padding: '8px 12px', fontSize: '13px', marginTop: '4px', boxSizing: 'border-box' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: '#888', fontWeight: 500 }}>開始時間</label>
                  <input type="time" value={form.start_time} onChange={e => setForm({ ...form, start_time: e.target.value })}
                    style={{ width: '100%', border: '1px solid #ddd', borderRadius: '8px', padding: '8px 12px', fontSize: '13px', marginTop: '4px', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: '#888', fontWeight: 500 }}>終了時間</label>
                  <input type="time" value={form.end_time} onChange={e => setForm({ ...form, end_time: e.target.value })}
                    style={{ width: '100%', border: '1px solid #ddd', borderRadius: '8px', padding: '8px 12px', fontSize: '13px', marginTop: '4px', boxSizing: 'border-box' }} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: '#888', fontWeight: 500 }}>担当者</label>
                  <input type="text" value={form.assigned_to} onChange={e => setForm({ ...form, assigned_to: e.target.value })} placeholder="山田"
                    style={{ width: '100%', border: '1px solid #ddd', borderRadius: '8px', padding: '8px 12px', fontSize: '13px', marginTop: '4px', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: '#888', fontWeight: 500 }}>顧客名</label>
                  <input type="text" value={form.customer_name} onChange={e => setForm({ ...form, customer_name: e.target.value })} placeholder="田中 太郎"
                    style={{ width: '100%', border: '1px solid #ddd', borderRadius: '8px', padding: '8px 12px', fontSize: '13px', marginTop: '4px', boxSizing: 'border-box' }} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#888', fontWeight: 500 }}>メモ</label>
                <textarea value={form.memo} onChange={e => setForm({ ...form, memo: e.target.value })} rows={2} placeholder="備考など"
                  style={{ width: '100%', border: '1px solid #ddd', borderRadius: '8px', padding: '8px 12px', fontSize: '13px', marginTop: '4px', boxSizing: 'border-box', resize: 'none' }} />
              </div>
            </div>
            <div style={{ padding: '16px 24px', borderTop: '1px solid #eee', display: 'flex', justifyContent: 'space-between' }}>
              <div>{editTarget && <button onClick={() => handleDelete(editTarget.id)} style={{ padding: '10px 16px', background: '#fff5f5', color: '#e53e3e', borderRadius: '8px', border: 'none', fontSize: '14px', cursor: 'pointer' }}>削除</button>}</div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => setShowModal(false)} style={{ padding: '10px 20px', background: '#f1f3f4', color: '#555', borderRadius: '8px', border: 'none', fontSize: '14px', cursor: 'pointer' }}>キャンセル</button>
                <button onClick={handleSave} style={{ padding: '10px 20px', background: '#0070f3', color: 'white', borderRadius: '8px', border: 'none', fontSize: '14px', fontWeight: 500, cursor: 'pointer' }}>保存</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}