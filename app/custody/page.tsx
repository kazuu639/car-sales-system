'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { useProfile } from '@/hooks/useProfile'

const REASON_CONFIG: Record<string, { bg: string; color: string }> = {
  '車検':       { bg: '#e8f0fe', color: '#1a73e8' },
  '修理':       { bg: '#fce8e6', color: '#c62828' },
  'メンテナンス': { bg: '#e6f4ea', color: '#1e7e34' },
  'カスタム':   { bg: '#f3e8fd', color: '#7b1fa2' },
  'チューニング': { bg: '#fff3e0', color: '#e65100' },
  '事故':       { bg: '#fce8e6', color: '#b71c1c' },
  'クレーム':   { bg: '#fce8e6', color: '#c62828' },
}
const STATUS_CONFIG: Record<string, { bg: string; color: string; dot: string }> = {
  '受付':   { bg: '#e8f0fe', color: '#1a73e8', dot: '#4285f4' },
  '作業中': { bg: '#fff3e0', color: '#e65100', dot: '#fb8c00' },
  '完了':   { bg: '#e6f4ea', color: '#1e7e34', dot: '#34a853' },
  '引渡済': { bg: '#f1f3f4', color: '#5f6368', dot: '#9aa0a6' },
}
const STATUSES = ['すべて', '受付', '作業中', '完了', '引渡済']

export default function CustodyPage() {
  const [list, setList]           = useState<any[]>([])
  const [loading, setLoading]     = useState(true)
  const [filterStatus, setFilterStatus] = useState('すべて')
  const [search, setSearch]       = useState('')
  const { profile } = useProfile()

  useEffect(() => {
    if (!profile?.company_id) return
    const load = async () => {
      setLoading(true)
      const { data } = await supabase
        .from('custody')
        .select('*, customers(id, 氏名, 電話番号), dealers(id, 業者名, 担当者名)')
        .eq('company_id', profile.company_id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
      setList(data ?? [])
      setLoading(false)
    }
    load()
  }, [profile])

  const filtered = list.filter(c => {
    const matchStatus = filterStatus === 'すべて' || c.status === filterStatus
    const name = c.customers?.['氏名'] ?? c.dealers?.['業者名'] ?? ''
    const matchSearch = !search ||
      (c.car_name        ?? '').includes(search) ||
      (c.chassis_number  ?? '').includes(search) ||
      name.includes(search)
    return matchStatus && matchSearch
  })

  const counts = STATUSES.reduce((acc, s) => {
    acc[s] = s === 'すべて' ? list.length : list.filter(c => c.status === s).length
    return acc
  }, {} as Record<string, number>)

  return (
    <div style={{ padding: '2rem', maxWidth: '1100px', margin: '0 auto' }}>

      {/* ヘッダー */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, margin: 0 }}>預かり台帳</h1>
          <p style={{ fontSize: '13px', color: '#888', margin: '4px 0 0' }}>{filtered.length}件表示 / 全{list.length}件</p>
        </div>
        <Link href="/custody/new" style={{ padding: '10px 20px', background: '#0070f3', color: 'white', borderRadius: '8px', textDecoration: 'none', fontSize: '14px', fontWeight: 600 }}>
          ＋ 新規受付
        </Link>
      </div>

      {/* フィルター */}
      <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #eee', padding: '14px 16px', marginBottom: '16px' }}>
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
                {s !== 'すべて' && <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: active ? 'rgba(255,255,255,0.8)' : (cfg?.dot ?? '#aaa'), flexShrink: 0 }} />}
                {s} <span style={{ fontSize: '10px', opacity: 0.75 }}>{counts[s]}</span>
              </button>
            )
          })}
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1, maxWidth: '360px' }}>
            <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#bbb', pointerEvents: 'none' }}>🔍</span>
            <input type="text" placeholder="車種名・車体番号・顧客名で検索" value={search} onChange={e => setSearch(e.target.value)}
              style={{ width: '100%', border: '1px solid #e8e8e8', borderRadius: '8px', padding: '8px 12px 8px 32px', fontSize: '13px', outline: 'none', background: '#fafafa', boxSizing: 'border-box' }} />
          </div>
          {search && <button onClick={() => setSearch('')} style={{ padding: '8px 14px', border: '1px solid #ddd', borderRadius: '8px', background: 'white', fontSize: '12px', cursor: 'pointer', color: '#888' }}>✕</button>}
        </div>
      </div>

      {/* テーブル */}
      <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #eee', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '4rem', textAlign: 'center', color: '#bbb' }}>読み込み中...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '4rem', textAlign: 'center', color: '#bbb' }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>🔧</div>
            該当する預かり案件がありません
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #f0f0f0' }}>
                {['顧客 / 業者', '車両', '預かり理由', 'ステータス', '受付日', '予定引渡', ''].map(h => (
                  <th key={h} style={{ padding: '11px 16px', textAlign: 'left', fontSize: '11px', color: '#9aa0a6', fontWeight: 600, letterSpacing: '0.03em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => {
                const ownerName = c.customers?.['氏名'] ?? c.dealers?.['業者名'] ?? '—'
                const ownerSub  = c.customers?.['電話番号'] ?? c.dealers?.['担当者名'] ?? ''
                const isDealer  = !!c.dealer_id
                const rcfg = REASON_CONFIG[c.custody_reason] ?? { bg: '#f1f3f4', color: '#555' }
                const scfg = STATUS_CONFIG[c.status]         ?? { bg: '#f1f3f4', color: '#555', dot: '#aaa' }
                return (
                  <tr key={c.id} style={{ borderTop: '1px solid #f4f4f4' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#fafbff'}
                    onMouseLeave={e => e.currentTarget.style.background = 'white'}>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: isDealer ? '#fff3e0' : '#e8f0fe', color: isDealer ? '#e65100' : '#1a73e8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, flexShrink: 0 }}>
                          {isDealer ? '業' : (ownerName[0] ?? '?')}
                        </div>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: '#111' }}>{ownerName}</div>
                          {ownerSub && <div style={{ fontSize: '11px', color: '#bbb' }}>{ownerSub}</div>}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontSize: '13px', fontWeight: 500, color: '#222' }}>{c.car_name ?? '—'}</div>
                      <div style={{ fontSize: '11px', color: '#bbb' }}>{c.chassis_number ?? ''}</div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '10px', background: rcfg.bg, color: rcfg.color, fontWeight: 600 }}>{c.custody_reason ?? '—'}</span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', padding: '3px 8px', borderRadius: '20px', fontWeight: 600, background: scfg.bg, color: scfg.color, border: `1px solid ${scfg.dot}44`, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
                        <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: scfg.dot }} />
                        {c.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '12px', color: '#888' }}>{c.intake_date ?? '—'}</td>
                    <td style={{ padding: '12px 16px', fontSize: '12px', color: '#888' }}>{c.scheduled_delivery_date ?? '—'}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <Link href={`/custody/${c.id}`}
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
