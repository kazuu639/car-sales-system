'use client'
import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { useProfile } from '@/hooks/useProfile'
import LoadingOverlay from '@/components/LoadingOverlay'

const CAT_COLOR: Record<string, { bg: string; color: string }> = {
  '売上':     { bg: '#e6f4ea', color: '#1e7e34' },
  '仕入':     { bg: '#fff5f5', color: '#e53e3e' },
  '経費':     { bg: '#fff3e0', color: '#e65100' },
  '車両経費': { bg: '#fff3e0', color: '#e65100' },
  '販売経費': { bg: '#fff3e0', color: '#e65100' },
  '税金':     { bg: '#f3e5f5', color: '#7b1fa2' },
  'その他':   { bg: '#f1f3f4', color: '#5f6368' },
}

type TxRecord = {
  id: string; vehicle_id: string | null; date: string | null
  type: 'in' | 'out'; category: string | null; subcategory: string | null
  amount: number; note: string | null; account_id: string | null
}

const STATUS_COLOR: Record<string, { bg: string; color: string }> = {
  '在庫中': { bg: '#e6f4ea', color: '#1e7e34' },
  '商談中': { bg: '#fff3e0', color: '#e65100' },
  '売約済': { bg: '#e8f0fe', color: '#1a73e8' },
  '納車済': { bg: '#f1f3f4', color: '#5f6368' },
}

const EQUIPMENT_SECTIONS = [
  {
    label: '安全装備',
    items: ['パワステ', 'ABS', 'サポカー', '衝突被害軽減ブレーキ', 'アダプティブクルーズコントロール', 'レーンキープアシスト', 'パーキングアシスト', 'アクセル踏み間違い防止', '障害物センサー', '全周囲カメラ', 'バックカメラ', 'ドライブレコーダー', '横滑り防止装置', 'ヒルディセントコントロール', 'アイドリングストップ', '盗難防止装置'],
  },
  {
    label: '快適装備',
    items: ['エアコン・クーラー', 'Wエアコン', 'カーナビ', 'フルセグTV', '後席モニター', 'ETC', 'ETC2.0', 'ミュージックプレイヤー接続可', 'エアサスペンション', '1500W給電', 'ディスプレイオーディオ'],
  },
  {
    label: 'インテリア',
    items: ['キーレス', 'スマートキー', 'パワーウインドウ', 'ベンチシート', '3列シート', 'ウォークスルー', '電動シート', 'シートエアコン', 'シートヒーター', 'フルフラットシート', 'オットマン', '本革シート'],
  },
  {
    label: 'エクステリア',
    items: ['アルミホイール', 'ローダウン', 'リフトアップ', 'サンルーフ・ガラスルーフ', 'ルーフレール', 'フルエアロ', 'フロントフォグランプ', 'スライドドア', '全塗装済'],
  },
]

const ASSESSMENT_DOC_ITEMS = [
  { key: 'shakken', label: '車検証',           col: 'assessment_shakken' },
  { key: 'touroku', label: '登録事項証明書',   col: 'assessment_touroku' },
  { key: 'caution', label: 'コーションプレート', col: 'assessment_caution' },
  { key: 'hyoka',   label: '査定表',           col: 'assessment_hyoka'   },
] as const
type AssessmentDocKey = typeof ASSESSMENT_DOC_ITEMS[number]['key']

const TRANSFER_DOC_ITEMS = [
  { key: 'shakken', label: '車検証',       col: 'transfer_shakken' },
  { key: 'touroku', label: '登録事項証明書', col: 'transfer_touroku' },
  { key: 'inin',    label: '委任状',        col: 'transfer_inin'    },
  { key: 'joto',    label: '譲渡書',        col: 'transfer_joto'    },
  { key: 'inkan',   label: '印鑑証明',      col: 'transfer_inkan'   },
] as const
type TransferDocKey = typeof TRANSFER_DOC_ITEMS[number]['key']

