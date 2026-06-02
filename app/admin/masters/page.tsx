'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function MastersPage() {
  const [tab, setTab] = useState<'countries' | 'makers' | 'models' | 'colors'>('countries')
  const [countries, setCountries] = useState<any[]>([])
  const [makers, setMakers] = useState<any[]>([])
  const [models, setModels] = useState<any[]>([])
  const [colors, setColors] = useState<any[]>([])
  const [newName, setNewName] = useState('')
  const [selectedCountry, setSelectedCountry] = useState('')
  const [selectedMaker, setSelectedMaker] = useState('')
  const [loading, setLoading] = useState(false)

  const fetchAll = async () => {
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

  useEffect(() => { fetchAll() }, [])

  const handleAdd = async () => {
    if (!newName.trim()) return
    setLoading(true)
    if (tab === 'countries') {
      await supabase.from('master_countries').insert({ name: newName, sort_order: countries.length + 1 })
    } else if (tab === 'makers') {
      if (!selectedCountry) { alert('国を選択してください'); setLoading(false); return }
      await supabase.from('master_makers').insert({ name: newName, country_id: selectedCountry, sort_order: makers.length + 1 })
    } else if (tab === 'models') {
      if (!selectedMaker) { alert('メーカーを選択してください'); setLoading(false); return }
      await supabase.from('master_models').insert({ name: newName, maker_id: selectedMaker, sort_order: models.length + 1 })
    } else if (tab === 'colors') {
      await supabase.from('master_colors').insert({ name: newName, sort_order: colors.length + 1 })
    }
    setNewName('')
    await fetchAll()
    setLoading(false)
  }

  const handleDelete = async (table: string, id: string) => {
    if (!confirm('削除しますか？')) return
    await supabase.from(table).delete().eq('id', id)
    await fetchAll()
  }

  const tabs = [
    { key: 'countries', label: '国' },
    { key: 'makers', label: 'メーカー' },
    { key: 'models', label: '車種' },
    { key: 'colors', label: '色' },
  ]

  const listData = tab === 'countries' ? countries : tab === 'makers' ? makers : tab === 'models' ? models : colors
  const tableMap: any = { countries: 'master_countries', makers: 'master_makers', models: 'master_models', colors: 'master_colors' }

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, margin: 0 }}>マスターデータ管理</h1>
          <p style={{ fontSize: '13px', color: '#888', margin: '4px 0 0' }}>国・メーカー・車種・色の管理</p>
        </div>
        <a href="/admin" style={{ fontSize: '13px', color: '#0070f3', textDecoration: 'none' }}>← スタッフ管理に戻る</a>
      </div>

      <div style={{ display: 'flex', gap: '0', borderBottom: '1px solid #eee', marginBottom: '1.5rem' }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key as any)} style={{
            padding: '10px 20px', background: 'none', border: 'none', cursor: 'pointer',
            fontSize: '14px', fontWeight: tab === t.key ? 600 : 400,
            color: tab === t.key ? '#0070f3' : '#555',
            borderBottom: tab === t.key ? '2px solid #0070f3' : '2px solid transparent',
          }}>{t.label}</button>
        ))}
      </div>

      <div style={{ background: 'white', border: '1px solid #eee', borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
        <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '12px' }}>新規追加</div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {tab === 'makers' && (
            <select value={selectedCountry} onChange={e => setSelectedCountry(e.target.value)}
              style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px' }}>
              <option value="">国を選択</option>
              {countries.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}
          {tab === 'models' && (
            <select value={selectedMaker} onChange={e => setSelectedMaker(e.target.value)}
              style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px' }}>
              <option value="">メーカーを選択</option>
              {makers.map(m => <option key={m.id} value={m.id}>{m.master_countries?.name} - {m.name}</option>)}
            </select>
          )}
          <input type="text" value={newName} onChange={e => setNewName(e.target.value)}
            placeholder="名前を入力"
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            style={{ flex: 1, padding: '8px 12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px', minWidth: '150px' }} />
          <button onClick={handleAdd} disabled={loading}
            style={{ padding: '8px 20px', background: '#0070f3', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', cursor: 'pointer' }}>
            追加
          </button>
        </div>
      </div>

      <div style={{ background: 'white', border: '1px solid #eee', borderRadius: '12px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8f9fa', borderBottom: '1px solid #eee' }}>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', color: '#888' }}>名前</th>
              {tab === 'makers' && <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', color: '#888' }}>国</th>}
              {tab === 'models' && <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', color: '#888' }}>メーカー</th>}
              <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', color: '#888' }}>操作</th>
            </tr>
          </thead>
          <tbody>
            {listData.map((item, i) => (
              <tr key={item.id} style={{ borderBottom: i < listData.length - 1 ? '1px solid #f0f0f0' : 'none' }}>
                <td style={{ padding: '12px 16px', fontSize: '14px' }}>{item.name}</td>
                {tab === 'makers' && <td style={{ padding: '12px 16px', fontSize: '13px', color: '#888' }}>{item.master_countries?.name}</td>}
                {tab === 'models' && <td style={{ padding: '12px 16px', fontSize: '13px', color: '#888' }}>{item.master_makers?.name}</td>}
                <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                  <button onClick={() => handleDelete(tableMap[tab], item.id)}
                    style={{ fontSize: '12px', padding: '4px 12px', border: '1px solid #e00', borderRadius: '6px', color: '#e00', background: 'white', cursor: 'pointer' }}>
                    削除
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}