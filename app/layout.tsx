'use client'
import UserMenu from '@/components/UserMenu'
import { usePathname } from 'next/navigation'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const hideNav = pathname === '/login'

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
            <a href="/" style={{ fontWeight: 700, fontSize: '16px', color: '#111', textDecoration: 'none' }}>
              Brain Base
            </a>
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
        <main style={{ minHeight: 'calc(100vh - 56px)' }}>
          {children}
        </main>
      </body>
    </html>
  )
}