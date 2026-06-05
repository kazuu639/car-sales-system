'use client'
import { useEffect, useState } from 'react'
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
  const [tab, setTab] = useState<'manual' | 'box' | 'estimate'>('manual')
  const [boxes, setBoxes] = useState<DocumentBox[]>([])
  const [openSection, setOpenSection] = useState<number | null>(0)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (tab === 'box') {
      setLoading(true)
      supabase.from('document_boxes')
        .select('*, vehicles(db_number, master_makers(name), master_models(name), status)')
        .order('box_number')
        .then(({ data }) => { setBoxes(data ?? []); setLoading(false) })
    }
  }, [tab])

  const occupiedBoxes = boxes.filter(b => b.is_occupied).length

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
    </div>
  )
}