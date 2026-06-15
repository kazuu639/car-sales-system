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
{ label: 'カレンダー',     href: '/calendar',     icon: 'ti-calendar'         },
{ label: '会計',     href: '/accounting', icon: 'ti-cash'     },
]
const NAV_ITEMS2 = [
{ label: '顧客',      href: '/customers', icon: 'ti-users'       },
{ label: '業者',      href: '/dealers',   icon: 'ti-building'    },
{ label: 'DATA BOX',  href: '/databox',   icon: 'ti-folder'      },
{ label: 'レポート',  href: '/reports',   icon: 'ti-chart-bar'   },
{ label: '設定', href: '/settings', icon: 'ti-tool' },
]

const DROPDOWN_GROUPS = [
  { label: '買取', items: [
    { label: '買取問合', href: '/inquiries/new?type=purchase' },
    { label: '買取商談', href: '/negotiations/new?category=purchase' },
  ]},
  { label: '販売', items: [
    { label: '販売問合', href: '/inquiries/new?type=sales' },
    { label: '販売商談', href: '/negotiations/new?category=sales' },
  ]},
  { label: 'その他', items: [
    { label: '車検',     href: '/negotiations/new?category=inspection' },
    { label: '修理',     href: '/negotiations/new?category=repair'     },
    { label: 'ドレスUP', href: '/negotiations/new?category=dresup'     },
  ]},
  { label: '車両', items: [
    { label: 'AA仕入', href: '/vehicles/new?type=aa'           },
    { label: '預かり', href: '/vehicles/new?type=consignment'  },
  ]},
]

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const hideNav = pathname === '/login'

  const [collapsed, setCollapsed] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const timerRef = useRef<any>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // ページ遷移時にモバイルメニューを閉じる
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [pathname])

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

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const TYPE_COLOR: Record<string, string> = {
    '車両': '#1a73e8', '顧客': '#1e7e34', '商談': '#e65100', '問合': '#c5221f'
  }
  const TYPE_BG: Record<string, string> = {
    '車両': '#e8f0fe', '顧客': '#e6f4ea', '商談': '#fff3e0', '問合': '#fce8e6'
  }

  const sidebarW = collapsed ? 56 : 230

  const NavLink = ({ href, icon, label }: { href: string; icon: string; label: string }) => {
    const active = pathname === href || (href !== '/' && pathname.startsWith(href))
    const isCollapsed = !isMobile && collapsed
    return (
      <Link href={href} style={{
        display: 'flex', alignItems: 'center', gap: '10px',
        padding: isCollapsed ? '9px 0' : '9px 12px',
        justifyContent: isCollapsed ? 'center' : 'flex-start',
        borderRadius: '8px', textDecoration: 'none', marginBottom: '2px',
        background: active ? '#eff6ff' : 'transparent',
        color: active ? '#1a73e8' : '#666',
        fontWeight: active ? 500 : 400,
        transition: 'background 0.15s, color 0.15s',
      }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.background = '#f5f5f5' }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
      title={isCollapsed ? label : undefined}
      >
        <i className={`ti ${icon}`} style={{ fontSize: '18px', flexShrink: 0 }} aria-hidden="true" />
        {!isCollapsed && <span style={{ fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden' }}>{label}</span>}
      </Link>
    )
  }

  if (hideNav) {
    return (
      <html lang="ja" suppressHydrationWarning>
        <body style={{ margin: 0, fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
          {children}
        </body>
      </html>
    )
  }

  return (
    <html lang="ja" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `
  (function() {
    var size = localStorage.getItem('fontSize') || 'medium';
    document.documentElement.setAttribute('data-fontsize', size);
    var zoom = size === 'small' ? '0.875' : size === 'large' ? '1.125' : '1';
    document.documentElement.style.zoom = zoom;
  })();
` }} />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#1a73e8" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="BRAIN BASE" />
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/dist/tabler-icons.min.css" />
      </head>
      <body style={{ margin: 0, fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif', background: '#f7f8fa', display: 'flex', minHeight: '100vh' }}>

        {/* グローバルヘッダー */}
        <header style={{
          position: 'fixed', top: 0, left: 0, right: 0, height: '56px',
          background: 'white', borderBottom: '1px solid #eee',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 16px 0 0', zIndex: 1000,
        }}>
          <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '3px', background: 'linear-gradient(to right, #e8622a, #2196f3, #4caf50)' }} />
          {/* 左: ハンバーガー（モバイル）またはロゴエリア（PC） */}
          {isMobile ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingLeft: '8px' }}>
              <button
                onClick={() => setMobileMenuOpen(o => !o)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px', display: 'flex', flexDirection: 'column', gap: '5px' }}
                aria-label="メニュー"
              >
                <span style={{ display: 'block', width: '22px', height: '2px', background: '#555', borderRadius: '2px' }} />
                <span style={{ display: 'block', width: '22px', height: '2px', background: '#555', borderRadius: '2px' }} />
                <span style={{ display: 'block', width: '22px', height: '2px', background: '#555', borderRadius: '2px' }} />
              </button>
              <Link href="/" style={{ lineHeight: 0 }}><SidebarLogo collapsed={false} /></Link>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '230px', flexShrink: 0 }}>
              <Link href="/" style={{ lineHeight: 0 }}><SidebarLogo collapsed={false} /></Link>
            </div>
          )}

          {/* 右: 新規データ入力ドロップダウン */}
          <div ref={dropdownRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setDropdownOpen(o => !o)}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: isMobile ? '8px 10px' : '8px 16px',
                background: '#1a73e8', color: 'white',
                border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <i className="ti ti-plus" style={{ fontSize: '15px' }} />
              {!isMobile && '新規データ入力'}
            </button>

            {dropdownOpen && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 8px)', right: 0,
                background: 'white', border: '1px solid #eee', borderRadius: '12px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.12)', zIndex: 2000,
                minWidth: '180px', overflow: 'hidden', padding: '8px 0',
              }}>
                {DROPDOWN_GROUPS.map((group, gi) => (
                  <div key={group.label}>
                    {gi > 0 && <div style={{ borderTop: '1px solid #f0f0f0', margin: '4px 0' }} />}
                    <div style={{ padding: '4px 16px 2px', fontSize: '10px', color: '#aaa', fontWeight: 600, letterSpacing: '0.05em' }}>
                      {group.label}
                    </div>
                    {group.items.map(item => (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setDropdownOpen(false)}
                        style={{ display: 'block', padding: '8px 16px 8px 24px', fontSize: '13px', color: '#333', textDecoration: 'none' }}
                        onMouseEnter={e => { e.currentTarget.style.background = '#f5f5f5' }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'white' }}
                      >
                        {item.label}
                      </Link>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        </header>

        {/* モバイル: オーバーレイ背景 */}
        {isMobile && mobileMenuOpen && (
          <div
            onClick={() => setMobileMenuOpen(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 150 }}
          />
        )}

        {/* サイドバー */}
        <aside style={{
          width: isMobile ? '230px' : `${sidebarW}px`,
          background: 'white', borderRight: '1px solid #eee',
          display: 'flex', flexDirection: 'column',
          position: 'fixed', top: isMobile ? 0 : '56px', left: 0, bottom: 0,
          transition: isMobile ? 'transform 0.25s ease' : 'width 0.22s ease',
          transform: isMobile ? (mobileMenuOpen ? 'translateX(0)' : 'translateX(-100%)') : 'none',
          overflow: 'hidden', zIndex: 160,
          flexShrink: 0,
        }}>
          {/* モバイル時のヘッダー部分 */}
          {isMobile && (
            <div style={{ height: '56px', display: 'flex', alignItems: 'center', padding: '0 16px', borderBottom: '1px solid #eee', flexShrink: 0 }}>
              <Link href="/" style={{ lineHeight: 0 }} onClick={() => setMobileMenuOpen(false)}>
                <SidebarLogo collapsed={false} />
              </Link>
            </div>
          )}

          {/* 検索ボタン */}
          <div style={{ padding: '8px 10px', borderBottom: '1px solid #eee' }}>
            <button onClick={() => { setSearchOpen(true); setMobileMenuOpen(false) }} style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: '6px',
              padding: (!isMobile && collapsed) ? '7px 0' : '7px 10px',
              justifyContent: (!isMobile && collapsed) ? 'center' : 'flex-start',
              background: '#f5f5f5', border: 'none', borderRadius: '8px', cursor: 'pointer',
            }} title={(!isMobile && collapsed) ? '総合検索' : undefined}>
              <i className="ti ti-search" style={{ fontSize: '15px', color: '#888', flexShrink: 0 }} aria-hidden="true" />
              {(isMobile || !collapsed) && <span style={{ fontSize: '12px', color: '#999', whiteSpace: 'nowrap' }}>総合検索...</span>}
            </button>
          </div>

          {/* ナビ */}
          <nav style={{ padding: '8px', flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden' }}>
            {(isMobile || !collapsed) && <div style={{ fontSize: '10px', color: '#bbb', padding: '6px 8px 4px', fontWeight: 600, letterSpacing: '0.05em' }}>メイン</div>}
            {NAV_ITEMS.map(item => <NavLink key={item.href} {...item} />)}
            <div style={{ height: '8px' }} />
            {(isMobile || !collapsed) && <div style={{ fontSize: '10px', color: '#bbb', padding: '6px 8px 4px', fontWeight: 600, letterSpacing: '0.05em' }}>管理</div>}
            {(!isMobile && collapsed) && <div style={{ borderTop: '1px solid #eee', margin: '8px 6px' }} />}
            {NAV_ITEMS2.map(item => <NavLink key={item.href} {...item} />)}
          </nav>

          {/* ユーザー */}
          <div style={{ padding: '10px 12px', borderTop: '1px solid #eee', display: 'flex', alignItems: 'center', justifyContent: (!isMobile && collapsed) ? 'center' : 'flex-start', gap: '8px' }}>
            <UserMenu />
          </div>
        </aside>

        {/* サイドバー開閉ボタン（PCのみ） */}
        {!isMobile && (
          <button
            onClick={() => setCollapsed(!collapsed)}
            style={{
              position: 'fixed',
              left: `${sidebarW - 12}px`,
              top: '70px',
              width: '24px',
              height: '40px',
              background: 'white',
              border: '1px solid #ddd',
              borderLeft: 'none',
              borderRadius: '0 6px 6px 0',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 110,
              boxShadow: '2px 0 6px rgba(0,0,0,0.08)',
              transition: 'left 0.22s ease',
              padding: 0,
            }}
            aria-label="サイドバー切替"
          >
            <span style={{ fontSize: '16px', color: '#999', lineHeight: 1, userSelect: 'none' }}>
              {collapsed ? '›' : '‹'}
            </span>
          </button>
        )}

        {/* 検索オーバーレイ */}
        {searchOpen && (
          <div onClick={() => setSearchOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 200 }} />
        )}

        {/* 検索パネル */}
        <div style={{
          position: 'fixed', top: 0, left: 0, height: '100vh',
          width: isMobile ? '100%' : '400px',
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
        <main style={{
          marginLeft: isMobile ? 0 : `${sidebarW}px`,
          flex: 1, minHeight: '100vh',
          transition: isMobile ? 'none' : 'margin-left 0.22s ease',
          paddingTop: '56px',
        }}>
          {children}
        </main>
      </body>
    </html>
  )
}
