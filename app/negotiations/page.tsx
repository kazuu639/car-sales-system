'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { useProfile } from '@/hooks/useProfile'

const STATUS_CONFIG: Record<string, { bg: string; color: string; dot: string }> = {
  '商談中': { bg: '#fff3e0', color: '#e65100', dot: '#fb8c00' },
  '見積済': { bg: '#e8f0fe', color: '#1a73e8', dot: '#4285f4' },
  '成約':   { bg: '#e6f4ea', color: '#1e7e34', dot: '#34a853' },
  '失注':   { bg: '#f1f3f4', color: '#5f6368', dot: '#9aa0a6' },
}

const STATUSES = ['すべて', '商談中', '見積済', '成約', '失注']

const SOURCE_MAP: Record<string, string> = {
  carsensor: 'カーセンサー', goo: 'グーネット', hp: 'HP', x: 'X',
  instagram: 'Instagram', youtube: 'YouTube', line: 'LINE',
  tel: '電話', visit: '来店', referral: '紹介', other: 'その他',
}

export default function NegotiationsPage() {
  const [negotiations, setNegotiations] = useState<any[]>([])
  const [loading, setLoading]           = useState(true)
  const [filterStatus, setFilterStatus] = useState('すべて')
  const [search, setSearch]             = useState('')
  const { isAdmin } = useProfile()

  const load = async () => {
    setLoading(true)
    const { data } = await supabase.from('negotiations')
      .select('*, customers(氏名, 電話番号), vehicles(db_number, master_models(name), master_makers(name))')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
    setNegotiations(data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`「${name}」の商談を削除BOXに移動しますか？\n関連する契約・納車情報も移動されます。`)) return
    await supabase.from('negotiations').update({ deleted_at: new Date().toISOString() }).eq('id', id)
    load()
  }

  const filtered = negotiations.filter(n => {
    const matchStatus = filterStatus === 'すべて' || n.status === filterStatus
    const matchSearch = !search ||
      (n.customers?.氏名           ?? '').includes(search) ||
      (n.vehicles?.master_models?.name ?? '').includes(search) ||
      (n.vehicles?.master_makers?.name ?? '').includes(search) ||
      (n.vehicles?.db_number       ?? '').includes(search) ||
      (n.assigned_to               ?? '').includes(search)
    return matchStatus && matchSearch
  })

  const statusCounts = STATUSES.reduce((acc, s) => {
    acc[s] = s === 'すべて' ? negotiations.length : negotiations.filter(n => n.status === s).length
    return acc
  }, {} as Record<string, number>)

  const hasFilter = filterStatus !== 'すべて' || !!search

  return (
    <div style={{ padding: '2rem', maxWidth: '1100px', margin: '0 auto' }}>

      {/* ヘッダー */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, margin: 0 }}>商談一覧</h1>
          <p style={{ fontSize: '13px', color: '#888', margin: '4px 0 0' }}>
            {filtered.length}件表示 / 全{negotiations.length}件
          </p>
        </div>
        <Link href="/negotiations/new" style={{ padding: '10px 20px', background: '#0070f3', color: 'white', borderRadius: '8px', textDecoration: 'none', fontSize: '14px', fontWeight: 600 }}>
          ＋ 商談登録
        </Link>
      </div>

      {/* フィルターバー */}
      <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #eee', padding: '14px 16px', marginBottom: '16px' }}>

        {/* ステータスタブ */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '12px', flexWrap: 'wrap' }}>
          {STATUSES.map(s => {
            const cfg = STATUS_CONFIG[s]
            const active = filterStatus === s
            return (
              <button key={s} onClick={() => setFilterStatus(s)} style={{
                display: 'flex', alignItems: 'center', gap: '5px',
                padding: '5px 14px', borderRadius: '20px', border: 'none',
                fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                background: active ? (cfg?.dot ?? '#111') : '#f1f3f4',
                color: active ? 'white' : '#666',
                boxShadow: active ? `0 2px 6px ${cfg?.dot ?? '#0003'}40` : 'none',
              }}>
                {s !== 'すべて' && (
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: active ? 'rgba(255,255,255,0.8)' : (cfg?.dot ?? '#aaa'), flexShrink: 0 }} />
                )}
                {s}
                <span style={{ fontSize: '10px', opacity: 0.75 }}>{statusCounts[s]}</span>
              </button>
            )
          })}
        </div>

        {/* 検索 */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1, maxWidth: '360px' }}>
            <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#bbb', fontSize: '14px', pointerEvents: 'none' }}>🔍</span>
            <input
              type="text"
              placeholder="顧客名・車種・担当者で検索"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ width: '100%', border: '1px solid #e8e8e8', borderRadius: '8px', padding: '8px 12px 8px 32px', fontSize: '13px', outline: 'none', background: '#fafafa', boxSizing: 'border-box' }}
            />
          </div>
          {hasFilter && (
            <button onClick={() => { setSearch(''); setFilterStatus('すべて') }}
              style={{ padding: '8px 14px', border: '1px solid #ddd', borderRadius: '8px', background: 'white', fontSize: '12px', cursor: 'pointer', color: '#888' }}>
              ✕ リセット
            </button>
          )}
          <span style={{ fontSize: '13px', color: '#aaa', marginLeft: 'auto' }}>{filtered.length}件</span>
        </div>
      </div>

      {/* テーブル */}
      <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #eee', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '4rem', textAlign: 'center', color: '#bbb', fontSize: '14px' }}>読み込み中...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '4rem', textAlign: 'center', color: '#bbb', fontSize: '14px' }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>📋</div>
            {hasFilter ? '検索条件に一致する商談がありません' : '商談データがありません'}
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #f0f0f0' }}>
                {['顧客', '対象車両', '流入経路', '担当', 'ステータス', '登録日', ''].map(h => (
                  <th key={h} style={{ padding: '11px 16px', textAlign: 'left', fontSize: '11px', color: '#9aa0a6', fontWeight: 600, letterSpacing: '0.03em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((n, i) => {
                const cfg = STATUS_CONFIG[n.status]
                const sourceName = SOURCE_MAP[n.source] ?? n.inquiry_route ?? null
                return (
                  <tr key={n.id}
                    style={{ borderBottom: i < filtered.length - 1 ? '1px solid #f4f4f4' : 'none', background: 'white', cursor: 'pointer' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#fafbff')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'white')}
                    onClick={() => window.location.href = `/negotiations/${n.id}`}
                  >
                    {/* 顧客 */}
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: '#111' }}>
                        {n.customers?.氏名 ?? <span style={{ color: '#bbb', fontWeight: 400 }}>未設定</span>}
                      </div>
                      {n.customers?.電話番号 && (
                        <div style={{ fontSize: '11px', color: '#bbb', marginTop: '1px' }}>{n.customers.電話番号}</div>
                      )}
                    </td>

                    {/* 対象車両 */}
                    <td style={{ padding: '14px 16px' }}>
                      {n.vehicles ? (
                        <>
                          <div style={{ fontSize: '13px', fontWeight: 500, color: '#333' }}>
                            {n.vehicles.master_makers?.name} {n.vehicles.master_models?.name}
                          </div>
                          <div style={{ fontSize: '11px', color: '#bbb', marginTop: '1px', fontFamily: 'monospace' }}>
                            {n.vehicles.db_number}
                          </div>
                        </>
                      ) : <span style={{ fontSize: '12px', color: '#ccc' }}>未選択</span>}
                    </td>

                    {/* 流入経路 */}
                    <td style={{ padding: '14px 16px' }}>
                      {sourceName ? (
                        <span style={{ fontSize: '11px', padding: '3px 9px', borderRadius: '20px', fontWeight: 500, background: '#f5f5f5', color: '#666' }}>
                          {sourceName}
                        </span>
                      ) : <span style={{ color: '#ccc', fontSize: '12px' }}>—</span>}
                    </td>

                    {/* 担当 */}
                    <td style={{ padding: '14px 16px', fontSize: '13px', color: '#666' }}>
                      {n.assigned_to ?? <span style={{ color: '#ccc' }}>—</span>}
                    </td>

                    {/* ステータス */}
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: '5px',
                        fontSize: '11px', padding: '4px 10px', borderRadius: '20px', fontWeight: 600,
                        background: cfg?.bg ?? '#f1f3f4', color: cfg?.color ?? '#5f6368',
                      }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: cfg?.dot ?? '#aaa', flexShrink: 0 }} />
                        {n.status}
                      </span>
                    </td>

                    {/* 登録日 */}
                    <td style={{ padding: '14px 16px', fontSize: '12px', color: '#bbb', whiteSpace: 'nowrap' }}>
                      {n.created_at ? new Date(n.created_at).toLocaleDateString('ja-JP') : '—'}
                    </td>

                    {/* 操作 */}
                    <td style={{ padding: '14px 16px' }} onClick={e => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                        <Link href={`/negotiations/${n.id}`}
                          style={{ padding: '5px 14px', background: '#e8f0fe', color: '#1a73e8', borderRadius: '6px', textDecoration: 'none', fontSize: '12px', fontWeight: 600 }}>
                          詳細
                        </Link>
                        {isAdmin && (
                          <button onClick={() => handleDelete(n.id, n.customers?.氏名 ?? '商談')}
                            style={{ padding: '5px 12px', background: 'none', border: '1px solid #f0f0f0', color: '#e53e3e', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>
                            削除
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
