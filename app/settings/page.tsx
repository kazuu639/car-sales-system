'use client'
import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

type DocumentBox = {
  id: string
  box_number: string
  is_occupied: boolean
  vehicle_id: string | null
  vehicles?: {
    db_number: string
    master_makers: { name: string } | null
    master_models: { name: string } | null
    status: string
  } | null
}

const MANUAL_SECTIONS = [
  {
    title: '🚗 車両登録',
    content: `1. 左メニューの「在庫管理」→「＋ 車両登録」をクリック
2. メーカー・車種・年式・走行距離などを入力
3. 写真をアップロード
4. 仕入情報（仕入日・仕入金額・担当者）を入力
5. 「登録する」ボタンをクリック

【ポイント】
・管理番号（DB番号）は自動採番されます
・WEB掲載チェックは車両詳細ページで設定できます
・財務明細（入出金）は車両詳細の「財務」タブから登録してください`
  },
  {
    title: '📋 問合登録',
    content: `1. 左メニューの「問合」→「＋ 新規問合」をクリック
2. 流入経路（カーセンサー・グーネット・HP等）を選択
3. お客様名・電話番号・希望車種を入力
4. 担当者を入力して「保存」

【ポイント】
・流入経路はレポートページで集計されます
・問合一覧でCSVダウンロードができます`
  },
  {
    title: '🤝 商談登録',
    content: `1. 左メニューの「商談」→「＋ 商談登録」をクリック
2. 顧客・対象車両・流入経路・担当者を選択
3. 来店日があれば入力
4. 「登録する」ボタンをクリック

【ポイント】
・商談詳細で検討車両を複数追加できます
・見積り→成約の流れで進めます
・失注時は顧客ランク（A〜E）を更新してください`
  },
  {
    title: '🚚 納車管理',
    content: `納車は3つの条件がすべて完了すると納車ボタンが表示されます。

① 入金確認
・現金 or ローンを選択
・ローンの場合はOK番号を入力

② 書類・名義変更
・委任状・印鑑証明・車庫証明の受取をチェック
・登録済み車検証番号を入力

③ 契約業務
・ローン申込・車検登録・整備・クリーニングをチェック

【ポイント】
・進行メーターで契約から何日目かが確認できます（2週間ベース）`
  },
  {
    title: '💴 財務・会計',
    content: `【車両財務】
・車両詳細の「財務」タブから入出金明細を登録
・区分：1-1仕入金額 / 2-1仕入経費 / 2-2在庫経費 / 2-3販売経費 / 3-1売上 / 3-2売上雑収入 / 4-1納車後
・支払方法：現金金庫 or 銀行（仮想BK）

【会計ページ】
・左メニューの「会計」で金庫・銀行の入出金を管理
・月別に入出金履歴を確認できます

【レポート】
・左メニューの「レポート」で売上・粗利・問合経路・スタッフ別成績を確認`
  },
  {
    title: '📁 書類BOX',
    content: `書類BOXは物理的な棚と連動して書類を管理します。

・001〜030（在庫上限分）のBOXが用意されています
・車両契約時に書類BOXを割り当てます
・書類（委任状・印鑑証明・車庫証明など）をBOX番号の棚に入れます
・納車完了で自動的に空きになります

【確認方法】
・設定ページの「書類BOX」タブで使用状況を確認できます
・管理画面の「書類BOX」タブでも確認できます`
  },
]