export default function VehicleDetailPage() {
  const { id } = useParams()
  const { profile, isAdmin } = useProfile()
  console.log('isAdmin:', isAdmin, 'profile.role:', profile?.role)
  const [v, setV] = useState<any>(null)
  const [transactions, setTransactions] = useState<TxRecord[]>([])
  const searchParams = useSearchParams()
  const initialTab = searchParams.get('tab') || '在庫'
  const [tab, setTab] = useState<'仕入' | '在庫' | '販売' | '契約' | '登録' | '財務'>(initialTab as '仕入' | '在庫' | '販売' | '契約' | '登録' | '財務')
  const [saving, setSaving] = useState(false)
  const [editingPurchase, setEditingPurchase] = useState(false)
  const [editingStockDate, setEditingStockDate] = useState(false)
  const [editingRegistration, setEditingRegistration] = useState(false)
  const [editingContract, setEditingContract] = useState(false)
  const [editForm, setEditForm] = useState<Record<string, any>>({})
  const [photoUrls, setPhotoUrls] = useState<string[]>([])
  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const [photoChanged, setPhotoChanged] = useState(false)
  const [editingPhoto, setEditingPhoto] = useState(false)
  const [photoUploading, setPhotoUploading] = useState(false)
  const [linkedNegotiationId, setLinkedNegotiationId] = useState<string | null>(null)
  const [assessmentCarImages, setAssessmentCarImages] = useState<string[]>([])
  const [assessmentDocs, setAssessmentDocs] = useState<Record<AssessmentDocKey, string | null>>({ shakken: null, touroku: null, caution: null, hyoka: null })
  const [assessmentScore, setAssessmentScore] = useState('')
  const [assessmentComment, setAssessmentComment] = useState('')
  const [transferDocs, setTransferDocs] = useState<Record<TransferDocKey, string | null>>({ shakken: null, touroku: null, inin: null, joto: null, inkan: null })
  const [transferDocUploading, setTransferDocUploading] = useState<Record<string, boolean>>({})
  const [transferDocImages, setTransferDocImages] = useState<(string | null)[]>([null, null, null, null, null])
  const [transferImgUploading, setTransferImgUploading] = useState(false)
  const [transferComment, setTransferComment] = useState('')
  const [loadingOverlay, setLoadingOverlay] = useState(false)
  const [loadingMessage, setLoadingMessage] = useState('処理中...')
  const [vehicleSpec, setVehicleSpec] = useState({
    reg_number: '',
    first_reg_year_month: '',
    reg_date: '',
    car_name: '',
    model_type: '',
    engine_type: '',
    displacement: '',
    fuel_type: '',
    body_shape: '',
    seating_capacity: '',
    vehicle_weight: '',
    vehicle_gross_weight: '',
    length: '',
    width: '',
    height: '',
    front_front_axle: '',
    front_rear_axle: '',
    rear_front_axle: '',
    rear_rear_axle: '',
    inspection_expiry: '',
    exterior_color: '',
    handle_side: '右',
    grade: '',
    recycle_fee: '',
    vehicle_use: '自家用',
    stock_notes: '',
  })
  const [editingSpec, setEditingSpec] = useState(false)
  const [specSaving, setSpecSaving] = useState(false)
  const [specOpen, setSpecOpen] = useState(false)
  const [sellingPrice, setSellingPrice] = useState('')
  const [expenseItems, setExpenseItems] = useState<{label: string, amount: number}[]>([])
  const [optionItems, setOptionItems] = useState<{label: string, amount: number}[]>([])
  const [editingEstimate, setEditingEstimate] = useState(false)
  const [estimateSaving, setEstimateSaving] = useState(false)
  const [equipment, setEquipment] = useState<string[]>([])
  const [tuningNotes, setTuningNotes] = useState('')
  const [equipmentOpen, setEquipmentOpen] = useState(false)
  const [editingEquipment, setEditingEquipment] = useState(false)
  const [purchaseSubTab, setPurchaseSubTab] = useState<'査定' | '契約' | '譲渡書類' | '支払'>('査定')
  const [salesEstimates, setSalesEstimates] = useState<any[]>([])
  const [showStatusModal, setShowStatusModal] = useState(false)
  const [showImageModal, setShowImageModal] = useState(false)
  const [imageModalUrl, setImageModalUrl] = useState('')

  // 契約サブタブ
  const [contractSubTab, setContractSubTab] = useState<'契約情報' | '納車管理'>(() => {
    if (typeof window !== 'undefined') {
      const st = new URLSearchParams(window.location.search).get('subtab')
      if (st === '契約情報' || st === '納車管理') return st
    }
    return '契約情報'
  })

  // 納車管理ステート
  const [delivery, setDelivery] = useState<any>(null)
  const [contractForDelivery, setContractForDelivery] = useState<any>(null)
  const [deliveryCustomerName, setDeliveryCustomerName] = useState<string | null>(null)
  const [deliveryLoading, setDeliveryLoading] = useState(false)
  const [actualDeliveryDate, setActualDeliveryDate] = useState('')
  const [purchaseContract, setPurchaseContract] = useState<any>(null)

  // ---- データ取得 ----
  const fetchVehicle = async () => {
    const { data } = await supabase.from('vehicles')
      .select('*, master_makers(name), master_models(name), master_colors(name)')
      .eq('id', id as string).single()
    setV(data)
  }

  const fetchTransactions = async () => {
    const { data } = await supabase.from('transactions').select('*')
      .eq('vehicle_id', id as string).order('date', { ascending: false })
    setTransactions((data || []) as TxRecord[])
  }

  const fetchDelivery = async () => {
    const vid = id as string

    // vehicle → negotiations
    const { data: negList } = await supabase
      .from('negotiations')
      .select('id, customers(*)')
      .eq('vehicle_id', vid)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(1)
    const neg = negList?.[0] ?? null

    if (!neg) { setContractForDelivery(null); setDelivery(null); return }
    setDeliveryCustomerName((neg.customers as any)?.氏名 ?? null)

    // negotiations → contracts
    const { data: contList } = await supabase
      .from('contracts')
      .select('id, contract_date, delivery_date, payment_type, loan_company, down_payment, status')
      .eq('negotiation_id', neg.id)
      .order('created_at', { ascending: false })
      .limit(1)
    const cont = contList?.[0] ?? null
    setContractForDelivery(cont)

    if (!cont) { setDelivery(null); return }

    // contracts → deliveries
    const { data: delList } = await supabase
      .from('deliveries')
      .select('*')
      .eq('contract_id', cont.id)
      .limit(1)
    const del = delList?.[0] ?? null
    setDelivery(del)
    if (del?.actual_delivery_date) setActualDeliveryDate(del.actual_delivery_date)
  }

  const fetchAssessmentFromNegotiation = async (vid: string) => {
    const { data } = await supabase
      .from('negotiations')
      .select('id, assessment_car_images, assessment_doc_shakken, assessment_doc_touroku, assessment_doc_caution, assessment_doc_hyoka, assessment_score, assessment_comment')
      .eq('vehicle_id', vid)
      .eq('category', 'purchase')
      .order('created_at', { ascending: false })
    if (data && data.length > 0) {
      const best = data.find((d: any) => d.assessment_car_images?.length > 0) || data[0]
      setLinkedNegotiationId(best.id)
      setAssessmentCarImages(best.assessment_car_images || [])
      setAssessmentDocs({
        shakken: best.assessment_doc_shakken || null,
        touroku: best.assessment_doc_touroku || null,
        caution: best.assessment_doc_caution || null,
        hyoka:   best.assessment_doc_hyoka   || null,
      })
      setAssessmentScore(best.assessment_score || '')
      setAssessmentComment(best.assessment_comment || '')
    }
  }

  const fetchPurchaseContract = async () => {
    const { data } = await supabase.from('purchase_contracts')
      .select('contract_date, contract_amount, seller_name, payment_method')
      .eq('vehicle_id', id as string).maybeSingle()
    setPurchaseContract(data ?? null)
  }

  const fetchSalesEstimates = async (vid: string) => {
    const { data } = await supabase
      .from('sales_estimates')
      .select('*')
      .eq('vehicle_id', vid)
      .order('created_at', { ascending: false })
    setSalesEstimates(data || [])
  }

  useEffect(() => { fetchVehicle(); fetchTransactions(); fetchDelivery(); fetchPurchaseContract(); fetchAssessmentFromNegotiation(id as string); fetchSalesEstimates(id as string) }, [id])

  useEffect(() => {
    if (v) {
      setPhotoUrls(v.image_urls ?? [])
      setPhotoChanged(false)
      setAssessmentCarImages(v.assessment_car_images ?? [])
      setAssessmentDocs({
        shakken: v.assessment_shakken ?? null,
        touroku: v.assessment_touroku ?? null,
        caution: v.assessment_caution ?? null,
        hyoka:   v.assessment_hyoka   ?? null,
      })
      setAssessmentScore(v.assessment_score ?? '')
      setAssessmentComment(v.assessment_comment ?? '')
      setTransferDocs({
        shakken: v.transfer_shakken ?? null,
        touroku: v.transfer_touroku ?? null,
        inin:    v.transfer_inin    ?? null,
        joto:    v.transfer_joto    ?? null,
        inkan:   v.transfer_inkan   ?? null,
      })
      const fixed5: (string | null)[] = [null, null, null, null, null]
      ;(v.transfer_doc_images ?? []).slice(0, 5).forEach((url: string | null, i: number) => { fixed5[i] = url })
      setTransferDocImages(fixed5)
      setTransferComment(v.transfer_comment ?? '')
      setVehicleSpec({
        reg_number: v.reg_number || '',
        first_reg_year_month: v.first_reg_year_month || '',
        reg_date: v.reg_date || '',
        car_name: v.car_name || '',
        model_type: v.model_type || '',
        engine_type: v.engine_type || '',
        displacement: v.displacement?.toString() || '',
        fuel_type: v.fuel_type || '',
        body_shape: v.body_shape || '',
        seating_capacity: v.seating_capacity?.toString() || '',
        vehicle_weight: v.vehicle_weight?.toString() || '',
        vehicle_gross_weight: v.vehicle_gross_weight?.toString() || '',
        length: v.length?.toString() || '',
        width: v.width?.toString() || '',
        height: v.height?.toString() || '',
        front_front_axle: v.front_front_axle?.toString() || '',
        front_rear_axle: v.front_rear_axle?.toString() || '',
        rear_front_axle: v.rear_front_axle?.toString() || '',
        rear_rear_axle: v.rear_rear_axle?.toString() || '',
        inspection_expiry: v.inspection_expiry || '',
        exterior_color: v.exterior_color || '',
        handle_side: v.handle_side || '右',
        grade: v.grade || '',
        recycle_fee: v.recycle_fee?.toString() || '',
        vehicle_use: v.vehicle_use || '自家用',
        stock_notes: v.stock_notes || '',
      })
      setEquipment(v.equipment || [])
      setTuningNotes(v.tuning_notes || '')
      setSellingPrice(v.selling_price?.toString() || '')
      setExpenseItems(v.expenses || [])
      setOptionItems(v.options || [])
    }
  }, [v?.id])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') { setShowStatusModal(false); setShowImageModal(false) } }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // ---- 車両操作 ----
  const handleSaveSpec = async () => {
    setSpecSaving(true)
    await supabase.from('vehicles').update({
      reg_number: vehicleSpec.reg_number || null,
      first_reg_year_month: vehicleSpec.first_reg_year_month || null,
      reg_date: vehicleSpec.reg_date || null,
      car_name: vehicleSpec.car_name || null,
      model_type: vehicleSpec.model_type || null,
      engine_type: vehicleSpec.engine_type || null,
      displacement: vehicleSpec.displacement ? parseInt(vehicleSpec.displacement) : null,
      fuel_type: vehicleSpec.fuel_type || null,
      body_shape: vehicleSpec.body_shape || null,
      seating_capacity: vehicleSpec.seating_capacity ? parseInt(vehicleSpec.seating_capacity) : null,
      vehicle_weight: vehicleSpec.vehicle_weight ? parseInt(vehicleSpec.vehicle_weight) : null,
      vehicle_gross_weight: vehicleSpec.vehicle_gross_weight ? parseInt(vehicleSpec.vehicle_gross_weight) : null,
      length: vehicleSpec.length ? parseInt(vehicleSpec.length) : null,
      width: vehicleSpec.width ? parseInt(vehicleSpec.width) : null,
      height: vehicleSpec.height ? parseInt(vehicleSpec.height) : null,
      front_front_axle: vehicleSpec.front_front_axle ? parseInt(vehicleSpec.front_front_axle) : null,
      front_rear_axle: vehicleSpec.front_rear_axle ? parseInt(vehicleSpec.front_rear_axle) : null,
      rear_front_axle: vehicleSpec.rear_front_axle ? parseInt(vehicleSpec.rear_front_axle) : null,
      rear_rear_axle: vehicleSpec.rear_rear_axle ? parseInt(vehicleSpec.rear_rear_axle) : null,
      inspection_expiry: vehicleSpec.inspection_expiry || null,
      exterior_color: vehicleSpec.exterior_color || null,
      handle_side: vehicleSpec.handle_side || null,
      grade: vehicleSpec.grade || null,
      recycle_fee: vehicleSpec.recycle_fee ? parseInt(vehicleSpec.recycle_fee) : null,
      vehicle_use: vehicleSpec.vehicle_use || null,
      stock_notes: vehicleSpec.stock_notes || null,
    }).eq('id', id as string)
    setSpecSaving(false)
    setEditingSpec(false)
  }
  const initExpensesFromMaster = async () => {
    const { data } = await supabase
      .from('expense_master')
      .select('label, amount')
      .order('sort_order')
    if (data) {
      setExpenseItems(data.map(d => ({ label: d.label, amount: d.amount || 0 })))
    }
  }

  const handleSaveEstimate = async () => {
    setEstimateSaving(true)
    const bodyPrice = parseInt(sellingPrice) || 0
    const expenseTotal = expenseItems.reduce((sum, e) => sum + (e.amount || 0), 0)
    const optionTotal = optionItems.reduce((sum, o) => sum + (o.amount || 0), 0)
    const totalPayment = bodyPrice + expenseTotal + optionTotal
    await supabase.from('vehicles').update({
      selling_price: bodyPrice || null,
      body_price: bodyPrice || null,
      misc_fee: expenseTotal || null,
      total_price: totalPayment || null,
      expenses: expenseItems,
      options: optionItems,
    }).eq('id', id as string)
    setEstimateSaving(false)
    setEditingEstimate(false)
    fetchVehicle()
  }

  const handleSaveEquipment = async () => {
    await supabase.from('vehicles').update({
      equipment,
      tuning_notes: tuningNotes || null,
    }).eq('id', id as string)
    setEditingEquipment(false)
  }
  const updateVehicle = async (fields: Record<string, any>) => {
    setSaving(true)
    await supabase.from('vehicles').update(fields).eq('id', id as string)
    await fetchVehicle()
    setSaving(false)
  }
  const toggleCheck = (key: string) => updateVehicle({ [key]: !v[key] })
  const savePhotoOrder = async () => { await updateVehicle({ image_urls: photoUrls }); setPhotoChanged(false) }

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    setLoadingMessage('写真をアップロード中...')
    setLoadingOverlay(true)
    setPhotoUploading(true)
    const newUrls: string[] = []
    for (const file of Array.from(files)) {
      const ext = file.name.split('.').pop()
      const path = `${id}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
      const { error } = await supabase.storage.from('vehicle-images').upload(path, file)
      if (!error) {
        const { data } = supabase.storage.from('vehicle-images').getPublicUrl(path)
        newUrls.push(data.publicUrl)
      }
    }
    setPhotoUrls(prev => [...prev, ...newUrls])
    setPhotoChanged(true)
    setPhotoUploading(false)
    setLoadingOverlay(false)
    e.target.value = ''
  }

  const handleTransferDocSingleUpload = async (e: React.ChangeEvent<HTMLInputElement>, key: TransferDocKey, col: string) => {
    const file = e.target.files?.[0]
    if (!file) return
    setTransferDocUploading(prev => ({ ...prev, [key]: true }))
    const ext = file.name.split('.').pop()
    const path = `${id}/transfer/${key}/${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('vehicle-images').upload(path, file)
    if (!error) {
      const { data } = supabase.storage.from('vehicle-images').getPublicUrl(path)
      setTransferDocs(prev => ({ ...prev, [key]: data.publicUrl }))
      await supabase.from('vehicles').update({ [col]: data.publicUrl }).eq('id', id as string)
    }
    setTransferDocUploading(prev => ({ ...prev, [key]: false }))
    e.target.value = ''
  }

  const deleteTransferDocSingle = async (key: TransferDocKey, col: string) => {
    setTransferDocs(prev => ({ ...prev, [key]: null }))
    await supabase.from('vehicles').update({ [col]: null }).eq('id', id as string)
  }

  const handleTransferDocImgUpload = async (e: React.ChangeEvent<HTMLInputElement>, slotIndex: number) => {
    const file = e.target.files?.[0]
    if (!file) return
    setLoadingMessage('写真をアップロード中...')
    setLoadingOverlay(true)
    setTransferImgUploading(true)
    const ext = file.name.split('.').pop()
    const path = `${id}/transfer/other/${Date.now()}_${slotIndex}.${ext}`
    const { error } = await supabase.storage.from('vehicle-images').upload(path, file)
    if (!error) {
      const { data } = supabase.storage.from('vehicle-images').getPublicUrl(path)
      const updated = [...transferDocImages]
      updated[slotIndex] = data.publicUrl
      setTransferDocImages(updated)
      await supabase.from('vehicles').update({ transfer_doc_images: updated }).eq('id', id as string)
    }
    setTransferImgUploading(false)
    setLoadingOverlay(false)
    e.target.value = ''
  }

  const deleteTransferDocImg = async (slotIndex: number) => {
    const updated = [...transferDocImages]
    updated[slotIndex] = null
    setTransferDocImages(updated)
    await supabase.from('vehicles').update({ transfer_doc_images: updated }).eq('id', id as string)
  }

  const handleDelete = async () => {
    if (!confirm('この車両を削除BOXに移動しますか？\n関連する商談・財務明細も移動されます。')) return
    await supabase.from('vehicles').update({ deleted_at: new Date().toISOString() }).eq('id', id as string)
    window.location.href = '/vehicles'
  }

  const totalIn     = transactions.filter(t => t.type === 'in').reduce((s, t) => s + t.amount, 0)
  const totalOut    = transactions.filter(t => t.type === 'out').reduce((s, t) => s + t.amount, 0)
  const grossProfit = totalIn - totalOut

  // ---- 納車管理操作 ----
  const updateDelivery = async (fields: Record<string, any>) => {
    if (!delivery) return
    setDeliveryLoading(true)
    await supabase.from('deliveries').update(fields).eq('id', delivery.id)
    await fetchDelivery()
    setDeliveryLoading(false)
  }
  const toggleDelivery = (key: string) => updateDelivery({ [key]: !delivery[key] })

  const completeDelivery = async () => {
    if (!actualDeliveryDate) { alert('納車日を入力してください'); return }
    if (!canDeliver) { alert('3つの条件が全て完了していません'); return }
    setDeliveryLoading(true)
    await supabase.from('deliveries').update({ actual_delivery_date: actualDeliveryDate, current_step: 8 }).eq('id', delivery.id)
    await supabase.from('contracts').update({ status: '完了' }).eq('id', delivery.contract_id)
    await supabase.from('vehicles').update({ status: '納車済' }).eq('id', id as string)
    await fetchVehicle()
    await fetchDelivery()
    setDeliveryLoading(false)
  }

  // 納車3軸判定
  const paymentOK  = !!delivery?.payment_confirmed
  const docsOK     = !!(delivery?.doc_commission && delivery?.doc_seal && delivery?.doc_parking && delivery?.registration_number)
  const tasksOK    = !!(delivery?.task_loan_apply && delivery?.task_inspection && delivery?.task_maintenance && delivery?.task_cleaning)
  const canDeliver = paymentOK && docsOK && tasksOK
  const isDeliveryCompleted = contractForDelivery?.status === '完了' || (delivery?.current_step ?? 0) >= 8
  const deliveryDays = contractForDelivery?.contract_date
    ? Math.floor((Date.now() - new Date(contractForDelivery.contract_date).getTime()) / 86400000)
    : null
  const deliveryPct = deliveryDays !== null ? Math.min(Math.round((deliveryDays / 14) * 100), 100) : 0

  if (!v) return <div style={{ padding: '2rem' }}>読み込み中...</div>

  const cell = (label: string, value: any) => (
    <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', borderBottom: '1px solid #f5f5f5', padding: '7px 0', fontSize: '13px' }}>
      <span style={{ color: '#888' }}>{label}</span>
      <span>{value ?? '—'}</span>
    </div>
  )

  const CheckBadge = ({ label, checked, onToggle }: { label: string; checked: boolean; onToggle: () => void }) => (
    <button onClick={onToggle} style={{
      padding: '4px 12px', borderRadius: '20px', border: 'none', fontSize: '11px', fontWeight: 600, cursor: 'pointer',
      background: checked ? '#e6f4ea' : '#f1f3f4', color: checked ? '#1e7e34' : '#888',
    }}>
      {checked ? '✓ ' : ''}{label}
    </button>
  )

  // 納車管理用ヘルパー
  const CheckItem = ({ label, checked, onToggle, children }: { label: string; checked: boolean; onToggle: () => void; children?: React.ReactNode }) => (
    <div style={{ padding: '10px 12px', borderRadius: '8px', background: checked ? '#e6f4ea' : '#f8f9fa', border: `1px solid ${checked ? '#a8d5b5' : '#eee'}`, marginBottom: '8px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <button onClick={onToggle} disabled={isDeliveryCompleted}
          style={{ width: '22px', height: '22px', borderRadius: '50%', border: `2px solid ${checked ? '#1e7e34' : '#ddd'}`, background: checked ? '#1e7e34' : 'white', cursor: isDeliveryCompleted ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '12px', color: 'white', fontWeight: 700 }}>
          {checked ? '✓' : ''}
        </button>
        <span style={{ fontSize: '13px', fontWeight: 500, color: checked ? '#1e7e34' : '#555', flex: 1 }}>{label}</span>
      </div>
      {children}
    </div>
  )

  const SectionHeader = ({ num, label, ok }: { num: string; label: string; ok: boolean }) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: ok ? '#1e7e34' : '#0070f3', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700 }}>
          {num}
        </div>
        <span style={{ fontSize: '15px', fontWeight: 600 }}>{label}</span>
      </div>
      <span style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '20px', fontWeight: 600, background: ok ? '#e6f4ea' : '#f1f3f4', color: ok ? '#1e7e34' : '#888' }}>
        {ok ? '✓ 完了' : '進行中'}
      </span>
    </div>
  )

  const TABS = ['仕入', '在庫', '販売', '契約', '登録', '財務'] as const

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto' }}>
      {loadingOverlay && <LoadingOverlay message={loadingMessage} />}

      {/* ===== 上部ヘッダー ===== */}
      <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #eee', padding: '16px 20px', marginBottom: '16px' }}>

        {/* 1行目: 写真 + 管理番号/バッジ + ボタン群 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
            <div style={{ width: '90px', height: '68px', borderRadius: '8px', overflow: 'hidden', flexShrink: 0, border: '1px solid #eee', background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '26px' }}>
              {v.image_urls?.length > 0
                ? <img src={v.image_urls[0]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : '🚗'}
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '15px', color: '#555', fontWeight: 700 }}>{v.db_number}</span>
              <span style={{ fontSize: '11px', padding: '2px 10px', borderRadius: '20px', fontWeight: 600, background: STATUS_COLOR[v.status]?.bg ?? '#f1f3f4', color: STATUS_COLOR[v.status]?.color ?? '#555' }}>{v.status}</span>
              <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', background: '#f1f3f4', color: '#555' }}>{v.purchase_type}</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <Link href="/vehicles" style={{ padding: '7px 14px', background: '#f1f3f4', color: '#555', borderRadius: '8px', textDecoration: 'none', fontSize: '13px' }}>← 一覧</Link>
            <button onClick={() => setShowStatusModal(true)} style={{ padding: '7px 14px', background: '#f1f3f4', color: '#555', borderRadius: '8px', border: 'none', fontSize: '13px', cursor: 'pointer', fontWeight: 500 }}>ステータス変更</button>
            <Link href={`/vehicles/${v.id}/estimate`} style={{ padding: '7px 14px', background: '#00a86b', color: 'white', borderRadius: '8px', textDecoration: 'none', fontSize: '13px', fontWeight: 500 }}>見積作成</Link>
            <Link href={`/negotiations/new?vehicle=${v.id}`} style={{ padding: '7px 14px', background: '#0070f3', color: 'white', borderRadius: '8px', textDecoration: 'none', fontSize: '13px', fontWeight: 500 }}>販売商談作成</Link>
          </div>
        </div>

        {/* 2行目: 4カラム情報グリッド */}
        {(() => {
          const hcell = (label: string, value: React.ReactNode) => (
            <div style={{ display: 'flex', gap: '6px', fontSize: '12px', marginBottom: '5px', alignItems: 'baseline' }}>
              <span style={{ color: '#aaa', flexShrink: 0, minWidth: '72px' }}>{label}</span>
              <span style={{ color: value ? '#222' : '#ccc', fontWeight: value ? 500 : 400 }}>{value || '―'}</span>
            </div>
          )
          const hsec = (title: string) => (
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#bbb', letterSpacing: '0.08em', marginBottom: '8px', textTransform: 'uppercase' }}>{title}</div>
          )
          return (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0 20px', padding: '14px 0', borderTop: '1px solid #f0f0f0', borderBottom: '1px solid #f0f0f0' }}>
              {/* 車輌 */}
              <div>
                {hsec('車輌')}
                {hcell('車種', [v.master_makers?.name, v.master_models?.name].filter(Boolean).join(' ') || null)}
                {hcell('年式', v.year ? `${v.year}年` : null)}
                {hcell('走行距離', v.mileage ? `${v.mileage.toLocaleString()} km` : null)}
                {hcell('車台番号', v.chassis_number)}
                {hcell('修復歴', <span style={{ color: v.repair_history ? '#e53e3e' : undefined }}>{v.repair_history ? 'あり' : 'なし'}</span>)}
              </div>
              {/* 各契約日 */}
              <div>
                {hsec('各契約日')}
                {hcell('仕）契約日', v.purchase_contract_date)}
                {hcell('入庫日', v.stock_date)}
                {hcell('販）契約日', null)}
                {hcell('売上日', null)}
              </div>
              {/* 財務情報 */}
              <div>
                {hsec('財務情報')}
                {hcell('仕入金額', v.purchase_price ? `¥${v.purchase_price.toLocaleString()}` : null)}
                {hcell('売上', null)}
              </div>
              {/* 担当 */}
              <div>
                {hsec('担当')}
                {hcell('仕入担当', v.purchase_staff)}
                {hcell('売上担当', null)}
              </div>
            </div>
          )
        })()}

        {/* 3行目: チェックバッジ */}
        <div style={{ marginTop: '12px' }}>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', color: '#888', fontWeight: 600 }}>仕入</span>
            <CheckBadge label="入庫済" checked={v.entry_check} onToggle={() => toggleCheck('entry_check')} />
            <CheckBadge label="洗車済" checked={v.car_wash_check} onToggle={() => toggleCheck('car_wash_check')} />
            <CheckBadge label="撮影済" checked={v.photo_shoot_check} onToggle={() => toggleCheck('photo_shoot_check')} />
            <span style={{ fontSize: '11px', color: '#888', fontWeight: 600, marginLeft: '8px' }}>WEB掲載</span>
            <CheckBadge label="カーセンサー" checked={v.web_carsensor} onToggle={() => toggleCheck('web_carsensor')} />
            <CheckBadge label="グーネット" checked={v.web_goo} onToggle={() => toggleCheck('web_goo')} />
            <CheckBadge label="HP" checked={v.web_hp} onToggle={() => toggleCheck('web_hp')} />
            <CheckBadge label="X" checked={v.web_x} onToggle={() => toggleCheck('web_x')} />
            <CheckBadge label="LINE" checked={v.web_line} onToggle={() => toggleCheck('web_line')} />
          </div>
        </div>
      </div>

      {/* 車検証情報カード */}
      <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #eee', overflow: 'hidden', marginBottom: '16px' }}>
        {/* ヘッダー */}
        <div
          style={{ padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', background: '#EFF6FF', borderBottom: (specOpen || editingSpec) ? '1px solid #BFDBFE' : 'none', borderRadius: '12px 12px 0 0' }}
          onClick={() => { if (!editingSpec) setSpecOpen(o => !o) }}>
          <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#1E3A5F', display: 'flex', alignItems: 'center', gap: '8px' }}>
            📋 車検証情報
            <span style={{ fontSize: '11px', color: '#9ca3af', fontWeight: 400 }}>{specOpen ? '▲ 閉じる' : '▼ 開く'}</span>
          </h3>
          <div style={{ display: 'flex', gap: '8px' }} onClick={e => e.stopPropagation()}>
            {specOpen && !editingSpec && (
              <button onClick={() => setEditingSpec(true)}
                style={{ padding: '6px 14px', background: 'white', border: '1px solid #ddd', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}>
                編集
              </button>
            )}
            {editingSpec && (
              <>
                <button onClick={() => { setEditingSpec(false) }}
                  style={{ padding: '6px 14px', background: 'white', border: '1px solid #ddd', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}>
                  キャンセル
                </button>
                <button onClick={handleSaveSpec} disabled={specSaving}
                  style={{ padding: '6px 14px', background: '#1a73e8', color: 'white', border: 'none', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}>
                  {specSaving ? '保存中...' : '保存'}
                </button>
              </>
            )}
          </div>
        </div>

        {/* 表示モード */}
        {specOpen && !editingSpec && (
          <div style={{ padding: '16px 20px' }}>
            {/* 登録情報 */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '12px' }}>
              {[
                { label: '登録番号', value: vehicleSpec.reg_number },
                { label: '初度登録', value: vehicleSpec.first_reg_year_month },
                { label: '登録年月日', value: vehicleSpec.reg_date },
                { label: '有効期限', value: vehicleSpec.inspection_expiry },
              ].map(({ label, value }) => (
                <div key={label}>
                  <div style={{ fontSize: '11px', color: '#888', marginBottom: '2px' }}>{label}</div>
                  <div style={{ fontSize: '13px', color: value ? '#111' : '#ccc' }}>{value || '—'}</div>
                </div>
              ))}
            </div>
            {/* 車両基本情報 */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '12px' }}>
              {[
                { label: '車名', value: vehicleSpec.car_name },
                { label: 'グレード', value: vehicleSpec.grade },
                { label: '型式', value: vehicleSpec.model_type },
                { label: '原動機型式', value: vehicleSpec.engine_type },
                { label: '排気量', value: vehicleSpec.displacement ? `${vehicleSpec.displacement}cc` : '' },
                { label: '燃料', value: vehicleSpec.fuel_type },
                { label: '車体形状', value: vehicleSpec.body_shape },
                { label: '用途', value: vehicleSpec.vehicle_use },
                { label: '外装色', value: vehicleSpec.exterior_color },
                { label: 'ハンドル', value: vehicleSpec.handle_side ? `${vehicleSpec.handle_side}ハンドル` : '' },
                { label: '乗車定員', value: vehicleSpec.seating_capacity ? `${vehicleSpec.seating_capacity}人` : '' },
                { label: 'リサイクル料', value: vehicleSpec.recycle_fee ? `¥${Number(vehicleSpec.recycle_fee).toLocaleString()}` : '' },
              ].map(({ label, value }) => (
                <div key={label}>
                  <div style={{ fontSize: '11px', color: '#888', marginBottom: '2px' }}>{label}</div>
                  <div style={{ fontSize: '13px', color: value ? '#111' : '#ccc' }}>{value || '—'}</div>
                </div>
              ))}
            </div>
            {/* 寸法・重量 */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '12px' }}>
              {[
                { label: '長さ', value: vehicleSpec.length ? `${vehicleSpec.length}cm` : '' },
                { label: '幅', value: vehicleSpec.width ? `${vehicleSpec.width}cm` : '' },
                { label: '高さ', value: vehicleSpec.height ? `${vehicleSpec.height}cm` : '' },
                { label: '車両重量', value: vehicleSpec.vehicle_weight ? `${vehicleSpec.vehicle_weight}kg` : '' },
                { label: '車両総重量', value: vehicleSpec.vehicle_gross_weight ? `${vehicleSpec.vehicle_gross_weight}kg` : '' },
                { label: '前前軸重', value: vehicleSpec.front_front_axle ? `${vehicleSpec.front_front_axle}kg` : '' },
                { label: '前後軸重', value: vehicleSpec.front_rear_axle ? `${vehicleSpec.front_rear_axle}kg` : '' },
                { label: '後前軸重', value: vehicleSpec.rear_front_axle ? `${vehicleSpec.rear_front_axle}kg` : '' },
              ].map(({ label, value }) => (
                <div key={label}>
                  <div style={{ fontSize: '11px', color: '#888', marginBottom: '2px' }}>{label}</div>
                  <div style={{ fontSize: '13px', color: value ? '#111' : '#ccc' }}>{value || '—'}</div>
                </div>
              ))}
            </div>
            {vehicleSpec.stock_notes && (
              <div>
                <div style={{ fontSize: '11px', color: '#888', marginBottom: '2px' }}>備考</div>
                <div style={{ fontSize: '13px', color: '#111' }}>{vehicleSpec.stock_notes}</div>
              </div>
            )}
          </div>
        )}

        {/* 編集モード */}
        {(specOpen || editingSpec) && editingSpec && (
          <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* 登録情報 */}
            <div>
              <h4 style={{ margin: '0 0 10px', fontSize: '13px', color: '#666', fontWeight: 600 }}>登録情報</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                {[
                  { key: 'reg_number', label: '登録番号', placeholder: '例：相模330あ1358' },
                  { key: 'first_reg_year_month', label: '初度登録', placeholder: '例：H7.6' },
                  { key: 'reg_date', label: '登録年月日', placeholder: '例：H30.3.17' },
                  { key: 'inspection_expiry', label: '有効期限', placeholder: '例：R8.11.10' },
                ].map(({ key, label, placeholder }) => (
                  <div key={key}>
                    <label style={{ display: 'block', fontSize: '12px', color: '#666', marginBottom: '4px' }}>{label}</label>
                    <input value={vehicleSpec[key as keyof typeof vehicleSpec] as string}
                      onChange={e => setVehicleSpec(s => ({ ...s, [key]: e.target.value }))}
                      placeholder={placeholder}
                      style={{ width: '100%', padding: '7px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box' }} />
                  </div>
                ))}
              </div>
            </div>

            {/* 基本情報 */}
            <div>
              <h4 style={{ margin: '0 0 10px', fontSize: '13px', color: '#666', fontWeight: 600 }}>基本情報</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                {[
                  { key: 'car_name', label: '車名', placeholder: '例：スプリンタートレノ' },
                  { key: 'grade', label: 'グレード', placeholder: '例：1.6 BZ-G' },
                  { key: 'model_type', label: '型式', placeholder: '例：E-AE111' },
                  { key: 'engine_type', label: '原動機型式', placeholder: '例：4A-GE' },
                  { key: 'displacement', label: '排気量(cc)', placeholder: '例：1600' },
                  { key: 'exterior_color', label: '外装色', placeholder: '例：ホワイト' },
                  { key: 'seating_capacity', label: '乗車定員', placeholder: '例：5' },
                  { key: 'recycle_fee', label: 'リサイクル料金', placeholder: '例：12000' },
                ].map(({ key, label, placeholder }) => (
                  <div key={key}>
                    <label style={{ display: 'block', fontSize: '12px', color: '#666', marginBottom: '4px' }}>{label}</label>
                    <input value={vehicleSpec[key as keyof typeof vehicleSpec] as string}
                      onChange={e => setVehicleSpec(s => ({ ...s, [key]: e.target.value }))}
                      placeholder={placeholder}
                      style={{ width: '100%', padding: '7px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box' }} />
                  </div>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginTop: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#666', marginBottom: '4px' }}>燃料</label>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {['G', 'D', 'HV', 'EV'].map(fv => (
                      <button key={fv} onClick={() => setVehicleSpec(s => ({ ...s, fuel_type: fv }))}
                        style={{ flex: 1, padding: '7px 4px', borderRadius: '6px', border: `1px solid ${vehicleSpec.fuel_type === fv ? '#1a73e8' : '#e5e7eb'}`, background: vehicleSpec.fuel_type === fv ? '#eff6ff' : 'white', color: vehicleSpec.fuel_type === fv ? '#1a73e8' : '#555', fontSize: '12px', cursor: 'pointer' }}>{fv}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#666', marginBottom: '4px' }}>ハンドル</label>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {['右', '左'].map(hv => (
                      <button key={hv} onClick={() => setVehicleSpec(s => ({ ...s, handle_side: hv }))}
                        style={{ flex: 1, padding: '7px 4px', borderRadius: '6px', border: `1px solid ${vehicleSpec.handle_side === hv ? '#1a73e8' : '#e5e7eb'}`, background: vehicleSpec.handle_side === hv ? '#eff6ff' : 'white', color: vehicleSpec.handle_side === hv ? '#1a73e8' : '#555', fontSize: '12px', cursor: 'pointer' }}>{hv}ハンドル</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#666', marginBottom: '4px' }}>用途</label>
                  <select value={vehicleSpec.vehicle_use} onChange={e => setVehicleSpec(s => ({ ...s, vehicle_use: e.target.value }))}
                    style={{ width: '100%', padding: '7px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px' }}>
                    {['自家用', '事業用', 'レンタカー', 'その他'].map(uv => <option key={uv}>{uv}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#666', marginBottom: '4px' }}>車体形状</label>
                  <input value={vehicleSpec.body_shape} onChange={e => setVehicleSpec(s => ({ ...s, body_shape: e.target.value }))}
                    placeholder="例：クーペ"
                    style={{ width: '100%', padding: '7px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box' }} />
                </div>
              </div>
            </div>

            {/* 寸法・重量 */}
            <div>
              <h4 style={{ margin: '0 0 10px', fontSize: '13px', color: '#666', fontWeight: 600 }}>寸法・重量</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                {[
                  { key: 'length', label: '長さ(cm)', placeholder: '例：435' },
                  { key: 'width', label: '幅(cm)', placeholder: '例：169' },
                  { key: 'height', label: '高さ(cm)', placeholder: '例：130' },
                  { key: 'vehicle_weight', label: '車両重量(kg)', placeholder: '例：1050' },
                  { key: 'vehicle_gross_weight', label: '車両総重量(kg)', placeholder: '例：1375' },
                  { key: 'front_front_axle', label: '前前軸重(kg)', placeholder: '例：590' },
                  { key: 'front_rear_axle', label: '前後軸重(kg)', placeholder: '例：590' },
                  { key: 'rear_front_axle', label: '後前軸重(kg)', placeholder: '例：460' },
                ].map(({ key, label, placeholder }) => (
                  <div key={key}>
                    <label style={{ display: 'block', fontSize: '12px', color: '#666', marginBottom: '4px' }}>{label}</label>
                    <input value={vehicleSpec[key as keyof typeof vehicleSpec] as string}
                      onChange={e => setVehicleSpec(s => ({ ...s, [key]: e.target.value }))}
                      placeholder={placeholder}
                      style={{ width: '100%', padding: '7px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box' }} />
                  </div>
                ))}
              </div>
            </div>

            {/* 備考 */}
            <div>
              <h4 style={{ margin: '0 0 10px', fontSize: '13px', color: '#666', fontWeight: 600 }}>備考・オプション</h4>
              <textarea value={vehicleSpec.stock_notes} onChange={e => setVehicleSpec(s => ({ ...s, stock_notes: e.target.value }))}
                placeholder="オプション装備・特記事項など"
                rows={3}
                style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', resize: 'vertical', boxSizing: 'border-box' }} />
            </div>
          </div>
        )}
      </div>

      {/* メインタブ */}
      <div style={{ display: 'flex', gap: '2px', marginBottom: '16px', background: '#f1f3f4', borderRadius: '10px', padding: '4px', width: 'fit-content' }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '7px 20px', border: 'none', fontSize: '13px', cursor: 'pointer',
            background: tab === t ? '#E6F1FB' : 'transparent',
            color: tab === t ? '#0C447C' : '#888',
            borderBottom: tab === t ? '2px solid #185FA5' : '2px solid transparent',
            borderRadius: tab === t ? '8px 8px 0 0' : '0',
            fontWeight: tab === t ? 600 : 400,
          }}>{t}</button>
        ))}
      </div>

      {/* ===== 仕入タブ ===== */}
      {tab === '仕入' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '16px' }}>
          <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #eee', overflow: 'hidden' }}>
            <div style={{ background: '#F0FDF4', borderBottom: '1px solid #BBF7D0', padding: '12px 20px', borderRadius: '12px 12px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#14532D', margin: 0 }}>仕入情報</h3>
              {isAdmin && !editingPurchase && (
                <button onClick={() => { setEditingPurchase(true); setEditForm({ purchase_type: v.purchase_type ?? '', purchase_price: v.purchase_price ?? '', purchase_staff: v.purchase_staff ?? '' }) }}
                  style={{ padding: '5px 14px', background: '#f1f3f4', border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', color: '#555', fontWeight: 500 }}>
                  仕入情報を編集
                </button>
              )}
            </div>
            <div style={{ padding: '20px' }}>

            {!editingPurchase ? (
              <>
                {cell('仕入区分', v.purchase_type)}
                {cell('仕入契約日', v.purchase_contract_date)}

                {/* 入庫日: 管理者・非管理者ともに専用の編集ボタンでインライン編集 */}
                <div style={{ borderBottom: '1px solid #f5f5f5', padding: '7px 0', fontSize: '13px' }}>
                  {editingStockDate ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <span style={{ color: '#888', fontSize: '12px' }}>入庫日</span>
                      <input
                        type="date"
                        value={editForm.stock_date ?? ''}
                        autoFocus
                        onChange={e => setEditForm((f: any) => ({ ...f, stock_date: e.target.value }))}
                        style={{ padding: '6px 10px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '13px', width: '100%', boxSizing: 'border-box' as const }}
                      />
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button onClick={async () => {
                          await updateVehicle({ stock_date: editForm.stock_date || null })
                          setEditingStockDate(false)
                        }} disabled={saving}
                          style={{ flex: 1, padding: '6px', background: '#0070f3', color: 'white', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
                          {saving ? '保存中...' : '保存'}
                        </button>
                        <button onClick={() => setEditingStockDate(false)}
                          style={{ flex: 1, padding: '6px', background: '#f1f3f4', color: '#555', border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>
                          キャンセル
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', alignItems: 'center' }}>
                      <span style={{ color: '#888' }}>入庫日</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>{v.stock_date ?? '—'}</span>
                        <button onClick={() => { setEditingStockDate(true); setEditForm((f: any) => ({ ...f, stock_date: v.stock_date ?? '' })) }}
                          style={{ padding: '2px 8px', background: '#f1f3f4', border: 'none', borderRadius: '4px', fontSize: '11px', cursor: 'pointer', color: '#555' }}>
                          編集
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {cell('仕入担当', v.purchase_staff || null)}
                {cell('仕入金額', v.purchase_price ? '¥' + v.purchase_price.toLocaleString() : null)}
              </>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: '#888', display: 'block', marginBottom: '4px' }}>仕入区分</label>
                  <select value={editForm.purchase_type} onChange={e => setEditForm((f: any) => ({ ...f, purchase_type: e.target.value }))}
                    style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '13px' }}>
                    {['買取', 'AA', '業者AA', '業販', '下取'].map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: '#888', display: 'block', marginBottom: '4px' }}>仕入金額（円）</label>
                  <input type="number" value={editForm.purchase_price} onChange={e => setEditForm((f: any) => ({ ...f, purchase_price: e.target.value }))}
                    style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: '#888', display: 'block', marginBottom: '4px' }}>仕入担当</label>
                  <input type="text" value={editForm.purchase_staff} onChange={e => setEditForm((f: any) => ({ ...f, purchase_staff: e.target.value }))}
                    style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box' }} />
                </div>
                <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                  <button onClick={async () => {
                    await updateVehicle({
                      purchase_type:  editForm.purchase_type  || null,
                      purchase_price: editForm.purchase_price ? parseInt(editForm.purchase_price) : null,
                      purchase_staff: editForm.purchase_staff || null,
                    })
                    setEditingPurchase(false)
                  }}
                    disabled={saving}
                    style={{ flex: 1, padding: '9px', background: '#0070f3', color: 'white', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
                    {saving ? '保存中...' : '保存'}
                  </button>
                  <button onClick={() => setEditingPurchase(false)}
                    style={{ flex: 1, padding: '9px', background: '#f1f3f4', color: '#555', border: 'none', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}>
                    キャンセル
                  </button>
                </div>
              </div>
            )}
            </div>{/* padding wrapper */}
          </div>
          {/* 右エリア: サブタブ */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* サブタブナビ */}
            <div style={{ display: 'flex', gap: '2px', background: '#f1f3f4', borderRadius: '10px', padding: '4px', width: 'fit-content' }}>
              {(['査定', '契約', '譲渡書類', '支払'] as const).map(t => (
                <button key={t} onClick={() => setPurchaseSubTab(t)} style={{
                  padding: '6px 14px', border: 'none', borderRadius: '7px', fontSize: '12px', fontWeight: 500, cursor: 'pointer',
                  background: purchaseSubTab === t ? 'white' : 'transparent',
                  color: purchaseSubTab === t ? '#111' : '#888',
                  boxShadow: purchaseSubTab === t ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
                }}>{t}</button>
              ))}
            </div>

            {/* ===== 査定サブタブ ===== */}
            {purchaseSubTab === '査定' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                {linkedNegotiationId && (
                  <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '13px', color: '#1d4ed8' }}>📋 査定商談のデータを参照しています</span>
                    <a href={`/negotiations/${linkedNegotiationId}`} style={{ fontSize: '13px', color: '#1d4ed8', textDecoration: 'underline' }}>商談ページで編集 →</a>
                  </div>
                )}

                <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
                  <div style={{ background: '#FFF7ED', borderBottom: '1px solid #FED7AA', padding: '12px 20px', borderRadius: '12px 12px 0 0' }}>
                    <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#7C2D12' }}>査定写真</h3>
                  </div>
                  <div style={{ padding: '20px' }}>
                  {assessmentCarImages.length === 0 ? (
                    <div style={{ background: '#f9fafb', borderRadius: '8px', padding: '32px', textAlign: 'center', color: '#9ca3af', fontSize: '14px' }}>写真なし</div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '8px' }}>
                      {assessmentCarImages.map((url, i) => (
                        <div key={i} style={{ aspectRatio: '4/3', borderRadius: '8px', overflow: 'hidden', background: '#f3f4f6' }}>
                          <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                      ))}
                    </div>
                  )}
                  </div>{/* padding wrapper */}
                </div>

                <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
                  <div style={{ background: '#FFF7ED', borderBottom: '1px solid #FED7AA', padding: '12px 20px', borderRadius: '12px 12px 0 0' }}>
                    <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#7C2D12' }}>書類写真</h3>
                  </div>
                  <div style={{ padding: '20px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {[
                      { key: 'shakken', label: '車検証' },
                      { key: 'touroku', label: '登録事項証明書' },
                      { key: 'caution', label: 'コーションプレート' },
                      { key: 'hyoka',   label: '査定表' },
                    ].map(({ key, label }) => (
                      <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ width: '140px', fontSize: '14px', color: '#374151' }}>{label}</span>
                        {assessmentDocs[key as keyof typeof assessmentDocs] ? (
                          <a href={assessmentDocs[key as keyof typeof assessmentDocs]!} target="_blank" rel="noopener noreferrer">
                            <img src={assessmentDocs[key as keyof typeof assessmentDocs]!} alt={label} style={{ width: '60px', height: '45px', objectFit: 'cover', borderRadius: '4px', border: '1px solid #e5e7eb' }} />
                          </a>
                        ) : (
                          <span style={{ fontSize: '13px', color: '#9ca3af' }}>—</span>
                        )}
                      </div>
                    ))}
                  </div>
                  </div>{/* padding wrapper */}
                </div>

                <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
                  <div style={{ background: '#FFF7ED', borderBottom: '1px solid #FED7AA', padding: '12px 20px', borderRadius: '12px 12px 0 0' }}>
                    <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#7C2D12' }}>評価点・コメント</h3>
                  </div>
                  <div style={{ padding: '20px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <span style={{ width: '120px', fontSize: '14px', color: '#6b7280' }}>評価点</span>
                      <span style={{ fontSize: '14px', color: '#111' }}>{assessmentScore || '—'}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                      <span style={{ width: '120px', fontSize: '14px', color: '#6b7280', paddingTop: '2px' }}>査定コメント</span>
                      <span style={{ fontSize: '14px', color: '#111', whiteSpace: 'pre-wrap' }}>{assessmentComment || '—'}</span>
                    </div>
                  </div>
                  </div>{/* padding wrapper */}
                </div>

              </div>
            )}

            {/* ===== 契約サブタブ ===== */}
            {purchaseSubTab === '契約' && (
              purchaseContract ? (
                <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #eee', padding: '20px' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: 600, margin: '0 0 14px' }}>買取契約書</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px', fontSize: '13px', marginBottom: '16px' }}>
                    <div><span style={{ color: '#aaa', fontSize: '11px' }}>契約日</span><div style={{ fontWeight: 500, marginTop: '2px' }}>{purchaseContract.contract_date ?? '—'}</div></div>
                    <div><span style={{ color: '#aaa', fontSize: '11px' }}>契約金額</span><div style={{ fontWeight: 500, marginTop: '2px' }}>{purchaseContract.contract_amount ? `¥${Number(purchaseContract.contract_amount).toLocaleString()}` : '—'}</div></div>
                    <div><span style={{ color: '#aaa', fontSize: '11px' }}>売主名</span><div style={{ fontWeight: 500, marginTop: '2px' }}>{purchaseContract.seller_name || '—'}</div></div>
                    <div><span style={{ color: '#aaa', fontSize: '11px' }}>支払方法</span><div style={{ fontWeight: 500, marginTop: '2px' }}>{purchaseContract.payment_method || '—'}</div></div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <Link href={`/vehicles/${v.id}/purchase-contract`} style={{ padding: '8px 18px', background: '#e65100', color: 'white', borderRadius: '8px', textDecoration: 'none', fontSize: '13px', fontWeight: 500 }}>
                      📋 契約書を確認・編集
                    </Link>
                  </div>
                </div>
              ) : (
                <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #eee', padding: '32px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                  <p style={{ margin: 0, color: '#aaa', fontSize: '13px' }}>買取契約書がまだ作成されていません</p>
                  <Link href={`/vehicles/${v.id}/purchase-contract`} style={{ padding: '10px 20px', background: '#e65100', color: 'white', borderRadius: '8px', textDecoration: 'none', fontSize: '13px', fontWeight: 500 }}>
                    📋 買取契約書を作成
                  </Link>
                </div>
              )
            )}

            {/* ===== 譲渡書類サブタブ ===== */}
            {purchaseSubTab === '譲渡書類' && (
              <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #eee', overflow: 'hidden' }}>
                <div style={{ background: '#F5F3FF', borderBottom: '1px solid #DDD6FE', padding: '12px 20px', borderRadius: '12px 12px 0 0' }}>
                  <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#4C1D95' }}>譲渡書類</h3>
                </div>
                <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* 1枚ずつの書類写真 */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {TRANSFER_DOC_ITEMS.map(({ key, label, col }) => {
                    const url = transferDocs[key]
                    const uploading = transferDocUploading[key]
                    return (
                      <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '12px', color: '#666', width: '100px', flexShrink: 0 }}>{label}</span>
                        {url ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <img src={url} alt={label} onClick={() => { setImageModalUrl(url); setShowImageModal(true) }}
                              style={{ width: '60px', height: '45px', objectFit: 'cover', borderRadius: '4px', border: '1px solid #eee', cursor: 'zoom-in' }} />
                            <label style={{ padding: '3px 8px', background: '#f1f3f4', color: '#555', borderRadius: '4px', fontSize: '11px', cursor: uploading ? 'wait' : 'pointer', userSelect: 'none' }}>
                              変更
                              <input type="file" accept="image/*" onChange={e => handleTransferDocSingleUpload(e, key, col)} style={{ display: 'none' }} disabled={uploading} />
                            </label>
                            <button onClick={() => deleteTransferDocSingle(key, col)}
                              style={{ padding: '3px 8px', background: '#fff5f5', color: '#e53e3e', border: '1px solid #fce8e6', borderRadius: '4px', fontSize: '11px', cursor: 'pointer' }}>
                              削除
                            </button>
                          </div>
                        ) : (
                          <label style={{ padding: '4px 12px', background: uploading ? '#f8f9fa' : '#f0f7ff', color: uploading ? '#aaa' : '#1a73e8', border: '1px solid', borderColor: uploading ? '#eee' : '#c8e0fa', borderRadius: '6px', fontSize: '11px', cursor: uploading ? 'wait' : 'pointer', userSelect: 'none' }}>
                            {uploading ? 'アップロード中...' : 'アップロード'}
                            <input type="file" accept="image/*" onChange={e => handleTransferDocSingleUpload(e, key, col)} style={{ display: 'none' }} disabled={uploading} />
                          </label>
                        )}
                      </div>
                    )
                  })}
                </div>
                <div style={{ borderTop: '1px solid #f0f0f0' }} />
                {/* その他（5枠固定） */}
                <div>
                  <h4 style={{ fontSize: '13px', fontWeight: 600, margin: '0 0 10px' }}>その他</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px' }}>
                    {transferDocImages.map((url, i) => (
                      <div key={i} style={{ position: 'relative' }}>
                        {url ? (
                          <>
                            <img src={url} alt="" onClick={() => { setImageModalUrl(url); setShowImageModal(true) }}
                              style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover', borderRadius: '6px', border: '1px solid #eee', cursor: 'zoom-in', display: 'block' }} />
                            <button onClick={() => deleteTransferDocImg(i)}
                              style={{ position: 'absolute', top: '3px', right: '3px', width: '18px', height: '18px', background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '50%', color: 'white', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1, padding: 0 }}>
                              ×
                            </button>
                          </>
                        ) : (
                          <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', aspectRatio: '4/3', background: '#f8f9fa', borderRadius: '6px', border: '1.5px dashed #ddd', cursor: transferImgUploading ? 'wait' : 'pointer' }}>
                            <span style={{ fontSize: '18px', color: '#ccc' }}>+</span>
                            <input type="file" accept="image/*" onChange={e => handleTransferDocImgUpload(e, i)} style={{ display: 'none' }} disabled={transferImgUploading} />
                          </label>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ borderTop: '1px solid #f0f0f0' }} />
                {/* コメント */}
                <div>
                  <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '4px' }}>コメント</label>
                  <textarea value={transferComment} rows={3}
                    onChange={e => setTransferComment(e.target.value)}
                    onBlur={async e => { await supabase.from('vehicles').update({ transfer_comment: e.target.value || null }).eq('id', id as string) }}
                    style={{ width: '100%', padding: '8px 10px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '13px', resize: 'vertical', boxSizing: 'border-box' }} />
                </div>
                </div>{/* padding wrapper */}
              </div>
            )}

            {/* ===== 支払サブタブ ===== */}
            {purchaseSubTab === '支払' && (
              <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #eee', padding: '48px 20px', textAlign: 'center', color: '#bbb', fontSize: '13px' }}>
                準備中
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== 在庫タブ ===== */}
      {tab === '在庫' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #eee', overflow: 'hidden' }}>
            {/* ヘッダー */}
            <div style={{ padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #B5D4F4', background: '#E6F1FB', borderRadius: '12px 12px 0 0' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: '#0C447C' }}>💴 販売価格（WEB標準見積）</h3>
              <div style={{ display: 'flex', gap: '8px' }}>
                {!editingEstimate ? (
                  <button onClick={() => setEditingEstimate(true)}
                    style={{ padding: '6px 14px', background: 'white', border: '1px solid #ddd', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}>
                    編集
                  </button>
                ) : (
                  <>
                    <button onClick={() => setEditingEstimate(false)}
                      style={{ padding: '6px 14px', background: 'white', border: '1px solid #ddd', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}>
                      キャンセル
                    </button>
                    <button onClick={handleSaveEstimate} disabled={estimateSaving}
                      style={{ padding: '6px 14px', background: '#1a73e8', color: 'white', border: 'none', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}>
                      {estimateSaving ? '保存中...' : '保存'}
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* 表示モード */}
            {!editingEstimate && (
              <div style={{ padding: '20px' }}>
                {/* 3列サマリー */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                  {[
                    { label: '車体価格（税込）', value: parseInt(sellingPrice) || 0 },
                    { label: '諸費用合計', value: expenseItems.reduce((s, e) => s + (e.amount || 0), 0) + optionItems.reduce((s, o) => s + (o.amount || 0), 0) },
                    { label: '支払総額', value: (parseInt(sellingPrice) || 0) + expenseItems.reduce((s, e) => s + (e.amount || 0), 0) + optionItems.reduce((s, o) => s + (o.amount || 0), 0) },
                  ].map(({ label, value }) => (
                    <div key={label} style={{ background: '#f8f9fa', borderRadius: '8px', padding: '14px' }}>
                      <div style={{ fontSize: '12px', color: '#888', marginBottom: '6px' }}>{label}</div>
                      <div style={{ fontSize: '20px', fontWeight: 700 }}>{value ? '¥' + value.toLocaleString() : '—'}</div>
                    </div>
                  ))}
                </div>
                {/* 内訳 */}
                {(expenseItems.length > 0 || optionItems.length > 0) && (
                  <div style={{ fontSize: '13px', color: '#6b7280' }}>
                    <div style={{ marginBottom: '4px', fontWeight: 500, color: '#374151' }}>諸費用内訳</div>
                    {expenseItems.filter(e => e.amount > 0).map((e, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', borderBottom: '1px solid #f3f4f6' }}>
                        <span>{e.label}</span><span>¥{e.amount.toLocaleString()}</span>
                      </div>
                    ))}
                    {optionItems.filter(o => o.amount > 0).map((o, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', borderBottom: '1px solid #f3f4f6', color: '#1a73e8' }}>
                        <span>【OP】{o.label}</span><span>¥{o.amount.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 編集モード */}
            {editingEstimate && (
              <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

                {/* 車体価格 */}
                <div>
                  <label style={{ display: 'block', fontSize: '13px', color: '#6b7280', marginBottom: '6px', fontWeight: 500 }}>車体価格（税込）</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '14px', color: '#374151' }}>¥</span>
                    <input
                      type="number"
                      value={sellingPrice}
                      onChange={e => setSellingPrice(e.target.value)}
                      placeholder="例：1980000"
                      style={{ width: '200px', padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '14px' }}
                    />
                    {sellingPrice && (
                      <span style={{ fontSize: '13px', color: '#6b7280' }}>
                        本体：¥{(parseInt(sellingPrice) - Math.floor(parseInt(sellingPrice) / 11)).toLocaleString()}
                        　消費税：¥{Math.floor(parseInt(sellingPrice) / 11).toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>

                {/* 諸費用 */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <label style={{ fontSize: '13px', color: '#6b7280', fontWeight: 500 }}>諸費用明細</label>
                    <button onClick={initExpensesFromMaster}
                      style={{ padding: '4px 10px', background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', color: '#555' }}>
                      マスタから読込
                    </button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {expenseItems.map((item, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input
                          value={item.label}
                          onChange={e => setExpenseItems(prev => prev.map((p, idx) => idx === i ? { ...p, label: e.target.value } : p))}
                          style={{ flex: 1, padding: '7px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px' }}
                          placeholder="項目名"
                        />
                        <span style={{ fontSize: '13px', color: '#6b7280' }}>¥</span>
                        <input
                          type="number"
                          value={item.amount}
                          onChange={e => setExpenseItems(prev => prev.map((p, idx) => idx === i ? { ...p, amount: parseInt(e.target.value) || 0 } : p))}
                          style={{ width: '120px', padding: '7px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px' }}
                        />
                        <button onClick={() => setExpenseItems(prev => prev.filter((_, idx) => idx !== i))}
                          style={{ padding: '6px 8px', background: '#fff5f5', color: '#e53e3e', border: '1px solid #fce8e6', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>
                          削除
                        </button>
                      </div>
                    ))}
                    <button onClick={() => setExpenseItems(prev => [...prev, { label: '', amount: 0 }])}
                      style={{ padding: '7px', background: '#f9fafb', border: '1px dashed #d1d5db', borderRadius: '6px', fontSize: '13px', cursor: 'pointer', color: '#6b7280' }}>
                      ＋ 諸費用を追加
                    </button>
                  </div>
                </div>

                {/* オプション */}
                <div>
                  <label style={{ display: 'block', fontSize: '13px', color: '#6b7280', fontWeight: 500, marginBottom: '10px' }}>オプション</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {optionItems.map((item, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input
                          value={item.label}
                          onChange={e => setOptionItems(prev => prev.map((p, idx) => idx === i ? { ...p, label: e.target.value } : p))}
                          style={{ flex: 1, padding: '7px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px' }}
                          placeholder="オプション名"
                        />
                        <span style={{ fontSize: '13px', color: '#6b7280' }}>¥</span>
                        <input
                          type="number"
                          value={item.amount}
                          onChange={e => setOptionItems(prev => prev.map((p, idx) => idx === i ? { ...p, amount: parseInt(e.target.value) || 0 } : p))}
                          style={{ width: '120px', padding: '7px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px' }}
                        />
                        <button onClick={() => setOptionItems(prev => prev.filter((_, idx) => idx !== i))}
                          style={{ padding: '6px 8px', background: '#fff5f5', color: '#e53e3e', border: '1px solid #fce8e6', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>
                          削除
                        </button>
                      </div>
                    ))}
                    <button onClick={() => setOptionItems(prev => [...prev, { label: '', amount: 0 }])}
                      style={{ padding: '7px', background: '#f9fafb', border: '1px dashed #d1d5db', borderRadius: '6px', fontSize: '13px', cursor: 'pointer', color: '#6b7280' }}>
                      ＋ オプションを追加
                    </button>
                  </div>
                </div>

                {/* 合計サマリー */}
                <div style={{ background: '#f0f7ff', borderRadius: '10px', padding: '16px', border: '1px solid #bfdbfe' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#6b7280' }}>車体価格（税込）</span>
                      <span>¥{(parseInt(sellingPrice) || 0).toLocaleString()}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#6b7280' }}>諸費用合計</span>
                      <span>¥{expenseItems.reduce((s, e) => s + (e.amount || 0), 0).toLocaleString()}</span>
                    </div>
                    {optionItems.length > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#6b7280' }}>オプション合計</span>
                        <span>¥{optionItems.reduce((s, o) => s + (o.amount || 0), 0).toLocaleString()}</span>
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '15px', borderTop: '1px solid #bfdbfe', paddingTop: '8px', marginTop: '4px' }}>
                      <span style={{ color: '#1d4ed8' }}>支払総額</span>
                      <span style={{ color: '#1d4ed8' }}>¥{((parseInt(sellingPrice) || 0) + expenseItems.reduce((s, e) => s + (e.amount || 0), 0) + optionItems.reduce((s, o) => s + (o.amount || 0), 0)).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

              </div>
            )}
          </div>
          {/* 装備・仕様カード */}
          <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #eee', overflow: 'hidden' }}>
            <div
              style={{ padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', background: '#F0FDF4', borderBottom: (equipmentOpen || editingEquipment) ? '1px solid #BBF7D0' : 'none', borderRadius: '12px 12px 0 0' }}
              onClick={() => { if (!editingEquipment) setEquipmentOpen(o => !o) }}>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#14532D', display: 'flex', alignItems: 'center', gap: '8px' }}>
                🔧 装備・仕様
                <span style={{ fontSize: '11px', color: '#9ca3af', fontWeight: 400 }}>{equipmentOpen ? '▲ 閉じる' : '▼ 開く'}</span>
                {equipment.length > 0 && <span style={{ fontSize: '12px', color: '#1a73e8', fontWeight: 500 }}>{equipment.length}項目選択中</span>}
              </h3>
              <div style={{ display: 'flex', gap: '8px' }} onClick={e => e.stopPropagation()}>
                {equipmentOpen && !editingEquipment && (
                  <button onClick={() => setEditingEquipment(true)}
                    style={{ padding: '6px 14px', background: 'white', border: '1px solid #ddd', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}>
                    編集
                  </button>
                )}
                {editingEquipment && (
                  <>
                    <button onClick={() => setEditingEquipment(false)}
                      style={{ padding: '6px 14px', background: 'white', border: '1px solid #ddd', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}>
                      キャンセル
                    </button>
                    <button onClick={handleSaveEquipment}
                      style={{ padding: '6px 14px', background: '#1a73e8', color: 'white', border: 'none', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}>
                      保存
                    </button>
                  </>
                )}
              </div>
            </div>

            {(equipmentOpen || editingEquipment) && (
              <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {EQUIPMENT_SECTIONS.map(({ label, items }) => (
                  <div key={label}>
                    <h4 style={{ margin: '0 0 10px', fontSize: '13px', fontWeight: 600, color: '#555' }}>{label}</h4>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {items.map(item => {
                        const selected = equipment.includes(item)
                        return (
                          <button
                            key={item}
                            onClick={() => {
                              if (!editingEquipment) return
                              setEquipment(prev =>
                                selected ? prev.filter(e => e !== item) : [...prev, item]
                              )
                            }}
                            style={{
                              padding: '6px 12px',
                              borderRadius: '6px',
                              border: `1px solid ${selected ? '#f9a8d4' : '#e5e7eb'}`,
                              background: selected ? '#fdf2f8' : 'white',
                              color: selected ? '#be185d' : '#374151',
                              fontSize: '13px',
                              cursor: editingEquipment ? 'pointer' : 'default',
                              fontWeight: selected ? 600 : 400,
                            }}
                          >
                            {item}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}

                {/* チューニング */}
                <div>
                  <h4 style={{ margin: '0 0 10px', fontSize: '13px', fontWeight: 600, color: '#555' }}>チューニング・カスタム内容</h4>
                  {editingEquipment ? (
                    <textarea
                      value={tuningNotes}
                      onChange={e => setTuningNotes(e.target.value)}
                      placeholder="例：車高調・マフラー交換・エンジンチューニングなど"
                      rows={3}
                      style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', resize: 'vertical', boxSizing: 'border-box' }}
                    />
                  ) : (
                    <p style={{ margin: 0, fontSize: '13px', color: tuningNotes ? '#111' : '#9ca3af' }}>
                      {tuningNotes || '未入力'}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #eee', overflow: 'hidden' }}>
            <div style={{ background: '#FFF7ED', borderBottom: '1px solid #FED7AA', padding: '12px 20px', borderRadius: '12px 12px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#7C2D12', margin: 0 }}>WEB用写真</h3>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                {!editingPhoto ? (
                  <button onClick={() => setEditingPhoto(true)}
                    style={{ padding: '5px 14px', background: '#f1f3f4', color: '#555', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 500, cursor: 'pointer' }}>
                    写真を編集
                  </button>
                ) : (
                  <>
                    {photoChanged && (
                      <button onClick={async () => { await savePhotoOrder() }} disabled={saving}
                        style={{ padding: '5px 14px', background: '#0070f3', color: 'white', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
                        {saving ? '保存中...' : '並び順を保存'}
                      </button>
                    )}
                    <button onClick={() => { setEditingPhoto(false); setPhotoUrls(v.image_urls ?? []); setPhotoChanged(false) }}
                      style={{ padding: '5px 14px', background: '#f1f3f4', color: '#555', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 500, cursor: 'pointer' }}>
                      編集を終了
                    </button>
                  </>
                )}
              </div>
            </div>
            <div style={{ padding: '20px' }}>
            {photoUrls.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {/* 左：メイン画像（aspect-ratio 4/3） */}
                <div style={{ position: 'relative', width: '100%', aspectRatio: '4/3', borderRadius: '10px', overflow: 'hidden', border: '1px solid #eee' }}>
                  <img src={photoUrls[0]} alt="メイン"
                    onClick={() => { setImageModalUrl(photoUrls[0]); setShowImageModal(true) }}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'zoom-in', display: 'block' }} />
                  <span style={{ position: 'absolute', bottom: '8px', left: '8px', background: '#0070f3', color: 'white', fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', pointerEvents: 'none' }}>メイン</span>
                </div>
                {/* 右：全画像グリッド（編集モード時：ドラッグ＋削除＋追加） */}
                <div style={{ overflowY: 'auto' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '8px' }}>
                    {photoUrls.map((url, i) => (
                      <div key={url + i}
                        draggable={editingPhoto}
                        onDragStart={editingPhoto ? () => setDragIdx(i) : undefined}
                        onDragOver={editingPhoto ? e => e.preventDefault() : undefined}
                        onDrop={editingPhoto ? e => {
                          e.preventDefault()
                          if (dragIdx === null || dragIdx === i) return
                          const arr = [...photoUrls]
                          const moved = arr.splice(dragIdx, 1)[0]
                          arr.splice(i, 0, moved)
                          setPhotoUrls(arr); setPhotoChanged(true); setDragIdx(null)
                        } : undefined}
                        onDragEnd={editingPhoto ? () => setDragIdx(null) : undefined}
                        style={{ position: 'relative', cursor: editingPhoto ? 'grab' : 'default', opacity: dragIdx === i ? 0.4 : 1 }}>
                        <img src={url} alt=""
                          onClick={() => { if (!editingPhoto) { setImageModalUrl(url); setShowImageModal(true) } }}
                          style={{ width: '100%', height: '100px', objectFit: 'cover', borderRadius: '6px', border: i === 0 ? '2px solid #0070f3' : '1px solid #eee', display: 'block', cursor: editingPhoto ? 'grab' : 'zoom-in' }} />
                        {i === 0 && (
                          <span style={{ position: 'absolute', bottom: '4px', left: '4px', background: '#0070f3', color: 'white', fontSize: '9px', fontWeight: 700, padding: '1px 5px', borderRadius: '3px', pointerEvents: 'none' }}>メイン</span>
                        )}
                        {editingPhoto && (
                          <button onClick={e => { e.stopPropagation(); setPhotoUrls(photoUrls.filter((_, idx) => idx !== i)); setPhotoChanged(true) }}
                            style={{ position: 'absolute', top: '4px', right: '4px', width: '20px', height: '20px', background: 'rgba(0,0,0,0.65)', border: 'none', borderRadius: '50%', color: 'white', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>
                            ×
                          </button>
                        )}
                      </div>
                    ))}
                    {editingPhoto && (
                      <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100px', borderRadius: '6px', border: '2px dashed #ddd', cursor: photoUploading ? 'wait' : 'pointer', background: '#fafafa', fontSize: '24px', color: '#ccc' }}>
                        {photoUploading ? '⏳' : '+'}
                        <input type="file" accept="image/*" multiple onChange={handlePhotoUpload} style={{ display: 'none' }} disabled={photoUploading} />
                      </label>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ padding: '3rem', textAlign: 'center', color: '#ccc', fontSize: '13px', background: '#fafafa', borderRadius: '8px' }}>
                写真が登録されていません
                {editingPhoto && (
                  <div style={{ marginTop: '12px' }}>
                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 20px', background: '#0070f3', color: 'white', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}>
                      📷 写真を追加
                      <input type="file" accept="image/*" multiple onChange={handlePhotoUpload} style={{ display: 'none' }} />
                    </label>
                  </div>
                )}
              </div>
            )}
            </div>{/* padding wrapper */}
          </div>
        </div>
      )}

      {/* ===== 契約タブ（子タブあり） ===== */}
      {tab === '契約' && (
        <div>
          {/* 子タブ */}
          <div style={{ display: 'flex', gap: '2px', marginBottom: '16px', background: '#f1f3f4', borderRadius: '10px', padding: '4px', width: 'fit-content' }}>
            {(['契約情報', '納車管理'] as const).map(st => (
              <button key={st} onClick={() => setContractSubTab(st)} style={{
                padding: '6px 20px', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 500, cursor: 'pointer',
                background: contractSubTab === st ? 'white' : 'transparent',
                color: contractSubTab === st ? '#111' : '#888',
                boxShadow: contractSubTab === st ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
              }}>{st}</button>
            ))}
          </div>

          {/* 子タブ①: 契約情報 */}
          {contractSubTab === '契約情報' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #eee', padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: 600, margin: 0 }}>販売契約情報</h3>
                  {!editingContract && (
                    <button onClick={() => { setEditingContract(true); setEditForm({ contract_date: v.contract_date ?? '', delivery_date: v.delivery_date ?? '' }) }}
                      style={{ padding: '5px 14px', background: '#f1f3f4', border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', color: '#555', fontWeight: 500 }}>
                      契約情報を編集
                    </button>
                  )}
                </div>
                {cell('販売担当', v.sales_staff)}
                {!editingContract ? (
                  <>
                    {cell('販売契約日', v.contract_date)}
                    {cell('売上日', v.sale_date)}
                    {cell('納車日', v.delivery_date)}
                  </>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '12px', background: '#f8f9fa', borderRadius: '8px', marginBottom: '8px' }}>
                    <div>
                      <label style={{ fontSize: '12px', color: '#888', display: 'block', marginBottom: '4px' }}>契約日</label>
                      <input type="date" value={editForm.contract_date} onChange={e => setEditForm((f: any) => ({ ...f, contract_date: e.target.value }))}
                        style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box' }} />
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', color: '#888', display: 'block', marginBottom: '4px' }}>納車日</label>
                      <input type="date" value={editForm.delivery_date} onChange={e => setEditForm((f: any) => ({ ...f, delivery_date: e.target.value }))}
                        style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box' }} />
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={async () => { await updateVehicle({ contract_date: editForm.contract_date || null, delivery_date: editForm.delivery_date || null }); setEditingContract(false) }}
                        disabled={saving}
                        style={{ flex: 1, padding: '9px', background: '#0070f3', color: 'white', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
                        {saving ? '保存中...' : '保存'}
                      </button>
                      <button onClick={() => setEditingContract(false)}
                        style={{ flex: 1, padding: '9px', background: '#f1f3f4', color: '#555', border: 'none', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}>
                        キャンセル
                      </button>
                    </div>
                  </div>
                )}
                {cell('済車日', v.completion_date)}
                {cell('車体価格', v.body_price ? '¥' + v.body_price.toLocaleString() : null)}
                {cell('支払総額', v.total_price ? '¥' + v.total_price.toLocaleString() : null)}
              </div>
              <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #eee', padding: '20px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 600, margin: '0 0 16px' }}>仕入契約情報</h3>
                {cell('仕入担当', v.purchase_staff)}
                {cell('仕入契約日', v.purchase_contract_date)}
                {cell('入庫日', v.stock_date)}
                {cell('仕入金額', v.purchase_price ? '¥' + v.purchase_price.toLocaleString() : null)}
                {cell('仕入区分', v.purchase_type)}
              </div>
            </div>
          )}

          {/* 子タブ②: 納車管理 */}
          {contractSubTab === '納車管理' && (
            <div>
              {/* データなし */}
              {!contractForDelivery && (
                <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #eee', padding: '3rem', textAlign: 'center', color: '#aaa', fontSize: '14px' }}>
                  <div style={{ fontSize: '32px', marginBottom: '8px' }}>📋</div>
                  契約が作成されていません
                  <div style={{ marginTop: '8px', fontSize: '12px', color: '#ccc' }}>商談 → 契約書作成 → 納車登録の順で進めてください</div>
                </div>
              )}
              {contractForDelivery && !delivery && (
                <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #eee', padding: '3rem', textAlign: 'center', color: '#aaa', fontSize: '14px' }}>
                  <div style={{ fontSize: '32px', marginBottom: '8px' }}>🚗</div>
                  納車管理がまだ開始されていません
                  <div style={{ marginTop: '8px', fontSize: '12px', color: '#ccc' }}>契約書プレビューから「納車管理を開始する」ボタンを押してください</div>
                </div>
              )}

              {delivery && (
                <>
                  {/* 進行メーター */}
                  <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #eee', padding: '16px 20px', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <div style={{ display: 'flex', gap: '24px', fontSize: '13px', flexWrap: 'wrap' }}>
                        {deliveryCustomerName && <span>顧客: <strong>{deliveryCustomerName} 様</strong></span>}
                        <span>契約日: <strong>{contractForDelivery.contract_date ? new Date(contractForDelivery.contract_date).toLocaleDateString('ja-JP') : '—'}</strong></span>
                        <span>納車予定: <strong>{delivery.delivery_scheduled_date ? new Date(delivery.delivery_scheduled_date).toLocaleDateString('ja-JP') : contractForDelivery.delivery_date ? new Date(contractForDelivery.delivery_date).toLocaleDateString('ja-JP') : '—'}</strong></span>
                        {deliveryDays !== null && <span style={{ color: deliveryPct >= 100 ? '#e53e3e' : '#888' }}>契約から <strong>{deliveryDays}日目</strong></span>}
                      </div>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: deliveryPct >= 100 ? '#e53e3e' : '#1a73e8' }}>{deliveryPct}%</span>
                    </div>
                    <div style={{ height: '8px', background: '#f0f0f0', borderRadius: '4px' }}>
                      <div style={{ width: `${deliveryPct}%`, height: '100%', background: deliveryPct >= 100 ? '#e53e3e' : deliveryPct >= 70 ? '#e65100' : '#1a73e8', borderRadius: '4px', transition: 'width 0.3s' }} />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginTop: '12px' }}>
                      {[
                        { label: '① 入金確認', ok: paymentOK },
                        { label: '② 書類・名変', ok: docsOK },
                        { label: '③ 契約業務', ok: tasksOK },
                      ].map(s => (
                        <div key={s.label} style={{ padding: '8px 12px', borderRadius: '8px', background: s.ok ? '#e6f4ea' : '#f8f9fa', border: `1px solid ${s.ok ? '#a8d5b5' : '#eee'}`, display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '14px' }}>{s.ok ? '✅' : '⬜'}</span>
                          <span style={{ fontSize: '12px', fontWeight: 500, color: s.ok ? '#1e7e34' : '#888' }}>{s.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 3軸チェック */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                    {/* ① 入金確認 */}
                    <div style={{ background: 'white', borderRadius: '12px', border: `1px solid ${paymentOK ? '#a8d5b5' : '#eee'}`, padding: '20px' }}>
                      <SectionHeader num="1" label="入金確認" ok={paymentOK} />
                      <div style={{ marginBottom: '12px' }}>
                        <label style={{ fontSize: '12px', color: '#888', fontWeight: 500 }}>支払方法</label>
                        <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                          {['現金', 'ローン'].map(t => (
                            <button key={t} onClick={() => !isDeliveryCompleted && updateDelivery({ payment_type: t })}
                              style={{ flex: 1, padding: '6px', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 500, cursor: isDeliveryCompleted ? 'default' : 'pointer', background: delivery.payment_type === t ? '#0070f3' : '#f1f3f4', color: delivery.payment_type === t ? 'white' : '#555' }}>
                              {t}
                            </button>
                          ))}
                        </div>
                      </div>
                      {delivery.payment_type === 'ローン' && (
                        <div style={{ marginBottom: '12px' }}>
                          <label style={{ fontSize: '12px', color: '#888', fontWeight: 500 }}>OK番号</label>
                          <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                            <input type="text" defaultValue={delivery.ok_number_value ?? ''} id="ok-number" placeholder="OK番号を入力"
                              style={{ flex: 1, border: '1px solid #ddd', borderRadius: '6px', padding: '6px 10px', fontSize: '12px' }} />
                            <button onClick={() => { const val = (document.getElementById('ok-number') as HTMLInputElement)?.value; updateDelivery({ ok_number_value: val }) }}
                              style={{ padding: '6px 12px', background: '#0070f3', color: 'white', border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>保存</button>
                          </div>
                          {delivery.ok_number_value && <div style={{ fontSize: '11px', color: '#1e7e34', marginTop: '4px' }}>OK番号: {delivery.ok_number_value}</div>}
                        </div>
                      )}
                      <CheckItem label="入金確認済み" checked={delivery.payment_confirmed} onToggle={() => toggleDelivery('payment_confirmed')}>
                        {delivery.payment_type === 'ローン' && !delivery.ok_number_value && (
                          <div style={{ fontSize: '11px', color: '#e65100', marginTop: '4px', marginLeft: '32px' }}>⚠ OK番号を先に入力してください</div>
                        )}
                      </CheckItem>
                    </div>

                    {/* ② 書類・名変 */}
                    <div style={{ background: 'white', borderRadius: '12px', border: `1px solid ${docsOK ? '#a8d5b5' : '#eee'}`, padding: '20px' }}>
                      <SectionHeader num="2" label="書類・名義変更" ok={docsOK} />
                      <CheckItem label="委任状　受取済" checked={delivery.doc_commission} onToggle={() => toggleDelivery('doc_commission')} />
                      <CheckItem label="印鑑証明　受取済" checked={delivery.doc_seal} onToggle={() => toggleDelivery('doc_seal')} />
                      <CheckItem label="車庫証明　受取済" checked={delivery.doc_parking} onToggle={() => toggleDelivery('doc_parking')} />
                      <div style={{ marginTop: '12px' }}>
                        <label style={{ fontSize: '12px', color: '#888', fontWeight: 500 }}>登録済み車検証番号</label>
                        <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                          <input type="text" defaultValue={delivery.registration_number ?? ''} id="reg-number" placeholder="車検証番号を入力"
                            style={{ flex: 1, border: '1px solid #ddd', borderRadius: '6px', padding: '6px 10px', fontSize: '12px' }} />
                          <button onClick={() => { const val = (document.getElementById('reg-number') as HTMLInputElement)?.value; updateDelivery({ registration_number: val }) }}
                            style={{ padding: '6px 12px', background: '#0070f3', color: 'white', border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>保存</button>
                        </div>
                        {delivery.registration_number && <div style={{ fontSize: '11px', color: '#1e7e34', marginTop: '4px' }}>✓ {delivery.registration_number}</div>}
                      </div>
                    </div>

                    {/* ③ 契約業務 */}
                    <div style={{ background: 'white', borderRadius: '12px', border: `1px solid ${tasksOK ? '#a8d5b5' : '#eee'}`, padding: '20px' }}>
                      <SectionHeader num="3" label="契約業務" ok={tasksOK} />
                      <CheckItem label="ローン申込　完了" checked={delivery.task_loan_apply} onToggle={() => toggleDelivery('task_loan_apply')} />
                      <CheckItem label="車検・登録　完了" checked={delivery.task_inspection} onToggle={() => toggleDelivery('task_inspection')} />
                      <CheckItem label="整備・仕上　完了" checked={delivery.task_maintenance} onToggle={() => toggleDelivery('task_maintenance')} />
                      <CheckItem label="クリーニング　完了" checked={delivery.task_cleaning} onToggle={() => toggleDelivery('task_cleaning')} />
                      <div style={{ marginTop: '8px' }}>
                        <label style={{ fontSize: '12px', color: '#888', fontWeight: 500 }}>担当者</label>
                        <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                          <input type="text" defaultValue={delivery.assigned_to ?? ''} id="delivery-assigned" placeholder="担当者名"
                            style={{ flex: 1, border: '1px solid #ddd', borderRadius: '6px', padding: '6px 10px', fontSize: '12px' }} />
                          <button onClick={() => { const val = (document.getElementById('delivery-assigned') as HTMLInputElement)?.value; updateDelivery({ assigned_to: val }) }}
                            style={{ padding: '6px 12px', background: '#0070f3', color: 'white', border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>保存</button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 納車完了ボタン */}
                  {!isDeliveryCompleted ? (
                    <div style={{ background: canDeliver ? '#e8f0fe' : '#f8f9fa', borderRadius: '12px', border: `1px solid ${canDeliver ? '#93b4f0' : '#eee'}`, padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ fontSize: '15px', fontWeight: 600, color: canDeliver ? '#1a73e8' : '#888', marginBottom: '4px' }}>
                          {canDeliver ? '🚗 納車準備完了！納車日を入力してください' : '納車には3つの条件をすべて完了させてください'}
                        </div>
                        {!canDeliver && (
                          <div style={{ fontSize: '12px', color: '#aaa' }}>
                            {!paymentOK && '① 入金確認 '}{!docsOK && '② 書類・名変 '}{!tasksOK && '③ 契約業務 '}が未完了です
                          </div>
                        )}
                      </div>
                      {canDeliver && (
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <input type="date" value={actualDeliveryDate} onChange={e => setActualDeliveryDate(e.target.value)}
                            style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '8px 12px', fontSize: '13px' }} />
                          <button onClick={completeDelivery} disabled={deliveryLoading}
                            style={{ padding: '10px 24px', background: '#00a86b', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}>
                            🎉 納車完了
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ background: '#e6f4ea', borderRadius: '12px', border: '1px solid #a8d5b5', padding: '20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontSize: '24px' }}>✅</span>
                      <div>
                        <div style={{ fontSize: '15px', fontWeight: 700, color: '#1e7e34' }}>納車完了</div>
                        {delivery.actual_delivery_date && (
                          <div style={{ fontSize: '13px', color: '#1e7e34', marginTop: '2px' }}>
                            納車日: {new Date(delivery.actual_delivery_date).toLocaleDateString('ja-JP')}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* ===== 登録タブ ===== */}
      {tab === '登録' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #eee', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 600, margin: 0 }}>車検証情報</h3>
              {!editingRegistration && (
                <button onClick={() => { setEditingRegistration(true); setEditForm({ car_name: v.car_name ?? '', year: v.year ?? '', mileage: v.mileage ?? '', shift: v.shift ?? '', color: v.color ?? '', chassis_number: v.chassis_number ?? '', car_number: v.car_number ?? '', inspection_date: v.inspection_date ?? '' }) }}
                  style={{ padding: '5px 14px', background: '#f1f3f4', border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', color: '#555', fontWeight: 500 }}>
                  車検証情報を編集
                </button>
              )}
            </div>
            {!editingRegistration ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
                {cell('車種', v.car_name)}
                {cell('年式', v.year ? v.year + '年' : null)}
                {cell('走行距離', v.mileage ? v.mileage.toLocaleString() + 'km' : null)}
                {cell('シフト', v.shift)}
                {cell('外装色', v.color)}
                {cell('車台番号', v.chassis_number)}
                {cell('車両ナンバー', v.car_number)}
                {cell('車検満了日', v.inspection_date)}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  {([
                    { label: '車種', key: 'car_name', type: 'text' },
                    { label: '年式', key: 'year', type: 'number' },
                    { label: '走行距離（km）', key: 'mileage', type: 'number' },
                    { label: 'シフト', key: 'shift', type: 'text' },
                    { label: '色', key: 'color', type: 'text' },
                    { label: '車台番号', key: 'chassis_number', type: 'text' },
                    { label: '車両ナンバー', key: 'car_number', type: 'text' },
                    { label: '車検満了日', key: 'inspection_date', type: 'date' },
                  ] as const).map(({ label, key, type }) => (
                    <div key={key}>
                      <label style={{ fontSize: '12px', color: '#888', display: 'block', marginBottom: '4px' }}>{label}</label>
                      <input type={type} value={editForm[key]} onChange={e => setEditForm((f: any) => ({ ...f, [key]: e.target.value }))}
                        style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box' }} />
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                  <button onClick={async () => { await updateVehicle({ car_name: editForm.car_name || null, year: editForm.year ? parseInt(editForm.year) : null, mileage: editForm.mileage ? parseInt(editForm.mileage) : null, shift: editForm.shift || null, color: editForm.color || null, chassis_number: editForm.chassis_number || null, car_number: editForm.car_number || null, inspection_date: editForm.inspection_date || null }); setEditingRegistration(false) }}
                    disabled={saving}
                    style={{ flex: 1, padding: '9px', background: '#0070f3', color: 'white', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
                    {saving ? '保存中...' : '保存'}
                  </button>
                  <button onClick={() => setEditingRegistration(false)}
                    style={{ flex: 1, padding: '9px', background: '#f1f3f4', color: '#555', border: 'none', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}>
                    キャンセル
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== 販売タブ ===== */}
      {tab === '販売' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* 新規見積作成ボタン */}
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <a href={`/vehicles/${id}/estimates/new`}
              style={{ padding: '10px 20px', background: '#1a73e8', color: 'white', borderRadius: '8px', fontSize: '14px', fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              ＋ 新規見積・契約書作成
            </a>
          </div>

          {/* 履歴一覧 */}
          <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #eee', overflow: 'hidden' }}>
            <div style={{ padding: '12px 20px', background: '#E6F1FB', borderBottom: '1px solid #B5D4F4' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0C447C' }}>📋 見積・契約書履歴</h3>
            </div>
            {salesEstimates.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#9ca3af', fontSize: '14px' }}>
                見積・契約書はまだありません
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8f9fa', borderBottom: '1px solid #eee' }}>
                    {['作成日時', '顧客名', '担当', '支払総額', 'ステータス', ''].map(h => (
                      <th key={h} style={{ padding: '10px 16px', fontSize: '12px', color: '#6b7280', fontWeight: 500, textAlign: 'left' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {salesEstimates.map((est, i) => (
                    <tr key={est.id} style={{ borderBottom: '1px solid #f3f4f6', background: i % 2 === 0 ? 'white' : '#fafafa' }}>
                      <td style={{ padding: '12px 16px', fontSize: '13px' }}>
                        {new Date(est.created_at).toLocaleDateString('ja-JP')}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '13px' }}>{est.buyer_name || '—'}</td>
                      <td style={{ padding: '12px 16px', fontSize: '13px' }}>{est.staff_name || '—'}</td>
                      <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: 600 }}>
                        {est.total_amount ? `¥${est.total_amount.toLocaleString()}` : '—'}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 500,
                          background: est.status === 'contracted' ? '#d1fae5' : est.status === 'draft' ? '#f3f4f6' : '#fef3c7',
                          color: est.status === 'contracted' ? '#065f46' : est.status === 'draft' ? '#6b7280' : '#92400e',
                        }}>
                          {est.status === 'contracted' ? '契約済' : est.status === 'draft' ? '下書き' : '見積中'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <a href={`/estimates/${est.id}`}
                          style={{ padding: '5px 12px', background: 'white', border: '1px solid #ddd', borderRadius: '6px', fontSize: '12px', color: '#374151', textDecoration: 'none' }}>
                          開く
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ===== 財務タブ ===== */}
      {tab === '財務' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
            {[
              { label: '総入金',   value: totalIn,     color: '#1e7e34' },
              { label: '総出金',   value: totalOut,    color: '#e53e3e' },
              { label: '確定粗利', value: grossProfit, color: grossProfit >= 0 ? '#1a73e8' : '#e65100' },
            ].map(k => (
              <div key={k.label} style={{ background: 'white', borderRadius: '12px', border: '1px solid #eee', padding: '20px', textAlign: 'center' }}>
                <div style={{ fontSize: '12px', color: '#888', marginBottom: '8px' }}>{k.label}</div>
                <div style={{ fontSize: '24px', fontWeight: 700, color: k.color }}>
                  {k.label === '確定粗利' && k.value > 0 ? '+' : ''}¥{k.value.toLocaleString()}
                </div>
              </div>
            ))}
          </div>
          <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #eee', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 600, margin: 0 }}>入出金明細</h3>
              <Link href="/accounting" style={{ padding: '7px 16px', background: '#0070f3', color: 'white', borderRadius: '8px', fontSize: '13px', fontWeight: 500, textDecoration: 'none' }}>
                ＋ 明細追加（仮想BK）
              </Link>
            </div>
            {transactions.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#ccc', fontSize: '13px' }}>明細がありません</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr style={{ background: '#f8f9fa', borderBottom: '1px solid #eee' }}>
                    {['日付', '入出金', 'カテゴリ', 'サブカテゴリ', '金額', '備考'].map(h => (
                      <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: '#888', fontWeight: 600 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx, i) => {
                    const cfg = CAT_COLOR[tx.category ?? ''] ?? { bg: '#f1f3f4', color: '#888' }
                    return (
                      <tr key={tx.id} style={{ borderBottom: i < transactions.length - 1 ? '1px solid #f0f0f0' : 'none' }}>
                        <td style={{ padding: '10px 12px', color: '#888' }}>{tx.date || '—'}</td>
                        <td style={{ padding: '10px 12px' }}>
                          <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', fontWeight: 600, background: tx.type === 'in' ? '#e6f4ea' : '#fce8e6', color: tx.type === 'in' ? '#1e7e34' : '#e53e3e' }}>
                            {tx.type === 'in' ? '入金' : '出金'}
                          </span>
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          {tx.category ? (
                            <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', fontWeight: 600, background: cfg.bg, color: cfg.color }}>{tx.category}</span>
                          ) : <span style={{ color: '#ccc' }}>—</span>}
                        </td>
                        <td style={{ padding: '10px 12px', color: '#666' }}>{tx.subcategory || '—'}</td>
                        <td style={{ padding: '10px 12px', fontWeight: 600, color: tx.type === 'in' ? '#1e7e34' : '#e53e3e' }}>
                          {tx.type === 'in' ? '+' : '-'}¥{tx.amount.toLocaleString()}
                        </td>
                        <td style={{ padding: '10px 12px', color: '#888' }}>{tx.note || '—'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ===== ステータス変更モーダル ===== */}
      {showStatusModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}
          onClick={() => setShowStatusModal(false)}>
          <div style={{ background: 'white', borderRadius: '16px', width: '320px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>ステータス変更</h2>
              <button onClick={() => setShowStatusModal(false)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#888' }}>×</button>
            </div>
            <div style={{ padding: '16px 24px 24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {(['在庫中', '商談中', '売約済', '納車済'] as const).map(s => {
                const cfg = STATUS_COLOR[s]
                const isCurrent = v.status === s
                return (
                  <button key={s} onClick={async () => { await updateVehicle({ status: s }); setShowStatusModal(false) }}
                    style={{ padding: '12px 16px', borderRadius: '10px', border: `2px solid ${isCurrent ? cfg.color : '#eee'}`, background: isCurrent ? cfg.bg : 'white', color: isCurrent ? cfg.color : '#555', fontSize: '14px', fontWeight: isCurrent ? 700 : 500, cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {isCurrent && <span>✓</span>}{s}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ===== 画像拡大モーダル ===== */}
      {showImageModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300 }}
          onClick={() => setShowImageModal(false)}>
          <button onClick={() => setShowImageModal(false)} style={{ position: 'absolute', top: '16px', right: '20px', background: 'none', border: 'none', color: 'white', fontSize: '32px', cursor: 'pointer', lineHeight: 1 }}>×</button>
          <img src={imageModalUrl} alt="拡大" onClick={e => { e.stopPropagation(); window.open(imageModalUrl, '_blank') }}
            style={{ maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain', borderRadius: '8px', cursor: 'zoom-in' }} />
          <div style={{ position: 'absolute', bottom: '20px', color: 'rgba(255,255,255,0.6)', fontSize: '12px' }}>クリックで原寸大表示　ESCで閉じる</div>
        </div>
      )}

      {/* 削除ボタン */}
      {isAdmin && (
        <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #eee' }}>
          <button onClick={handleDelete} style={{ padding: '10px 20px', background: '#fff5f5', color: '#e53e3e', borderRadius: '8px', border: '1px solid #fce8e6', fontSize: '13px', cursor: 'pointer', fontWeight: 500 }}>
            🗑 この車両を削除BOXに移動する
          </button>
        </div>
      )}
    </div>
  )
}
