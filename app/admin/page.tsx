import { supabase } from '@/lib/supabase'

export default async function AdminPage() {
  const { data: profiles } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: true })

  const roleLabel: any = {
    admin: '管理者',
    manager: '店長',
    staff: 'スタッフ',
    part: 'バイト・パート',
  }

  const roleColor: any = {
    admin: { bg: '#fce8e6', color: '#c62828' },
    manager: { bg: '#fff3e0', color: '#e65100' },
    staff: { bg: '#e8f0fe', color: '#1a73e8' },
    part: { bg: '#f1f3f4', color: '#5f6368' },
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, margin: 0 }}>管理画面</h1>
          <p style={{ fontSize: '13px', color: '#888', margin: '4px 0 0' }}>スタッフ・マスターデータの管理</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <a href="/admin/masters" style={{
            padding: '10px 20px', background: 'white', color: '#555',
            borderRadius: '8px', textDecoration: 'none', fontSize: '14px',
            border: '1px solid #ddd', fontWeight: 500
          }}>⚙️ マスターデータ</a>
          <a href="/admin/new" style={{
            padding: '10px 20px', background: '#0070f3', color: 'white',
            borderRadius: '8px', textDecoration: 'none', fontSize: '14px', fontWeight: 500
          }}>＋ スタッフ追加</a>
        </div>
      </div>

      <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #eee', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8f9fa', borderBottom: '1px solid #eee' }}>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', color: '#888', fontWeight: 600 }}>名前</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', color: '#888', fontWeight: 600 }}>メールアドレス</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', color: '#888', fontWeight: 600 }}>権限</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', color: '#888', fontWeight: 600 }}>入社日</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', color: '#888', fontWeight: 600 }}>操作</th>
            </tr>
          </thead>
          <tbody>
            {profiles && profiles.map((p, i) => (
              <tr key={p.id} style={{ borderBottom: i < profiles.length - 1 ? '1px solid #f0f0f0' : 'none' }}>
                <td style={{ padding: '14px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      width: '32px', height: '32px', borderRadius: '50%',
                      background: '#0070f3', color: 'white', display: 'flex',
                      alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 600, flexShrink: 0
                    }}>
                      {p.display_name?.charAt(0).toUpperCase()}
                    </div>
                    <span style={{ fontSize: '14px', fontWeight: 500 }}>{p.display_name}</span>
                  </div>
                </td>
                <td style={{ padding: '14px 16px', fontSize: '13px', color: '#888' }}>{p.email}</td>
                <td style={{ padding: '14px 16px' }}>
                  <span style={{
                    fontSize: '11px', padding: '3px 10px', borderRadius: '20px', fontWeight: 500,
                    background: roleColor[p.role]?.bg ?? '#f1f3f4',
                    color: roleColor[p.role]?.color ?? '#5f6368',
                  }}>{roleLabel[p.role] ?? p.role}</span>
                </td>
                <td style={{ padding: '14px 16px', fontSize: '13px', color: '#888' }}>
                  {p.join_date ? new Date(p.join_date).toLocaleDateString('ja-JP') : '未設定'}
                </td>
                <td style={{ padding: '14px 16px' }}>
                  <a href={`/admin/${p.id}/edit`} style={{
                    fontSize: '12px', padding: '5px 12px', border: '1px solid #ddd',
                    borderRadius: '6px', textDecoration: 'none', color: '#555'
                  }}>編集</a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}