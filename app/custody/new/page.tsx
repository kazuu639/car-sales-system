'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, getCurrentUserScope } from '@/lib/supabase'

const REASONS = ['車検', '修理', 'メンテナンス', 'カスタム', 'チューニング', '事故', 'クレーム']
const STATUSES = ['受付', '作業中', '完了', '引渡済']

const inp: React.CSSProperties = { width: '100%', padding: '9px 12px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '13px', boxSizing: 'border-box', outline: 'none' }
const lbl: React.CSSProperties = { fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px', fontWeight: 500 }
const sec: React.CSSProperties = { background: 'white', borderRadius: '12px', border: '1px solid #eee', overflow: 'hidden', marginBottom: '16px' }

function SecHead({ bg, border, color, title }: { bg: string; border: string; color: string; title: string }) {
  return (
    <div style={{ padding: '12px 20px', background: bg, borderBottom: `1px solid ${border}` }}>
      <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color }}>{title}</h3>
    </div>
  )
}

export default function CustodyNewPage() {
  const router = useRouter()
  const [saving, setSaving]           = useState(false)
  const [ownerType, setOwnerType]     = useState<'customer' | 'dealer'>('customer')
  const [customers, setCustomers]     = useState<any[]>([])
  const [dealers, setDealers]         = useState<any[]>([])
  const [ownerVehicles, setOwnerVehicles] = useState<any[]>([])
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('') // '' = 未選択, 'new' = 手入力

  const [form, setForm] = useState({
    customer_id: '', dealer_id: '',
    car_name: '', chassis_number: '', car_number: '',
    year: '', mileage: '', color: '',
    custody_reason: '修理',
    status: '受付',
    intake_date: new Date().toISOString().slice(0, 10),
    scheduled_delivery_date: '',
    notes: '',
  })

  useEffect(() => {
    const load = async () => {
      const scope = await getCurrentUserScope()
      if (!scope?.company_id) return
      const [{ data: c }, { data: d }] = await Promise.all([
        supabase.from('customers').select('id, 氏名, 電話番号').eq('company_id', scope.company_id).is('deleted_at', null).order('作成日時', { ascending: false }),
        supabase.from('dealers').select('id, 業者名, 担当者名').eq('company_id', scope.company_id).is('deleted_at', null).order('作成日時', { ascending: false }),
      ])
      setCustomers(c ?? [])
      setDealers(d ?? [])
    }
    load()
  }, [])

  // オーナー変更時に紐付き車両を取得
  const handleOwnerChange = async (type: 'customer' | 'dealer', ownerId: string) => {
    setForm(f => ({ ...f, customer_id: type === 'customer' ? ownerId : '', dealer_id: type === 'dealer' ? ownerId : '' }))
    setSelectedVehicleId('')
    setOwnerVehicles([])
    if (!ownerId) return

    let vehicles: any[] = []
    if (type === 'customer') {
      // 顧客の商談に紐づく車両を取得
      const { data: negs } = await supabase
        .from('negotiations')
        .select('vehicles(id, car_name, grade, chassis_number, car_number, year, mileage, color, master_models(name))')
        .eq('customer_id', ownerId)
        .is('deleted_at', null)
      const seen = new Set<string>()
      for (const n of (negs ?? [])) {
        const v = (n as any).vehicles
        if (v && !seen.has(v.id)) { seen.add(v.id); vehicles.push(v) }
      }
    } else {
      // 業者に紐づく仕入車両を取得
      const { data: vList } = await supabase
        .from('vehicles')
        .select('id, car_name, grade, chassis_number, car_number, year, mileage, color, master_models(name)')
        .eq('dealer_id', ownerId)
        .is('deleted_at', null)
      vehicles = vList ?? []
    }
    setOwnerVehicles(vehicles)
  }

  // 車両選択時に手入力欄へ自動入力
  const handleVehicleSelect = (vid: string) => {
    setSelectedVehicleId(vid)
    if (vid === 'new' || vid === '') {
      setForm(f => ({ ...f, car_name: '', chassis_number: '', car_number: '', year: '', mileage: '', color: '' }))
      return
    }
    const v = ownerVehicles.find(x => x.id === vid)
    if (!v) return
    setForm(f => ({
      ...f,
      car_name:       v.car_name ?? v.master_models?.name ?? '',
      chassis_number: v.chassis_number ?? '',
      car_number:     v.car_number ?? '',
      year:           v.year ? String(v.year) : '',
      mileage:        v.mileage ? String(v.mileage) : '',
      color:          v.color ?? '',
    }))
  }

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const showVehicleInputs = selectedVehicleId === 'new' || (ownerVehicles.length === 0 && (form.customer_id || form.dealer_id))

  const handleSave = async () => {
    const customerId = ownerType === 'customer' ? form.customer_id : null
    const dealerId   = ownerType === 'dealer'   ? form.dealer_id   : null
    if (!customerId && !dealerId) { alert('顧客または業者を選択してください'); return }
    if (!form.custody_reason)    { alert('預かり理由を選択してください');     return }

    setSaving(true)
    const scope = await getCurrentUserScope()
    if (!scope?.company_id) { alert('ログイン情報の取得に失敗しました'); setSaving(false); return }

    const linkedVehicleId = selectedVehicleId && selectedVehicleId !== 'new' ? selectedVehicleId : null

    const { data, error } = await supabase.from('custody').insert({
      company_id:               scope.company_id,
      customer_id:              customerId || null,
      dealer_id:                dealerId   || null,
      vehicle_id:               linkedVehicleId,
      car_name:                 form.car_name     || null,
      chassis_number:           form.chassis_number || null,
      car_number:               form.car_number   || null,
      year:                     form.year     ? parseInt(form.year)    : null,
      mileage:                  form.mileage  ? parseInt(form.mileage) : null,
      color:                    form.color    || null,
      custody_reason:           form.custody_reason,
      status:                   form.status,
      intake_date:              form.intake_date || null,
      scheduled_delivery_date:  form.scheduled_delivery_date || null,
      notes:                    form.notes || null,
    }).select('id').single()

    setSaving(false)
    if (error) { alert('登録に失敗しました: ' + error.message); return }
    router.push(`/custody/${data.id}`)
  }

  const ownerSelected = !!(form.customer_id || form.dealer_id)

  return (
    <div style={{ padding: '2rem', maxWidth: '860px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <button onClick={() => router.push('/custody')} style={{ padding: '8px 16px', background: 'white', border: '1px solid #ddd', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}>← 戻る</button>
        <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 700 }}>新規受付</h1>
      </div>

      {/* 預かり理由 */}
      <div style={sec}>
        <SecHead bg="#fff7ed" border="#fed7aa" color="#c2410c" title="預かり理由" />
        <div style={{ padding: '20px' }}>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {REASONS.map(r => (
              <button key={r} onClick={() => set('custody_reason', r)} style={{
                padding: '8px 18px', borderRadius: '20px', border: '2px solid',
                fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                background: form.custody_reason === r ? '#c2410c' : 'white',
                color: form.custody_reason === r ? 'white' : '#666',
                borderColor: form.custody_reason === r ? '#c2410c' : '#e5e7eb',
              }}>{r}</button>
            ))}
          </div>
        </div>
      </div>

      {/* 顧客 / 業者 */}
      <div style={sec}>
        <SecHead bg="#eff6ff" border="#bfdbfe" color="#1d4ed8" title="顧客 / 業者情報" />
        <div style={{ padding: '20px' }}>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            {(['customer', 'dealer'] as const).map(t => (
              <button key={t} onClick={() => { setOwnerType(t); setForm(f => ({ ...f, customer_id: '', dealer_id: '' })); setOwnerVehicles([]); setSelectedVehicleId('') }} style={{
                padding: '7px 20px', borderRadius: '8px', border: '2px solid',
                fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                background: ownerType === t ? '#1d4ed8' : 'white',
                color: ownerType === t ? 'white' : '#666',
                borderColor: ownerType === t ? '#1d4ed8' : '#e5e7eb',
              }}>{t === 'customer' ? '👤 顧客' : '🏢 業者'}</button>
            ))}
          </div>
          {ownerType === 'customer' ? (
            <div>
              <label style={lbl}>顧客 <span style={{ color: '#e53e3e' }}>*</span></label>
              <select value={form.customer_id} onChange={e => handleOwnerChange('customer', e.target.value)} style={inp}>
                <option value="">顧客を選択してください</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c['氏名']}{c['電話番号'] ? `　${c['電話番号']}` : ''}</option>)}
              </select>
              <div style={{ marginTop: '8px', fontSize: '12px', color: '#888' }}>
                未登録の場合は先に<a href="/customers/new" target="_blank" style={{ color: '#0070f3' }}>顧客登録</a>してください
              </div>
            </div>
          ) : (
            <div>
              <label style={lbl}>業者 <span style={{ color: '#e53e3e' }}>*</span></label>
              <select value={form.dealer_id} onChange={e => handleOwnerChange('dealer', e.target.value)} style={inp}>
                <option value="">業者を選択してください</option>
                {dealers.map(d => <option key={d.id} value={d.id}>{d['業者名']}{d['担当者名'] ? `　${d['担当者名']}` : ''}</option>)}
              </select>
              <div style={{ marginTop: '8px', fontSize: '12px', color: '#888' }}>
                未登録の場合は先に<a href="/dealers/new" target="_blank" style={{ color: '#0070f3' }}>業者登録</a>してください
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 車両選択（オーナー選択後に表示） */}
      {ownerSelected && (
        <div style={sec}>
          <SecHead bg="#f0fdf4" border="#bbf7d0" color="#15803d" title="車両情報" />
          <div style={{ padding: '20px' }}>

            {/* 既存車両プルダウン（紐付き車両がある場合） */}
            {ownerVehicles.length > 0 ? (
              <div style={{ marginBottom: '16px' }}>
                <label style={lbl}>車両を選択</label>
                <select value={selectedVehicleId} onChange={e => handleVehicleSelect(e.target.value)} style={{ ...inp, marginBottom: '4px' }}>
                  <option value="">— 選択してください —</option>
                  {ownerVehicles.map(v => {
                    const name = v.car_name ?? v.master_models?.name ?? '不明'
                    const sub  = [v.chassis_number, v.year ? v.year + '年' : null].filter(Boolean).join(' · ')
                    return <option key={v.id} value={v.id}>{name}{sub ? `　${sub}` : ''}</option>
                  })}
                  <option value="new">＋ この一覧にない車両（新規入力）</option>
                </select>
                {selectedVehicleId && selectedVehicleId !== 'new' && (
                  <div style={{ marginTop: '8px', padding: '10px 14px', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0', fontSize: '12px', color: '#15803d' }}>
                    ✓ 登録済み車両を選択しました。下記に情報が反映されています。
                  </div>
                )}
              </div>
            ) : (
              <div style={{ marginBottom: '12px', padding: '10px 14px', background: '#fafafa', borderRadius: '8px', border: '1px solid #eee', fontSize: '12px', color: '#888' }}>
                この{ownerType === 'customer' ? '顧客' : '業者'}に紐づく登録済み車両が見つかりませんでした。下記に直接入力してください。
              </div>
            )}

            {/* 手入力欄：既存車両なし or「新規入力」選択時 */}
            {(showVehicleInputs || (selectedVehicleId && selectedVehicleId !== 'new')) && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={lbl}>車種名</label>
                  <input value={form.car_name} onChange={e => set('car_name', e.target.value)} placeholder="例：ホンダ フィット"
                    readOnly={!!(selectedVehicleId && selectedVehicleId !== 'new')}
                    style={{ ...inp, background: (selectedVehicleId && selectedVehicleId !== 'new') ? '#f9fafb' : 'white' }} />
                </div>
                <div>
                  <label style={lbl}>車体番号</label>
                  <input value={form.chassis_number} onChange={e => set('chassis_number', e.target.value)} placeholder="例：GK3-1234567"
                    style={{ ...inp, background: (selectedVehicleId && selectedVehicleId !== 'new') ? '#f9fafb' : 'white' }} />
                </div>
                <div>
                  <label style={lbl}>車両ナンバー</label>
                  <input value={form.car_number} onChange={e => set('car_number', e.target.value)} placeholder="例：品川330あ1234"
                    style={{ ...inp, background: (selectedVehicleId && selectedVehicleId !== 'new') ? '#f9fafb' : 'white' }} />
                </div>
                <div>
                  <label style={lbl}>年式</label>
                  <input type="number" value={form.year} onChange={e => set('year', e.target.value)} placeholder="例：2020"
                    style={{ ...inp, background: (selectedVehicleId && selectedVehicleId !== 'new') ? '#f9fafb' : 'white' }} />
                </div>
                <div>
                  <label style={lbl}>走行距離（km）</label>
                  <input type="number" value={form.mileage} onChange={e => set('mileage', e.target.value)} placeholder="例：35000"
                    style={{ ...inp, background: (selectedVehicleId && selectedVehicleId !== 'new') ? '#f9fafb' : 'white' }} />
                </div>
                <div>
                  <label style={lbl}>色</label>
                  <input value={form.color} onChange={e => set('color', e.target.value)} placeholder="例：パールホワイト"
                    style={{ ...inp, background: (selectedVehicleId && selectedVehicleId !== 'new') ? '#f9fafb' : 'white' }} />
                </div>
                {selectedVehicleId && selectedVehicleId !== 'new' && (
                  <div style={{ gridColumn: '1 / -1' }}>
                    <div style={{ fontSize: '11px', color: '#aaa' }}>※ 車両情報は登録済みデータから自動入力されています。預かり登録後に車両詳細ページで編集できます。</div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 受付情報 */}
      <div style={sec}>
        <SecHead bg="#faf5ff" border="#e9d5ff" color="#7e22ce" title="受付情報" />
        <div style={{ padding: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
          <div>
            <label style={lbl}>ステータス</label>
            <select value={form.status} onChange={e => set('status', e.target.value)} style={inp}>
              {STATUSES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div />
          <div>
            <label style={lbl}>受付日</label>
            <input type="date" value={form.intake_date} onChange={e => set('intake_date', e.target.value)} style={inp} />
          </div>
          <div>
            <label style={lbl}>予定引渡日</label>
            <input type="date" value={form.scheduled_delivery_date} onChange={e => set('scheduled_delivery_date', e.target.value)} style={inp} />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={lbl}>備考</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={3}
              style={{ ...inp, resize: 'vertical' }} placeholder="症状・要望など" />
          </div>
        </div>
      </div>

      {/* 保存 */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
        <button onClick={() => router.push('/custody')} style={{ padding: '11px 28px', background: 'white', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px', cursor: 'pointer' }}>キャンセル</button>
        <button onClick={handleSave} disabled={saving}
          style={{ padding: '11px 36px', background: '#0070f3', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
          {saving ? '登録中...' : '登録する'}
        </button>
      </div>
    </div>
  )
}
