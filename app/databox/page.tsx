'use client'
import { useEffect, useState, useRef } from 'react'
import { supabase, getCurrentUserScope } from '@/lib/supabase'

type Folder = {
  id: string
  name: string
  parent_id: string | null
  created_at: string
}
type FileItem = {
  id: string
  folder_id: string | null
  name: string
  storage_path: string
  file_size: number | null
  mime_type: string | null
  created_at: string
}

export default function DataBoxPage() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [folders, setFolders] = useState<Folder[]>([])
  const [files, setFiles] = useState<FileItem[]>([])
  const [currentFolder, setCurrentFolder] = useState<string | null>(null)
  const [breadcrumb, setBreadcrumb] = useState<Folder[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [showNewFolder, setShowNewFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')

  const fetchData = async () => {
    setLoading(true)
    const scope = await getCurrentUserScope()
    if (!scope) { setLoading(false); return }
    if (currentFolder === null) {
      const [{ data: f }, { data: fi }] = await Promise.all([
        supabase.from('databox_folders').select('*').eq('company_id', scope.company_id).is('parent_id', null).order('name'),
        supabase.from('databox_files').select('*').eq('company_id', scope.company_id).is('folder_id', null).order('name'),
      ])
      setFolders(f || [])
      setFiles(fi || [])
    } else {
      const [{ data: f }, { data: fi }] = await Promise.all([
        supabase.from('databox_folders').select('*').eq('company_id', scope.company_id).eq('parent_id', currentFolder).order('name'),
        supabase.from('databox_files').select('*').eq('company_id', scope.company_id).eq('folder_id', currentFolder).order('name'),
      ])
      setFolders(f || [])
      setFiles(fi || [])
    }
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [currentFolder])

  const enterFolder = (folder: Folder) => {
    setBreadcrumb(prev => [...prev, folder])
    setCurrentFolder(folder.id)
  }

  const goToBreadcrumb = (index: number) => {
    if (index === -1) {
      setBreadcrumb([])
      setCurrentFolder(null)
    } else {
      setBreadcrumb(prev => prev.slice(0, index + 1))
      setCurrentFolder(breadcrumb[index].id)
    }
  }

  const createFolder = async () => {
    if (!newFolderName.trim()) return
    const scope = await getCurrentUserScope()
    if (!scope) { alert('ログイン情報の取得に失敗しました'); return }
    await supabase.from('databox_folders').insert({ name: newFolderName.trim(), parent_id: currentFolder, company_id: scope.company_id })
    setNewFolderName('')
    setShowNewFolder(false)
    fetchData()
  }

  const deleteFolder = async (id: string) => {
    if (!confirm('このフォルダを削除しますか？')) return
    await supabase.from('databox_folders').delete().eq('id', id)
    fetchData()
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const scope = await getCurrentUserScope()
    if (!scope) { alert('ログイン情報の取得に失敗しました'); setUploading(false); return }
    const path = `${currentFolder ?? 'root'}/${Date.now()}_${file.name}`
    const { error } = await supabase.storage.from('databox').upload(path, file)
    if (!error) {
      await supabase.from('databox_files').insert({
        folder_id: currentFolder,
        name: file.name,
        storage_path: path,
        file_size: file.size,
        mime_type: file.type,
        company_id: scope.company_id,
      })
      fetchData()
    } else {
      alert('アップロード失敗: ' + error.message)
    }
    setUploading(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleDownload = async (file: FileItem) => {
    const { data } = await supabase.storage.from('databox').createSignedUrl(file.storage_path, 60)
    if (data?.signedUrl) window.open(data.signedUrl, '_blank')
  }

  const deleteFile = async (file: FileItem) => {
    if (!confirm(`「${file.name}」を削除しますか？`)) return
    await supabase.storage.from('databox').remove([file.storage_path])
    await supabase.from('databox_files').delete().eq('id', file.id)
    fetchData()
  }

  const formatSize = (bytes: number | null) => {
    if (!bytes) return '―'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1100px', margin: '0 auto' }}>
      {/* ヘッダー */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, margin: 0 }}>DATA BOX</h1>
          <p style={{ fontSize: '13px', color: '#888', margin: '4px 0 0' }}>PDF・書類の管理</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => setShowNewFolder(true)}
            style={{ padding: '10px 16px', background: '#f1f3f4', color: '#555', borderRadius: '8px', border: 'none', fontSize: '14px', fontWeight: 500, cursor: 'pointer' }}>
            📁 フォルダ作成
          </button>
          <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
            style={{ padding: '10px 20px', background: '#0070f3', color: 'white', borderRadius: '8px', border: 'none', fontSize: '14px', fontWeight: 500, cursor: 'pointer', opacity: uploading ? 0.6 : 1 }}>
            {uploading ? 'アップロード中...' : '⬆ アップロード'}
          </button>
          <input ref={fileInputRef} type="file" onChange={handleUpload} style={{ display: 'none' }} />
        </div>
      </div>

      {/* パンくず */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', marginBottom: '16px' }}>
        <button onClick={() => goToBreadcrumb(-1)} style={{ color: '#0070f3', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: '13px' }}>ホーム</button>
        {breadcrumb.map((b, i) => (
          <span key={b.id} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ color: '#ccc' }}>/</span>
            <button onClick={() => goToBreadcrumb(i)} style={{ color: '#0070f3', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: '13px' }}>{b.name}</button>
          </span>
        ))}
      </div>

      {/* フォルダ作成入力 */}
      {showNewFolder && (
        <div style={{ background: '#e8f0fe', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px', display: 'flex', gap: '8px', alignItems: 'center' }}>
          <input type="text" value={newFolderName} onChange={e => setNewFolderName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && createFolder()}
            autoFocus placeholder="フォルダ名を入力"
            style={{ flex: 1, border: '1px solid #ddd', borderRadius: '8px', padding: '8px 12px', fontSize: '13px' }} />
          <button onClick={createFolder} style={{ padding: '8px 16px', background: '#0070f3', color: 'white', borderRadius: '8px', border: 'none', fontSize: '13px', cursor: 'pointer' }}>作成</button>
          <button onClick={() => setShowNewFolder(false)} style={{ padding: '8px 12px', background: 'none', color: '#888', border: 'none', fontSize: '13px', cursor: 'pointer' }}>キャンセル</button>
        </div>
      )}

      {/* ファイル一覧 */}
      <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #eee', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#aaa', fontSize: '14px' }}>読み込み中...</div>
        ) : folders.length === 0 && files.length === 0 ? (
          <div style={{ padding: '4rem', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>📂</div>
            <p style={{ color: '#aaa', fontSize: '14px', margin: 0 }}>ファイルやフォルダがありません</p>
            <p style={{ color: '#ccc', fontSize: '12px', margin: '4px 0 0' }}>フォルダを作成するかファイルをアップロードしてください</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8f9fa', borderBottom: '1px solid #eee' }}>
                {['名前', '種別', 'サイズ', '作成日', '操作'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', color: '#888', fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {folders.map((folder, i) => (
                <tr key={folder.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <td style={{ padding: '14px 16px' }}>
                    <button onClick={() => enterFolder(folder)}
                      style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: 500, color: '#0070f3', padding: 0 }}>
                      <span style={{ fontSize: '18px' }}>📁</span>
                      {folder.name}
                    </button>
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: '13px', color: '#888' }}>フォルダ</td>
                  <td style={{ padding: '14px 16px', fontSize: '13px', color: '#aaa' }}>―</td>
                  <td style={{ padding: '14px 16px', fontSize: '12px', color: '#aaa' }}>{folder.created_at.split('T')[0]}</td>
                  <td style={{ padding: '14px 16px' }}>
                    <button onClick={() => deleteFolder(folder.id)} style={{ fontSize: '12px', color: '#e53e3e', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>削除</button>
                  </td>
                </tr>
              ))}
              {files.map((file, i) => (
                <tr key={file.id} style={{ borderBottom: i < files.length - 1 ? '1px solid #f0f0f0' : 'none' }}>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 500 }}>
                      <span style={{ fontSize: '18px' }}>{file.mime_type?.includes('pdf') ? '📄' : '📎'}</span>
                      {file.name}
                    </div>
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: '12px', color: '#888' }}>{file.mime_type || '―'}</td>
                  <td style={{ padding: '14px 16px', fontSize: '12px', color: '#888' }}>{formatSize(file.file_size)}</td>
                  <td style={{ padding: '14px 16px', fontSize: '12px', color: '#aaa' }}>{file.created_at.split('T')[0]}</td>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <button onClick={() => handleDownload(file)} style={{ fontSize: '12px', color: '#0070f3', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>ダウンロード</button>
                      <button onClick={() => deleteFile(file)} style={{ fontSize: '12px', color: '#e53e3e', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>削除</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}