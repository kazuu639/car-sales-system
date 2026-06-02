import UserMenu from '@/components/UserMenu'

export const metadata = {
  title: '車販管理システム',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body style={{ margin: 0, fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif', background: '#f7f8fa' }}>
        <nav style={{
          background: 'white', borderBottom: '1px solid #eee',
          padding: '0 2rem', height: '56px', display: 'flex',
          alignItems: 'center', justifyContent: 'space-between',
          position: 'sticky', top: 0, zIndex: 100
        }}>
          <a href="/" style={{ fontWeight: 700, fontSize: '16px', color: '#111', textDecoration: 'none' }}>
            車販管理システム
          </a>
          <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
            <a href="/" style={{ fontSize: '14px', color: '#555', textDecoration: 'none' }}>ホーム</a>
            <a href="/vehicles" style={{ fontSize: '14px', color: '#555', textDecoration: 'none' }}>在庫一覧</a>
            <a href="/vehicles/new" style={{ fontSize: '14px', color: '#555', textDecoration: 'none' }}>車両登録</a>
            <a href="/customers" style={{ fontSize: '14px', color: '#555', textDecoration: 'none' }}>顧客</a>
            <a href="/dealers" style={{ fontSize: '14px', color: '#555', textDecoration: 'none' }}>業者</a>
            <a href="/delivery" style={{ fontSize: '14px', color: '#555', textDecoration: 'none' }}>納車管理</a>
            <UserMenu />
          </div>
        </nav>
        <main style={{ minHeight: 'calc(100vh - 56px)' }}>
          {children}
        </main>
      </body>
    </html>
  )
}