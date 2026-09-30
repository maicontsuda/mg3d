'use client'

import { useState } from 'react'
import Icon from './Icon'
import { supabase } from '../lib/supabase'
import { emptyProduct, slugify } from '../lib/product-utils'

export default function ProductForm({ product, onSave, onCancel }) {
  const [form, setForm] = useState(product || emptyProduct)
  const [adminKey, setAdminKey] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadMessage, setUploadMessage] = useState('')
  const [uploadError, setUploadError] = useState('')
  const update = (key, value) => setForm(current => ({ ...current, [key]: value }))

  async function uploadMedia(event) {
    const file = event.target.files?.[0]
    const targetField = event.currentTarget.dataset.target || 'image'
    if (!file) return
    const { data: sessionData } = await supabase.auth.getSession()
    const accessToken = sessionData.session?.access_token
    if (!accessToken && !adminKey.trim()) { setUploadError('Sessão expirada. Entre novamente ou informe a chave de upload.'); event.target.value = ''; return }
    const resourceType = file.type.startsWith('video/') ? 'video' : (file.type.startsWith('image/') ? 'image' : 'raw')
    setUploading(true); setUploadError(''); setUploadMessage('Preparando upload...')
    try {
      const signedResponse = await fetch('/api/cloudinary/sign', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}), ...(adminKey.trim() ? { 'x-mg3d-admin-key': adminKey.trim() } : {}) }, body: JSON.stringify({ folder: 'mg3d/products' }) })
      const signed = await signedResponse.json()
      if (!signedResponse.ok) throw new Error(signed.error || 'Não foi possível assinar o upload.')
      const payload = new FormData()
      payload.append('file', file); payload.append('api_key', signed.apiKey); payload.append('timestamp', signed.timestamp); payload.append('signature', signed.signature); payload.append('folder', signed.folder)
      const uploadResponse = await fetch(`https://api.cloudinary.com/v1_1/${signed.cloudName}/${resourceType}/upload`, { method: 'POST', body: payload })
      const uploaded = await uploadResponse.json()
      if (!uploadResponse.ok) throw new Error(uploaded.error?.message || 'O Cloudinary recusou o arquivo.')
      update(targetField, uploaded.secure_url); setUploadMessage(`${file.name} enviado com sucesso.`); if (adminKey.trim()) sessionStorage.setItem('mg3d-upload-key', adminKey.trim())
    } catch (error) { setUploadError(error.message || 'Falha ao enviar o arquivo.'); setUploadMessage('') } finally { setUploading(false); event.target.value = '' }
  }

  function submit(event) {
    event.preventDefault()
    if (!form.name.trim() || !form.price || (form.photo_visible !== false && !form.image.trim())) return
    onSave({ ...form, id: form.id || Date.now(), slug: form.slug || slugify(form.name), price: Number(form.price), active: form.active !== false })
  }

  return <form className="admin-product-form" onSubmit={submit}><div className="admin-form-head"><div><p className="eyebrow"><span></span> Catálogo</p><h3>{product ? 'Editar produto' : 'Novo produto'}</h3></div><button type="button" className="modal-close" onClick={onCancel} aria-label="Fechar formulário"><Icon name="x" /></button></div><div className="admin-form-grid"><label>Nome<input required value={form.name} onChange={e => update('name', e.target.value)} placeholder="Ex.: Vaso Orbit" /></label><label>Preço em ienes<input required min="1" type="number" value={form.price || ''} onChange={e => update('price', e.target.value)} placeholder="1490" /></label><label>Quantidade em estoque<input min="0" type="number" value={form.stock_quantity ?? 0} onChange={e => update('stock_quantity', e.target.value)} placeholder="0" /></label><label className="admin-check"><input type="checkbox" checked={form.allow_preorder !== false} onChange={e => update('allow_preorder', e.target.checked)} /> Aceitar encomendas quando o estoque acabar</label><label>Categoria<select value={form.category} onChange={e => update('category', e.target.value)}><option>Casa</option><option>Luz</option><option>Organização</option></select></label><label>Material<select value={form.material} onChange={e => update('material', e.target.value)}><option>PLA</option><option>PETG</option><option>TPU</option></select></label><label>Cor principal<input value={form.color} onChange={e => update('color', e.target.value)} placeholder="Azul" /></label><label>Cores disponíveis<input value={form.colors} onChange={e => update('colors', e.target.value)} placeholder="Azul, branco e preto" /></label><label>Dimensões<input value={form.dimensions} onChange={e => update('dimensions', e.target.value)} placeholder="20 × 15 × 10 cm" /></label><label>Prazo de produção<input value={form.production} onChange={e => update('production', e.target.value)} placeholder="3 a 5 dias úteis" /></label><label className="admin-form-wide">Chave de upload (opcional)<input type="password" value={adminKey} onChange={e => setAdminKey(e.target.value)} placeholder="Só se o upload pela sessão falhar" autoComplete="off" /><small>Com você logado como administrador o upload já é autorizado pela sessão; a chave é apenas um plano B e nunca é salva no banco.</small></label><label className="admin-form-wide admin-check"><input type="checkbox" checked={form.photo_visible !== false} onChange={e => update('photo_visible', e.target.checked)} /> Exibir foto para clientes</label><label className="admin-form-wide">Mídia do produto<input type="file" data-target="image" accept="image/*,video/*" onChange={uploadMedia} disabled={uploading} />{uploading && <small>Enviando para o Cloudinary...</small>}{uploadMessage && <small className="upload-success">{uploadMessage}</small>}{uploadError && <small className="form-error">{uploadError}</small>}<input required value={form.image} onChange={e => update('image', e.target.value)} placeholder="URL Cloudinary ou arquivo enviado" /></label><label className="admin-form-wide">Upload do arquivo técnico (somente admin)<input type="file" data-target="admin_file_url" accept=".pdf,.stl,.zip,.step,.3mf" onChange={uploadMedia} disabled={uploading} /><input value={form.admin_file_url || ''} onChange={e => update('admin_file_url', e.target.value)} placeholder="Link interno ou URL do arquivo técnico" /><small>O cliente nunca verá este arquivo.</small></label><label className="admin-form-wide">Resumo curto<input value={form.desc} onChange={e => update('desc', e.target.value)} placeholder="Uma descrição para a coleção" /></label><label className="admin-form-wide">Descrição completa<textarea rows="3" value={form.details} onChange={e => update('details', e.target.value)} placeholder="Conte a história e os detalhes do produto" /></label></div><div className="admin-form-actions"><button type="button" className="detail-contact" onClick={onCancel}>Cancelar</button><button className="button button-dark" type="submit" disabled={uploading}>Salvar produto <Icon name="check" size={17} /></button></div></form>
}
