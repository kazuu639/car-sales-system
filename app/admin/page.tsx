'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

const ROLE_LABEL: any = { admin: '管理者', manager: '店長', staff: 'スタッフ', part: 'バイト・パート' }
const ROLE_COLOR: any = {
  admin:   { bg: '#fce8e6', color: '#c62828' },
  manager: { bg: '#fff3e0', color: '#e65100' },
  staff:   { bg: '#e8f0fe', color: '#1a73e8' },
  part:    { bg: '#f1f3f4', color: '#5f6368' },
}

export default function AdminPage() {
  const [tab, setTab] = useState<'shop' | 'staff' | 'box'>('shop')
  const [profiles, setProfiles] = useState<any[]>([])
  const [settings, setSettings] = useState<any>(null)
  const [boxes, setBoxes] = useState<any[]>([])
  const [vehicles, setVehicles] = useState<any[]>([])
  const [saving, setSaving] = useState(false)
  const [shopForm, setShopForm] = useState<any>({})
  const [showStaffModal, setShowStaffModal] = useState(false)
  const [editStaff, setEditStaff] = useState<any>(null)
  const [staffForm, setStaffForm] = useState({ display_name: '', email: '', role: 'staff', join_date: '' })

  const fetchAll = async () => {
    const [p, s, b, v] = await Promise.all([
      supabase.from('profiles').select('*').order('created_at', { ascending: true }),
      supabase.from('shop_settings').select('*').single(),
      supabase.from('document_boxes').select('*, vehicles(db_number, master_makers(name), master_models(name), status)').order('box_number'),
      supabase.from('vehicles').select('id, status').in('status', ['在庫中', '商談中', '売約済']),
    ])
    setProfiles(p.data ?? [])
    setSettings(s.data)
    setShopForm(s.data ?? {})
    setBoxes(b.data ?? [])
    setVehicles(v.data ?? [])
  }

  useEffect(() => { fetchAll() }, [])

  const saveShop = async () => {
    setSaving(true)
    const { id, created_at, ...rest } = shopForm
    await supabase.from('shop_settings').update({ ...rest, updated_at: new Date().toISOString() }).eq('id', settings.id)

    // 在庫上限変更時にBOXを自動調整
    const newMax = parseInt(shopForm.max_vehicles) || 30
    const currentCount = boxes.length
    if (newMax > currentCount) {
      // 追加
      const toAdd = Array.from({ length: newMax - currentCount }, (_, i) => ({
        box_number: String(currentCount + i + 1).padStart(3, '0')
      }))
      await supabase.from('document_boxes').insert(toAdd)
    }
    await fetchAll()
    setSaving(false)
    alert('保存しました！')
  }

  const openNewStaff = () => {
    setEditStaff(null)
    setStaffForm({ display_name: '', email: '', role: 'staff', join_date: '' })
    setShowStaffModal(true)
  }

  const openEditStaff = (p: any) => {
    setEditStaff(p)
    setStaffForm({ display_name: p.display_name ?? '', email: p.email ?? '', role: p.role ?? 'staff', join_date: p.join_date ?? '' })
    setShowStaffModal(true)
  }

  const saveStaff = async () => {
    if (!staffForm.display_name) return alert('名前を入力してください')
    const maxStaff = settings?.max_staff ?? 5
    if (!editStaff && profiles.length >= maxStaff) return alert(`スタッフは${maxStaff}人までです`)
    if (editStaff) {
      await supabase.from('profiles').update({ ...staffForm }).eq('id', editStaff.id)
    } else {
      await supabase.from('profiles').insert({ ...staffForm })
    }
    setShowStaffModal(false)
    fetchAll()
  }

  const deleteStaff = async (id: string) => {
    if (!confirm('このスタッフを削除しますか？')) return
    await supabase.from('profiles').delete().eq('id', id)
    fetchAll()
  }

  // 在庫数
  const currentVehicles = vehicles.length
  const maxVehicles = settings?.max_vehicles ?? 30
  const maxStaff = settings?.max_staff ?? 5
  const vehiclePct = Math.round((currentVehicles / maxVehicles) * 100)
  const staffPct = Math.round((profiles.length / maxStaff) * 100)
  const occupiedBoxes = boxes.filter(b => b.is_occupied).length

  const inp = { width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '13px', boxSizing: 'border-box' as const, outline: 'none' }
  const lbl = { fontSize: '12px', color: '#888', fontWeight: 500, marginBottom: '4px', display: 'block' }

  return (
    <div style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
      {/* ヘッダー */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 700, margin: 0 }}>管理画面</h1>
        <p style={{ fontSize: '13px', color: '#888', margin: '4px 0 0' }}>店舗設定・スタッフ管理</p>
      </div>

      {/* サマリーカード */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '20px' }}>
        {[
          { label: '在庫台数', current: currentVehicles, max: maxVehicles, pct: vehiclePct, color: vehiclePct >= 90 ? '#e53e3e' : '#1a73e8', bg: vehiclePct >= 90 ? '#fce8e6' : '#e8f0fe', unit: '台' },
          { label: 'スタッフ数', current: profiles.length, max: maxStaff, pct: staffPct, color: staffPct >= 100 ? '#e53e3e' : '#1e7e34', bg: staffPct >= 100 ? '#fce8e6' : '#e6f4ea', unit: '人' },
          { label: '書類BOX使用', current: occupiedBoxes, max: boxes.length, pct: boxes.length > 0 ? Math.round((occupiedBoxes / boxes.length) * 100) : 0, color: '#e65100', bg: '#fff3e0', unit: '個' },
        ].map(k => (
          <div key={k.label} style={{ background: 'white', border: '1px solid #eee', borderRadius: '12px', padding: '16px' }}>
            <div style={{ fontSize: '12px', color: '#888', marginBottom: '8px' }}>{k.label}</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '8px' }}>
              <span style={{ fontSize: '24px', fontWeight: 700, color: k.color }}>{k.current}</span>
              <span style={{ fontSize: '13px', color: '#888' }}>/ {k.max}{k.unit}</span>
            </div>
            <div style={{ height: '6px', background: '#f0f0f0', borderRadius: '3px' }}>
              <div style={{ width: `${Math.min(k.pct, 100)}%`, height: '100%', background: k.color, borderRadius: '3px' }} />
            </div>
          </div>
        ))}
      </div>

      {/* タブ */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', background: '#f1f3f4', borderRadius: '10px', padding: '4px', width: 'fit-content' }}>
        {[{ key: 'shop', label: '🏢 店舗設定' }, { key: 'staff', label: '👥 スタッフ管理' }, { key: 'box', label: '📁 書類BOX' }].map(t => (
          <button key={t.key} onClick={() => setTab(t.key as any)} style={{
            padding: '7px 20px', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 500, cursor: 'pointer',
            background: tab === t.key ? 'white' : 'transparent', color: tab === t.key ? '#111' : '#888',
            boxShadow: tab === t.key ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
          }}>{t.label}</button>
        ))}
      </div>

      {/* ===== 店舗設定タブ ===== */}
      {tab === 'shop' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* 基本情報 */}
          <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #eee', padding: '24px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 600, margin: '0 0 20px' }}>基本情報</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={lbl}>店舗名</label>
                <input value={shopForm.shop_name ?? ''} onChange={e => setShopForm((f: any) => ({ ...f, shop_name: e.target.value }))} style={inp} placeholder="Brain Base モータース" />
              </div>
              <div>
                <label style={lbl}>店舗名（カナ）</label>
                <input value={shopForm.shop_name_kana ?? ''} onChange={e => setShopForm((f: any) => ({ ...f, shop_name_kana: e.target.value }))} style={inp} placeholder="ブレインベースモータース" />
              </div>
              <div>
                <label style={lbl}>電話番号</label>
                <input value={shopForm.phone ?? ''} onChange={e => setShopForm((f: any) => ({ ...f, phone: e.target.value }))} style={inp} placeholder="03-0000-0000" />
              </div>
              <div>
                <label style={lbl}>FAX</label>
                <input value={shopForm.fax ?? ''} onChange={e => setShopForm((f: any) => ({ ...f, fax: e.target.value }))} style={inp} placeholder="03-0000-0001" />
              </div>
              <div>
                <label style={lbl}>メールアドレス</label>
                <input value={shopForm.email ?? ''} onChange={e => setShopForm((f: any) => ({ ...f, email: e.target.value }))} style={inp} placeholder="info@example.com" />
              </div>
              <div>
                <label style={lbl}>ウェブサイト</label>
                <input value={shopForm.website ?? ''} onChange={e => setShopForm((f: any) => ({ ...f, website: e.target.value }))} style={inp} placeholder="https://example.com" />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={lbl}>住所</label>
                <input value={shopForm.address ?? ''} onChange={e => setShopForm((f: any) => ({ ...f, address: e.target.value }))} style={inp} placeholder="東京都渋谷区..." />
              </div>
            </div>
          </div>

        {/* 上限設定 */}
          <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #eee', padding: '24px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 600, margin: '0 0 8px' }}>上限設定</h3>
            <p style={{ fontSize: '12px', color: '#aaa', margin: '0 0 20px' }}>上限変更はBrain Base管理者にお問い合わせください</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={lbl}>在庫上限台数（書類BOX数と連動）</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input type="number" value={shopForm.max_vehicles ?? 30}
                    disabled
                    style={{ ...inp, width: '100px', background: '#f5f5f5', color: '#aaa', cursor: 'not-allowed' }} />
                  <span style={{ fontSize: '13px', color: '#888' }}>台（現在 {currentVehicles}台使用中）</span>
                </div>
              </div>
              <div>
                <label style={lbl}>スタッフ上限人数</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input type="number" value={shopForm.max_staff ?? 5}
                    disabled
                    style={{ ...inp, width: '100px', background: '#f5f5f5', color: '#aaa', cursor: 'not-allowed' }} />
                  <span style={{ fontSize: '13px', color: '#888' }}>人（現在 {profiles.length}人登録中）</span>
                </div>
              </div>
            </div>
            <p style={{ fontSize: '11px', color: '#bbb', margin: '12px 0 0', display: 'flex', alignItems: 'center', gap: '4px' }}>
              🔒 上限変更はBrain Base管理者への申請が必要です
            </p>
          </div>

          {/* 銀行口座 */}
          <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #eee', padding: '24px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 600, margin: '0 0 20px' }}>銀行口座（仮想BK）</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={lbl}>銀行名</label>
                <input value={shopForm.bank_name ?? ''} onChange={e => setShopForm((f: any) => ({ ...f, bank_name: e.target.value }))} style={inp} placeholder="〇〇銀行" />
              </div>
              <div>
                <label style={lbl}>支店名</label>
                <input value={shopForm.bank_branch ?? ''} onChange={e => setShopForm((f: any) => ({ ...f, bank_branch: e.target.value }))} style={inp} placeholder="〇〇支店" />
              </div>
              <div>
                <label style={lbl}>口座種別</label>
                <select value={shopForm.bank_account_type ?? '普通'} onChange={e => setShopForm((f: any) => ({ ...f, bank_account_type: e.target.value }))} style={inp}>
                  <option>普通</option><option>当座</option>
                </select>
              </div>
              <div>
                <label style={lbl}>口座番号</label>
                <input value={shopForm.bank_account_number ?? ''} onChange={e => setShopForm((f: any) => ({ ...f, bank_account_number: e.target.value }))} style={inp} placeholder="1234567" />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={lbl}>口座名義</label>
                <input value={shopForm.bank_account_name ?? ''} onChange={e => setShopForm((f: any) => ({ ...f, bank_account_name: e.target.value }))} style={inp} placeholder="カ）ブレインベース" />
              </div>
            </div>
          </div>

          <button onClick={saveShop} disabled={saving} style={{ padding: '12px', background: '#0070f3', color: 'white', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: 600, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
            {saving ? '保存中...' : '設定を保存する'}
          </button>
        </div>
      )}

      {/* ===== スタッフ管理タブ ===== */}
      {tab === 'staff' && (
        <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #eee', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #eee' }}>
            <div>
              <span style={{ fontSize: '15px', fontWeight: 600 }}>スタッフ一覧</span>
              <span style={{ fontSize: '13px', color: profiles.length >= maxStaff ? '#e53e3e' : '#888', marginLeft: '8px' }}>
                {profiles.length}/{maxStaff}人
              </span>
            </div>
            <button onClick={openNewStaff} disabled={profiles.length >= maxStaff}
              style={{ padding: '8px 16px', background: profiles.length >= maxStaff ? '#f1f3f4' : '#0070f3', color: profiles.length >= maxStaff ? '#aaa' : 'white', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 500, cursor: profiles.length >= maxStaff ? 'not-allowed' : 'pointer' }}>
              ＋ スタッフ追加
            </button>
          </div>
          {profiles.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#aaa', fontSize: '14px' }}>スタッフが登録されていません</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8f9fa', borderBottom: '1px solid #eee' }}>
                  {['名前', 'メール', '権限', '入社日', '操作'].map(h => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', color: '#888', fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {profiles.map((p, i) => (
                  <tr key={p.id} style={{ borderBottom: i < profiles.length - 1 ? '1px solid #f0f0f0' : 'none' }}>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#0070f3', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700 }}>
                          {p.display_name?.charAt(0)?.toUpperCase()}
                        </div>
                        <span style={{ fontSize: '14px', fontWeight: 500 }}>{p.display_name}</span>
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '13px', color: '#888' }}>{p.email}</td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '20px', fontWeight: 500, background: ROLE_COLOR[p.role]?.bg ?? '#f1f3f4', color: ROLE_COLOR[p.role]?.color ?? '#555' }}>
                        {ROLE_LABEL[p.role] ?? p.role}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '13px', color: '#888' }}>
                      {p.join_date ? new Date(p.join_date).toLocaleDateString('ja-JP') : '未設定'}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={() => openEditStaff(p)} style={{ padding: '5px 12px', border: '1px solid #ddd', borderRadius: '6px', background: 'white', fontSize: '12px', cursor: 'pointer', color: '#555' }}>編集</button>
                        <button onClick={() => deleteStaff(p.id)} style={{ padding: '5px 12px', border: '1px solid #fce8e6', borderRadius: '6px', background: 'white', fontSize: '12px', cursor: 'pointer', color: '#e53e3e' }}>削除</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ===== 書類BOXタブ ===== */}
      {tab === 'box' && (
        <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #eee', padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 600, margin: 0 }}>車検証BOX</h3>
              <p style={{ fontSize: '12px', color: '#aaa', margin: '4px 0 0' }}>使用中 {occupiedBoxes}個 / 全{boxes.length}個</p>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '8px' }}>
            {boxes.map(box => (
              <div key={box.id} style={{
                padding: '12px', borderRadius: '8px', border: `1px solid ${box.is_occupied ? '#93b4f0' : '#eee'}`,
                background: box.is_occupied ? '#e8f0fe' : '#fafafa', textAlign: 'center',
              }}>
                <div style={{ fontSize: '18px', fontWeight: 700, color: box.is_occupied ? '#1a73e8' : '#ccc', marginBottom: '4px' }}>
                  {box.box_number}
                </div>
                {box.is_occupied && box.vehicles ? (
                  <div style={{ fontSize: '10px', color: '#1a73e8', lineHeight: 1.4 }}>
                    <div style={{ fontWeight: 500 }}>{box.vehicles.db_number}</div>
                    <div>{box.vehicles.master_makers?.name} {box.vehicles.master_models?.name}</div>
                  </div>
                ) : (
                  <div style={{ fontSize: '10px', color: '#ccc' }}>空き</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* スタッフモーダル */}
      {showStaffModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
          <div style={{ background: 'white', borderRadius: '16px', width: '100%', maxWidth: '440px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>{editStaff ? 'スタッフ編集' : 'スタッフ追加'}</h2>
              <button onClick={() => setShowStaffModal(false)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#888' }}>×</button>
            </div>
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={lbl}>名前 *</label>
                <input value={staffForm.display_name} onChange={e => setStaffForm(f => ({ ...f, display_name: e.target.value }))} placeholder="山田 太郎" style={inp} />
              </div>
              <div>
                <label style={lbl}>メールアドレス</label>
                <input type="email" value={staffForm.email} onChange={e => setStaffForm(f => ({ ...f, email: e.target.value }))} placeholder="yamada@example.com" style={inp} />
              </div>
              <div>
                <label style={lbl}>権限</label>
                <select value={staffForm.role} onChange={e => setStaffForm(f => ({ ...f, role: e.target.value }))} style={inp}>
                  <option value="admin">管理者</option>
                  <option value="manager">店長</option>
                  <option value="staff">スタッフ</option>
                  <option value="part">バイト・パート</option>
                </select>
              </div>
              <div>
                <label style={lbl}>入社日</label>
                <input type="date" value={staffForm.join_date} onChange={e => setStaffForm(f => ({ ...f, join_date: e.target.value }))} style={inp} />
              </div>
            </div>
            <div style={{ padding: '16px 24px', borderTop: '1px solid #eee', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button onClick={() => setShowStaffModal(false)} style={{ padding: '10px 20px', background: '#f1f3f4', color: '#555', borderRadius: '8px', border: 'none', fontSize: '14px', cursor: 'pointer' }}>キャンセル</button>
              <button onClick={saveStaff} style={{ padding: '10px 20px', background: '#0070f3', color: 'white', borderRadius: '8px', border: 'none', fontSize: '14px', fontWeight: 500, cursor: 'pointer' }}>保存</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}