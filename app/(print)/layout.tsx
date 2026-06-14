export default function PrintLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body style={{ margin: 0, padding: 0, background: 'white', fontFamily: 'serif' }}>
        {children}
      </body>
    </html>
  )
}
