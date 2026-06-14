'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { useProfile } from '@/hooks/useProfile'
import LoadingOverlay from '@/components/LoadingOverlay'

const SOURCES = [
  { value: 'carsensor', label: 'カーセンサー', color: '#c0392b', bg: '#fde8e8' },
  { value: 'goo',       label: 'グーネット',   color: '#27ae60', bg: '#e8f8ef' },
  { value: 'hp',        label: 'HP',           color: '#2980b9', bg: '#e8f0fe' },
  { value: 'x',         label: 'X(Twitter)',   color: '#111',    bg: '#f0f0f0' },
  { value: 'instagram', label: 'Instagram',    color: '#8e44ad', bg: '#f3e8fd' },
  { value: 'youtube',   label: 'YouTube',      color: '#e74c3c', bg: '#fde8e8' },
  { value: 'line',      label: 'LINE',         color: '#27ae60', bg: '#e8f8ef' },
  { value: 'tel',       label: '電話',         color: '#e65100', bg: '#fff3e0' },
  { value: 'visit',     label: '来店',         color: '#1a73e8', bg: '#e8f0fe' },
  { value: 'referral',  label: '紹介',         color: '#6d4c41', bg: '#f5ede8' },
  { value: 'other',     label: 'その他',       color: '#5f6368', bg: '#f1f3f4' },
]
const SOURCE_MAP = Object.fromEntries(SOURCES.map(s => [s.value, s]))

const cleanNotes = (text: string | null | undefined): string => {
  if (!text) return ''
  return text.replace(/\n*【買取車両情報】[\s\S]*$/, '').trim()
}

const yen = (n: number | null | undefined) =>
  n != null ? '¥' + n.toLocaleString() : null

