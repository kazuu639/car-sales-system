'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function CompanySettingPage() {
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [companyId, setCompanyId] = useState<string | null>(null)

  const [form, setForm] = useState({
    name: '',
    name_kana: '',
    zip_code: '',
    address: '',
    tel: '',
    fax: '',
    tax_number: '',
    bank_name: '',
    bank_branch: '',
    bank_type: '普通',
    bank_account: '',
    bank_holder: '',
  })

  useEffect(() => {
    supabase.from('companies').select('*').limit(1).single()
      .then(({ data }) => {
        if (data) {
          setCompanyId(data.id)
          setForm({
            name: data.name ?? '',
            name_kana: data.name_kana ?? '',
            zip_code: data.zip_code ?? '',
            address: data.address ?? '',
            tel: data.tel ?? '',
            fax: data.fax ?? '',
            tax_number: data.tax_number ?? '',
            bank_name: data.bank_name ?? '',
            bank_branch: data.bank_branch ?? '',
            bank_type: data.bank_type ?? '普通',
            bank_account: data.bank_account ?? '',
            bank_holder: data.bank_holder ?? '',
          })
        }
      })
  }, [])

  const handleSubmit = async () => {
    setLoading(true)
    if (companyId) {
      await supabase.from('companies').update({ ...form, updated_at: new Date().toISOString() }).eq('id', companyId)
    } else {
      const { data } = await supabase.from('companies').insert([form]).select().single()
      if (data) setCompanyId(data.id)
    }
    setLoading(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const set = (key: string, value: string) => setForm(f => ({ ...f, [key]: value }))

  const fieldStyle: React.CSSProperties = { width: '100%', padding: '9px 12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }
  const labelStyle: React.CSSProperties = { fontSize: '13px', fontWeight: 500, color: '#444', marginBottom: '6px', display: 'block' }
  const sectionStyle: React.CSSProperties = { background: 'white', borderRadius: '12px', border: '1px solid #eee', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }
  const sectionTitle = (label: string) => (
    <div style={{ fontSize: '15px', fontWeight: 600, paddingBottom: '8px', borderBottom: '2px solid #1a1a2e', marginBottom: '4px' }}>{label}</div>
  )

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <Link href="/admin" style={{ fontSize: '13px', color: '#888', textDecoration: 'none' }}>← 管理画面に戻る</Link>
        <h1 style={{ fontSize: '22px', fontWeight: 700, margin: '8px 0 0' }}>会社情報設定</h1>
        <p style={{ fontSize: '13px', color: '#888', margin: '4px 0 0' }}>見積書・契約書に表示される会社情報を設定してください</p>
      </div>

      {saved && (
        <div style={{ background: '#e6f4ea', border: '1px solid #a8d5b5', borderRadius: '8px', padding: '12px 16px', marginBottom: '1rem', fontSize: '14px', color: '#1e7e34' }}>
          ✅ 保存しました！
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

        {/* 基本情報 */}
        <div style={sectionStyle}>
          {sectionTitle('🏢 会社基本情報')}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={labelStyle}>会社名 <span style={{ color: 'red' }}>*</span></label>
              <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="株式会社〇〇" style={fieldStyle} />
            </div>
            <div>
              <label style={labelStyle}>会社名カナ</label>
              <input value={form.name_kana} onChange={e => set('name_kana', e.target.value)} placeholder="カブシキガイシャ〇〇" style={fieldStyle} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem' }}>
            <div>
              <label style={labelStyle}>郵便番号</label>
              <input value={form.zip_code} onChange={e => set('zip_code', e.target.value)} placeholder="000-0000" style={fieldStyle} />
            </div>
            <div>
              <label style={labelStyle}>住所</label>
              <input value={form.address} onChange={e => set('address', e.target.value)} placeholder="〇〇県〇〇市..." style={fieldStyle} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={labelStyle}>電話番号</label>
              <input value={form.tel} onChange={e => set('tel', e.target.value)} placeholder="000-000-0000" style={fieldStyle} />
            </div>
            <div>
              <label style={labelStyle}>FAX</label>
              <input value={form.fax} onChange={e => set('fax', e.target.value)} placeholder="000-000-0000" style={fieldStyle} />
            </div>
          </div>
          <div>
            <label style={labelStyle}>事業者登録番号</label>
            <input value={form.tax_number} onChange={e => set('tax_number', e.target.value)} placeholder="T0000000000000" style={fieldStyle} />
          </div>
        </div>

        {/* 銀行情報 */}
        <div style={sectionStyle}>
          {sectionTitle('🏦 振込先情報')}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={labelStyle}>銀行名</label>
              <input value={form.bank_name} onChange={e => set('bank_name', e.target.value)} placeholder="〇〇銀行" style={fieldStyle} />
            </div>
            <div>
              <label style={labelStyle}>支店名</label>
              <input value={form.bank_branch} onChange={e => set('bank_branch', e.target.value)} placeholder="〇〇支店" style={fieldStyle} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem' }}>
            <div>
              <label style={labelStyle}>口座種別</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                {['普通', '当座'].map(t => (
                  <button key={t} onClick={() => set('bank_type', t)}
                    style={{ padding: '8px 20px', borderRadius: '20px', border: '1.5px solid', fontSize: '13px', cursor: 'pointer', fontWeight: form.bank_type === t ? 600 : 400, background: form.bank_type === t ? '#1a1a2e' : 'white', color: form.bank_type === t ? 'white' : '#555', borderColor: form.bank_type === t ? '#1a1a2e' : '#ddd' }}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label style={labelStyle}>口座番号</label>
              <input value={form.bank_account} onChange={e => set('bank_account', e.target.value)} placeholder="0000000" style={fieldStyle} />
            </div>
          </div>
          <div>
            <label style={labelStyle}>口座名義（カナ）</label>
            <input value={form.bank_holder} onChange={e => set('bank_holder', e.target.value)} placeholder="カブシキガイシャ〇〇" style={fieldStyle} />
          </div>
        </div>

        <button onClick={handleSubmit} disabled={loading}
          style={{ padding: '14px', background: '#1a1a2e', color: 'white', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
          {loading ? '保存中...' : '💾 会社情報を保存する'}
        </button>
      </div>
    </div>
  )
}