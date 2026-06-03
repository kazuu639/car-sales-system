'use client'
import UserMenu from '@/components/UserMenu'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'

type SearchResult = {
  id: string
  type: '車両' | '顧客' | '商談' | '問合'
  title: string
  sub: string
  href: string
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const hideNav = pathname === '/login'

  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const timerRef = useRef<any>(null)

  // キーワードをスペース区切りでAND検索
  const buildFilter = (col: string, keywords: string[]) =>
    keywords.map(k => `${col}.ilike.%${k}%`).join(',')

  const search = async (q: string) => {
    const keywords = q.trim().replace(/\s+/g, ' ').split(' ').filter(Boolean)
    if (keywords.length === 0) { setResults([]); return }
    setSearching(true)

    const filter = (col: string) => keywords.reduce(
      (query: any, k) => query.ilike(col, `%${k}%`),
      supabase.from('').select('') // dummy, overridden below
    )

    // 並列検索
    const [
      { data: vehicles1 },
      { data: vehicles2 },
      { data: vehicles3 },
      { data: customers1 },
      { data: customers2 },
      { data: customers3 },
      { data: inquiries1 },
      { data: inquiries2 },
      { data: negotiations },
    ] = await Promise.all([
      // 車両：車台番号
      keywords.reduce((q: any, k) => q.ilike('chassis_number', `%${k}%`),
        supabase.from('vehicles').select('id, chassis_number, car_number, db_number, car_name, master_models(name), master_makers(name)').limit(5)),
      // 車両：車両ナンバー
      keywords.reduce((q: any, k) => q.ilike('car_number', `%${k}%`),
        supabase.from('vehicles').select('id, chassis_number, car_number, db_number, car_name, master_models(name), master_makers(name)').limit(5)),
      // 車両：車種名
      keywords.reduce((q: any, k) => q.ilike('car_name', `%${k}%`),
        supabase.from('vehicles').select('id, chassis_number, car_number, db_number, car_name, master_models(name), master_makers(name)').limit(5)),
      // 顧客：氏名
      keywords.reduce((q: any, k) => q.ilike('氏名', `%${k}%`),
        supabase.from('customers').select('id, 氏名, 氏名カナ, 電話番号').limit(5)),
      // 顧客：氏名カナ
      keywords.reduce((q: any, k) => q.ilike('氏名カナ', `%${k}%`),
        supabase.from('customers').select('id, 氏名, 氏名カナ, 電話番号').limit(5)),
      // 顧客：電話番号
      keywords.reduce((q: any, k) => q.ilike('電話番号', `%${k}%`),
        supabase.from('customers').select('id, 氏名, 氏名カナ, 電話番号').limit(5)),
      // 問合：顧客名
      keywords.reduce((q: any, k) => q.ilike('customer_name', `%${k}%`),
        supabase.from('inquiries').select('id, customer_name, phone, car_interest, inquiry_date').limit(5)),
      // 問合：電話番号
      keywords.reduce((q: any, k) => q.ilike('phone', `%${k}%`),
        supabase.from('inquiries').select('id, customer_name, phone, car_interest, inquiry_date').limit(5)),
      // 商談：顧客名経由
      keywords.reduce((q: any, k) => q.ilike('customers.氏名', `%${k}%`),
        supabase.from('negotiations').select('id, status, created_at, customers(氏名, 電話番号), vehicles(db_number, master_models(name))').limit(5)),
    ])

    // 重複除去してまとめる
    const seen = new Set<string>()
    const res: SearchResult[] = []

    const addVehicle = (v: any) => {
      if (!v || seen.has('v' + v.id)) return
      seen.add('v' + v.id)
      const modelName = (v.master_makers?.name ?? '') + ' ' + (v.master_models?.name ?? v.car_name ?? '')
      res.push({
        id: v.id, type: '車両',
        title: modelName.trim() || '車両',
        sub: [v.db_number, v.chassis_number, v.car_number].filter(Boolean).join(' · '),
        href: `/vehicles/${v.id}`,
      })
    }
    const addCustomer = (c: any) => {
      if (!c || seen.has('c' + c.id)) return
      seen.add('c' + c.id)
      res.push({
        id: c.id, type: '顧客',
        title: c.氏名 ?? '顧客',
        sub: [c.氏名カナ, c.電話番号].filter(Boolean).join(' · '),
        href: `/customers/${c.id}`,
      })
    }
    const addInquiry = (inq: any) => {
      if (!inq || seen.has('i' + inq.id)) return
      seen.add('i' + inq.id)
      res.push({
        id: inq.id, type: '問合',
        title: inq.customer_name ?? '問合',
        sub: [inq.phone, inq.car_interest, inq.inquiry_date].filter(Boolean).join(' · '),
        href: `/inquiries`,
      })
    }
    const addNegotiation = (n: any) => {
      if (!n || seen.has('n' + n.id)) return
      seen.add('n' + n.id)
      res.push({
        id: n.id, type: '商談',
        title: n.customers?.氏名 ?? '商談',
        sub: [n.vehicles?.master_models?.name, n.status].filter(Boolean).join(' · '),
        href: `/negotiations/${n.id}`,
      })
    }

    ;(vehicles1 || []).forEach(addVehicle)
    ;(vehicles2 || []).forEach(addVehicle)
    ;(vehicles3 || []).forEach(addVehicle)
    ;(customers1 || []).forEach(addCustomer)
    ;(customers2 || []).forEach(addCustomer)
    ;(customers3 || []).forEach(addCustomer)
    ;(inquiries1 || []).forEach(addInquiry)
    ;(inquiries2 || []).forEach(addInquiry)
    ;(negotiations || []).forEach(addNegotiation)

    setResults(res)
    setSearching(false)
  }

  // 入力から300msデバウンス
  useEffect(() => {
    clearTimeout(timerRef.current)
    if (!query.trim()) { setResults([]); return }
    timerRef.current = setTimeout(() => search(query), 300)
    return () => clearTimeout(timerRef.current)
  }, [query])

  // サイドバー開いたら自動フォーカス
  useEffect(() => {
    if (sidebarOpen) setTimeout(() => inputRef.current?.focus(), 100)
    else { setQuery(''); setResults([]) }
  }, [sidebarOpen])

  const TYPE_COLOR: Record<string, { bg: string; color: string }> = {
    '車両': { bg: '#e8f0fe', color: '#1a73e8' },
    '顧客': { bg: '#e6f4ea', color: '#1e7e34' },
    '商談': { bg: '#fff3e0', color: '#e65100' },
    '問合': { bg: '#fce8e6', color: '#c5221f' },
  }

  return (
    <html lang="ja">
      <body style={{ margin: 0, fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif', background: '#f7f8fa' }}>
        {!hideNav && (
          <nav style={{
            background: 'white', borderBottom: '1px solid #eee',
            padding: '0 2rem', height: '56px', display: 'flex',
            alignItems: 'center', justifyContent: 'space-between',
            position: 'sticky', top: 0, zIndex: 100
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              {/* 検索ボタン */}
              <button
                onClick={() => setSidebarOpen(true)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '7px 14px', background: '#f1f3f4', border: 'none',
                  borderRadius: '8px', cursor: 'pointer', fontSize: '13px', color: '#555'
                }}
              >
                🔍 総合検索
              </button>
              <a href="/" style={{ fontWeight: 700, fontSize: '16px', color: '#111', textDecoration: 'none' }}>
                Brain Base
              </a>
            </div>
            <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
              <a href="/" style={{ fontSize: '14px', color: '#555', textDecoration: 'none' }}>TOP</a>
              <a href="/inquiries" style={{ fontSize: '14px', color: '#555', textDecoration: 'none' }}>問合</a>
              <a href="/negotiations" style={{ fontSize: '14px', color: '#555', textDecoration: 'none' }}>商談</a>
              <a href="/vehicles" style={{ fontSize: '14px', color: '#555', textDecoration: 'none' }}>在庫管理</a>
              <a href="/deliveries" style={{ fontSize: '14px', color: '#555', textDecoration: 'none' }}>納車管理</a>
              <a href="/databox" style={{ fontSize: '14px', color: '#555', textDecoration: 'none' }}>BOX</a>
              <UserMenu />
            </div>
          </nav>
        )}

        {/* オーバーレイ */}
        {sidebarOpen && (
          <div
            onClick={() => setSidebarOpen(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 200 }}
          />
        )}

        {/* 検索サイドバー */}
        <div style={{
          position: 'fixed', top: 0, left: 0, height: '100vh', width: '400px',
          background: 'white', zIndex: 201, boxShadow: '4px 0 24px rgba(0,0,0,0.15)',
          transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.25s ease',
          display: 'flex', flexDirection: 'column',
        }}>
          {/* サイドバーヘッダー */}
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '18px' }}>🔍</span>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="車体番号・顧客名・電話番号など"
              style={{
                flex: 1, border: 'none', outline: 'none', fontSize: '15px',
                background: 'transparent', color: '#111'
              }}
            />
            {query && (
              <button onClick={() => setQuery('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#aaa', fontSize: '18px', lineHeight: 1 }}>×</button>
            )}
            <button onClick={() => setSidebarOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#aaa', fontSize: '18px', lineHeight: 1, marginLeft: '4px' }}>✕</button>
          </div>

          {/* 検索ヒント */}
          {!query && (
            <div style={{ padding: '20px', color: '#aaa', fontSize: '13px', lineHeight: 2 }}>
              <p style={{ margin: '0 0 12px', fontWeight: 600, color: '#888' }}>検索できる項目</p>
              <div>🚗 車体番号・車両ナンバー・車種名</div>
              <div>👤 顧客名・フリガナ・電話番号</div>
              <div>🤝 商談（顧客名から）</div>
              <div>📋 問合（顧客名・電話番号）</div>
              <p style={{ margin: '16px 0 0', fontSize: '12px', color: '#ccc' }}>スペース区切りでAND検索できます</p>
            </div>
          )}

          {/* 検索中 */}
          {searching && (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#aaa', fontSize: '14px' }}>検索中...</div>
          )}

          {/* 結果なし */}
          {!searching && query && results.length === 0 && (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#aaa', fontSize: '14px' }}>
              「{query}」に一致する結果がありません
            </div>
          )}

          {/* 検索結果 */}
          {!searching && results.length > 0 && (
            <div style={{ overflowY: 'auto', flex: 1 }}>
              <div style={{ padding: '12px 20px', fontSize: '12px', color: '#888' }}>{results.length}件ヒット</div>
              {results.map(r => (
                <div
                  key={r.type + r.id}
                  onClick={() => { router.push(r.href); setSidebarOpen(false) }}
                  style={{
                    padding: '14px 20px', cursor: 'pointer', borderBottom: '1px solid #f0f0f0',
                    display: 'flex', alignItems: 'center', gap: '12px',
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#f8f9fa')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'white')}
                >
                  <span style={{
                    fontSize: '11px', padding: '2px 8px', borderRadius: '20px', fontWeight: 600, whiteSpace: 'nowrap',
                    background: TYPE_COLOR[r.type]?.bg ?? '#f1f3f4',
                    color: TYPE_COLOR[r.type]?.color ?? '#555',
                  }}>{r.type}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '14px', fontWeight: 500, color: '#111', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.title}</div>
                    <div style={{ fontSize: '12px', color: '#888', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.sub}</div>
                  </div>
                  <span style={{ color: '#ccc', fontSize: '16px' }}>›</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <main style={{ minHeight: 'calc(100vh - 56px)' }}>
          {children}
        </main>
      </body>
    </html>
  )
}