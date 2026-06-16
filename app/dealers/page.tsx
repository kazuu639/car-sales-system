'use client'
import { useEffect, useState } from 'react'
import { supabase, getCurrentUserScope } from '@/lib/supabase'
import Link from 'next/link'

const TYPE_CONFIG: Record<string, { bg: string; color: string; dot: string }> = {
  '仕入先': { bg: '#e6f4ea', color: '#1e7e34', dot: '#34a853' },
  '販売先': { bg: '#e8f0fe', color: '#1a73e8', dot: '#4285f4' },
  '両方':   { bg: '#fff3e0', color: '#e65100', dot: '#fb8c00' },
}

const TYPES = ['すべて', '仕入先', '販売先', '両方']

export default function DealersPage() {
  const [dealers, setDealers]   = useState<any[]>([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [filterType, setFilterType] = useState('すべて')

  useEffect(() => {
    const load = async () => {
      const scope = await getCurrentUserScope()
      if (!scope) { setLoading(false); return }
      const { data } = await supabase.from('dealers').select('*')
        .eq('company_id', scope.company_id)
        .order('作成日時', { ascending: false })
      setDealers(data ?? [])
      setLoading(false)
    }
    load()
  }, [])

  const filtered = dealers.filter(d => {
    const matchType   = filterType === 'すべて' || d.業者区分 === filterType
    const matchSearch = !search ||
      (d.業者名     ?? '').includes(search) ||
      (d.業者名カナ ?? '').includes(search) ||
      (d.担当者名   ?? '').includes(search) ||
      (d.電話番号   ?? '').includes(search)
    return matchType && matchSearch
  })

  const typeCounts = TYPES.reduce((acc, t) => {
    acc[t] = t === 'すべて' ? dealers.length : dealers.filter(d => d.業者区分 === t).length
    return acc
  }, {} as Record<string, number>)

  const hasFilter = filterType !== 'すべて' || !!search

  return (
    <div style={{ padding: '2rem', maxWidth: '1100px', margin: '0 auto' }}>

      {/* ヘッダー */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, margin: 0 }}>業者一覧</h1>
          <p style={{ fontSize: '13px', color: '#888', margin: '4px 0 0' }}>
            {filtered.length}件表示 / 全{dealers.length}件
          </p>
        </div>
        <Link href="/dealers/new" style={{ padding: '10px 20px', background: '#0070f3', color: 'white', borderRadius: '8px', textDecoration: 'none', fontSize: '14px', fontWeight: 600 }}>
          ＋ 業者登録
        </Link>
      </div>

      {/* フィルターバー */}
      <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #eee', padding: '14px 16px', marginBottom: '16px' }}>

        {/* 区分タブ */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '12px', flexWrap: 'wrap' }}>
          {TYPES.map(t => {
            const cfg = TYPE_CONFIG[t]
            const active = filterType === t
            return (
              <button key={t} onClick={() => setFilterType(t)} style={{
                display: 'flex', alignItems: 'center', gap: '5px',
                padding: '5px 14px', borderRadius: '20px', border: 'none',
                fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                background: active ? (cfg?.dot ?? '#111') : '#f1f3f4',
                color: active ? 'white' : '#666',
                boxShadow: active ? `0 2px 6px ${cfg?.dot ?? '#0003'}40` : 'none',
              }}>
                {t !== 'すべて' && (
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: active ? 'rgba(255,255,255,0.8)' : (cfg?.dot ?? '#aaa'), flexShrink: 0 }} />
                )}
                {t}
                <span style={{ fontSize: '10px', opacity: 0.75 }}>{typeCounts[t]}</span>
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
              placeholder="業者名・担当者・電話番号で検索"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ width: '100%', border: '1px solid #e8e8e8', borderRadius: '8px', padding: '8px 12px 8px 32px', fontSize: '13px', outline: 'none', background: '#fafafa', boxSizing: 'border-box' }}
            />
          </div>
          {hasFilter && (
            <button onClick={() => { setSearch(''); setFilterType('すべて') }}
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
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>🏢</div>
            {search || filterType !== 'すべて' ? '検索条件に一致する業者がいません' : '業者データがありません'}
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #f0f0f0' }}>
                {['業者名', '区分', '担当者', '電話番号', 'メール', ''].map(h => (
                  <th key={h} style={{ padding: '11px 16px', textAlign: 'left', fontSize: '11px', color: '#9aa0a6', fontWeight: 600, letterSpacing: '0.03em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((d: any, i: number) => {
                const cfg = TYPE_CONFIG[d.業者区分]
                return (
                  <tr key={d.id}
                    style={{ borderBottom: i < filtered.length - 1 ? '1px solid #f4f4f4' : 'none', background: 'white' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#fafbff')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'white')}
                  >
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: '#111' }}>{d.業者名}</div>
                      {d.業者名カナ && <div style={{ fontSize: '11px', color: '#bbb', marginTop: '1px' }}>{d.業者名カナ}</div>}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      {d.業者区分 ? (
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: '5px',
                          fontSize: '11px', padding: '4px 10px', borderRadius: '20px', fontWeight: 600,
                          background: cfg?.bg ?? '#f1f3f4', color: cfg?.color ?? '#555',
                        }}>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: cfg?.dot ?? '#aaa', flexShrink: 0 }} />
                          {d.業者区分}
                        </span>
                      ) : <span style={{ color: '#ccc', fontSize: '12px' }}>—</span>}
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '13px', color: '#444' }}>{d.担当者名 ?? '—'}</td>
                    <td style={{ padding: '14px 16px', fontSize: '13px', color: '#444' }}>{d.電話番号 ?? '—'}</td>
                    <td style={{ padding: '14px 16px', fontSize: '13px', color: '#666' }}>{d.メール ?? '—'}</td>
                    <td style={{ padding: '14px 16px' }}>
                      <Link href={`/dealers/${d.id}`}
                        style={{ padding: '5px 14px', background: '#e8f0fe', color: '#1a73e8', borderRadius: '6px', textDecoration: 'none', fontSize: '12px', fontWeight: 600 }}>
                        詳細
                      </Link>
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