export default function NegotiationDetailPage() {
  const { id } = useParams()
  const { isAdmin } = useProfile()

  const [negotiation, setNegotiation] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [loadingOverlay, setLoadingOverlay] = useState(false)
  const [loadingMessage, setLoadingMessage] = useState('処理中...')

  // 商談情報編集
  const [editingInfo, setEditingInfo] = useState(false)
  const [infoForm, setInfoForm] = useState({ assigned_to: '', source: '', visit_date: '' })

  // 買取車両情報編集
  const [editingPurchase, setEditingPurchase] = useState(false)
  const [purchaseForm, setPurchaseForm] = useState({
    maker: '', model: '', year: '', mileage: '',
    desired_price: '', chassis_number: '', color: '', repair_history: false,
  })
  const [makers, setMakers] = useState<any[]>([])
  const [allModels, setAllModels] = useState<any[]>([])
  const [filteredModels, setFilteredModels] = useState<any[]>([])
  const [purchaseMakerId, setPurchaseMakerId] = useState('')

  // 査定結果編集
  const [editingAssessment, setEditingAssessment] = useState(false)
  const [assessmentForm, setAssessmentForm] = useState({
    price: '', recycle: '', purchase: '', result: '未定',
  })
  const [assessmentSaving, setAssessmentSaving] = useState(false)

  // 査定写真・書類
  const [assessmentCarImages, setAssessmentCarImages] = useState<string[]>([])
  const [assessmentCarImgUploading, setAssessmentCarImgUploading] = useState(false)
  const [assessmentDocs, setAssessmentDocs] = useState<Record<string, string | null>>({
    assessment_doc_shakken: null,
    assessment_doc_touroku: null,
    assessment_doc_caution: null,
    assessment_doc_hyoka:   null,
  })
  const [assessmentDocUploading, setAssessmentDocUploading] = useState<string | null>(null)
  const [assessmentScore, setAssessmentScore] = useState('')
  const [assessmentComment, setAssessmentComment] = useState('')

  // コメント
  const [commentText, setCommentText] = useState('')
  const [commentSaving, setCommentSaving] = useState(false)
  const [ownerSame, setOwnerSame] = useState(true)
  const [ownerName, setOwnerName] = useState('')
  const [ownerAddress, setOwnerAddress] = useState('')
  const [ownerRelationship, setOwnerRelationship] = useState('')
  const [ownerRelationshipNote, setOwnerRelationshipNote] = useState('')

  // トースト
  const [toast, setToast] = useState('')
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(''), 2500)
    return () => clearTimeout(t)
  }, [toast])

  // 査定額リアルタイム自動計算
  const purchaseNum  = parseInt(assessmentForm.purchase) || 0
  const recycleNum   = parseInt(assessmentForm.recycle)  || 0
  const vehicleAmount = purchaseNum ? (purchaseNum - recycleNum) : null
  const taxAmount     = vehicleAmount != null ? Math.floor(vehicleAmount / 11) : null

  const fetchData = async () => {
    const [neg, mk, md] = await Promise.all([
      supabase.from('negotiations').select('*, customers(*)').eq('id', id).single(),
      supabase.from('master_makers').select('*').order('sort_order'),
      supabase.from('master_models').select('*').order('sort_order'),
    ])
    const makerList = mk.data ?? []
    const modelList = md.data ?? []
    setMakers(makerList)
    setAllModels(modelList)
    setNegotiation(neg.data)
    if (neg.data) {
      setInfoForm({
        assigned_to: neg.data.assigned_to ?? '',
        source:      neg.data.source      ?? '',
        visit_date:  neg.data.visit_date  ?? '',
      })
      setCommentText(cleanNotes(neg.data.notes))
      setAssessmentCarImages(neg.data.assessment_car_images || [])
      setAssessmentDocs({
        assessment_doc_shakken: neg.data.assessment_doc_shakken || null,
        assessment_doc_touroku: neg.data.assessment_doc_touroku || null,
        assessment_doc_caution: neg.data.assessment_doc_caution || null,
        assessment_doc_hyoka:   neg.data.assessment_doc_hyoka   || null,
      })
      setAssessmentScore(neg.data.assessment_score || '')
      setAssessmentComment(neg.data.assessment_comment || '')
      setOwnerSame(neg.data.owner_same_as_customer ?? true)
      setOwnerName(neg.data.owner_name || '')
      setOwnerAddress(neg.data.owner_address || '')
      setOwnerRelationship(neg.data.owner_relationship || '')
      setOwnerRelationshipNote(neg.data.owner_relationship_note || '')
      setAssessmentForm({
        price:    neg.data.assessment_price?.toString()  ?? '',
        recycle:  neg.data.recycle_price?.toString()     ?? '',
        purchase: neg.data.purchase_amount?.toString()   ?? '',
        result:   neg.data.assessment_result             ?? '未定',
      })
      if (neg.data.category === 'purchase') {
        setPurchaseForm({
          maker:          neg.data.purchase_maker          ?? '',
          model:          neg.data.purchase_model          ?? '',
          year:           neg.data.purchase_year?.toString()           ?? '',
          mileage:        neg.data.purchase_mileage?.toString()        ?? '',
          desired_price:  neg.data.purchase_desired_price?.toString()  ?? '',
          chassis_number: neg.data.purchase_chassis_number ?? '',
          color:          neg.data.purchase_color          ?? '',
          repair_history: neg.data.purchase_repair_history ?? false,
        })
        if (neg.data.purchase_maker) {
          const foundMaker = makerList.find((m: any) => m.name === neg.data.purchase_maker)
          if (foundMaker) {
            setPurchaseMakerId(foundMaker.id)
            setFilteredModels(modelList.filter((m: any) => m.maker_id === foundMaker.id))
          }
        }
      }
    }
  }

  useEffect(() => { fetchData() }, [id])

  const ASSESSMENT_DOC_ITEMS = [
    { key: 'assessment_doc_shakken', label: '車検証' },
    { key: 'assessment_doc_touroku', label: '登録事項証明書' },
    { key: 'assessment_doc_caution', label: 'コーションプレート' },
    { key: 'assessment_doc_hyoka',   label: '査定表' },
  ]

  const saveOwnerInfo = async (updates: Record<string, any>) => {
    await supabase.from('negotiations').update(updates).eq('id', id as string)
  }

  const handleAssessmentCarImgUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    setAssessmentCarImgUploading(true)
    try {
      const newUrls: string[] = []
      for (const file of Array.from(files)) {
        const ext = file.name.split('.').pop()
        const path = `assessments/${negotiation.id}/car/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
        const { error } = await supabase.storage.from('vehicle-images').upload(path, file)
        if (error) throw error
        const { data: urlData } = supabase.storage.from('vehicle-images').getPublicUrl(path)
        newUrls.push(urlData.publicUrl)
      }
      const updated = [...assessmentCarImages, ...newUrls]
      setAssessmentCarImages(updated)
      await supabase.from('negotiations').update({ assessment_car_images: updated }).eq('id', negotiation.id)
    } catch (err) {
      console.error('写真アップロードエラー:', err)
      alert('アップロードに失敗しました')
    } finally {
      setAssessmentCarImgUploading(false)
    }
  }

  const deleteAssessmentCarImg = async (index: number) => {
    const updated = assessmentCarImages.filter((_, i) => i !== index)
    setAssessmentCarImages(updated)
    await supabase.from('negotiations').update({ assessment_car_images: updated }).eq('id', negotiation.id)
  }

  const handleAssessmentDocUpload = async (e: React.ChangeEvent<HTMLInputElement>, key: string) => {
    const file = e.target.files?.[0]
    if (!file) return
    setAssessmentDocUploading(key)
    try {
      const ext = file.name.split('.').pop()
      const path = `assessments/${negotiation.id}/docs/${key}_${Date.now()}.${ext}`
      const { error } = await supabase.storage.from('vehicle-images').upload(path, file)
      if (error) throw error
      const { data: urlData } = supabase.storage.from('vehicle-images').getPublicUrl(path)
      const updated = { ...assessmentDocs, [key]: urlData.publicUrl }
      setAssessmentDocs(updated)
      await supabase.from('negotiations').update({ [key]: urlData.publicUrl }).eq('id', negotiation.id)
    } catch (err) {
      console.error('書類アップロードエラー:', err)
      alert('アップロードに失敗しました')
    } finally {
      setAssessmentDocUploading(null)
    }
  }

  const deleteAssessmentDoc = async (key: string) => {
    const updated = { ...assessmentDocs, [key]: null }
    setAssessmentDocs(updated)
    await supabase.from('negotiations').update({ [key]: null }).eq('id', negotiation.id)
  }

  const handleStatusChange = async (status: string) => {
    setLoading(true)
    await supabase.from('negotiations').update({ status }).eq('id', id)
    setNegotiation((n: any) => ({ ...n, status }))
    setLoading(false)
  }

  const handleSaveInfo = async () => {
    setLoadingMessage('保存中...')
    setLoadingOverlay(true)
    await supabase.from('negotiations').update({
      assigned_to: infoForm.assigned_to || null,
      source:      infoForm.source      || null,
      visit_date:  infoForm.visit_date  || null,
    }).eq('id', id as string)
    setEditingInfo(false)
    setLoadingOverlay(false)
    fetchData()
  }

  const handleSavePurchase = async () => {
    setLoadingMessage('保存中...')
    setLoadingOverlay(true)
    await supabase.from('negotiations').update({
      purchase_maker:          purchaseForm.maker          || null,
      purchase_model:          purchaseForm.model          || null,
      purchase_year:           purchaseForm.year          ? parseInt(purchaseForm.year)          : null,
      purchase_mileage:        purchaseForm.mileage       ? parseInt(purchaseForm.mileage)       : null,
      purchase_desired_price:  purchaseForm.desired_price ? parseInt(purchaseForm.desired_price) : null,
      purchase_chassis_number: purchaseForm.chassis_number || null,
      purchase_color:          purchaseForm.color          || null,
      purchase_repair_history: purchaseForm.repair_history,
    }).eq('id', id as string)
    setEditingPurchase(false)
    setLoadingOverlay(false)
    fetchData()
  }

  const handleSaveAssessment = async () => {
    setLoadingMessage('保存中...')
    setLoadingOverlay(true)
    setAssessmentSaving(true)
    const p = parseInt(assessmentForm.purchase) || 0
    const r = parseInt(assessmentForm.recycle)  || 0
    const vAmt = p ? (p - r) : null
    const tAmt = vAmt != null ? Math.floor(vAmt / 11) : null
    const { error } = await supabase.from('negotiations').update({
      assessment_price:  assessmentForm.price   ? parseInt(assessmentForm.price)   : null,
      recycle_price:     assessmentForm.recycle  ? parseInt(assessmentForm.recycle)  : null,
      purchase_amount:   assessmentForm.purchase ? parseInt(assessmentForm.purchase) : null,
      vehicle_amount:    vAmt,
      tax_amount:        tAmt,
      assessment_result: assessmentForm.result || null,
    }).eq('id', id as string)
    setAssessmentSaving(false)
    if (error) {
      console.error('査定結果保存エラー:', error)
      alert('保存に失敗しました: ' + error.message)
      return
    }
    setEditingAssessment(false)
    setLoadingOverlay(false)
    setToast('保存しました')
    fetchData()
  }

  const handleSaveComment = async () => {
    setLoadingMessage('保存中...')
    setLoadingOverlay(true)
    setCommentSaving(true)
    const { error } = await supabase.from('negotiations').update({
      notes: commentText || null,
    }).eq('id', id as string)
    setCommentSaving(false)
    if (error) {
      console.error('コメント保存エラー:', error)
      alert('保存に失敗しました: ' + error.message)
      return
    }
    setLoadingOverlay(false)
    setToast('保存しました')
  }

  if (!negotiation) return <div style={{ padding: '2rem' }}>読み込み中...</div>

  const STATUS_COLOR: any = {
    '商談中': { bg: '#fff3e0', color: '#e65100' },
    '見積済': { bg: '#e8f0fe', color: '#1a73e8' },
    '成約':   { bg: '#e6f4ea', color: '#1e7e34' },
    '失注':   { bg: '#f1f3f4', color: '#5f6368' },
  }
  const RESULT_COLOR: any = {
    '成約':  { bg: '#e6f4ea', color: '#1e7e34' },
    '未成約':{ bg: '#fde8e8', color: '#c0392b' },
    '未定':  { bg: '#f1f3f4', color: '#888'    },
  }

  const src = SOURCE_MAP[negotiation.source]
  const inp = { width: '100%', padding: '7px 10px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '12px', boxSizing: 'border-box' as const }
  const lbl = { fontSize: '11px', color: '#888', fontWeight: 500 as const, display: 'block' as const, marginBottom: '4px' }

  return (
    <div style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto' }}>

      {/* トースト */}
      {loadingOverlay && <LoadingOverlay message={loadingMessage} />}
      {toast && (
        <div style={{ position: 'fixed', bottom: '24px', right: '24px', background: '#1a1a1a', color: 'white', padding: '12px 20px', borderRadius: '8px', fontSize: '13px', fontWeight: 500, zIndex: 9999, boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
          ✅ {toast}
        </div>
      )}

      {/* ヘッダー */}
      <div style={{ marginBottom: '1.5rem' }}>
        <Link href="/negotiations" style={{ fontSize: '13px', color: '#888', textDecoration: 'none' }}>← 商談一覧に戻る</Link>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: '#e8f0fe', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 700, color: '#1a73e8' }}>
              {(negotiation.customers?.氏名 ?? '?')[0]}
            </div>
            <div>
              <h1 style={{ fontSize: '22px', fontWeight: 700, margin: 0 }}>{negotiation.customers?.氏名 ?? '顧客未設定'}</h1>
              <div style={{ display: 'flex', gap: '8px', marginTop: '4px', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '20px', fontWeight: 600, background: STATUS_COLOR[negotiation.status]?.bg, color: STATUS_COLOR[negotiation.status]?.color }}>
                  {negotiation.status}
                </span>
                {src && (
                  <span style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '20px', fontWeight: 600, background: src.bg, color: src.color }}>
                    {src.label}
                  </span>
                )}
                {negotiation.assigned_to && (
                  <span style={{ fontSize: '12px', color: '#888' }}>担当: {negotiation.assigned_to}</span>
                )}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {negotiation.category === 'purchase' && negotiation.vehicle_id && (
              <Link
                href={`/vehicles/${negotiation.vehicle_id}?tab=仕入`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 16px',
                  background: '#f0fdf4',
                  color: '#16a34a',
                  border: '1px solid #bbf7d0',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 500,
                  textDecoration: 'none',
                }}
              >
                🚗 在庫ページへ
              </Link>
            )}
            {negotiation.status === '商談中' && (
              <button onClick={() => handleStatusChange('失注')} disabled={loading}
                style={{ padding: '8px 16px', background: 'white', color: '#e53e3e', border: '1px solid #e53e3e', borderRadius: '8px', fontSize: '13px', cursor: 'pointer' }}>
                失注
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 顧客情報 ＋ 商談情報 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>

        {/* 顧客情報 */}
        <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #eee', padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '14px', fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <i className="ti ti-user" style={{ fontSize: '15px', color: '#888' }} /> 顧客情報
            </h2>
            {negotiation.customer_id && (
              <Link href={`/customers/${negotiation.customer_id}`} style={{ fontSize: '12px', color: '#0070f3', textDecoration: 'none' }}>詳細 →</Link>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[
              ['氏名',    negotiation.customers?.氏名],
              ['電話番号',negotiation.customers?.電話番号],
              ['メール',  negotiation.customers?.メール],
            ].map(([label, value]) => (
              <div key={label} style={{ display: 'flex', fontSize: '13px', borderBottom: '1px solid #f5f5f5', paddingBottom: '8px' }}>
                <span style={{ width: '80px', color: '#888', flexShrink: 0 }}>{label}</span>
                <span>{value ?? '—'}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 商談情報 */}
        <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #eee', padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '14px', fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <i className="ti ti-file-text" style={{ fontSize: '15px', color: '#888' }} /> 商談情報
            </h2>
            <button onClick={() => setEditingInfo(!editingInfo)} style={{ fontSize: '12px', color: '#0070f3', background: 'none', border: 'none', cursor: 'pointer' }}>
              {editingInfo ? 'キャンセル' : '編集'}
            </button>
          </div>

          {editingInfo ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <label style={lbl}>流入経路</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '6px' }}>
                  {SOURCES.map(s => (
                    <button key={s.value} onClick={() => setInfoForm(f => ({ ...f, source: f.source === s.value ? '' : s.value }))}
                      style={{ padding: '4px 10px', borderRadius: '20px', border: 'none', fontSize: '11px', fontWeight: 500, cursor: 'pointer',
                        background: infoForm.source === s.value ? s.color : s.bg,
                        color:      infoForm.source === s.value ? 'white'  : s.color }}>
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <label style={lbl}>担当者</label>
                  <input type="text" value={infoForm.assigned_to} onChange={e => setInfoForm(f => ({ ...f, assigned_to: e.target.value }))}
                    placeholder="山田" style={{ ...inp, marginTop: '0' }} />
                </div>
                <div>
                  <label style={lbl}>来店日</label>
                  <input type="date" value={infoForm.visit_date} onChange={e => setInfoForm(f => ({ ...f, visit_date: e.target.value }))}
                    style={{ ...inp, marginTop: '0' }} />
                </div>
              </div>
              <button onClick={handleSaveInfo} style={{ padding: '8px', background: '#0070f3', color: 'white', border: 'none', borderRadius: '6px', fontSize: '13px', cursor: 'pointer', fontWeight: 500 }}>保存</button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                ['流入経路', src ? <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', fontWeight: 600, background: src.bg, color: src.color }}>{src.label}</span> : '—'],
                ['担当者',  negotiation.assigned_to],
                ['来店日',  negotiation.visit_date],
                ['問合日',  negotiation.inquiry_date ? new Date(negotiation.inquiry_date).toLocaleDateString('ja-JP') : null],
              ].map(([label, value]: any) => (
                <div key={label} style={{ display: 'flex', fontSize: '13px', borderBottom: '1px solid #f5f5f5', paddingBottom: '8px', alignItems: 'center' }}>
                  <span style={{ width: '80px', color: '#888', flexShrink: 0 }}>{label}</span>
                  <span>{value ?? '—'}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 買取車両情報 */}
      {negotiation.category === 'purchase' && (
        <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #a8d5b5', padding: '20px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '14px', fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: '6px', color: '#1e7e34' }}>
              <i className="ti ti-car" style={{ fontSize: '15px', color: '#34a853' }} /> 買取車両情報
            </h2>
            <button onClick={() => setEditingPurchase(!editingPurchase)} style={{ fontSize: '12px', color: '#0070f3', background: 'none', border: 'none', cursor: 'pointer' }}>
              {editingPurchase ? 'キャンセル' : '編集'}
            </button>
          </div>

          {editingPurchase ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={lbl}>メーカー</label>
                  <select value={purchaseForm.maker}
                    onChange={e => {
                      const name = e.target.value
                      const maker = makers.find((m: any) => m.name === name)
                      setPurchaseMakerId(maker?.id || '')
                      setFilteredModels(maker ? allModels.filter((m: any) => m.maker_id === maker.id) : [])
                      setPurchaseForm(f => ({ ...f, maker: name, model: '' }))
                    }}
                    style={inp}>
                    <option value="">選択</option>
                    {makers.map((m: any) => <option key={m.id} value={m.name}>{m.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl}>車種</label>
                  <select value={purchaseForm.model}
                    onChange={e => setPurchaseForm(f => ({ ...f, model: e.target.value }))}
                    disabled={!purchaseMakerId}
                    style={{ ...inp, background: purchaseMakerId ? 'white' : '#f5f5f5' }}>
                    <option value="">{purchaseMakerId ? '選択' : 'メーカーを先に選択'}</option>
                    {filteredModels.map((m: any) => <option key={m.id} value={m.name}>{m.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl}>年式</label>
                  <select value={purchaseForm.year} onChange={e => setPurchaseForm(f => ({ ...f, year: e.target.value }))} style={inp}>
                    <option value="">選択</option>
                    {Array.from({ length: 36 }, (_, i) => 2025 - i).map(y => (
                      <option key={y} value={String(y)}>{y}年</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={lbl}>走行距離（km）</label>
                  <input type="number" value={purchaseForm.mileage} onChange={e => setPurchaseForm(f => ({ ...f, mileage: e.target.value }))} placeholder="50000" style={inp} />
                </div>
                <div>
                  <label style={lbl}>希望買取金額（円）</label>
                  <input type="number" value={purchaseForm.desired_price} onChange={e => setPurchaseForm(f => ({ ...f, desired_price: e.target.value }))} placeholder="2000000" style={inp} />
                </div>
                <div>
                  <label style={lbl}>車台番号</label>
                  <input type="text" value={purchaseForm.chassis_number} onChange={e => setPurchaseForm(f => ({ ...f, chassis_number: e.target.value }))} placeholder="ABC-1234567" style={inp} />
                </div>
                <div>
                  <label style={lbl}>色</label>
                  <input type="text" value={purchaseForm.color} onChange={e => setPurchaseForm(f => ({ ...f, color: e.target.value }))} placeholder="パールホワイト" style={inp} />
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: '2px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
                    <input type="checkbox" checked={purchaseForm.repair_history} onChange={e => setPurchaseForm(f => ({ ...f, repair_history: e.target.checked }))}
                      style={{ width: '16px', height: '16px', cursor: 'pointer' }} />
                    修復歴あり
                  </label>
                </div>
              </div>
              <button onClick={handleSavePurchase} style={{ padding: '8px', background: '#1e7e34', color: 'white', border: 'none', borderRadius: '6px', fontSize: '13px', cursor: 'pointer', fontWeight: 500 }}>保存</button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {[
                ['メーカー',     negotiation.purchase_maker],
                ['車種',         negotiation.purchase_model],
                ['年式',         negotiation.purchase_year   ? negotiation.purchase_year + '年' : null],
                ['走行距離',     negotiation.purchase_mileage ? negotiation.purchase_mileage.toLocaleString() + ' km' : null],
                ['希望買取金額', yen(negotiation.purchase_desired_price)],
                ['車台番号',     negotiation.purchase_chassis_number],
                ['色',           negotiation.purchase_color],
                ['修復歴',       negotiation.purchase_repair_history ? 'あり' : 'なし'],
              ].map(([label, value]: any) => (
                <div key={label} style={{ display: 'flex', fontSize: '13px', borderBottom: '1px solid #f5f5f5', paddingBottom: '8px', alignItems: 'center' }}>
                  <span style={{ width: '100px', color: '#888', flexShrink: 0, fontSize: '12px' }}>{label}</span>
                  <span style={{ color: value ? '#111' : '#ccc' }}>{value ?? '—'}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 所有者情報 */}
      {negotiation.category === 'purchase' && (
        <div style={{ background: 'white', borderRadius: '12px', padding: '24px', border: '1px solid #e5e7eb', marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#111' }}>🪪 車検証上の所有者</h3>
          </div>

          {/* 顧客と同一チェック */}
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginBottom: '16px' }}>
            <input
              type="checkbox"
              checked={ownerSame}
              onChange={async (e) => {
                setOwnerSame(e.target.checked)
                await saveOwnerInfo({ owner_same_as_customer: e.target.checked })
              }}
              style={{ width: '16px', height: '16px', cursor: 'pointer' }}
            />
            <span style={{ fontSize: '14px', color: '#374151' }}>問合せ顧客と同一</span>
          </label>

          {/* 同一でない場合のみ表示 */}
          {!ownerSame && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '16px', background: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>

              {/* 氏名 */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', color: '#6b7280', marginBottom: '6px' }}>所有者氏名</label>
                <input
                  type="text"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  onBlur={async () => await saveOwnerInfo({ owner_name: ownerName || null })}
                  placeholder="例：山田 花子"
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }}
                />
              </div>

              {/* 住所 */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', color: '#6b7280', marginBottom: '6px' }}>所有者住所</label>
                <input
                  type="text"
                  value={ownerAddress}
                  onChange={(e) => setOwnerAddress(e.target.value)}
                  onBlur={async () => await saveOwnerInfo({ owner_address: ownerAddress || null })}
                  placeholder="例：東京都渋谷区..."
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }}
                />
              </div>

              {/* 関係性 */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', color: '#6b7280', marginBottom: '6px' }}>顧客との関係</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
                  {['配偶者', '親族', '法人代表者', 'その他'].map((rel) => (
                    <button
                      key={rel}
                      onClick={async () => {
                        const newVal = ownerRelationship === rel ? '' : rel
                        setOwnerRelationship(newVal)
                        await saveOwnerInfo({ owner_relationship: newVal || null })
                      }}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '20px',
                        border: `1px solid ${ownerRelationship === rel ? '#1a73e8' : '#e5e7eb'}`,
                        background: ownerRelationship === rel ? '#eff6ff' : 'white',
                        color: ownerRelationship === rel ? '#1a73e8' : '#374151',
                        fontSize: '13px',
                        cursor: 'pointer',
                      }}
                    >
                      {rel}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={ownerRelationshipNote}
                  onChange={(e) => setOwnerRelationshipNote(e.target.value)}
                  onBlur={async () => await saveOwnerInfo({ owner_relationship_note: ownerRelationshipNote || null })}
                  placeholder="関係性の詳細（任意）"
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* 査定写真・書類 */}
      {negotiation.category === 'purchase' && (
        <div style={{ background: 'white', borderRadius: '12px', padding: '24px', border: '1px solid #e5e7eb', marginBottom: '16px' }}>
          {/* 査定写真 */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#111' }}>査定写真</h3>
              <label style={{ cursor: 'pointer', padding: '6px 14px', background: 'white', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px', color: '#374151' }}>
                {assessmentCarImgUploading ? 'アップロード中...' : '+ 追加'}
                <input type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handleAssessmentCarImgUpload} disabled={assessmentCarImgUploading} />
              </label>
            </div>
            {assessmentCarImages.length === 0 ? (
              <div style={{ background: '#f9fafb', borderRadius: '8px', padding: '32px', textAlign: 'center', color: '#9ca3af', fontSize: '14px' }}>写真なし</div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '8px' }}>
                {assessmentCarImages.map((url, i) => (
                  <div key={i} style={{ position: 'relative', aspectRatio: '4/3', borderRadius: '8px', overflow: 'hidden', background: '#f3f4f6' }}>
                    <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <button onClick={() => deleteAssessmentCarImg(i)} style={{ position: 'absolute', top: '4px', right: '4px', background: 'rgba(0,0,0,0.6)', color: 'white', border: 'none', borderRadius: '50%', width: '22px', height: '22px', cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid #f3f4f6', margin: '0 0 24px' }} />

          {/* 書類写真 */}
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ margin: '0 0 12px', fontSize: '15px', fontWeight: 600, color: '#111' }}>書類写真</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {ASSESSMENT_DOC_ITEMS.map(({ key, label }) => (
                <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ width: '140px', fontSize: '14px', color: '#374151' }}>{label}</span>
                  {assessmentDocs[key] ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <a href={assessmentDocs[key]!} target="_blank" rel="noopener noreferrer">
                        <img src={assessmentDocs[key]!} alt={label} style={{ width: '60px', height: '45px', objectFit: 'cover', borderRadius: '4px', border: '1px solid #e5e7eb' }} />
                      </a>
                      <label style={{ cursor: 'pointer', fontSize: '12px', color: '#6b7280', textDecoration: 'underline' }}>
                        変更
                        <input type="file" accept="image/*,.pdf" style={{ display: 'none' }} onChange={(e) => handleAssessmentDocUpload(e, key)} />
                      </label>
                      <button onClick={() => deleteAssessmentDoc(key)} style={{ fontSize: '12px', color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}>削除</button>
                    </div>
                  ) : (
                    <label style={{ cursor: 'pointer', padding: '5px 14px', background: 'white', border: '1px solid #93c5fd', borderRadius: '6px', fontSize: '13px', color: '#3b82f6' }}>
                      {assessmentDocUploading === key ? 'アップロード中...' : 'アップロード'}
                      <input type="file" accept="image/*,.pdf" style={{ display: 'none' }} onChange={(e) => handleAssessmentDocUpload(e, key)} disabled={assessmentDocUploading === key} />
                    </label>
                  )}
                </div>
              ))}
            </div>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid #f3f4f6', margin: '0 0 24px' }} />

          {/* 評価点・コメント */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', color: '#6b7280', marginBottom: '6px' }}>評価点</label>
              <input
                type="text"
                value={assessmentScore}
                onChange={(e) => setAssessmentScore(e.target.value)}
                onBlur={async () => {
                  await supabase.from('negotiations').update({ assessment_score: assessmentScore }).eq('id', negotiation.id)
                }}
                placeholder="例：3.5"
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', color: '#6b7280', marginBottom: '6px' }}>査定コメント</label>
              <textarea
                value={assessmentComment}
                onChange={(e) => setAssessmentComment(e.target.value)}
                onBlur={async () => {
                  await supabase.from('negotiations').update({ assessment_comment: assessmentComment }).eq('id', negotiation.id)
                }}
                placeholder="車両状態・特記事項など"
                rows={3}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box', resize: 'vertical' }}
              />
            </div>
          </div>
        </div>
      )}

      {/* 査定結果 */}
      {negotiation.category === 'purchase' && (
        <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #eee', padding: '20px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '14px', fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <i className="ti ti-clipboard-check" style={{ fontSize: '15px', color: '#888' }} /> 査定結果
            </h2>
            <button onClick={() => setEditingAssessment(!editingAssessment)} style={{ fontSize: '12px', color: '#0070f3', background: 'none', border: 'none', cursor: 'pointer' }}>
              {editingAssessment ? 'キャンセル' : '編集'}
            </button>
          </div>

          {editingAssessment ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={lbl}>査定価格（円）</label>
                  <input type="number" value={assessmentForm.price}
                    onChange={e => setAssessmentForm(f => ({ ...f, price: e.target.value }))}
                    placeholder="0" style={{ ...inp, fontSize: '14px' }} />
                </div>
                <div>
                  <label style={lbl}>リサイクル料金（円）</label>
                  <input type="number" value={assessmentForm.recycle}
                    onChange={e => setAssessmentForm(f => ({ ...f, recycle: e.target.value }))}
                    placeholder="0" style={{ ...inp, fontSize: '14px' }} />
                </div>
                <div>
                  <label style={lbl}>買取金額（お客様への支払額・円）</label>
                  <input type="number" value={assessmentForm.purchase}
                    onChange={e => setAssessmentForm(f => ({ ...f, purchase: e.target.value }))}
                    placeholder="0" style={{ ...inp, fontSize: '14px' }} />
                </div>
                <div>
                  <label style={lbl}>商談ステータス</label>
                  <select value={assessmentForm.result}
                    onChange={e => setAssessmentForm(f => ({ ...f, result: e.target.value }))}
                    style={{ ...inp, fontSize: '14px' }}>
                    <option value="未定">未定</option>
                    <option value="成約">成約</option>
                    <option value="未成約">未成約</option>
                  </select>
                </div>
              </div>
              {purchaseNum > 0 && (
                <div style={{ background: '#f8f9fa', borderRadius: '8px', padding: '12px 16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <div style={{ fontSize: '11px', color: '#888', marginBottom: '2px' }}>車両金額（自動計算）</div>
                    <div style={{ fontSize: '16px', fontWeight: 700, color: '#111' }}>
                      {vehicleAmount != null ? '¥' + vehicleAmount.toLocaleString() : '—'}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: '#888', marginBottom: '2px' }}>消費税（自動計算）</div>
                    <div style={{ fontSize: '16px', fontWeight: 700, color: '#111' }}>
                      {taxAmount != null ? '¥' + taxAmount.toLocaleString() : '—'}
                    </div>
                  </div>
                </div>
              )}
              <button onClick={handleSaveAssessment} disabled={assessmentSaving}
                style={{ padding: '8px 20px', background: '#0070f3', color: 'white', border: 'none', borderRadius: '6px', fontSize: '13px',
                  cursor: assessmentSaving ? 'not-allowed' : 'pointer', fontWeight: 500, opacity: assessmentSaving ? 0.7 : 1, width: 'fit-content' }}>
                {assessmentSaving ? '保存中...' : '保存'}
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {([
                ['査定価格',       yen(negotiation.assessment_price)],
                ['リサイクル料金', yen(negotiation.recycle_price)],
                ['買取金額',       yen(negotiation.purchase_amount)],
                ['車両金額',       yen(negotiation.vehicle_amount)],
                ['消費税',         yen(negotiation.tax_amount)],
              ] as [string, string | null][]).map(([label, value]) => (
                <div key={label} style={{ display: 'flex', fontSize: '13px', borderBottom: '1px solid #f5f5f5', paddingBottom: '8px', alignItems: 'center' }}>
                  <span style={{ width: '110px', color: '#888', flexShrink: 0, fontSize: '12px' }}>{label}</span>
                  <span style={{ color: value ? '#111' : '#ccc', fontWeight: value ? 600 : 400 }}>{value ?? '—'}</span>
                </div>
              ))}
              <div style={{ display: 'flex', fontSize: '13px', borderBottom: '1px solid #f5f5f5', paddingBottom: '8px', alignItems: 'center' }}>
                <span style={{ width: '110px', color: '#888', flexShrink: 0, fontSize: '12px' }}>商談ステータス</span>
                {negotiation.assessment_result ? (
                  <span style={{ fontSize: '11px', padding: '2px 10px', borderRadius: '20px', fontWeight: 600,
                    background: RESULT_COLOR[negotiation.assessment_result]?.bg,
                    color:      RESULT_COLOR[negotiation.assessment_result]?.color }}>
                    {negotiation.assessment_result}
                  </span>
                ) : (
                  <span style={{ color: '#ccc' }}>—</span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* コメント欄 */}
      <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #eee', padding: '20px', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '14px', fontWeight: 600, margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <i className="ti ti-message" style={{ fontSize: '15px', color: '#888' }} /> コメント
        </h2>
        <textarea
          value={commentText}
          onChange={e => setCommentText(e.target.value)}
          placeholder="メモ・コメントを入力..."
          rows={4}
          style={{ width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '13px', resize: 'vertical', boxSizing: 'border-box', outline: 'none', marginBottom: '10px', lineHeight: 1.6, fontFamily: 'system-ui, sans-serif' }}
        />
        <button onClick={handleSaveComment} disabled={commentSaving}
          style={{ padding: '8px 20px', background: '#0070f3', color: 'white', border: 'none', borderRadius: '6px', fontSize: '13px',
            cursor: commentSaving ? 'not-allowed' : 'pointer', fontWeight: 500, opacity: commentSaving ? 0.7 : 1 }}>
          {commentSaving ? '保存中...' : '保存'}
        </button>
      </div>

      {/* 失注時 */}
      {negotiation.status === '失注' && (
        <div style={{ background: '#fff3e0', borderRadius: '12px', border: '1px solid #ffe0b2', padding: '20px', marginBottom: '16px' }}>
          <p style={{ margin: '0 0 12px', fontSize: '14px', color: '#e65100', fontWeight: 500 }}>❌ 失注済み　顧客ランクを更新してください</p>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
            {['A', 'B', 'C', 'D', 'E'].map(rank => (
              <button key={rank} onClick={async () => {
                await supabase.from('customers').update({ purchase_rank: rank }).eq('id', negotiation.customer_id)
                alert(`顧客ランクを${rank}に更新しました`)
              }} style={{ padding: '8px 20px', borderRadius: '20px', border: '1.5px solid #ddd', background: 'white', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>
                {rank}
              </button>
            ))}
          </div>
          <div style={{ fontSize: '12px', color: '#888' }}>A:すぐ買う　B:1ヶ月以内　C:2〜3ヶ月　D:まだ先　E:買う気なし</div>
        </div>
      )}

      {/* 成約時 */}
      {negotiation.status === '成約' && negotiation.category !== 'purchase' && (
        <div style={{ background: '#e6f4ea', borderRadius: '12px', border: '1px solid #a8d5b5', padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <p style={{ margin: 0, fontSize: '14px', color: '#1e7e34', fontWeight: 500 }}>✅ 成約済み</p>
          <Link href="/deliveries" style={{ padding: '10px 20px', background: '#1e7e34', color: 'white', borderRadius: '8px', textDecoration: 'none', fontSize: '14px', fontWeight: 500 }}>
            納車管理へ →
          </Link>
        </div>
      )}

      {/* 買取契約書 */}
      {negotiation.category === 'purchase' && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginBottom: '16px' }}>
          {negotiation.vehicle_id && (
            <Link
              href={`/vehicles/${negotiation.vehicle_id}?tab=仕入`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '10px 20px',
                background: '#f0fdf4',
                color: '#16a34a',
                border: '1px solid #bbf7d0',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 500,
                textDecoration: 'none',
              }}
            >
              🚗 在庫ページへ →
            </Link>
          )}
          <Link href={`/negotiations/${id}/purchase-contract`}
            style={{ padding: '10px 20px', background: '#e65100', color: 'white', borderRadius: '8px', textDecoration: 'none', fontSize: '13px', fontWeight: 500 }}>
            📋 買取契約書を作成
          </Link>
        </div>
      )}

      {/* 削除 */}
      {isAdmin && (
        <button onClick={async () => {
          if (!confirm('この商談を削除BOXに移動しますか？')) return
          await supabase.from('negotiations').update({ deleted_at: new Date().toISOString() }).eq('id', id as string)
          window.location.href = '/negotiations'
        }} style={{ padding: '8px 16px', background: '#fff5f5', color: '#e53e3e', borderRadius: '8px', border: '1px solid #fce8e6', fontSize: '13px', cursor: 'pointer' }}>
          🗑 削除
        </button>
      )}
    </div>
  )
}
