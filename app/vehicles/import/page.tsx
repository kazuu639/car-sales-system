'use client'
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Papa from 'papaparse'
import LoadingOverlay from '@/components/LoadingOverlay'

const DB_FIELDS = [
  { value: '', label: '（未割当）' },
  { value: 'db_number', label: '管理番号' },
  { value: 'maker_name', label: 'メーカー名' },
  { value: 'model_name', label: '車種名' },
  { value: 'year', label: '年式' },
  { value: 'mileage', label: '走行距離' },
  { value: 'shift', label: 'シフト（AT/MT）' },
  { value: 'color_name', label: '色' },
  { value: 'chassis_number', label: '車体番号' },
  { value: 'car_number', label: '車両ナンバー' },
  { value: 'inspection_date', label: '車検日' },
  { value: 'stock_date', label: '入庫日' },
  { value: 'purchase_type', label: '仕入区分' },
  { value: 'status', label: 'ステータス' },
  { value: 'repair_history', label: '修復歴（有/無）' },
  { value: 'purchase_price', label: '仕入価格' },
  { value: 'body_price', label: '車体価格' },
  { value: 'total_price', label: '総額' },
]

const inp: React.CSSProperties = { width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '13px', boxSizing: 'border-box' }
const lbl: React.CSSProperties = { fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px' }

type ParsedRow = Record<string, string>

export default function VehicleImportPage() {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [headers, setHeaders] = useState<string[]>([])
  const [rows, setRows] = useState<ParsedRow[]>([])
  const [mapping, setMapping] = useState<Record<string, string>>({})
  const [loadingOverlay, setLoadingOverlay] = useState(false)
  const [loadingMessage, setLoadingMessage] = useState('取込み中...')
  const [result, setResult] = useState<{ success: number; errors: string[] } | null>(null)

  const decodeCSV = (buffer: ArrayBuffer): string => {
    const utf8 = new TextDecoder('utf-8').decode(buffer)
    const firstLine = utf8.split('\n')[0]
    const hasGarbled = /[�]/.test(firstLine) || /[\x80-\x9F]/.test(firstLine)
    if (hasGarbled) {
      try {
        return new TextDecoder('shift-jis').decode(buffer)
      } catch {
        return utf8
      }
    }
    return utf8
  }

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const buffer = ev.target?.result as ArrayBuffer
      const text = decodeCSV(buffer)
      const parsed = Papa.parse<ParsedRow>(text, { header: true, skipEmptyLines: true })
      const hdrs = parsed.meta.fields || []
      setHeaders(hdrs)
      setRows(parsed.data)
      // 自動マッピング: ヘッダー名がDBフィールドのlabelと部分一致したら自動選択
      const autoMap: Record<string, string> = {}
      hdrs.forEach(h => {
        const lower = h.toLowerCase()
        const found = DB_FIELDS.find(f => f.value && (
          lower.includes(f.value) ||
          lower.includes(f.label.replace(/（.*?）/g, '').toLowerCase())
        ))
        autoMap[h] = found?.value || ''
      })
      setMapping(autoMap)
      setResult(null)
    }
    reader.readAsArrayBuffer(file)
  }

  const getMappedValue = (row: ParsedRow, fieldName: string): string => {
    const csvCol = Object.entries(mapping).find(([, v]) => v === fieldName)?.[0]
    return csvCol ? (row[csvCol] || '').trim() : ''
  }

  const generateDbNumber = async (): Promise<string> => {
    const { data: last } = await supabase
      .from('vehicles')
      .select('db_number')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
    let nextNumber = 1
    if (last?.db_number) {
      const match = last.db_number.match(/V-(\d+)/)
      if (match) nextNumber = parseInt(match[1]) + 1
    }
    return `V-${String(nextNumber).padStart(3, '0')}`
  }

  const handleImport = async () => {
    setLoadingMessage('マスターデータを取得中...')
    setLoadingOverlay(true)
    const errors: string[] = []
    let successCount = 0

    try {
      // マスターデータ一括取得
      const [{ data: makers }, { data: models }, { data: colors }, { data: countries }] = await Promise.all([
        supabase.from('master_makers').select('id, name, country_id'),
        supabase.from('master_models').select('id, name, maker_id'),
        supabase.from('master_colors').select('id, name'),
        supabase.from('master_countries').select('id, name'),
      ])
      const makerList = makers || []
      const modelList = models || []
      const colorList = colors || []
      const countryList = countries || []

      // '不明' country を取得 or 作成
      let unknownCountryId: string | null = null
      const unknownCountry = countryList.find(c => c.name === '不明')
      if (unknownCountry) {
        unknownCountryId = unknownCountry.id
      } else {
        const { data: newCountry } = await supabase.from('master_countries').insert({ name: '不明' }).select('id').single()
        unknownCountryId = newCountry?.id ?? null
      }

      setLoadingMessage(`0 / ${rows.length} 行取込み中...`)

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i]
        setLoadingMessage(`${i + 1} / ${rows.length} 行取込み中...`)
        try {
          const makerName = getMappedValue(row, 'maker_name')
          const modelName = getMappedValue(row, 'model_name')
          const colorName = getMappedValue(row, 'color_name')

          // メーカー解決
          let makerId: string | null = null
          if (makerName) {
            const found = makerList.find(m => m.name.includes(makerName) || makerName.includes(m.name))
            if (found) {
              makerId = found.id
            } else {
              const { data: newMaker } = await supabase
                .from('master_makers')
                .insert({ name: makerName, country_id: unknownCountryId })
                .select('id, name, country_id')
                .single()
              if (newMaker) { makerList.push(newMaker); makerId = newMaker.id }
            }
          }

          // 車種解決
          let modelId: string | null = null
          if (modelName && makerId) {
            const found = modelList.find(m => m.maker_id === makerId && (m.name.includes(modelName) || modelName.includes(m.name)))
            if (found) {
              modelId = found.id
            } else {
              const { data: newModel } = await supabase
                .from('master_models')
                .insert({ name: modelName, maker_id: makerId })
                .select('id, name, maker_id')
                .single()
              if (newModel) { modelList.push(newModel); modelId = newModel.id }
            }
          }

          // 色解決
          let colorId: string | null = null
          if (colorName) {
            const found = colorList.find(c => c.name.includes(colorName) || colorName.includes(c.name))
            if (found) {
              colorId = found.id
            } else {
              const { data: newColor } = await supabase
                .from('master_colors')
                .insert({ name: colorName })
                .select('id, name')
                .single()
              if (newColor) { colorList.push(newColor); colorId = newColor.id }
            }
          }

          // 管理番号
          const dbNumber = getMappedValue(row, 'db_number') || await generateDbNumber()

          // 修復歴
          const repairRaw = getMappedValue(row, 'repair_history').toLowerCase()
          const repairHistory = repairRaw === 'true' || repairRaw === '有' || repairRaw === '1' || repairRaw === 'yes'

          const payload: Record<string, any> = {
            db_number: dbNumber,
            maker_id: makerId,
            model_id: modelId,
            color_id: colorId,
            car_name: modelName || null,
            year: getMappedValue(row, 'year') ? parseInt(getMappedValue(row, 'year')) : null,
            mileage: getMappedValue(row, 'mileage') ? parseInt(getMappedValue(row, 'mileage').replace(/,/g, '')) : null,
            shift: getMappedValue(row, 'shift') || null,
            chassis_number: getMappedValue(row, 'chassis_number') || null,
            car_number: getMappedValue(row, 'car_number') || null,
            inspection_date: getMappedValue(row, 'inspection_date') || null,
            stock_date: getMappedValue(row, 'stock_date') || null,
            purchase_type: getMappedValue(row, 'purchase_type') || null,
            status: getMappedValue(row, 'status') || '在庫中',
            repair_history: repairHistory,
            purchase_price: getMappedValue(row, 'purchase_price') ? parseInt(getMappedValue(row, 'purchase_price').replace(/,/g, '')) : null,
            body_price: getMappedValue(row, 'body_price') ? parseInt(getMappedValue(row, 'body_price').replace(/,/g, '')) : null,
            total_price: getMappedValue(row, 'total_price') ? parseInt(getMappedValue(row, 'total_price').replace(/,/g, '')) : null,
          }

          const { error } = await supabase.from('vehicles').insert(payload)
          if (error) throw error
          successCount++
        } catch (err: any) {
          errors.push(`行${i + 2}: ${err.message || String(err)}`)
        }
      }
    } catch (err: any) {
      errors.push(`致命的エラー: ${err.message || String(err)}`)
    } finally {
      setLoadingOverlay(false)
      setResult({ success: successCount, errors })
    }
  }

  const previewRows = rows.slice(0, 5)

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '24px' }}>
      {loadingOverlay && <LoadingOverlay message={loadingMessage} />}

      {/* ヘッダー */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <button onClick={() => router.push('/vehicles')} style={{ padding: '8px 16px', background: 'white', border: '1px solid #ddd', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}>← 戻る</button>
        <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 700 }}>車両CSV取込み</h1>
      </div>

      {/* ファイル選択 */}
      <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #eee', overflow: 'hidden', marginBottom: '20px' }}>
        <div style={{ padding: '12px 20px', background: '#E6F1FB', borderBottom: '1px solid #B5D4F4' }}>
          <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#0C447C' }}>① CSVファイルを選択</h3>
        </div>
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
          <input ref={fileRef} type="file" accept=".csv" onChange={handleFile} style={{ display: 'none' }} />
          <button onClick={() => fileRef.current?.click()}
            style={{ padding: '12px 32px', background: '#1a73e8', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>
            CSVファイルを選択
          </button>
          {rows.length > 0 && (
            <p style={{ margin: 0, fontSize: '13px', color: '#1e7e34', fontWeight: 600 }}>
              ✓ {rows.length}行 × {headers.length}列 を読み込みました
            </p>
          )}
          <p style={{ margin: 0, fontSize: '12px', color: '#9ca3af' }}>UTF-8 / Shift-JIS 両対応</p>
        </div>
      </div>

      {/* マッピング */}
      {headers.length > 0 && (
        <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #eee', overflow: 'hidden', marginBottom: '20px' }}>
          <div style={{ padding: '12px 20px', background: '#E6F1FB', borderBottom: '1px solid #B5D4F4' }}>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#0C447C' }}>② 列マッピング</h3>
          </div>
          <div style={{ padding: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {headers.map(h => (
              <div key={h}>
                <label style={lbl}>{h}</label>
                <select
                  value={mapping[h] || ''}
                  onChange={e => setMapping(m => ({ ...m, [h]: e.target.value }))}
                  style={inp}
                >
                  {DB_FIELDS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                </select>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* プレビュー */}
      {previewRows.length > 0 && (
        <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #eee', overflow: 'hidden', marginBottom: '20px' }}>
          <div style={{ padding: '12px 20px', background: '#F0FDF4', borderBottom: '1px solid #BBF7D0' }}>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#14532D' }}>③ プレビュー（先頭5行）</h3>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ background: '#f8f9fa' }}>
                  {headers.map(h => (
                    <th key={h} style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid #eee', whiteSpace: 'nowrap', color: mapping[h] ? '#1a73e8' : '#9ca3af', fontWeight: mapping[h] ? 600 : 400 }}>
                      {h}
                      {mapping[h] && <div style={{ fontSize: '10px', color: '#1a73e8', fontWeight: 400 }}>→ {DB_FIELDS.find(f => f.value === mapping[h])?.label}</div>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewRows.map((row, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f3f4f6', background: i % 2 === 0 ? 'white' : '#fafafa' }}>
                    {headers.map(h => (
                      <td key={h} style={{ padding: '8px 12px', whiteSpace: 'nowrap', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {row[h]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 実行ボタン */}
      {rows.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginBottom: '20px' }}>
          <button onClick={() => router.push('/vehicles')}
            style={{ padding: '10px 24px', background: 'white', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px', cursor: 'pointer' }}>
            キャンセル
          </button>
          <button onClick={handleImport}
            style={{ padding: '10px 32px', background: '#1a73e8', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>
            取込み実行（{rows.length}件）
          </button>
        </div>
      )}

      {/* 結果表示 */}
      {result && (
        <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #eee', overflow: 'hidden', marginBottom: '40px' }}>
          <div style={{ padding: '12px 20px', background: result.errors.length > 0 ? '#FFF7ED' : '#F0FDF4', borderBottom: `1px solid ${result.errors.length > 0 ? '#FED7AA' : '#BBF7D0'}` }}>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: result.errors.length > 0 ? '#7C2D12' : '#14532D' }}>
              取込み結果
            </h3>
          </div>
          <div style={{ padding: '20px' }}>
            <p style={{ margin: '0 0 8px', fontSize: '15px', fontWeight: 600, color: '#1e7e34' }}>
              ✓ 成功: {result.success}件
            </p>
            {result.errors.length > 0 && (
              <>
                <p style={{ margin: '0 0 8px', fontSize: '15px', fontWeight: 600, color: '#c62828' }}>
                  ✗ エラー: {result.errors.length}件
                </p>
                <div style={{ background: '#fce8e6', borderRadius: '8px', padding: '12px', fontSize: '12px', color: '#c62828', maxHeight: '200px', overflowY: 'auto' }}>
                  {result.errors.map((e, i) => <div key={i}>{e}</div>)}
                </div>
              </>
            )}
            {result.success > 0 && (
              <button onClick={() => router.push('/vehicles')}
                style={{ marginTop: '16px', padding: '10px 24px', background: '#1e7e34', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>
                在庫一覧へ
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
