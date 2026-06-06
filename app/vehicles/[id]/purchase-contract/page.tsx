'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function PurchaseContractPage() {
  const { id } = useParams() // vehicle_id
  const router = useRouter()
  const [vehicle, setVehicle] = useState<any>(null)
  const [contract, setContract] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [preview, setPreview] = useState(false)
  const [form, setForm] = useState({
    // 売主情報
    seller_name: '',
    seller_name_kana: '',
    seller_birthday: '',
    seller_license_number: '',
    seller_address: '',
    seller_phone: '',
    // 車両情報
    registration_number: '',
    first_registration: '',
    car_name: '',
    model_type: '',
    color: '',
    displacement: '',
    chassis_number: '',
    inspection_expiry: '',
    mileage: '',
    repair_history: false,
    // 契約情報
    contract_date: new Date().toISOString().split('T')[0],
    contract_amount: '',
    payment_method: '振込',
    bank_name: '',
    bank_branch: '',
    bank_account_type: '普通',
    bank_account_number: '',
    bank_account_name: '',
    notes: '',
  })

  useEffect(() => {
    const fetch = async () => {
      setLoading(true)
      const { data: v } = await supabase.from('vehicles')
        .select('*, master_makers(name), master_models(name)')
        .eq('id', id as string).single()
      setVehicle(v)

      // 既存契約書があれば読み込む
      const { data: c } = await supabase.from('purchase_contracts')
        .select('*').eq('vehicle_id', id as string).single()
      if (c) {
        setContract(c)
        setForm({
          seller_name: c.seller_name ?? '',
          seller_name_kana: c.seller_name_kana ?? '',
          seller_birthday: c.seller_birthday ?? '',
          seller_license_number: c.seller_license_number ?? '',
          seller_address: c.seller_address ?? '',
          seller_phone: c.seller_phone ?? '',
          registration_number: c.registration_number ?? '',
          first_registration: c.first_registration ?? '',
          car_name: c.car_name ?? '',
          model_type: c.model_type ?? '',
          color: c.color ?? '',
          displacement: c.displacement ?? '',
          chassis_number: c.chassis_number ?? '',
          inspection_expiry: c.inspection_expiry ?? '',
          mileage: c.mileage ?? '',
          repair_history: c.repair_history ?? false,
          contract_date: c.contract_date ?? new Date().toISOString().split('T')[0],
          contract_amount: c.contract_amount ?? '',
          payment_method: c.payment_method ?? '振込',
          bank_name: c.bank_name ?? '',
          bank_branch: c.bank_branch ?? '',
          bank_account_type: c.bank_account_type ?? '普通',
          bank_account_number: c.bank_account_number ?? '',
          bank_account_name: c.bank_account_name ?? '',
          notes: c.notes ?? '',
        })
      } else if (v) {
        // 車両情報から自動入力
        setForm(f => ({
          ...f,
          car_name: `${v.master_makers?.name ?? ''} ${v.master_models?.name ?? ''}`,
          chassis_number: v.chassis_number ?? '',
          registration_number: v.car_number ?? '',
          color: v.color ?? '',
          displacement: v.displacement ?? '',
          mileage: v.mileage ?? '',
          repair_history: v.repair_history ?? false,
          inspection_expiry: v.inspection_date ?? '',
          model_type: v.model_type ?? '',
        }))
      }
      setLoading(false)
    }
    fetch()
  }, [id])

  const handleSave = async (status: 'draft' | 'confirmed') => {
    setSaving(true)
    const payload = {
      vehicle_id: id as string,
      ...form,
      displacement: form.displacement ? parseInt(String(form.displacement)) : null,
      mileage: form.mileage ? parseInt(String(form.mileage)) : null,
      contract_amount: form.contract_amount ? parseInt(String(form.contract_amount)) : null,
      status,
      updated_at: new Date().toISOString(),
    }

    let contractId = contract?.id
    if (contract) {
      await supabase.from('purchase_contracts').update(payload).eq('id', contract.id)
    } else {
      const { data } = await supabase.from('purchase_contracts').insert(payload).select().single()
      contractId = data?.id
      setContract(data)
    }

    // 契約成立の場合：書類BOX自動割り当て＋車両ステータス更新
    if (status === 'confirmed') {
      // 空きBOX取得
      const { data: emptyBox } = await supabase
        .from('document_boxes')
        .select('*')
        .eq('is_occupied', false)
        .order('box_number', { ascending: true })
        .limit(1)
        .single()

      if (emptyBox) {
        await supabase.from('document_boxes').update({
          is_occupied: true,
          vehicle_id: id as string,
          assigned_at: new Date().toISOString(),
        }).eq('id', emptyBox.id)

        if (contractId) {
          await supabase.from('purchase_contracts').update({ document_box_id: emptyBox.id }).eq('id', contractId)
        }

        // 車両ステータスを在庫中に
        await supabase.from('vehicles').update({
          status: '在庫中',
          purchase_contract_date: form.contract_date,
          purchase_price: form.contract_amount ? parseInt(String(form.contract_amount)) : null,
        }).eq('id', id as string)

        alert(`✅ 買取契約が成立しました！\n書類BOX【${emptyBox.box_number}】を割り当てました`)
      } else {
        alert('✅ 買取契約が成立しました！\n⚠️ 空き書類BOXがありません。管理者に連絡してください。')
      }
      router.push(`/vehicles/${id}`)
    } else {
      alert('下書きとして保存しました')
    }
    setSaving(false)
  }

  if (loading) return <div style={{ padding: '2rem' }}>読み込み中...</div>

  const inp = { width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '13px', boxSizing: 'border-box' as const, outline: 'none' }
  const lbl = { fontSize: '12px', color: '#888', fontWeight: 500 as const, marginBottom: '4px', display: 'block' as const }

  // プレビュー表示
  if (preview) {
    return (
      <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '1.5rem' }}>
          <button onClick={() => setPreview(false)} style={{ padding: '8px 16px', background: '#f1f3f4', color: '#555', border: 'none', borderRadius: '8px', fontSize: '13px', cursor: 'pointer' }}>
            ← 編集に戻る
          </button>
          <button onClick={() => handleSave('draft')} disabled={saving} style={{ padding: '8px 16px', background: '#f1f3f4', color: '#555', border: 'none', borderRadius: '8px', fontSize: '13px', cursor: 'pointer' }}>
            💾 下書き保存
          </button>
          <button onClick={() => handleSave('confirmed')} disabled={saving} style={{ padding: '8px 20px', background: '#00a86b', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}>
            ✅ 契約成立・BOX割り当て
          </button>
          <button onClick={() => window.print()} style={{ padding: '8px 16px', background: '#0070f3', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', cursor: 'pointer' }}>
            🖨️ 印刷
          </button>
        </div>

        {/* 契約書プレビュー */}
        <div id="print-area" style={{ background: 'white', padding: '40px', border: '1px solid #ddd', borderRadius: '8px', fontFamily: 'serif' }}>
          <div style={{ textAlign: 'right', fontSize: '12px', marginBottom: '8px' }}>（弊社控え）</div>
          <h1 style={{ textAlign: 'center', fontSize: '24px', fontWeight: 700, marginBottom: '8px' }}>売　買　契　約　書</h1>
          <div style={{ textAlign: 'right', fontSize: '13px', marginBottom: '24px' }}>
            契約日：{form.contract_date}
          </div>

          {/* 売主情報 */}
          <div style={{ border: '1px solid #333', marginBottom: '16px' }}>
            <div style={{ background: '#f5f5f5', padding: '6px 12px', fontWeight: 700, borderBottom: '1px solid #333' }}>・売主</div>
            <div style={{ padding: '12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '13px' }}>
              <div><span style={{ color: '#888' }}>フリガナ：</span>{form.seller_name_kana}</div>
              <div><span style={{ color: '#888' }}>生年月日：</span>{form.seller_birthday}</div>
              <div style={{ gridColumn: '1 / -1' }}><span style={{ color: '#888' }}>氏名：</span><strong style={{ fontSize: '16px' }}>{form.seller_name}</strong></div>
              <div style={{ gridColumn: '1 / -1' }}><span style={{ color: '#888' }}>運転免許証番号：</span>{form.seller_license_number}</div>
              <div style={{ gridColumn: '1 / -1' }}><span style={{ color: '#888' }}>住所：</span>{form.seller_address}</div>
              <div><span style={{ color: '#888' }}>電話：</span>{form.seller_phone}</div>
            </div>
          </div>

          {/* 車両情報 */}
          <div style={{ border: '1px solid #333', marginBottom: '16px' }}>
            <div style={{ background: '#f5f5f5', padding: '6px 12px', fontWeight: 700, borderBottom: '1px solid #333' }}>・契約車両の表示および明細</div>
            <div style={{ padding: '12px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', fontSize: '13px' }}>
              <div><span style={{ color: '#888' }}>登録番号：</span>{form.registration_number}</div>
              <div><span style={{ color: '#888' }}>初年度登録：</span>{form.first_registration}</div>
              <div><span style={{ color: '#888' }}>車台番号：</span>{form.chassis_number}</div>
              <div><span style={{ color: '#888' }}>車名：</span>{form.car_name}</div>
              <div><span style={{ color: '#888' }}>型式：</span>{form.model_type}</div>
              <div><span style={{ color: '#888' }}>色：</span>{form.color}</div>
              <div><span style={{ color: '#888' }}>排気量：</span>{form.displacement}cc</div>
              <div><span style={{ color: '#888' }}>走行距離：</span>{form.mileage ? Number(form.mileage).toLocaleString() : ''}km</div>
              <div><span style={{ color: '#888' }}>修復歴：</span>{form.repair_history ? 'あり' : 'なし'}</div>
              <div><span style={{ color: '#888' }}>車検有効期限：</span>{form.inspection_expiry}</div>
            </div>
          </div>

          {/* 契約金額 */}
          <div style={{ border: '2px solid #333', marginBottom: '16px', padding: '16px' }}>
            <div style={{ fontWeight: 700, marginBottom: '8px' }}>・車両契約金額</div>
            <div style={{ fontSize: '28px', fontWeight: 700, textAlign: 'center', letterSpacing: '4px' }}>
              ¥ {form.contract_amount ? Number(form.contract_amount).toLocaleString() : '　　　　　　'} −
            </div>
          </div>

          {/* 支払方法 */}
          <div style={{ border: '1px solid #333', marginBottom: '16px' }}>
            <div style={{ background: '#f5f5f5', padding: '6px 12px', fontWeight: 700, borderBottom: '1px solid #333' }}>・お支払方法</div>
            <div style={{ padding: '12px', fontSize: '13px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div><span style={{ color: '#888' }}>支払方法：</span>{form.payment_method}</div>
              <div><span style={{ color: '#888' }}>口座名義：</span>{form.bank_account_name}</div>
              <div><span style={{ color: '#888' }}>金融機関：</span>{form.bank_name}</div>
              <div><span style={{ color: '#888' }}>支店名：</span>{form.bank_branch}</div>
              <div><span style={{ color: '#888' }}>口座種別：</span>{form.bank_account_type}</div>
              <div><span style={{ color: '#888' }}>口座番号：</span>{form.bank_account_number}</div>
            </div>
          </div>

          {/* 備考 */}
          {form.notes && (
            <div style={{ border: '1px solid #333', marginBottom: '16px' }}>
              <div style={{ background: '#f5f5f5', padding: '6px 12px', fontWeight: 700, borderBottom: '1px solid #333' }}>・特記事項</div>
              <div style={{ padding: '12px', fontSize: '13px', minHeight: '60px' }}>{form.notes}</div>
            </div>
          )}

          {/* 署名欄 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '24px' }}>
            <div style={{ border: '1px solid #333', padding: '16px', minHeight: '80px' }}>
              <div style={{ fontSize: '12px', color: '#888', marginBottom: '8px' }}>売主署名</div>
            </div>
            <div style={{ border: '1px solid #333', padding: '16px', minHeight: '80px' }}>
              <div style={{ fontSize: '12px', color: '#888', marginBottom: '8px' }}>買主（弊社）</div>
              <div style={{ fontSize: '13px' }}>{vehicle?.master_makers?.name}</div>
            </div>
          </div>
        </div>

        <style>{`
          @media print {
            body * { visibility: hidden; }
            #print-area, #print-area * { visibility: visible; }
            #print-area { position: absolute; left: 0; top: 0; width: 100%; }
          }
        `}</style>
      </div>
    )
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '900px', margin: '0 auto' }}>
      {/* ヘッダー */}
      <div style={{ marginBottom: '1.5rem' }}>
        <Link href={`/vehicles/${id}`} style={{ fontSize: '13px', color: '#888', textDecoration: 'none' }}>← 車両詳細に戻る</Link>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: 700, margin: 0 }}>買取契約書</h1>
            <p style={{ fontSize: '13px', color: '#888', margin: '4px 0 0' }}>
              {vehicle?.master_makers?.name} {vehicle?.master_models?.name}　{vehicle?.db_number}
            </p>
          </div>
          {contract?.status === 'confirmed' && (
            <span style={{ padding: '6px 16px', background: '#e6f4ea', color: '#1e7e34', borderRadius: '20px', fontSize: '13px', fontWeight: 600 }}>
              ✅ 契約成立済み
            </span>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

        {/* 売主情報 */}
        <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #eee', padding: '24px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 600, margin: '0 0 16px', color: '#111' }}>売主情報</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div>
              <label style={lbl}>氏名</label>
              <input value={form.seller_name} onChange={e => setForm(f => ({ ...f, seller_name: e.target.value }))} placeholder="高田 耿" style={inp} />
            </div>
            <div>
              <label style={lbl}>フリガナ</label>
              <input value={form.seller_name_kana} onChange={e => setForm(f => ({ ...f, seller_name_kana: e.target.value }))} placeholder="タカダ コウ" style={inp} />
            </div>
            <div>
              <label style={lbl}>生年月日</label>
              <input type="date" value={form.seller_birthday} onChange={e => setForm(f => ({ ...f, seller_birthday: e.target.value }))} style={inp} />
            </div>
            <div>
              <label style={lbl}>運転免許証番号</label>
              <input value={form.seller_license_number} onChange={e => setForm(f => ({ ...f, seller_license_number: e.target.value }))} placeholder="123456789012" style={inp} />
            </div>
            <div>
              <label style={lbl}>電話番号</label>
              <input value={form.seller_phone} onChange={e => setForm(f => ({ ...f, seller_phone: e.target.value }))} placeholder="090-0000-0000" style={inp} />
            </div>
            <div>
              <label style={lbl}>契約日</label>
              <input type="date" value={form.contract_date} onChange={e => setForm(f => ({ ...f, contract_date: e.target.value }))} style={inp} />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={lbl}>住所</label>
              <input value={form.seller_address} onChange={e => setForm(f => ({ ...f, seller_address: e.target.value }))} placeholder="千葉県..." style={inp} />
            </div>
          </div>
        </div>

        {/* 車両情報 */}
        <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #eee', padding: '24px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 600, margin: '0 0 16px', color: '#111' }}>車両情報</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
            <div>
              <label style={lbl}>登録番号</label>
              <input value={form.registration_number} onChange={e => setForm(f => ({ ...f, registration_number: e.target.value }))} placeholder="千葉 530 と 1234" style={inp} />
            </div>
            <div>
              <label style={lbl}>初年度登録</label>
              <input type="date" value={form.first_registration} onChange={e => setForm(f => ({ ...f, first_registration: e.target.value }))} style={inp} />
            </div>
            <div>
              <label style={lbl}>車台番号</label>
              <input value={form.chassis_number} onChange={e => setForm(f => ({ ...f, chassis_number: e.target.value }))} style={inp} />
            </div>
            <div>
              <label style={lbl}>車名</label>
              <input value={form.car_name} onChange={e => setForm(f => ({ ...f, car_name: e.target.value }))} style={inp} />
            </div>
            <div>
              <label style={lbl}>型式</label>
              <input value={form.model_type} onChange={e => setForm(f => ({ ...f, model_type: e.target.value }))} style={inp} />
            </div>
            <div>
              <label style={lbl}>色</label>
              <input value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} style={inp} />
            </div>
            <div>
              <label style={lbl}>排気量（cc）</label>
              <input type="number" value={form.displacement} onChange={e => setForm(f => ({ ...f, displacement: e.target.value }))} placeholder="1500" style={inp} />
            </div>
            <div>
              <label style={lbl}>走行距離（km）</label>
              <input type="number" value={form.mileage} onChange={e => setForm(f => ({ ...f, mileage: e.target.value }))} style={inp} />
            </div>
            <div>
              <label style={lbl}>車検有効期限</label>
              <input type="date" value={form.inspection_expiry} onChange={e => setForm(f => ({ ...f, inspection_expiry: e.target.value }))} style={inp} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '20px' }}>
              <input type="checkbox" checked={form.repair_history} onChange={e => setForm(f => ({ ...f, repair_history: e.target.checked }))}
                style={{ width: '16px', height: '16px', cursor: 'pointer' }} />
              <label style={{ fontSize: '13px', cursor: 'pointer' }}>修復歴あり</label>
            </div>
          </div>
        </div>

        {/* 契約金額・支払方法 */}
        <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #eee', padding: '24px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 600, margin: '0 0 16px', color: '#111' }}>契約金額・支払方法</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div>
              <label style={lbl}>契約金額（円）</label>
              <input type="number" value={form.contract_amount} onChange={e => setForm(f => ({ ...f, contract_amount: e.target.value }))} placeholder="0" style={{ ...inp, fontSize: '16px', fontWeight: 600 }} />
            </div>
            <div>
              <label style={lbl}>支払方法</label>
              <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                {['振込', 'その他'].map(m => (
                  <button key={m} onClick={() => setForm(f => ({ ...f, payment_method: m }))}
                    style={{ flex: 1, padding: '8px', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 500, cursor: 'pointer', background: form.payment_method === m ? '#0070f3' : '#f1f3f4', color: form.payment_method === m ? 'white' : '#555' }}>
                    {m}
                  </button>
                ))}
              </div>
            </div>
            {form.payment_method === '振込' && (
              <>
                <div>
                  <label style={lbl}>銀行名</label>
                  <input value={form.bank_name} onChange={e => setForm(f => ({ ...f, bank_name: e.target.value }))} placeholder="〇〇銀行" style={inp} />
                </div>
                <div>
                  <label style={lbl}>支店名</label>
                  <input value={form.bank_branch} onChange={e => setForm(f => ({ ...f, bank_branch: e.target.value }))} placeholder="〇〇支店" style={inp} />
                </div>
                <div>
                  <label style={lbl}>口座種別</label>
                  <select value={form.bank_account_type} onChange={e => setForm(f => ({ ...f, bank_account_type: e.target.value }))} style={inp}>
                    <option>普通</option><option>当座</option>
                  </select>
                </div>
                <div>
                  <label style={lbl}>口座番号</label>
                  <input value={form.bank_account_number} onChange={e => setForm(f => ({ ...f, bank_account_number: e.target.value }))} style={inp} />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={lbl}>口座名義（カタカナ）</label>
                  <input value={form.bank_account_name} onChange={e => setForm(f => ({ ...f, bank_account_name: e.target.value }))} placeholder="タカダ コウ" style={inp} />
                </div>
              </>
            )}
          </div>
        </div>

        {/* 特記事項 */}
        <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #eee', padding: '24px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 600, margin: '0 0 16px', color: '#111' }}>特記事項</h3>
          <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3}
            style={{ ...inp, resize: 'vertical' }} placeholder="備考など" />
        </div>

        {/* ボタン */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button onClick={() => handleSave('draft')} disabled={saving}
            style={{ padding: '12px 24px', background: '#f1f3f4', color: '#555', border: 'none', borderRadius: '8px', fontSize: '14px', cursor: 'pointer', fontWeight: 500 }}>
            💾 下書き保存
          </button>
          <button onClick={() => setPreview(true)}
            style={{ padding: '12px 24px', background: '#0070f3', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', cursor: 'pointer', fontWeight: 500 }}>
            👁 プレビュー
          </button>
          <button onClick={() => handleSave('confirmed')} disabled={saving || contract?.status === 'confirmed'}
            style={{ padding: '12px 24px', background: contract?.status === 'confirmed' ? '#ccc' : '#00a86b', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', cursor: contract?.status === 'confirmed' ? 'not-allowed' : 'pointer', fontWeight: 700 }}>
            ✅ 契約成立・BOX割り当て
          </button>
        </div>
      </div>
    </div>
  )
}