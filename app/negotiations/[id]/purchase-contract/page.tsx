'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase, getCurrentUserScope } from '@/lib/supabase'
import Link from 'next/link'
import { useProfile } from '@/hooks/useProfile'
import LoadingOverlay from '@/components/LoadingOverlay'

export default function NegotiationPurchaseContractPage() {
  const params = useParams()
  const negotiationId = params.id as string
  const router = useRouter()

  const { profile } = useProfile()
  const [negotiation, setNegotiation] = useState<any>(null)
  const [contract, setContract] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [loadingOverlay, setLoadingOverlay] = useState(false)
  const [loadingMessage, setLoadingMessage] = useState('処理中...')
  const [preview, setPreview] = useState(false)
  const [form, setForm] = useState({
    // 売主情報
    seller_name: '',          seller_name_kana: '',
    seller_birthday: '',      seller_license_number: '',
    seller_address: '',       seller_phone: '',
    // 所有者情報
    owner_name: '',           owner_address: '',
    user_same_as_owner: true,
    user_name: '',            user_address: '',
    // 車両情報
    registration_number: '',  first_registration: '',
    first_registration_month: '',
    registration_date: '',
    car_name: '',             model_type: '',
    grade: '',
    color: '',                displacement: '',
    chassis_number: '',       inspection_expiry: '',
    mileage: '',
    fuel: 'G',
    turbo: false,
    drive: '2WD',
    vehicle_history: '自家用',
    handle: '右H',
    import_car: false,        model_year: '',
    // 状態
    repair_history: false,
    disaster_history: false,
    modification_history: false,
    lien: false,
    meter_exchange: false,
    has_warranty_book: false,
    has_manual: false,
    has_service_record: false,
    mission: 'AT',            mission_speed: '',
    car_tax: '納付済',
    defect_detail: '',
    recycle_deposited: true,
    recycle_fee: '',
    loan_debt: false,         loan_debt_amount: '',
    // その他
    introducer: false,        introducer_name: '',
    owner_discrepancy_reason: '',
    account_discrepancy_reason: '',
    // 契約
    contract_date: new Date().toISOString().split('T')[0],
    contract_amount: '',      payment_method: '振込',
    bank_name: '',            bank_branch: '',
    bank_account_type: '普通', bank_account_number: '',
    bank_account_name: '',    notes: '',
  })

  useEffect(() => {
    const load = async () => {
      setLoading(true)

      const { data: neg } = await supabase
        .from('negotiations')
        .select('*, customers(*)')
        .eq('id', negotiationId)
        .single()
      setNegotiation(neg)

      const { data: c } = await supabase
        .from('purchase_contracts')
        .select('*')
        .eq('negotiation_id', negotiationId)
        .single()

      if (c) {
        setContract(c)
        setForm((f) => ({
          ...f,
          seller_name:          c.seller_name          ?? '',
          seller_name_kana:     c.seller_name_kana     ?? '',
          seller_birthday:      c.seller_birthday      ?? '',
          seller_license_number:c.seller_license_number?? '',
          seller_address:       c.seller_address       ?? '',
          seller_phone:         c.seller_phone         ?? '',
          registration_number:  c.registration_number  ?? '',
          first_registration:   c.first_registration   ?? '',
          car_name:             c.car_name             ?? '',
          model_type:           c.model_type           ?? '',
          color:                c.color                ?? '',
          displacement:         c.displacement         ?? '',
          chassis_number:       c.chassis_number       ?? '',
          inspection_expiry:    c.inspection_expiry    ?? '',
          mileage:              c.mileage              ?? '',
          repair_history:       c.repair_history       ?? false,
          contract_date:        c.contract_date        ?? new Date().toISOString().split('T')[0],
          contract_amount:      c.contract_amount      ?? '',
          payment_method:       c.payment_method       ?? '振込',
          bank_name:            c.bank_name            ?? '',
          bank_branch:          c.bank_branch          ?? '',
          bank_account_type:    c.bank_account_type    ?? '普通',
          bank_account_number:  c.bank_account_number  ?? '',
          bank_account_name:    c.bank_account_name    ?? '',
          notes:                c.notes                ?? '',
        }))
      } else if (neg) {
        // 商談・買取車両情報からプリセット
        setForm(f => ({
          ...f,
          seller_name:    neg.customers?.氏名      ?? '',
          seller_phone:   neg.customers?.電話番号  ?? '',
          car_name:       [neg.purchase_maker, neg.purchase_model].filter(Boolean).join(' '),
          chassis_number: neg.purchase_chassis_number ?? '',
          mileage:        neg.purchase_mileage?.toString()   ?? '',
          color:          neg.purchase_color        ?? '',
          repair_history: neg.purchase_repair_history ?? false,
          contract_amount:neg.assessment_price?.toString()   ?? '',
        }))
      }

      setLoading(false)
    }
    load()
  }, [negotiationId])

  const buildPayload = (status: 'draft' | 'confirmed', vehicleId?: string) => ({
    negotiation_id:     negotiationId,
    vehicle_id:         vehicleId ?? contract?.vehicle_id ?? null,
    seller_name:        form.seller_name        || null,
    seller_name_kana:   form.seller_name_kana   || null,
    seller_birthday:    form.seller_birthday    || null,
    seller_license_number: form.seller_license_number || null,
    seller_address:     form.seller_address     || null,
    seller_phone:       form.seller_phone       || null,
    registration_number:form.registration_number|| null,
    first_registration: form.first_registration || null,
    car_name:           form.car_name           || null,
    model_type:         form.model_type         || null,
    color:              form.color              || null,
    displacement:       form.displacement ? parseInt(String(form.displacement)) : null,
    chassis_number:     form.chassis_number     || null,
    inspection_expiry:  form.inspection_expiry  || null,
    mileage:            form.mileage ? parseInt(String(form.mileage)) : null,
    repair_history:     form.repair_history,
    contract_date:      form.contract_date      || null,
    contract_amount:    form.contract_amount ? parseInt(String(form.contract_amount)) : null,
    payment_method:     form.payment_method     || null,
    bank_name:          form.bank_name          || null,
    bank_branch:        form.bank_branch        || null,
    bank_account_type:  form.bank_account_type  || null,
    bank_account_number:form.bank_account_number|| null,
    bank_account_name:  form.bank_account_name  || null,
    notes:              form.notes              || null,
    status,
    updated_at: new Date().toISOString(),
  })

  const handleSave = async () => {
    setLoadingMessage('保存中...')
    setLoadingOverlay(true)
    setSaving(true)
    const payload = buildPayload('draft')
    if (contract) {
      await supabase.from('purchase_contracts').update(payload).eq('id', contract.id)
    } else {
      const { data } = await supabase.from('purchase_contracts').insert(payload).select().single()
      setContract(data)
    }
    setLoadingOverlay(false)
    setSaving(false)
    alert('下書きとして保存しました')
  }

  const handleConfirm = async () => {
    if (!confirm('買取契約を成立させ、在庫に登録しますか？')) return
    setLoadingMessage('処理中...')
    setLoadingOverlay(true)
    setSaving(true)

    // 1. db_number 生成
    const { data: lastVehicle } = await supabase
      .from('vehicles')
      .select('db_number')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
    let nextNumber = 1
    if (lastVehicle?.db_number) {
      const match = lastVehicle.db_number.match(/V-(\d+)/)
      if (match) nextNumber = parseInt(match[1]) + 1
    }
    const dbNumber = `V-${String(nextNumber).padStart(3, '0')}`

    // 2. maker_id / model_id / color_id / country_id 取得
    const [makerRes, modelRes, colorRes] = await Promise.all([
      negotiation?.purchase_maker
        ? supabase.from('master_makers').select('id, country_id').eq('name', negotiation.purchase_maker).single()
        : Promise.resolve({ data: null }),
      negotiation?.purchase_model
        ? supabase.from('master_models').select('id').eq('name', negotiation.purchase_model).single()
        : Promise.resolve({ data: null }),
      negotiation?.purchase_color
        ? supabase.from('master_colors').select('id').eq('name', negotiation.purchase_color).single()
        : Promise.resolve({ data: null }),
    ])

    // 3. vehicles に新規 INSERT
    const scope = await getCurrentUserScope()
    if (!scope) { alert('ログイン情報の取得に失敗しました'); setSaving(false); return }
    const { data: newVehicle, error: vehicleError } = await supabase
      .from('vehicles')
      .insert([{
        db_number:             dbNumber,
        maker_id:              makerRes.data?.id        ?? null,
        model_id:              modelRes.data?.id        ?? null,
        color_id:              colorRes.data?.id        ?? null,
        country_id:            makerRes.data?.country_id ?? null,
        year:                  negotiation?.purchase_year     ?? null,
        mileage:               negotiation?.purchase_mileage  ?? null,
        chassis_number:        negotiation?.purchase_chassis_number ?? null,
        repair_history:        negotiation?.purchase_repair_history ?? false,
        purchase_price:        form.contract_amount ? parseInt(String(form.contract_amount)) : null,
        purchase_contract_date:form.contract_date || null,
        purchase_type:         '買取',
        purchase_staff:        profile?.display_name || null,
        status:                '在庫中',
        customer_id:           negotiation?.customer_id ?? null,
        company_id:            scope.company_id,
        branch_id:             scope.branch_id,
      }])
      .select()
      .single()

    if (vehicleError || !newVehicle) {
      alert('車両登録エラー: ' + vehicleError?.message)
      setSaving(false)
      return
    }

    // 4. negotiations 更新（vehicle_id・status）
    await supabase.from('negotiations').update({
      vehicle_id: newVehicle.id,
      status: '成約',
    }).eq('id', negotiationId)

    // 5. purchase_contracts 保存（vehicle_id も設定）
    const contractPayload = buildPayload('confirmed', newVehicle.id)
    let contractId = contract?.id
    if (contract) {
      await supabase.from('purchase_contracts').update(contractPayload).eq('id', contract.id)
    } else {
      const { data } = await supabase.from('purchase_contracts').insert(contractPayload).select().single()
      contractId = data?.id
    }

    // 6. 空き書類BOX 割り当て
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
        vehicle_id:  newVehicle.id,
        assigned_at: new Date().toISOString(),
      }).eq('id', emptyBox.id)
      if (contractId) {
        await supabase.from('purchase_contracts').update({ document_box_id: emptyBox.id }).eq('id', contractId)
      }
      alert(`✅ 買取契約が成立しました！\n管理番号: ${dbNumber}\n書類BOX【${emptyBox.box_number}】を割り当てました`)
    } else {
      alert(`✅ 買取契約が成立しました！\n管理番号: ${dbNumber}\n⚠️ 空き書類BOXがありません。管理者に連絡してください。`)
    }

    router.push(`/vehicles/${newVehicle.id}`)
    setLoadingOverlay(false)
    setSaving(false)
  }

  if (loading) return <div style={{ padding: '2rem' }}>読み込み中...</div>

  const inp = { width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '13px', boxSizing: 'border-box' as const, outline: 'none' }
  const lbl = { fontSize: '12px', color: '#888', fontWeight: 500 as const, marginBottom: '4px', display: 'block' as const }

  const isConfirmed = contract?.status === 'confirmed'

  // ===== プレビュー =====
  if (preview) {
    return (
      <div>
        {loadingOverlay && <LoadingOverlay message={loadingMessage} />}
        {/* 操作ボタン（印刷時非表示） */}
        <div className="no-print" style={{ padding: '12px 24px', display: 'flex', gap: '12px', alignItems: 'center', background: '#f8f9fa', borderBottom: '1px solid #eee', marginTop: '56px' }}>
          <button onClick={() => {
  const printArea = document.querySelector('.print-area') as HTMLElement
  if (!printArea) return

  // print-areaのHTMLを取得
  const html = printArea.outerHTML

  // 新しいウィンドウで開く
  const w = window.open('', '_blank')
  if (!w) return

  w.document.write(`<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<title>売買契約書</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: "MS Mincho", "Yu Mincho", serif; background: white; }
@page { size: A4 portrait; margin: 8mm 8mm; }
.print-area { width: 100%; }
table { border-collapse: collapse; width: 100%; }
.section-header { background: #f0f0f0; padding: 2px 6px; font-weight: bold; border-bottom: 1px solid #333; font-size: 10px; }
.cell { padding: 2px 6px; font-size: 9px; border: 0.5px solid #ccc; }
.label { color: #555; }
div { font-size: 9px; }
h1, h2, h3 { font-size: 11px; }
</style>
</head>
<body>
${html}
</body>
</html>`)
  w.document.close()
  w.focus()
  setTimeout(() => { w.print() }, 800)
}} style={{ padding: '8px 20px', background: '#1a73e8', color: 'white', border: 'none', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}>🖨 印刷</button>
          <button onClick={() => setPreview(false)} style={{ padding: '8px 20px', background: 'white', border: '1px solid #ddd', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}>← 編集に戻る</button>
        </div>

        {/* 契約書本体 */}
        <div className="print-area" style={{ background: 'white', maxWidth: '210mm', margin: '0 auto', padding: '5mm 8mm', fontSize: '10px', fontFamily: 'serif', lineHeight: 1.4 }}>

          {/* ヘッダー */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
            <div style={{ fontSize: '10px' }}>（弊社控え）</div>
            <div style={{ textAlign: 'right', fontSize: '10px' }}>
              <div>契約No.</div>
              <div>査定No.</div>
            </div>
          </div>

          <div style={{ textAlign: 'center', fontSize: '20px', fontWeight: 'bold', letterSpacing: '12px', marginBottom: '4px' }}>売　買　契　約　書</div>

          <div style={{ fontSize: '10px', marginBottom: '6px' }}>
            売主と買主は、この契約書表面の記載及び状態に従って、ここに自動車の売買契約を締結します。
          </div>

          {/* 売主・買主情報 2カラム */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', marginBottom: '4px' }}>
            {/* 売主 */}
            <div style={{ border: '1px solid #333' }}>
              <div style={{ background: '#f0f0f0', padding: '3px 8px', fontWeight: 'bold', borderBottom: '1px solid #333', fontSize: '11px' }}>・売主</div>
              <div style={{ padding: '6px 8px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', marginBottom: '4px', fontSize: '10px' }}>
                  <div><span style={{ color: '#555' }}>フリガナ：</span>{form.seller_name_kana}</div>
                  <div><span style={{ color: '#555' }}>生年月日：</span>{form.seller_birthday}</div>
                </div>
                <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '4px' }}>氏名：{form.seller_name}</div>
                <div style={{ fontSize: '10px', marginBottom: '2px' }}><span style={{ color: '#555' }}>運転免許証番号：</span>{form.seller_license_number}</div>
                <div style={{ fontSize: '10px', marginBottom: '2px' }}><span style={{ color: '#555' }}>住所：</span>{form.seller_address}</div>
                <div style={{ fontSize: '10px' }}><span style={{ color: '#555' }}>電話：</span>{form.seller_phone}</div>
              </div>
            </div>
            {/* 買主 */}
            <div style={{ border: '1px solid #333' }}>
              <div style={{ background: '#f0f0f0', padding: '3px 8px', fontWeight: 'bold', borderBottom: '1px solid #333', fontSize: '11px' }}>・買主の商号及び所在地</div>
              <div style={{ padding: '6px 8px' }}>
                <div style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '4px' }}>{negotiation?.company_name || '株式会社　　　　　'}</div>
                <div style={{ fontSize: '10px', marginBottom: '2px' }}>{negotiation?.company_address || '〒　　　　　　　　　　　　　　　'}</div>
                <div style={{ fontSize: '10px', marginBottom: '2px' }}>TEL {negotiation?.company_tel || '　　　　　　'} FAX {negotiation?.company_fax || '　　　　　　'}</div>
                <div style={{ fontSize: '10px' }}>担当者：{negotiation?.assigned_to || '　　　　　'}</div>
              </div>
            </div>
          </div>

          {/* 契約日 */}
          <div style={{ textAlign: 'right', fontSize: '10px', marginBottom: '4px' }}>
            契約日：{form.contract_date}
          </div>

          {/* 契約車両の表示および明細 */}
          <div style={{ border: '1px solid #333', marginBottom: '4px' }}>
            <div style={{ background: '#f0f0f0', padding: '3px 8px', fontWeight: 'bold', borderBottom: '1px solid #333', fontSize: '11px' }}>・契約車両の表示および明細</div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid #ddd', fontSize: '10px' }}>
              <div style={{ padding: '4px 8px', borderRight: '1px solid #ddd' }}><span style={{ color: '#555' }}>所有者名：</span>{form.owner_name || '　'}<span style={{ color: '#555', marginLeft: '8px' }}>住所：</span>{form.owner_address || '　'}</div>
              <div style={{ padding: '4px 8px' }}><span style={{ color: '#555' }}>使用者名：</span>{form.user_same_as_owner ? '同上' : (form.user_name || '　')}<span style={{ color: '#555', marginLeft: '8px' }}>住所：</span>{form.user_same_as_owner ? '同上' : (form.user_address || '　')}</div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', borderBottom: '1px solid #ddd', fontSize: '10px' }}>
              <div style={{ padding: '4px 8px', borderRight: '1px solid #ddd' }}><span style={{ color: '#555' }}>登録番号：</span>{form.registration_number}</div>
              <div style={{ padding: '4px 8px', borderRight: '1px solid #ddd' }}><span style={{ color: '#555' }}>初年度登録：</span>{form.first_registration}年{form.first_registration_month}月</div>
              <div style={{ padding: '4px 8px' }}><span style={{ color: '#555' }}>登録年月日：</span>{form.registration_date}</div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', borderBottom: '1px solid #ddd', fontSize: '10px' }}>
              <div style={{ padding: '4px 8px', borderRight: '1px solid #ddd' }}><span style={{ color: '#555' }}>車名：</span>{form.car_name}</div>
              <div style={{ padding: '4px 8px', borderRight: '1px solid #ddd' }}><span style={{ color: '#555' }}>グレード・仕様：</span>{form.grade}</div>
              <div style={{ padding: '4px 8px' }}><span style={{ color: '#555' }}>ターボ：</span>{form.turbo ? '有' : '無'}<span style={{ color: '#555', marginLeft: '8px' }}>駆動：</span>{form.drive}</div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', borderBottom: '1px solid #ddd', fontSize: '10px' }}>
              <div style={{ padding: '4px 8px', borderRight: '1px solid #ddd' }}><span style={{ color: '#555' }}>型式：</span>{form.model_type}</div>
              <div style={{ padding: '4px 8px', borderRight: '1px solid #ddd' }}><span style={{ color: '#555' }}>色：</span>{form.color}</div>
              <div style={{ padding: '4px 8px', borderRight: '1px solid #ddd' }}><span style={{ color: '#555' }}>排気量：</span>{form.displacement}cc</div>
              <div style={{ padding: '4px 8px' }}><span style={{ color: '#555' }}>燃料：</span>{form.fuel}<span style={{ color: '#555', marginLeft: '6px' }}>ハンドル：</span>{form.handle}</div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', borderBottom: '1px solid #ddd', fontSize: '10px' }}>
              <div style={{ padding: '4px 8px', borderRight: '1px solid #ddd' }}><span style={{ color: '#555' }}>車台番号：</span>{form.chassis_number}</div>
              <div style={{ padding: '4px 8px', borderRight: '1px solid #ddd' }}><span style={{ color: '#555' }}>車歴：</span>{form.vehicle_history}</div>
              <div style={{ padding: '4px 8px' }}><span style={{ color: '#555' }}>車検有効期限：</span>{form.inspection_expiry}</div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid #ddd', fontSize: '10px' }}>
              <div style={{ padding: '4px 8px', borderRight: '1px solid #ddd' }}>
                <span style={{ color: '#555' }}>メーター表示値：</span>{form.mileage ? Number(form.mileage).toLocaleString() : ''}km
                <span style={{ color: '#555', marginLeft: '8px' }}>メーター交換：</span>{form.meter_exchange ? '有' : '無'}
              </div>
              <div style={{ padding: '4px 8px' }}>
                <span style={{ color: '#555' }}>ミッション：</span>{form.mission}{form.mission_speed && `（${form.mission_speed}速）`}
                <span style={{ color: '#555', marginLeft: '8px' }}>輸入車：</span>{form.import_car ? '有' : '無'}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', borderBottom: '1px solid #ddd', fontSize: '10px' }}>
              <div style={{ padding: '4px 8px', borderRight: '1px solid #ddd' }}><span style={{ color: '#555' }}>新車時保証書：</span>{form.has_warranty_book ? '有' : '無'}</div>
              <div style={{ padding: '4px 8px', borderRight: '1px solid #ddd' }}><span style={{ color: '#555' }}>取扱説明書：</span>{form.has_manual ? '有' : '無'}</div>
              <div style={{ padding: '4px 8px' }}><span style={{ color: '#555' }}>整備記録：</span>{form.has_service_record ? '有' : '無'}</div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', borderBottom: '1px solid #ddd', fontSize: '10px' }}>
              <div style={{ padding: '4px 8px', borderRight: '1px solid #ddd' }}><span style={{ color: '#555' }}>修復歴：</span>{form.repair_history ? '有' : '無'}</div>
              <div style={{ padding: '4px 8px', borderRight: '1px solid #ddd' }}><span style={{ color: '#555' }}>災害歴：</span>{form.disaster_history ? '有' : '無'}</div>
              <div style={{ padding: '4px 8px', borderRight: '1px solid #ddd' }}><span style={{ color: '#555' }}>改造歴：</span>{form.modification_history ? '有' : '無'}</div>
              <div style={{ padding: '4px 8px' }}><span style={{ color: '#555' }}>抵当権：</span>{form.lien ? '有' : '無'}</div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', borderBottom: '1px solid #ddd', fontSize: '10px' }}>
              <div style={{ padding: '4px 8px', borderRight: '1px solid #ddd' }}><span style={{ color: '#555' }}>自動車税：</span>{form.car_tax}</div>
              <div style={{ padding: '4px 8px', borderRight: '1px solid #ddd' }}>
                <span style={{ color: '#555' }}>リサイクル預託金：</span>
                {form.recycle_deposited ? '預託済' : '未預託'}
                {form.recycle_fee && `（¥${Number(form.recycle_fee).toLocaleString()}）`}
              </div>
              <div style={{ padding: '4px 8px' }}><span style={{ color: '#555' }}>ローン残債：</span>{form.loan_debt ? `有（${form.loan_debt_amount}円）` : '無'}</div>
            </div>

            {form.defect_detail && (
              <div style={{ padding: '4px 8px', borderBottom: '1px solid #ddd', fontSize: '10px' }}>
                <span style={{ color: '#555' }}>不具合箇所：</span>{form.defect_detail}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', fontSize: '10px' }}>
              <div style={{ padding: '4px 8px', borderRight: '1px solid #ddd' }}><span style={{ color: '#555' }}>紹介者：</span>{form.introducer ? `有（${form.introducer_name}）` : '無'}</div>
              <div style={{ padding: '4px 8px', borderRight: '1px solid #ddd' }}><span style={{ color: '#555' }}>売主と所有者の相違理由：</span>{form.owner_discrepancy_reason || '　'}</div>
              <div style={{ padding: '4px 8px' }}><span style={{ color: '#555' }}>売主と口座名義の相違理由：</span>{form.account_discrepancy_reason || '　'}</div>
            </div>
          </div>

          {/* 車両契約金額 */}
          <div style={{ border: '1px solid #333', marginBottom: '4px' }}>
            <div style={{ background: '#f0f0f0', padding: '3px 8px', fontWeight: 'bold', borderBottom: '1px solid #333', fontSize: '11px' }}>・車両契約金額</div>
            <div style={{ padding: '8px', textAlign: 'center', fontSize: '26px', fontWeight: 'bold', letterSpacing: '4px' }}>
              ¥ {form.contract_amount ? Number(form.contract_amount).toLocaleString() : '　　　　　　'} －
            </div>
            <div style={{ padding: '4px 8px', fontSize: '9px', borderTop: '1px solid #ddd', color: '#555' }}>
              ※上記車両契約金額は、以下のものを含みます。<br/>
              自動車損害賠償責任保険の未経過分保険料相当額（自動車損害賠償責任保険料は次回車検満了日の翌日までの期間分の完納を前提とします）<br/>
              車両本体価格に関わる消費税　重量税　未経過自動車税<br/>
              なお、支払代金に関しましては、契約約自動車の自動車未納金額およびローン残債、契約車両を担保とする借入金額等がある場合は、これらの金額を差し引きます。
            </div>
          </div>

          {/* 特記事項・お支払方法 2カラム */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', marginBottom: '4px' }}>
            <div style={{ border: '1px solid #333' }}>
              <div style={{ background: '#f0f0f0', padding: '3px 8px', fontWeight: 'bold', borderBottom: '1px solid #333', fontSize: '11px' }}>・特記事項</div>
              <div style={{ padding: '8px', minHeight: '60px', fontSize: '10px' }}>{form.notes || '　'}</div>
            </div>
            <div style={{ border: '1px solid #333' }}>
              <div style={{ background: '#f0f0f0', padding: '3px 8px', fontWeight: 'bold', borderBottom: '1px solid #333', fontSize: '11px' }}>・お支払方法</div>
              <div style={{ padding: '6px 8px', fontSize: '10px' }}>
                <div style={{ marginBottom: '4px' }}><span style={{ color: '#555' }}>支払方法：</span>{form.payment_method}</div>
                <div style={{ marginBottom: '4px' }}><span style={{ color: '#555' }}>口座名義：</span>{form.bank_account_name}</div>
                <div style={{ marginBottom: '4px' }}><span style={{ color: '#555' }}>金融機関名：</span>{form.bank_name}<span style={{ color: '#555', marginLeft: '8px' }}>支店名：</span>{form.bank_branch}</div>
                <div><span style={{ color: '#555' }}>{form.bank_account_type}　口座番号：</span>{form.bank_account_number}</div>
              </div>
            </div>
          </div>

          {/* 車両引渡時期および譲渡書類引渡期限 */}
          <div style={{ border: '1px solid #333', marginBottom: '4px', fontSize: '10px' }}>
            <div style={{ background: '#f0f0f0', padding: '3px 8px', fontWeight: 'bold', borderBottom: '1px solid #333', fontSize: '11px' }}>・車両引渡時期および譲渡書類引渡期限</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', padding: '4px 8px', gap: '8px' }}>
              <div><span style={{ color: '#555' }}>契約車両引渡日：</span>　　年　　月　　日</div>
              <div><span style={{ color: '#555' }}>譲渡書類引渡期日：</span>　　年　　月　　日</div>
              <div><span style={{ color: '#555' }}>引渡場所：</span>　　　　　　　　</div>
            </div>
          </div>

          {/* 本契約についての売主の確認 */}
          <div style={{ border: '1px solid #333', marginBottom: '4px', fontSize: '9px' }}>
            <div style={{ background: '#f0f0f0', padding: '3px 8px', fontWeight: 'bold', borderBottom: '1px solid #333', fontSize: '11px' }}>・本契約についての売主の確認</div>
            <div style={{ padding: '4px 8px' }}>
              {[
                '上記に表示の契約車両の詳細及び状態に相違ありません。これらの内容に相違があった場合、契約解除・代金返還・損害賠償等の請求を受けても異議ありません。',
                '裏面記載の車両売買約款を確認し、承諾いたしました。',
                '契約車両は私の認識の有無にかかわらず、走行距離・修復歴・災害車両等の相違があると判明したとき、または後に係争等が明らかとなった場合、何らの催告なしに本契約を解除されても異議ありません。',
                '駐車場反則・放置違反等の未納金はありません。',
                '売主が所有者と異なる場合、売却について所有者より委託を受け、または所有者の委任を得ていることを保証します。',
                '売主が所有者と異なる場合、売却について所有者より委託され、または所有者の委任を得ていることを保証します。',
                '私に不利な内容を含め、本契約に関する説明を受けたうえに全条項について異議なく承諾いたしました。',
              ].map((text, i) => (
                <div key={i} style={{ marginBottom: '2px' }}>{i + 1}. {text}</div>
              ))}
            </div>
          </div>

          {/* 売主署名・買主署名 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
            <div style={{ border: '1px solid #333', padding: '8px', minHeight: '60px' }}>
              <div style={{ fontSize: '10px', color: '#555', marginBottom: '4px' }}>売主署名</div>
              <div style={{ fontSize: '14px', marginTop: '20px', borderBottom: '1px solid #333' }}></div>
            </div>
            <div style={{ border: '1px solid #333', padding: '8px', minHeight: '60px' }}>
              <div style={{ fontSize: '10px', color: '#555', marginBottom: '4px' }}>買主（弊社）</div>
              <div style={{ fontSize: '13px', fontWeight: 'bold' }}>{negotiation?.company_name || '　　　　　　　　'}</div>
            </div>
          </div>

        </div>
      </div>
    )
  }

  // ===== 編集フォーム =====
  return (
    <div style={{ padding: '2rem', maxWidth: '900px', margin: '0 auto' }}>
      {loadingOverlay && <LoadingOverlay message={loadingMessage} />}
      <div style={{ marginBottom: '1.5rem' }}>
        <Link href={`/negotiations/${negotiationId}`} style={{ fontSize: '13px', color: '#888', textDecoration: 'none' }}>← 商談詳細に戻る</Link>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: 700, margin: 0 }}>買取契約書</h1>
            <p style={{ fontSize: '13px', color: '#888', margin: '4px 0 0' }}>
              {negotiation?.customers?.氏名}　{[negotiation?.purchase_maker, negotiation?.purchase_model].filter(Boolean).join(' ')}
            </p>
          </div>
          {isConfirmed && (
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
              <input value={form.seller_name} onChange={e => setForm(f => ({ ...f, seller_name: e.target.value }))} placeholder="山田 太郎" style={inp} />
            </div>
            <div>
              <label style={lbl}>フリガナ</label>
              <input value={form.seller_name_kana} onChange={e => setForm(f => ({ ...f, seller_name_kana: e.target.value }))} placeholder="ヤマダ タロウ" style={inp} />
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
              <input value={form.seller_address} onChange={e => setForm(f => ({ ...f, seller_address: e.target.value }))} placeholder="東京都..." style={inp} />
            </div>
          </div>
        </div>

        {/* 所有者情報 */}
        <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #eee', padding: '24px' }}>
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '12px', borderBottom: '2px solid #1a73e8', paddingBottom: '6px' }}>所有者・使用者情報</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={lbl}>所有者名</label>
                <input style={inp} value={form.owner_name} onChange={e => setForm(f => ({ ...f, owner_name: e.target.value }))} placeholder="車検証上の所有者名" />
              </div>
              <div>
                <label style={lbl}>所有者住所</label>
                <input style={inp} value={form.owner_address} onChange={e => setForm(f => ({ ...f, owner_address: e.target.value }))} placeholder="車検証上の住所" />
              </div>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '10px 0', cursor: 'pointer' }}>
              <input type="checkbox" checked={form.user_same_as_owner} onChange={e => setForm(f => ({ ...f, user_same_as_owner: e.target.checked }))} />
              <span style={{ fontSize: '13px' }}>使用者は所有者と同一</span>
            </label>
            {!form.user_same_as_owner && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '8px' }}>
                <div>
                  <label style={lbl}>使用者名</label>
                  <input style={inp} value={form.user_name} onChange={e => setForm(f => ({ ...f, user_name: e.target.value }))} />
                </div>
                <div>
                  <label style={lbl}>使用者住所</label>
                  <input style={inp} value={form.user_address} onChange={e => setForm(f => ({ ...f, user_address: e.target.value }))} />
                </div>
              </div>
            )}
          </div>

          {/* 車両情報 */}
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '12px', borderBottom: '2px solid #1a73e8', paddingBottom: '6px' }}>契約車両情報</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
              <div><label style={lbl}>登録番号</label><input style={inp} value={form.registration_number} onChange={e => setForm(f => ({ ...f, registration_number: e.target.value }))} /></div>
              <div><label style={lbl}>初年度登録（年）</label><input style={inp} value={form.first_registration} onChange={e => setForm(f => ({ ...f, first_registration: e.target.value }))} placeholder="例：R3" /></div>
              <div><label style={lbl}>初年度登録（月）</label><input style={inp} value={form.first_registration_month} onChange={e => setForm(f => ({ ...f, first_registration_month: e.target.value }))} placeholder="例：6" /></div>
              <div><label style={lbl}>登録年月日</label><input style={inp} value={form.registration_date} onChange={e => setForm(f => ({ ...f, registration_date: e.target.value }))} placeholder="例：H30.3.17" /></div>
              <div><label style={lbl}>車名（通称名）</label><input style={inp} value={form.car_name} onChange={e => setForm(f => ({ ...f, car_name: e.target.value }))} /></div>
              <div><label style={lbl}>グレード・仕様</label><input style={inp} value={form.grade} onChange={e => setForm(f => ({ ...f, grade: e.target.value }))} /></div>
              <div><label style={lbl}>型式</label><input style={inp} value={form.model_type} onChange={e => setForm(f => ({ ...f, model_type: e.target.value }))} /></div>
              <div><label style={lbl}>色</label><input style={inp} value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} /></div>
              <div><label style={lbl}>排気量（cc）</label><input style={inp} type="number" value={form.displacement} onChange={e => setForm(f => ({ ...f, displacement: e.target.value }))} /></div>
              <div><label style={lbl}>車台番号</label><input style={inp} value={form.chassis_number} onChange={e => setForm(f => ({ ...f, chassis_number: e.target.value }))} /></div>
              <div><label style={lbl}>車検有効期限</label><input style={inp} value={form.inspection_expiry} onChange={e => setForm(f => ({ ...f, inspection_expiry: e.target.value }))} placeholder="例：R8.11.10" /></div>
              <div><label style={lbl}>走行距離（km）</label><input style={inp} type="number" value={form.mileage} onChange={e => setForm(f => ({ ...f, mileage: e.target.value }))} /></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '12px', marginTop: '12px' }}>
              <div>
                <label style={lbl}>燃料</label>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {['G', 'D', 'HV', 'EV'].map(f => (
                    <button key={f} onClick={() => setForm(prev => ({ ...prev, fuel: f }))}
                      style={{ flex: 1, padding: '6px', borderRadius: '6px', border: `1px solid ${form.fuel === f ? '#1a73e8' : '#ddd'}`, background: form.fuel === f ? '#eff6ff' : 'white', color: form.fuel === f ? '#1a73e8' : '#555', fontSize: '12px', cursor: 'pointer' }}>{f}</button>
                  ))}
                </div>
              </div>
              <div>
                <label style={lbl}>駆動</label>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {['2WD', '4WD'].map(f => (
                    <button key={f} onClick={() => setForm(prev => ({ ...prev, drive: f }))}
                      style={{ flex: 1, padding: '6px', borderRadius: '6px', border: `1px solid ${form.drive === f ? '#1a73e8' : '#ddd'}`, background: form.drive === f ? '#eff6ff' : 'white', color: form.drive === f ? '#1a73e8' : '#555', fontSize: '12px', cursor: 'pointer' }}>{f}</button>
                  ))}
                </div>
              </div>
              <div>
                <label style={lbl}>ハンドル</label>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {['右H', '左H'].map(f => (
                    <button key={f} onClick={() => setForm(prev => ({ ...prev, handle: f }))}
                      style={{ flex: 1, padding: '6px', borderRadius: '6px', border: `1px solid ${form.handle === f ? '#1a73e8' : '#ddd'}`, background: form.handle === f ? '#eff6ff' : 'white', color: form.handle === f ? '#1a73e8' : '#555', fontSize: '12px', cursor: 'pointer' }}>{f}</button>
                  ))}
                </div>
              </div>
              <div>
                <label style={lbl}>車歴</label>
                <select style={inp} value={form.vehicle_history} onChange={e => setForm(f => ({ ...f, vehicle_history: e.target.value }))}>
                  {['自家用', '事業用', 'レンタカー', 'その他'].map(v => <option key={v}>{v}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginTop: '12px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                <input type="checkbox" checked={form.turbo} onChange={e => setForm(f => ({ ...f, turbo: e.target.checked }))} />ターボあり
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                <input type="checkbox" checked={form.import_car} onChange={e => setForm(f => ({ ...f, import_car: e.target.checked }))} />輸入車
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <label style={{ fontSize: '13px' }}>ミッション</label>
                <select style={{ ...inp, width: 'auto' }} value={form.mission} onChange={e => setForm(f => ({ ...f, mission: e.target.value }))}>
                  {['AT', 'MT'].map(v => <option key={v}>{v}</option>)}
                </select>
                <input style={{ ...inp, width: '60px' }} value={form.mission_speed} onChange={e => setForm(f => ({ ...f, mission_speed: e.target.value }))} placeholder="速" />
              </div>
            </div>
          </div>

          {/* 状態情報 */}
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '12px', borderBottom: '2px solid #1a73e8', paddingBottom: '6px' }}>車両状態</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '12px' }}>
              {[
                { key: 'repair_history', label: '修復歴' },
                { key: 'disaster_history', label: '災害歴' },
                { key: 'modification_history', label: '改造歴' },
                { key: 'lien', label: '抵当権' },
                { key: 'meter_exchange', label: 'メーター交換' },
                { key: 'has_warranty_book', label: '新車時保証書' },
                { key: 'has_manual', label: '取扱説明書' },
                { key: 'has_service_record', label: '整備記録' },
              ].map(({ key, label }) => (
                <label key={key} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={form[key as keyof typeof form] as boolean}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.checked }))} />{label}あり
                </label>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
              <div>
                <label style={lbl}>自動車税</label>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {['納付済', '未納', '減免'].map(v => (
                    <button key={v} onClick={() => setForm(f => ({ ...f, car_tax: v }))}
                      style={{ flex: 1, padding: '6px', borderRadius: '6px', border: `1px solid ${form.car_tax === v ? '#1a73e8' : '#ddd'}`, background: form.car_tax === v ? '#eff6ff' : 'white', color: form.car_tax === v ? '#1a73e8' : '#555', fontSize: '12px', cursor: 'pointer' }}>{v}</button>
                  ))}
                </div>
              </div>
              <div>
                <label style={lbl}>リサイクル預託金</label>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  {['預託済', '未預託'].map(v => (
                    <button key={v} onClick={() => setForm(f => ({ ...f, recycle_deposited: v === '預託済' }))}
                      style={{ padding: '6px 12px', borderRadius: '6px', border: `1px solid ${(form.recycle_deposited ? '預託済' : '未預託') === v ? '#1a73e8' : '#ddd'}`, background: (form.recycle_deposited ? '預託済' : '未預託') === v ? '#eff6ff' : 'white', color: (form.recycle_deposited ? '預託済' : '未預託') === v ? '#1a73e8' : '#555', fontSize: '12px', cursor: 'pointer' }}>{v}</button>
                  ))}
                  <input
                    type="number"
                    value={form.recycle_fee}
                    onChange={e => setForm(f => ({ ...f, recycle_fee: e.target.value }))}
                    placeholder="金額（円）"
                    style={{ width: '120px', padding: '6px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px' }}
                  />
                </div>
              </div>
              <div>
                <label style={lbl}>ローン残債</label>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <label style={{ fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <input type="checkbox" checked={form.loan_debt} onChange={e => setForm(f => ({ ...f, loan_debt: e.target.checked }))} />あり
                  </label>
                  {form.loan_debt && <input style={{ ...inp, flex: 1 }} value={form.loan_debt_amount} onChange={e => setForm(f => ({ ...f, loan_debt_amount: e.target.value }))} placeholder="概算金額" />}
                </div>
              </div>
            </div>
            <div style={{ marginTop: '12px' }}>
              <label style={lbl}>不具合箇所詳細</label>
              <textarea style={{ ...inp, resize: 'vertical' }} rows={2} value={form.defect_detail} onChange={e => setForm(f => ({ ...f, defect_detail: e.target.value }))} placeholder="不具合がある場合は記入" />
            </div>
          </div>

          {/* その他 */}
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '12px', borderBottom: '2px solid #1a73e8', paddingBottom: '6px' }}>その他</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer', marginBottom: '6px' }}>
                  <input type="checkbox" checked={form.introducer} onChange={e => setForm(f => ({ ...f, introducer: e.target.checked }))} />紹介者あり
                </label>
                {form.introducer && <input style={inp} value={form.introducer_name} onChange={e => setForm(f => ({ ...f, introducer_name: e.target.value }))} placeholder="紹介者名" />}
              </div>
              <div />
              <div>
                <label style={lbl}>売主と所有者の相違理由</label>
                <input style={inp} value={form.owner_discrepancy_reason} onChange={e => setForm(f => ({ ...f, owner_discrepancy_reason: e.target.value }))} />
              </div>
              <div>
                <label style={lbl}>売主と口座名義の相違理由</label>
                <input style={inp} value={form.account_discrepancy_reason} onChange={e => setForm(f => ({ ...f, account_discrepancy_reason: e.target.value }))} />
              </div>
            </div>
          </div>
        </div>

        {/* 契約金額・支払方法 */}
        <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #eee', padding: '24px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 600, margin: '0 0 16px', color: '#111' }}>契約金額・支払方法</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div>
              <label style={lbl}>契約金額（円）</label>
              <input type="number" value={form.contract_amount} onChange={e => setForm(f => ({ ...f, contract_amount: e.target.value }))} placeholder="0"
                style={{ ...inp, fontSize: '16px', fontWeight: 600 }} />
            </div>
            <div>
              <label style={lbl}>支払方法</label>
              <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                {['振込', 'その他'].map(m => (
                  <button key={m} onClick={() => setForm(f => ({ ...f, payment_method: m }))}
                    style={{ flex: 1, padding: '8px', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 500, cursor: 'pointer',
                      background: form.payment_method === m ? '#0070f3' : '#f1f3f4',
                      color:      form.payment_method === m ? 'white'   : '#555' }}>
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
                  <input value={form.bank_account_name} onChange={e => setForm(f => ({ ...f, bank_account_name: e.target.value }))} placeholder="ヤマダ タロウ" style={inp} />
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
          <button onClick={handleSave} disabled={saving}
            style={{ padding: '12px 24px', background: '#f1f3f4', color: '#555', border: 'none', borderRadius: '8px', fontSize: '14px', cursor: 'pointer', fontWeight: 500 }}>
            💾 下書き保存
          </button>
          <button onClick={() => setPreview(true)}
            style={{ padding: '12px 24px', background: '#0070f3', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', cursor: 'pointer', fontWeight: 500 }}>
            👁 プレビュー
          </button>
          <button onClick={handleConfirm} disabled={saving || isConfirmed}
            style={{ padding: '12px 24px', background: isConfirmed ? '#ccc' : '#00a86b', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px',
              cursor: isConfirmed ? 'not-allowed' : 'pointer', fontWeight: 700 }}>
            ✅ 契約成立・在庫登録
          </button>
        </div>
      </div>
    </div>
  )
}
