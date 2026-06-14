'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import LoadingOverlay from '@/components/LoadingOverlay'

export default function NewEstimatePage() {
  const { id } = useParams()
  const router = useRouter()
  const [loadingOverlay, setLoadingOverlay] = useState(false)
  const [loadingMessage, setLoadingMessage] = useState('処理中...')
  const [vehicle, setVehicle] = useState<any>(null)
  const [customers, setCustomers] = useState<any[]>([])
  const [profiles, setProfiles] = useState<any[]>([])
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    // 買主情報
    customer_id: '',
    buyer_name: '',
    buyer_name_kana: '',
    buyer_email: '',
    buyer_birthday: '',
    buyer_address: '',
    buyer_phone: '',
    buyer_company: '',
    owner_name: '',
    user_name: '',
    // 担当
    staff_name: '',
    contract_date: new Date().toISOString().split('T')[0],
    contract_number: '',
    // 車両価格
    vehicle_price: '',
    misc_fee: '',
    special_price: '',
    // 法定費用明細
    legal_details: [
      { label: '自動車税種別割', amount: '' },
      { label: '自動車重量税', amount: '' },
      { label: '自賠責保険', amount: '' },
      { label: '環境性能割/自動車取得税', amount: '' },
      { label: 'リサイクル預託金', amount: '' },
      { label: '登録印紙代', amount: '' },
      { label: '新規検査印紙代', amount: '' },
      { label: '車庫証明印紙代', amount: '' },
      { label: '公正証書作成', amount: '' },
      { label: 'その他', amount: '' },
    ],
    // 諸費用明細（課税）
    misc_details: [
      { label: '未経過自動車税相当額', amount: '' },
      { label: '未経過自賠責相当額', amount: '' },
      { label: '登録代行費用', amount: '' },
      { label: '県外登録費用', amount: '' },
      { label: '車庫証明代行費用', amount: '' },
      { label: '不動産手続代行費用', amount: '' },
      { label: '書類作成費用', amount: '' },
      { label: '下取車諸手続費用', amount: '' },
      { label: '納車代行費用', amount: '' },
      { label: 'オークション手数料', amount: '' },
      { label: 'その他', amount: '' },
    ],
    // 特別仕様明細
    special_details: [{ label: '', amount: '' }],
    // 支払情報
    payment_bank: '',
    payment_branch: '',
    payment_account_type: '普通',
    payment_account_number: '',
    payment_account_name: '',
    // 販売様態
    has_repair_history: false,
    has_mt_swap: false,
    has_meter_exchange: false,
    has_unknown_mileage: false,
    has_color_change: false,
    is_circuit_only: false,
    is_current_condition: true,
    sales_notes: '',
  })

  useEffect(() => {
    fetchVehicle()
    fetchCustomers()
    fetchProfiles()
  }, [])

  const fetchVehicle = async () => {
    const { data } = await supabase.from('vehicles').select('*').eq('id', id).single()
    if (data) setVehicle(data)
  }

  const fetchCustomers = async () => {
    const { data } = await supabase.from('customers').select('id, 氏名, 氏名カナ').order('氏名')
    setCustomers(data || [])
  }

  const fetchProfiles = async () => {
    const { data } = await supabase.from('profiles').select('id, display_name').order('display_name')
    setProfiles(data || [])
  }

  // 顧客選択時に自動入力
  const handleCustomerSelect = async (customerId: string) => {
    setForm(f => ({ ...f, customer_id: customerId }))
    if (!customerId) return
    const { data } = await supabase.from('customers').select('*').eq('id', customerId).single()
    if (data) {
      setForm(f => ({
        ...f,
        customer_id: customerId,
        buyer_name: data['氏名'] || '',
        buyer_name_kana: data['氏名カナ'] || '',
        buyer_phone: data['電話番号'] || '',
        buyer_address: data['住所'] || '',
        buyer_email: data['メール'] || '',
        owner_name: data['氏名'] || '',
        user_name: data['氏名'] || '',
      }))
    }
  }

  // 計算
  const vehicleNum = parseInt(form.vehicle_price) || 0
  const miscNum = parseInt(form.misc_fee) || 0
  const specialNum = parseInt(form.special_price) || 0
  const legalTotal = form.legal_details.reduce((s, d) => s + (parseInt(d.amount) || 0), 0)
  const miscTotal = form.misc_details.reduce((s, d) => s + (parseInt(d.amount) || 0), 0)
  const vehicleTax = Math.floor(vehicleNum / 11)
  const miscTax = Math.floor(miscNum / 11)
  const specialTax = Math.floor(specialNum / 11)
  const taxTotal = vehicleTax + miscTax + specialTax
  const subtotal = vehicleNum + miscNum + specialNum
  const totalAmount = subtotal + legalTotal

  const handleSave = async (status: string) => {
    setLoadingMessage(status === 'contracted' ? '契約成立処理中...' : '保存中...')
    setLoadingOverlay(true)
    setSaving(true)
    try {
      const { data, error } = await supabase.from('sales_estimates').insert({
        vehicle_id: id,
        customer_id: form.customer_id || null,
        buyer_name: form.buyer_name,
        buyer_name_kana: form.buyer_name_kana,
        buyer_email: form.buyer_email,
        buyer_birthday: form.buyer_birthday,
        buyer_address: form.buyer_address,
        buyer_phone: form.buyer_phone,
        buyer_company: form.buyer_company,
        owner_name: form.owner_name,
        user_name: form.user_name,
        staff_name: form.staff_name,
        contract_date: form.contract_date,
        contract_number: form.contract_number,
        vehicle_price: vehicleNum || null,
        misc_fee: miscNum || null,
        special_price: specialNum || null,
        legal_fee: legalTotal || null,
        total_amount: totalAmount || null,
        legal_details: form.legal_details,
        misc_details: form.misc_details,
        special_details: form.special_details,
        payment_bank: form.payment_bank,
        payment_branch: form.payment_branch,
        payment_account_type: form.payment_account_type,
        payment_account_number: form.payment_account_number,
        payment_account_name: form.payment_account_name,
        has_repair_history: form.has_repair_history,
        has_mt_swap: form.has_mt_swap,
        has_meter_exchange: form.has_meter_exchange,
        has_unknown_mileage: form.has_unknown_mileage,
        has_color_change: form.has_color_change,
        is_circuit_only: form.is_circuit_only,
        is_current_condition: form.is_current_condition,
        sales_notes: form.sales_notes,
        status,
      }).select().single()
      if (error) throw error
      router.push(`/vehicles/${id}?tab=販売`)
    } catch (err) {
      console.error(err)
      alert('保存に失敗しました')
    } finally {
      setSaving(false)
      setLoadingOverlay(false)
    }
  }

  const lbl = { fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px' } as const
  const inp = { width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '13px', boxSizing: 'border-box' } as const

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '24px' }}>
      {loadingOverlay && <LoadingOverlay message={loadingMessage} />}

      {/* ヘッダー */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <button onClick={() => router.push(`/vehicles/${id}?tab=販売`)} style={{ padding: '8px 16px', background: 'white', border: '1px solid #ddd', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}>← 戻る</button>
        <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 700 }}>見積・契約書作成</h1>
        {vehicle && <span style={{ fontSize: '14px', color: '#6b7280' }}>{vehicle.maker_name} {vehicle.model_name}</span>}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

        {/* 基本情報 */}
        <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #eee', overflow: 'hidden' }}>
          <div style={{ padding: '12px 20px', background: '#E6F1FB', borderBottom: '1px solid #B5D4F4' }}>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#0C447C' }}>基本情報</h3>
          </div>
          <div style={{ padding: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
            <div>
              <label style={lbl}>契約日</label>
              <input type="date" value={form.contract_date} onChange={e => setForm(f => ({ ...f, contract_date: e.target.value }))} style={inp} />
            </div>
            <div>
              <label style={lbl}>契約書番号</label>
              <input value={form.contract_number} onChange={e => setForm(f => ({ ...f, contract_number: e.target.value }))} placeholder="例：20260612-01" style={inp} />
            </div>
            <div>
              <label style={lbl}>担当者</label>
              <select value={form.staff_name} onChange={e => setForm(f => ({ ...f, staff_name: e.target.value }))} style={inp}>
                <option value="">選択してください</option>
                {profiles.map(p => <option key={p.id} value={p.display_name}>{p.display_name}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* 買主情報 */}
        <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #eee', overflow: 'hidden' }}>
          <div style={{ padding: '12px 20px', background: '#E6F1FB', borderBottom: '1px solid #B5D4F4' }}>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#0C447C' }}>買主（注文者）情報</h3>
          </div>
          <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={lbl}>顧客を選択（自動入力）</label>
              <select value={form.customer_id} onChange={e => handleCustomerSelect(e.target.value)} style={inp}>
                <option value="">-- 顧客を選択 --</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c['氏名']}（{c['氏名カナ']}）</option>)}
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div><label style={lbl}>氏名</label><input value={form.buyer_name} onChange={e => setForm(f => ({ ...f, buyer_name: e.target.value }))} style={inp} /></div>
              <div><label style={lbl}>フリガナ</label><input value={form.buyer_name_kana} onChange={e => setForm(f => ({ ...f, buyer_name_kana: e.target.value }))} style={inp} /></div>
              <div><label style={lbl}>メール</label><input value={form.buyer_email} onChange={e => setForm(f => ({ ...f, buyer_email: e.target.value }))} style={inp} /></div>
              <div><label style={lbl}>生年月日</label><input type="date" value={form.buyer_birthday} onChange={e => setForm(f => ({ ...f, buyer_birthday: e.target.value }))} style={inp} /></div>
              <div><label style={lbl}>電話番号</label><input value={form.buyer_phone} onChange={e => setForm(f => ({ ...f, buyer_phone: e.target.value }))} style={inp} /></div>
              <div><label style={lbl}>会社名</label><input value={form.buyer_company} onChange={e => setForm(f => ({ ...f, buyer_company: e.target.value }))} style={inp} /></div>
            </div>
            <div><label style={lbl}>住所</label><input value={form.buyer_address} onChange={e => setForm(f => ({ ...f, buyer_address: e.target.value }))} style={inp} /></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div><label style={lbl}>登録名義（所有者）</label><input value={form.owner_name} onChange={e => setForm(f => ({ ...f, owner_name: e.target.value }))} style={inp} /></div>
              <div><label style={lbl}>登録名義（使用者）</label><input value={form.user_name} onChange={e => setForm(f => ({ ...f, user_name: e.target.value }))} style={inp} /></div>
            </div>
          </div>
        </div>

        {/* 販売価格 */}
        <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #eee', overflow: 'hidden' }}>
          <div style={{ padding: '12px 20px', background: '#E6F1FB', borderBottom: '1px solid #B5D4F4' }}>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#0C447C' }}>販売価格</h3>
          </div>
          <div style={{ padding: '20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              <div>
                <label style={lbl}>車両価格 (A) 税込</label>
                <input type="number" value={form.vehicle_price} onChange={e => setForm(f => ({ ...f, vehicle_price: e.target.value }))} placeholder="例：1101719" style={inp} />
              </div>
              <div>
                <label style={lbl}>諸費用等合計 (B) 税込</label>
                <input type="number" value={form.misc_fee} onChange={e => setForm(f => ({ ...f, misc_fee: e.target.value }))} placeholder="例：75000" style={inp} />
              </div>
              <div>
                <label style={lbl}>特別仕様価格 (C) 税込</label>
                <input type="number" value={form.special_price} onChange={e => setForm(f => ({ ...f, special_price: e.target.value }))} placeholder="例：80000" style={inp} />
              </div>
            </div>

            {/* 自動計算サマリー */}
            <div style={{ background: '#f0f7ff', borderRadius: '10px', padding: '16px', border: '1px solid #bfdbfe' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '13px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#6b7280' }}>小計 (A+B+C)</span><span>¥{subtotal.toLocaleString()}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#6b7280' }}>消費税合計（内税）</span><span>¥{taxTotal.toLocaleString()}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#6b7280' }}>法定費用合計 (D)</span><span>¥{legalTotal.toLocaleString()}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '15px', color: '#1d4ed8' }}><span>支払総額 (A+B+C+D)</span><span>¥{totalAmount.toLocaleString()}</span></div>
              </div>
            </div>
          </div>
        </div>

        {/* 法定費用明細 */}
        <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #eee', overflow: 'hidden' }}>
          <div style={{ padding: '12px 20px', background: '#F0FDF4', borderBottom: '1px solid #BBF7D0' }}>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#14532D' }}>法定費用明細【非課税】(D)</h3>
          </div>
          <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {form.legal_details.map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ width: '180px', fontSize: '13px', color: '#374151' }}>{item.label}</span>
                <input type="number" value={item.amount} onChange={e => setForm(f => ({ ...f, legal_details: f.legal_details.map((d, idx) => idx === i ? { ...d, amount: e.target.value } : d) }))}
                  placeholder="0" style={{ width: '140px', padding: '6px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px' }} />
                <span style={{ fontSize: '13px', color: '#6b7280' }}>円</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'flex-end', fontWeight: 600, fontSize: '14px', marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #e5e7eb' }}>
              小計：¥{legalTotal.toLocaleString()}
            </div>
          </div>
        </div>

        {/* 諸費用明細 */}
        <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #eee', overflow: 'hidden' }}>
          <div style={{ padding: '12px 20px', background: '#FFF7ED', borderBottom: '1px solid #FED7AA' }}>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#7C2D12' }}>諸費用詳細【課税】(B)</h3>
          </div>
          <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {form.misc_details.map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ width: '180px', fontSize: '13px', color: '#374151' }}>{item.label}</span>
                <input type="number" value={item.amount} onChange={e => setForm(f => ({ ...f, misc_details: f.misc_details.map((d, idx) => idx === i ? { ...d, amount: e.target.value } : d) }))}
                  placeholder="0" style={{ width: '140px', padding: '6px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px' }} />
                <span style={{ fontSize: '13px', color: '#6b7280' }}>円</span>
                <span style={{ fontSize: '12px', color: '#9ca3af' }}>消費税：¥{Math.floor((parseInt(item.amount) || 0) / 11).toLocaleString()}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'flex-end', fontWeight: 600, fontSize: '14px', marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #e5e7eb' }}>
              小計：¥{miscNum.toLocaleString()}
            </div>
          </div>
        </div>

        {/* 特別仕様明細 */}
        <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #eee', overflow: 'hidden' }}>
          <div style={{ padding: '12px 20px', background: '#F5F3FF', borderBottom: '1px solid #DDD6FE' }}>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#4C1D95' }}>特別仕様明細【付属品】(C)</h3>
          </div>
          <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {form.special_details.map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <input value={item.label} onChange={e => setForm(f => ({ ...f, special_details: f.special_details.map((d, idx) => idx === i ? { ...d, label: e.target.value } : d) }))}
                  placeholder="付属品名" style={{ flex: 1, padding: '6px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px' }} />
                <input type="number" value={item.amount} onChange={e => setForm(f => ({ ...f, special_details: f.special_details.map((d, idx) => idx === i ? { ...d, amount: e.target.value } : d) }))}
                  placeholder="0" style={{ width: '140px', padding: '6px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px' }} />
                <span style={{ fontSize: '13px', color: '#6b7280' }}>円</span>
                <button onClick={() => setForm(f => ({ ...f, special_details: f.special_details.filter((_, idx) => idx !== i) }))}
                  style={{ padding: '5px 8px', background: '#fff5f5', color: '#e53e3e', border: '1px solid #fce8e6', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>削除</button>
              </div>
            ))}
            <button onClick={() => setForm(f => ({ ...f, special_details: [...f.special_details, { label: '', amount: '' }] }))}
              style={{ padding: '7px', background: '#f9fafb', border: '1px dashed #d1d5db', borderRadius: '6px', fontSize: '13px', cursor: 'pointer', color: '#6b7280' }}>
              ＋ 付属品を追加
            </button>
          </div>
        </div>

        {/* 支払情報 */}
        <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #eee', overflow: 'hidden' }}>
          <div style={{ padding: '12px 20px', background: '#E6F1FB', borderBottom: '1px solid #B5D4F4' }}>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#0C447C' }}>支払情報</h3>
          </div>
          <div style={{ padding: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div><label style={lbl}>金融機関名</label><input value={form.payment_bank} onChange={e => setForm(f => ({ ...f, payment_bank: e.target.value }))} style={inp} /></div>
            <div><label style={lbl}>支店名</label><input value={form.payment_branch} onChange={e => setForm(f => ({ ...f, payment_branch: e.target.value }))} style={inp} /></div>
            <div>
              <label style={lbl}>口座種別</label>
              <select value={form.payment_account_type} onChange={e => setForm(f => ({ ...f, payment_account_type: e.target.value }))} style={inp}>
                {['普通', '当座'].map(v => <option key={v}>{v}</option>)}
              </select>
            </div>
            <div><label style={lbl}>口座番号</label><input value={form.payment_account_number} onChange={e => setForm(f => ({ ...f, payment_account_number: e.target.value }))} style={inp} /></div>
            <div style={{ gridColumn: '1/-1' }}><label style={lbl}>口座名義（カタカナ）</label><input value={form.payment_account_name} onChange={e => setForm(f => ({ ...f, payment_account_name: e.target.value }))} style={inp} /></div>
          </div>
        </div>

        {/* 販売様態 */}
        <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #eee', overflow: 'hidden' }}>
          <div style={{ padding: '12px 20px', background: '#FFF7ED', borderBottom: '1px solid #FED7AA' }}>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#7C2D12' }}>販売様態</h3>
          </div>
          <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
              {[
                { key: 'has_repair_history', label: '修復歴車' },
                { key: 'has_mt_swap', label: 'M/T載せ替え' },
                { key: 'has_meter_exchange', label: 'メーター交換' },
                { key: 'has_unknown_mileage', label: '走行距離不明' },
                { key: 'has_color_change', label: '色替え車' },
                { key: 'is_circuit_only', label: 'サーキット走行のみ' },
              ].map(({ key, label }) => (
                <label key={key} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={form[key as keyof typeof form] as boolean}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.checked }))} />
                  {label}
                </label>
              ))}
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
              <input type="checkbox" checked={form.is_current_condition} onChange={e => setForm(f => ({ ...f, is_current_condition: e.target.checked }))} />
              この車両は現状販売の為、保証はございません。
            </label>
            <div>
              <label style={lbl}>備考</label>
              <textarea value={form.sales_notes} onChange={e => setForm(f => ({ ...f, sales_notes: e.target.value }))} rows={3}
                style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '13px', resize: 'vertical', boxSizing: 'border-box' }} />
            </div>
          </div>
        </div>

        {/* ボタン */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', paddingBottom: '40px' }}>
          <button onClick={() => router.push(`/vehicles/${id}?tab=販売`)} style={{ padding: '10px 24px', background: 'white', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px', cursor: 'pointer' }}>
            キャンセル
          </button>
          <button onClick={() => handleSave('draft')} disabled={saving}
            style={{ padding: '10px 24px', background: 'white', border: '1px solid #1a73e8', color: '#1a73e8', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>
            下書き保存
          </button>
          <button onClick={() => handleSave('estimate')} disabled={saving}
            style={{ padding: '10px 24px', background: '#1a73e8', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>
            見積保存
          </button>
          <button onClick={() => handleSave('contracted')} disabled={saving}
            style={{ padding: '10px 24px', background: '#16a34a', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>
            契約成立
          </button>
        </div>

      </div>
    </div>
  )
}