export default function SettingsPage() {
  const [tab, setTab] = useState<'manual' | 'box' | 'estimate' | 'masters' | 'display'>('manual')
  const [boxes, setBoxes] = useState<DocumentBox[]>([])
  const [openSection, setOpenSection] = useState<number | null>(0)
  const [loading, setLoading] = useState(false)
  const [fontSize, setFontSize] = useState<'small' | 'medium' | 'large'>('medium')

  // マスタ管理
  const [masterTab, setMasterTab] = useState<'makers' | 'models' | 'colors' | 'countries' | 'expenses'>('makers')
  const [countries, setCountries] = useState<any[]>([])
  const [makers, setMakers] = useState<any[]>([])
  const [models, setModels] = useState<any[]>([])
  const [colors, setColors] = useState<any[]>([])
  const [expenses, setExpenses] = useState<any[]>([])
  const [expenseLoading, setExpenseLoading] = useState(false)
  const [editingExpense, setEditingExpense] = useState<string | null>(null)
  const [editingExpenseAmount, setEditingExpenseAmount] = useState('')
  const [newName, setNewName] = useState('')
  const [selectedCountry, setSelectedCountry] = useState('')
  const [selectedMaker, setSelectedMaker] = useState('')
  const [masterLoading, setMasterLoading] = useState(false)
  const [masterSearch, setMasterSearch] = useState('')
  const [modelMakerFilter, setModelMakerFilter] = useState('')
  const [csvMessage, setCsvMessage] = useState('')
  const csvInputRef = useRef<HTMLInputElement>(null)

  const fetchExpenses = async () => {
    setExpenseLoading(true)
    const { data } = await supabase
      .from('expense_master')
      .select('*')
      .order('sort_order')
    setExpenses(data || [])
    setExpenseLoading(false)
  }

  const fetchMasters = async () => {
    const [c, m, mo, col] = await Promise.all([
      supabase.from('master_countries').select('*').order('sort_order'),
      supabase.from('master_makers').select('*, master_countries(name)').order('sort_order'),
      supabase.from('master_models').select('*, master_makers(name)').order('sort_order'),
      supabase.from('master_colors').select('*').order('sort_order'),
    ])
    setCountries(c.data ?? [])
    setMakers(m.data ?? [])
    setModels(mo.data ?? [])
    setColors(col.data ?? [])
  }

  useEffect(() => {
    const saved = localStorage.getItem('fontSize') as 'small' | 'medium' | 'large' | null
    if (saved) setFontSize(saved)
  }, [])

  const handleFontSize = (size: 'small' | 'medium' | 'large') => {
    setFontSize(size)
    localStorage.setItem('fontSize', size)
    document.documentElement.setAttribute('data-fontsize', size)
    const zoom = size === 'small' ? '0.875' : size === 'large' ? '1.125' : '1'
    document.documentElement.style.zoom = zoom
    alert('文字サイズを変更しました')
  }

  useEffect(() => {
    if (tab === 'box') {
      setLoading(true)
      supabase.from('document_boxes')
        .select('*, vehicles(db_number, master_makers(name), master_models(name), status)')
        .order('box_number')
        .then(({ data }) => { setBoxes(data ?? []); setLoading(false) })
    }
    if (tab === 'masters') { fetchMasters(); fetchExpenses() }
  }, [tab])

  const occupiedBoxes = boxes.filter(b => b.is_occupied).length

  const handleMasterAdd = async () => {
    if (!newName.trim()) return
    setMasterLoading(true)
    if (masterTab === 'countries') {
      await supabase.from('master_countries').insert({ name: newName, sort_order: countries.length + 1 })
    } else if (masterTab === 'makers') {
      if (!selectedCountry) { alert('国を選択してください'); setMasterLoading(false); return }
      await supabase.from('master_makers').insert({ name: newName, country_id: selectedCountry, sort_order: makers.length + 1 })
    } else if (masterTab === 'models') {
      if (!selectedMaker) { alert('メーカーを選択してください'); setMasterLoading(false); return }
      await supabase.from('master_models').insert({ name: newName, maker_id: selectedMaker, sort_order: models.length + 1 })
    } else if (masterTab === 'colors') {
      await supabase.from('master_colors').insert({ name: newName, sort_order: colors.length + 1 })
    }
    setNewName('')
    await fetchMasters()
    setMasterLoading(false)
  }

  const handleMasterDelete = async (table: string, id: string) => {
    if (!confirm('削除しますか？')) return
    await (supabase.from(table as any) as any).delete().eq('id', id)
    await fetchMasters()
  }

  const masterListData = masterTab === 'makers' ? makers : masterTab === 'models' ? models : masterTab === 'colors' ? colors : countries
  const masterTableMap: Record<string, string> = { makers: 'master_makers', models: 'master_models', colors: 'master_colors', countries: 'master_countries' }

  const filteredMasterList = masterListData.filter(item => {
    const matchSearch = !masterSearch || item.name.toLowerCase().includes(masterSearch.toLowerCase())
    const matchMaker = masterTab !== 'models' || !modelMakerFilter || item.maker_id === modelMakerFilter
    return matchSearch && matchMaker
  })

  const handleCsvDownload = () => {
    const fileNames: Record<string, string> = { makers: 'makers.csv', models: 'models.csv', colors: 'colors.csv', countries: 'countries.csv' }
    let lines: string[]
    if (masterTab === 'makers') {
      lines = ['name,country_name', ...makers.map(m => `${m.name},${m.master_countries?.name ?? ''}`)]
    } else if (masterTab === 'models') {
      lines = ['name,maker_name', ...models.map(m => `${m.name},${m.master_makers?.name ?? ''}`)]
    } else if (masterTab === 'colors') {
      lines = ['name', ...colors.map(c => c.name)]
    } else {
      lines = ['name', ...countries.map(c => c.name)]
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = fileNames[masterTab]; a.click()
    URL.revokeObjectURL(url)
  }

  const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const text = await file.text()
    const lines = text.trim().split('\n').slice(1).map(l => l.trim()).filter(Boolean)
    let added = 0
    if (masterTab === 'countries') {
      const existing = new Set(countries.map(c => c.name.toLowerCase()))
      for (const name of lines) {
        if (existing.has(name.toLowerCase())) continue
        await supabase.from('master_countries').insert({ name, sort_order: countries.length + added + 1 })
        added++
      }
    } else if (masterTab === 'colors') {
      const existing = new Set(colors.map(c => c.name.toLowerCase()))
      for (const name of lines) {
        if (existing.has(name.toLowerCase())) continue
        await supabase.from('master_colors').insert({ name, sort_order: colors.length + added + 1 })
        added++
      }
    } else if (masterTab === 'makers') {
      const existing = new Set(makers.map(m => m.name.toLowerCase()))
      for (const line of lines) {
        const [name, countryName] = line.split(',').map(s => s.trim())
        if (!name || existing.has(name.toLowerCase())) continue
        const country = countries.find(c => c.name.toLowerCase() === (countryName ?? '').toLowerCase())
        if (!country) continue
        await supabase.from('master_makers').insert({ name, country_id: country.id, sort_order: makers.length + added + 1 })
        added++
      }
    } else if (masterTab === 'models') {
      const existing = new Set(models.map(m => m.name.toLowerCase()))
      for (const line of lines) {
        const [name, makerName] = line.split(',').map(s => s.trim())
        if (!name || existing.has(name.toLowerCase())) continue
        const maker = makers.find(m => m.name.toLowerCase() === (makerName ?? '').toLowerCase())
        if (!maker) continue
        await supabase.from('master_models').insert({ name, maker_id: maker.id, sort_order: models.length + added + 1 })
        added++
      }
    }
    if (csvInputRef.current) csvInputRef.current.value = ''
    await fetchMasters()
    setCsvMessage(`${added}件追加しました`)
    setTimeout(() => setCsvMessage(''), 3000)
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
      {/* ヘッダー */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 700, margin: 0 }}>設定</h1>
        <p style={{ fontSize: '13px', color: '#888', margin: '4px 0 0' }}>マニュアル・書類BOX・見積テンプレート</p>
      </div>

      {/* タブ */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', background: '#f1f3f4', borderRadius: '10px', padding: '4px', width: 'fit-content' }}>
        {[
          { key: 'manual',   label: '📖 マニュアル' },
          { key: 'box',      label: '📁 書類BOX' },
          { key: 'estimate', label: '📝 見積テンプレート' },
          { key: 'masters',  label: '🏷️ マスタ管理' },
          { key: 'display',  label: '🖥️ 表示設定' },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key as any)} style={{
            padding: '7px 20px', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 500, cursor: 'pointer',
            background: tab === t.key ? 'white' : 'transparent',
            color: tab === t.key ? '#111' : '#888',
            boxShadow: tab === t.key ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
          }}>{t.label}</button>
        ))}
      </div>

      {/* ===== マニュアルタブ ===== */}
      {tab === 'manual' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ background: '#e8f0fe', borderRadius: '10px', padding: '14px 18px', marginBottom: '8px' }}>
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#1a73e8', marginBottom: '4px' }}>📖 Brain Base 操作マニュアル</div>
            <div style={{ fontSize: '12px', color: '#1a73e8' }}>各セクションをクリックして展開できます</div>
          </div>

          {MANUAL_SECTIONS.map((section, i) => (
            <div key={i} style={{ background: 'white', borderRadius: '12px', border: '1px solid #eee', overflow: 'hidden' }}>
              <button onClick={() => setOpenSection(openSection === i ? null : i)}
                style={{ width: '100%', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                <span style={{ fontSize: '14px', fontWeight: 600, color: '#111' }}>{section.title}</span>
                <span style={{ fontSize: '16px', color: '#aaa' }}>{openSection === i ? '▲' : '▼'}</span>
              </button>
              {openSection === i && (
                <div style={{ padding: '0 20px 20px', borderTop: '1px solid #f0f0f0' }}>
                  <pre style={{ fontSize: '13px', color: '#444', lineHeight: 1.8, margin: '16px 0 0', whiteSpace: 'pre-wrap', fontFamily: 'system-ui, sans-serif' }}>
                    {section.content}
                  </pre>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ===== 書類BOXタブ ===== */}
      {tab === 'box' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <span style={{ fontSize: '15px', fontWeight: 600 }}>書類BOX一覧</span>
              <span style={{ fontSize: '13px', color: '#888', marginLeft: '8px' }}>使用中 {occupiedBoxes}個 / 全{boxes.length}個</span>
            </div>
            <div style={{ display: 'flex', gap: '12px', fontSize: '12px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#e8f0fe', display: 'inline-block' }} />使用中
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#f5f5f5', display: 'inline-block' }} />空き
              </span>
            </div>
          </div>

          {loading ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#aaa' }}>読み込み中...</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '8px' }}>
              {boxes.map(box => (
                <div key={box.id} style={{
                  padding: '14px', borderRadius: '10px',
                  border: `1px solid ${box.is_occupied ? '#93b4f0' : '#eee'}`,
                  background: box.is_occupied ? '#e8f0fe' : '#fafafa',
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: '20px', fontWeight: 700, color: box.is_occupied ? '#1a73e8' : '#ccc', marginBottom: '6px' }}>
                    {box.box_number}
                  </div>
                  {box.is_occupied && box.vehicles ? (
                    <div style={{ fontSize: '10px', color: '#1a73e8', lineHeight: 1.5 }}>
                      <div style={{ fontWeight: 600 }}>{box.vehicles.db_number}</div>
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {box.vehicles.master_makers?.name} {box.vehicles.master_models?.name}
                      </div>
                      <div style={{ marginTop: '3px', padding: '1px 6px', borderRadius: '10px', background: '#c8dffe', fontSize: '9px' }}>
                        {box.vehicles.status}
                      </div>
                    </div>
                  ) : (
                    <div style={{ fontSize: '11px', color: '#ccc' }}>空き</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ===== 見積テンプレートタブ ===== */}
      {tab === 'estimate' && (
        <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #eee', padding: '40px', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📝</div>
          <div style={{ fontSize: '16px', fontWeight: 600, color: '#111', marginBottom: '8px' }}>見積テンプレート設定</div>
          <div style={{ fontSize: '13px', color: '#aaa', marginBottom: '24px' }}>
            見積書のテンプレート・諸費用項目・ローン会社などを設定できます
          </div>
          <div style={{ display: 'inline-block', padding: '8px 20px', background: '#e8f0fe', color: '#1a73e8', borderRadius: '20px', fontSize: '12px', fontWeight: 500 }}>
            🚧 開発予定
          </div>
        </div>
      )}

      {/* ===== マスタ管理タブ ===== */}
      {tab === 'masters' && (
        <div>
          {/* サブタブ */}
          <div style={{ display: 'flex', gap: '0', borderBottom: '1px solid #eee', marginBottom: '20px' }}>
            {([
              { key: 'makers',    label: 'メーカー管理' },
              { key: 'models',    label: '車種管理' },
              { key: 'colors',    label: '色マスタ' },
              { key: 'countries', label: '国マスタ' },
              { key: 'expenses', label: '諸費用マスタ' },
            ] as const).map(t => (
              <button key={t.key} onClick={() => { setMasterTab(t.key); setNewName(''); setSelectedCountry(''); setSelectedMaker(''); setMasterSearch(''); setModelMakerFilter('') }} style={{
                padding: '10px 20px', background: 'none', border: 'none', cursor: 'pointer',
                fontSize: '14px', fontWeight: masterTab === t.key ? 600 : 400,
                color: masterTab === t.key ? '#0070f3' : '#555',
                borderBottom: masterTab === t.key ? '2px solid #0070f3' : '2px solid transparent',
              }}>{t.label}</button>
            ))}
          </div>

          {masterTab !== 'expenses' && (
            <>
              {/* 検索・CSV操作バー */}
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap' }}>
                <input
                  type="text"
                  value={masterSearch}
                  onChange={e => setMasterSearch(e.target.value)}
                  placeholder="名前で検索..."
                  style={{ flex: 1, minWidth: '160px', padding: '8px 12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '13px' }}
                />
                {masterTab === 'models' && (
                  <select value={modelMakerFilter} onChange={e => setModelMakerFilter(e.target.value)}
                    style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '13px' }}>
                    <option value="">全メーカー</option>
                    {makers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                )}
                <div style={{ display: 'flex', gap: '6px', marginLeft: 'auto' }}>
                  <button onClick={handleCsvDownload}
                    style={{ padding: '8px 14px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '13px', background: 'white', cursor: 'pointer', color: '#444', fontWeight: 500 }}>
                    ↓ CSV
                  </button>
                  <button onClick={() => csvInputRef.current?.click()}
                    style={{ padding: '8px 14px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '13px', background: 'white', cursor: 'pointer', color: '#444', fontWeight: 500 }}>
                    ↑ CSV取込
                  </button>
                  <input ref={csvInputRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={handleCsvUpload} />
                </div>
                {csvMessage && (
                  <span style={{ fontSize: '13px', color: '#0070f3', fontWeight: 500 }}>{csvMessage}</span>
                )}
              </div>

              {/* 追加フォーム */}
              <div style={{ background: 'white', border: '1px solid #eee', borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
                <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '12px' }}>新規追加</div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {masterTab === 'makers' && (
                    <select value={selectedCountry} onChange={e => setSelectedCountry(e.target.value)}
                      style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px' }}>
                      <option value="">国を選択</option>
                      {countries.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  )}
                  {masterTab === 'models' && (
                    <select value={selectedMaker} onChange={e => setSelectedMaker(e.target.value)}
                      style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px' }}>
                      <option value="">メーカーを選択</option>
                      {makers.map(m => <option key={m.id} value={m.id}>{m.master_countries?.name} - {m.name}</option>)}
                    </select>
                  )}
                  <input type="text" value={newName} onChange={e => setNewName(e.target.value)}
                    placeholder="名前を入力"
                    onKeyDown={e => e.key === 'Enter' && handleMasterAdd()}
                    style={{ flex: 1, padding: '8px 12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px', minWidth: '150px' }} />
                  <button onClick={handleMasterAdd} disabled={masterLoading}
                    style={{ padding: '8px 20px', background: '#0070f3', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', cursor: 'pointer', opacity: masterLoading ? 0.7 : 1 }}>
                    追加
                  </button>
                </div>
              </div>

              {/* 一覧テーブル */}
              <div style={{ background: 'white', border: '1px solid #eee', borderRadius: '12px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f8f9fa', borderBottom: '1px solid #eee' }}>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', color: '#888' }}>名前</th>
                      {masterTab === 'makers' && <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', color: '#888' }}>国</th>}
                      {masterTab === 'models' && <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', color: '#888' }}>メーカー</th>}
                      <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', color: '#888' }}>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMasterList.length === 0 ? (
                      <tr>
                        <td colSpan={masterTab === 'makers' || masterTab === 'models' ? 3 : 2}
                          style={{ padding: '2rem', textAlign: 'center', color: '#aaa', fontSize: '13px' }}>
                          {masterSearch || modelMakerFilter ? '条件に一致するデータがありません' : 'データがありません'}
                        </td>
                      </tr>
                    ) : filteredMasterList.map((item, i) => (
                      <tr key={item.id} style={{ borderBottom: i < filteredMasterList.length - 1 ? '1px solid #f0f0f0' : 'none' }}>
                        <td style={{ padding: '12px 16px', fontSize: '14px' }}>{item.name}</td>
                        {masterTab === 'makers' && <td style={{ padding: '12px 16px', fontSize: '13px', color: '#888' }}>{item.master_countries?.name}</td>}
                        {masterTab === 'models' && <td style={{ padding: '12px 16px', fontSize: '13px', color: '#888' }}>{item.master_makers?.name}</td>}
                        <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                          <button onClick={() => handleMasterDelete(masterTableMap[masterTab], item.id)}
                            style={{ fontSize: '12px', padding: '4px 12px', border: '1px solid #e00', borderRadius: '6px', color: '#e00', background: 'white', cursor: 'pointer' }}>
                            削除
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {masterTab === 'expenses' && (
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '16px' }}>諸費用デフォルト設定</h3>
              <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '20px' }}>
                ここで設定した金額が車両見積作成時のデフォルト値になります。車両ごとに変更も可能です。
              </p>
              {expenseLoading ? (
                <div style={{ color: '#9ca3af', fontSize: '14px' }}>読み込み中...</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {expenses.map(exp => (
                    <div key={exp.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
                      <span style={{ flex: 1, fontSize: '14px', color: '#111' }}>{exp.label}</span>
                      {editingExpense === exp.id ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '13px', color: '#6b7280' }}>¥</span>
                          <input
                            type="number"
                            value={editingExpenseAmount}
                            onChange={e => setEditingExpenseAmount(e.target.value)}
                            style={{ width: '120px', padding: '6px 10px', border: '1px solid #1a73e8', borderRadius: '6px', fontSize: '14px' }}
                            autoFocus
                          />
                          <button
                            onClick={async () => {
                              await supabase.from('expense_master').update({ amount: parseInt(editingExpenseAmount) || 0 }).eq('id', exp.id)
                              setEditingExpense(null)
                              fetchExpenses()
                            }}
                            style={{ padding: '6px 14px', background: '#1a73e8', color: 'white', border: 'none', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}>
                            保存
                          </button>
                          <button
                            onClick={() => setEditingExpense(null)}
                            style={{ padding: '6px 14px', background: 'white', border: '1px solid #ddd', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}>
                            キャンセル
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span style={{ fontSize: '14px', color: '#111', minWidth: '100px', textAlign: 'right' }}>
                            {exp.amount ? `¥${exp.amount.toLocaleString()}` : '—'}
                          </span>
                          <button
                            onClick={() => { setEditingExpense(exp.id); setEditingExpenseAmount(exp.amount?.toString() || '0') }}
                            style={{ padding: '5px 12px', background: 'white', border: '1px solid #ddd', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', color: '#555' }}>
                            編集
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
      {/* ===== 表示設定タブ ===== */}
      {tab === 'display' && (
        <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #eee', padding: '32px', maxWidth: '480px' }}>
          <h3 style={{ margin: '0 0 24px', fontSize: '16px', fontWeight: 600, color: '#111' }}>文字サイズ</h3>
          <div style={{ display: 'flex', gap: '12px' }}>
            {([
              { value: 'small', label: '小', size: '14px' },
              { value: 'medium', label: '中', size: '16px' },
              { value: 'large', label: '大', size: '18px' },
            ] as const).map(({ value, label, size }) => (
              <button
                key={value}
                onClick={() => handleFontSize(value)}
                style={{
                  flex: 1,
                  padding: '16px',
                  borderRadius: '10px',
                  border: `2px solid ${fontSize === value ? '#1a73e8' : '#e5e7eb'}`,
                  background: fontSize === value ? '#eff6ff' : 'white',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <span style={{ fontSize: size, fontWeight: 600, color: fontSize === value ? '#1a73e8' : '#374151' }}>あ</span>
                <span style={{ fontSize: '13px', color: fontSize === value ? '#1a73e8' : '#6b7280' }}>{label}</span>
              </button>
            ))}
          </div>
          <p style={{ marginTop: '16px', fontSize: '13px', color: '#9ca3af' }}>※ 設定はこのブラウザに保存されます</p>
        </div>
      )}
    </div>
  )
}