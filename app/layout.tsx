'use client'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import UserMenu from '@/components/UserMenu'
import Link from 'next/link'
import SidebarLogo from '@/components/SidebarLogo'

type SearchResult = {
  id: string
  type: '車両' | '顧客' | '商談' | '問合'
  title: string
  sub: string
  href: string
}

const NAV_ITEMS = [
  { label: 'ダッシュボード', href: '/',             icon: 'ti-layout-dashboard' },
  { label: '問合',           href: '/inquiries',    icon: 'ti-message-circle'   },
  { label: '商談',           href: '/negotiations', icon: 'ti-file-text'        },
  { label: '在庫管理',       href: '/vehicles',     icon: 'ti-car'              },
  { label: '納車管理',       href: '/deliveries',   icon: 'ti-truck'            },
]
const NAV_ITEMS2 = [
  { label: '顧客',      href: '/customers', icon: 'ti-users'    },
  { label: '業者',      href: '/dealers',   icon: 'ti-building' },
  { label: 'DATA BOX',  href: '/databox',   icon: 'ti-folder'   },
  { label: '管理画面',  href: '/admin',     icon: 'ti-settings' },
]

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const hideNav = pathname === '/login'

  const [collapsed, setCollapsed] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const timerRef = useRef<any>(null)

  const search = async (q: string) => {
    const keywords = q.trim().replace(/\s+/g, ' ').split(' ').filter(Boolean)
    if (keywords.length === 0) { setResults([]); return }
    setSearching(true)
    const [
      { data: v1 }, { data: v2 }, { data: v3 },
      { data: c1 }, { data: c2 }, { data: c3 },
      { data: i1 }, { data: i2 },
      { data: n1 },
    ] = await Promise.all([
      keywords.reduce((q: any, k) => q.ilike('chassis_number', `%${k}%`), supabase.from('vehicles').select('id,chassis_number,car_number,db_number,car_name,master_models(name),master_makers(name)').limit(5)),
      keywords.reduce((q: any, k) => q.ilike('car_number',      `%${k}%`), supabase.from('vehicles').select('id,chassis_number,car_number,db_number,car_name,master_models(name),master_makers(name)').limit(5)),
      keywords.reduce((q: any, k) => q.ilike('car_name',        `%${k}%`), supabase.from('vehicles').select('id,chassis_number,car_number,db_number,car_name,master_models(name),master_makers(name)').limit(5)),
      keywords.reduce((q: any, k) => q.ilike('氏名',            `%${k}%`), supabase.from('customers').select('id,氏名,氏名カナ,電話番号').limit(5)),
      keywords.reduce((q: any, k) => q.ilike('氏名カナ',        `%${k}%`), supabase.from('customers').select('id,氏名,氏名カナ,電話番号').limit(5)),
      keywords.reduce((q: any, k) => q.ilike('電話番号',        `%${k}%`), supabase.from('customers').select('id,氏名,氏名カナ,電話番号').limit(5)),
      keywords.reduce((q: any, k) => q.ilike('customer_name',   `%${k}%`), supabase.from('inquiries').select('id,customer_name,phone,car_interest,inquiry_date').limit(5)),
      keywords.reduce((q: any, k) => q.ilike('phone',           `%${k}%`), supabase.from('inquiries').select('id,customer_name,phone,car_interest,inquiry_date').limit(5)),
      keywords.reduce((q: any, k) => q.ilike('customers.氏名',  `%${k}%`), supabase.from('negotiations').select('id,status,customers(氏名,電話番号),vehicles(db_number,master_models(name))').limit(5)),
    ])
    const seen = new Set<string>()
    const res: SearchResult[] = []
    const addV = (v: any) => {
      if (!v || seen.has('v'+v.id)) return; seen.add('v'+v.id)
      res.push({ id: v.id, type: '車両', title: ((v.master_makers?.name ?? '') + ' ' + (v.master_models?.name ?? v.car_name ?? '')).trim() || '車両', sub: [v.db_number, v.chassis_number, v.car_number].filter(Boolean).join(' · '), href: `/vehicles/${v.id}` })
    }
    const addC = (c: any) => {
      if (!c || seen.has('c'+c.id)) return; seen.add('c'+c.id)
      res.push({ id: c.id, type: '顧客', title: c.氏名 ?? '顧客', sub: [c.氏名カナ, c.電話番号].filter(Boolean).join(' · '), href: `/customers/${c.id}` })
    }
    const addI = (i: any) => {
      if (!i || seen.has('i'+i.id)) return; seen.add('i'+i.id)
      res.push({ id: i.id, type: '問合', title: i.customer_name ?? '問合', sub: [i.phone, i.car_interest, i.inquiry_date].filter(Boolean).join(' · '), href: '/inquiries' })
    }
    const addN = (n: any) => {
      if (!n || seen.has('n'+n.id)) return; seen.add('n'+n.id)
      res.push({ id: n.id, type: '商談', title: n.customers?.氏名 ?? '商談', sub: [n.vehicles?.master_models?.name, n.status].filter(Boolean).join(' · '), href: `/negotiations/${n.id}` })
    }
    ;[v1,v2,v3].forEach(arr => (arr||[]).forEach(addV))
    ;[c1,c2,c3].forEach(arr => (arr||[]).forEach(addC))
    ;[i1,i2].forEach(arr => (arr||[]).forEach(addI))
    ;(n1||[]).forEach(addN)
    setResults(res)
    setSearching(false)
  }

  useEffect(() => {
    clearTimeout(timerRef.current)
    if (!query.trim()) { setResults([]); return }
    timerRef.current = setTimeout(() => search(query), 300)
    return () => clearTimeout(timerRef.current)
  }, [query])

  useEffect(() => {
    if (searchOpen) setTimeout(() => inputRef.current?.focus(), 100)
    else { setQuery(''); setResults([]) }
  }, [searchOpen])

  const TYPE_COLOR: Record<string, string> = {
    '車両': '#1a73e8', '顧客': '#1e7e34', '商談': '#e65100', '問合': '#c5221f'
  }
  const TYPE_BG: Record<string, string> = {
    '車両': '#e8f0fe', '顧客': '#e6f4ea', '商談': '#fff3e0', '問合': '#fce8e6'
  }

  const sidebarW = collapsed ? 56 : 220

  const NavLink = ({ href, icon, label }: { href: string; icon: string; label: string }) => {
    const active = pathname === href || (href !== '/' && pathname.startsWith(href))
    return (
      <Link href={href} style={{
        display: 'flex', alignItems: 'center', gap: '10px',
        padding: collapsed ? '9px 0' : '9px 12px',
        justifyContent: collapsed ? 'center' : 'flex-start',
        borderRadius: '8px', textDecoration: 'none', marginBottom: '2px',
        background: active ? '#eff6ff' : 'transparent',
        color: active ? '#1a73e8' : '#666',
        fontWeight: active ? 500 : 400,
        transition: 'background 0.15s, color 0.15s',
      }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.background = '#f5f5f5' }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
      title={collapsed ? label : undefined}
      >
        <i className={`ti ${icon}`} style={{ fontSize: '18px', flexShrink: 0 }} aria-hidden="true" />
        {!collapsed && <span style={{ fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden' }}>{label}</span>}
      </Link>
    )
  }

  if (hideNav) {
    return (
      <html lang="ja">
        <body style={{ margin: 0, fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
          {children}
        </body>
      </html>
    )
  }

  return (
    <html lang="ja">
      <head>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/dist/tabler-icons.min.css" />
      </head>
      <body style={{ margin: 0, fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif', background: '#f7f8fa', display: 'flex', minHeight: '100vh' }}>

        {/* サイドバー */}
        <aside style={{
          width: `${sidebarW}px`, minHeight: '100vh',
          background: 'white', borderRight: '1px solid #eee',
          display: 'flex', flexDirection: 'column',
          position: 'fixed', top: 0, left: 0, bottom: 0,
          transition: 'width 0.22s ease', overflow: 'hidden', zIndex: 100,
          flexShrink: 0,
        }}>
          {/* ロゴ＋トグル */}
          <div style={{ padding: '8px 10px', borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'space-between', minHeight: '56px' }}>
            {!collapsed && <SidebarLogo collapsed={collapsed} />}
            <button onClick={() => setCollapsed(!collapsed)} style={{
              width: '28px', height: '28px', borderRadius: '6px', border: '1px solid #eee',
              background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center',
              justifyContent: 'center', flexShrink: 0,
            }} aria-label="サイドバー切替">
              <i className={`ti ${collapsed ? 'ti-layout-sidebar-left-expand' : 'ti-layout-sidebar-left-collapse'}`} style={{ fontSize: '16px', color: '#888' }} aria-hidden="true" />
            </button>
            {collapsed && <SidebarLogo collapsed={collapsed} />}
          </div>

          {/* 検索ボタン */}
          <div style={{ padding: '8px 10px', borderBottom: '1px solid #eee' }}>
            <button onClick={() => setSearchOpen(true)} style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: '6px',
              padding: collapsed ? '7px 0' : '7px 10px', justifyContent: collapsed ? 'center' : 'flex-start',
              background: '#f5f5f5', border: 'none', borderRadius: '8px', cursor: 'pointer',
            }} title={collapsed ? '総合検索' : undefined}>
              <i className="ti ti-search" style={{ fontSize: '15px', color: '#888', flexShrink: 0 }} aria-hidden="true" />
              {!collapsed && <span style={{ fontSize: '12px', color: '#999', whiteSpace: 'nowrap' }}>総合検索...</span>}
            </button>
          </div>

          {/* ナビ */}
          <nav style={{ padding: '8px', flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
            {!collapsed && <div style={{ fontSize: '10px', color: '#bbb', padding: '6px 8px 4px', fontWeight: 600, letterSpacing: '0.05em' }}>メイン</div>}
            {NAV_ITEMS.map(item => <NavLink key={item.href} {...item} />)}
            <div style={{ height: '8px' }} />
            {!collapsed && <div style={{ fontSize: '10px', color: '#bbb', padding: '6px 8px 4px', fontWeight: 600, letterSpacing: '0.05em' }}>管理</div>}
            {collapsed && <div style={{ borderTop: '1px solid #eee', margin: '8px 6px' }} />}
            {NAV_ITEMS2.map(item => <NavLink key={item.href} {...item} />)}
          </nav>

          {/* ユーザー */}
          <div style={{ padding: '10px 12px', borderTop: '1px solid #eee', display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'flex-start', gap: '8px' }}>
            <UserMenu />
          </div>
        </aside>

        {/* 検索オーバーレイ */}
        {searchOpen && (
          <div onClick={() => setSearchOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 200 }} />
        )}

        {/* 検索パネル */}
        <div style={{
          position: 'fixed', top: 0, left: 0, height: '100vh', width: '400px',
          background: 'white', zIndex: 201, boxShadow: '4px 0 24px rgba(0,0,0,0.15)',
          transform: searchOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.25s ease', display: 'flex', flexDirection: 'column',
        }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <i className="ti ti-search" style={{ fontSize: '18px', color: '#aaa' }} aria-hidden="true" />
            <input ref={inputRef} type="text" value={query} onChange={e => setQuery(e.target.value)}
              placeholder="車体番号・顧客名・電話番号など"
              style={{ flex: 1, border: 'none', outline: 'none', fontSize: '15px', background: 'transparent', color: '#111' }} />
            {query && <button onClick={() => setQuery('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#aaa', fontSize: '18px' }}>×</button>}
            <button onClick={() => setSearchOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#aaa', fontSize: '18px' }}>✕</button>
          </div>

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
          {searching && <div style={{ padding: '2rem', textAlign: 'center', color: '#aaa', fontSize: '14px' }}>検索中...</div>}
          {!searching && query && results.length === 0 && (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#aaa', fontSize: '14px' }}>「{query}」に一致する結果がありません</div>
          )}
          {!searching && results.length > 0 && (
            <div style={{ overflowY: 'auto', flex: 1 }}>
              <div style={{ padding: '12px 20px', fontSize: '12px', color: '#888' }}>{results.length}件ヒット</div>
              {results.map(r => (
                <div key={r.type+r.id} onClick={() => { router.push(r.href); setSearchOpen(false) }}
                  style={{ padding: '14px 20px', cursor: 'pointer', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', gap: '12px' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f8f9fa'}
                  onMouseLeave={e => e.currentTarget.style.background = 'white'}>
                  <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', fontWeight: 600, whiteSpace: 'nowrap', background: TYPE_BG[r.type], color: TYPE_COLOR[r.type] }}>{r.type}</span>
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

        {/* メインコンテンツ */}
        <main style={{ marginLeft: `${sidebarW}px`, flex: 1, minHeight: '100vh', transition: 'margin-left 0.22s ease' }}>
          {children}
        </main>
      </body>
    </html>
  )
}