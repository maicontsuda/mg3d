'use client'

import { useState } from 'react'
import { formatJPY } from '../catalog'

export default function AdminOrders({ orders, onStatusChange }) {
  // Status que o admin pode aplicar (os mesmos aceitos por /api/orders/status)
  const labels = { pending: 'Recebido', processing: 'Em produção', shipped: 'Enviado', delivered: 'Entregue', cancelled: 'Cancelado' }
  // awaiting_payment é criado pelo checkout e só muda via webhook do Stripe
  const readOnlyLabels = { awaiting_payment: 'Aguardando pagamento' }
  const [statusFilter, setStatusFilter] = useState('all')
  const [customerSearch, setCustomerSearch] = useState('')
  const [printError, setPrintError] = useState('')
  const visibleOrders = orders.filter(order => {
    const customer = `${order.customers?.name || ''} ${order.customers?.email || ''}`.toLowerCase()
    return (statusFilter === 'all' || order.status === statusFilter) && customer.includes(customerSearch.toLowerCase().trim())
  })

  function printOrder(order) {
    const customer = order.customers?.name || 'Cliente MG3D'
    const email = order.customers?.email || ''
    const items = order.order_items?.map(item => `<tr><td>${escapePrint(item.product_name)}</td><td>${item.quantity}</td><td>${formatJPY(item.unit_price)}</td><td>${formatJPY(item.unit_price * item.quantity)}</td></tr>`).join('') || ''
    const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>MG3D — Pedido #${order.id}</title><style>body{font-family:Arial,sans-serif;color:#111;max-width:820px;margin:40px auto;padding:0 24px}header{display:flex;justify-content:space-between;border-bottom:3px solid #087cff;padding-bottom:22px}h1{margin:0;font-size:28px}h2{font-size:18px;margin-top:34px}p{line-height:1.5;color:#444}.meta{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:25px 0}.meta strong{display:block;color:#111}.meta span{color:#555}table{width:100%;border-collapse:collapse;margin-top:14px}th,td{text-align:left;border-bottom:1px solid #ddd;padding:12px 8px}th{background:#f2f5f8;font-size:12px;text-transform:uppercase}td:nth-child(n+2),th:nth-child(n+2){text-align:right}.total{text-align:right;font-size:20px;font-weight:bold;margin-top:20px}.notice{margin-top:45px;padding:14px;background:#f2f5f8;font-size:12px;color:#555}@media print{body{margin:0}.no-print{display:none}}</style></head><body><header><div><h1>MG3D</h1><p>Print Lab · Documento de pedido</p></div><div><strong>Pedido #${order.id}</strong><p>${new Date(order.created_at).toLocaleDateString('ja-JP')}</p></div></header><section class="meta"><div><strong>Cliente</strong><span>${escapePrint(customer)}</span></div><div><strong>E-mail</strong><span>${escapePrint(email)}</span></div><div><strong>Status</strong><span>${labels[order.status] || readOnlyLabels[order.status] || escapePrint(order.status)}</span></div><div><strong>Atualizado em</strong><span>${new Date(order.updated_at || order.created_at).toLocaleDateString('ja-JP')}</span></div></section><h2>Itens do pedido</h2><table><thead><tr><th>Produto</th><th>Qtd.</th><th>Unitário</th><th>Total</th></tr></thead><tbody>${items}</tbody></table><div class="total">Total: ${formatJPY(order.total)}</div><div class="notice">Documento gerado pelo painel MG3D para conferência e impressão. Para emissão de nota fiscal oficial, preencha os dados fiscais da empresa e valide os requisitos aplicáveis no Japão.</div><p class="no-print">Use a caixa de diálogo do navegador para imprimir ou salvar como PDF.</p></body></html>`
    const popup = window.open('', '_blank', 'noopener,noreferrer,width=900,height=800')
    if (!popup) { setPrintError('Permita pop-ups no navegador para imprimir o pedido.'); return }
    setPrintError('')
    popup.document.write(html); popup.document.close(); popup.focus(); popup.onafterprint = () => popup.close(); setTimeout(() => popup.print(), 250)
  }

  function escapePrint(value) { return String(value || '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[character])) }
  return <div className="admin-orders"><div className="admin-list-head"><strong>Pedidos em tempo real</strong><span>{visibleOrders.length} de {orders.length}</span></div>{printError && <p className="form-error" role="alert">{printError}</p>}<div className="order-filters"><input aria-label="Buscar por nome ou e-mail do cliente" value={customerSearch} onChange={event => setCustomerSearch(event.target.value)} placeholder="Buscar cliente..." /><select aria-label="Filtrar por status" value={statusFilter} onChange={event => setStatusFilter(event.target.value)}><option value="all">Todos os status</option><option value="awaiting_payment">Aguardando pagamento</option>{Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>{visibleOrders.length ? visibleOrders.map(order => <div className="admin-order-row" key={order.id}><div><strong>#{order.id} · {order.customers?.name || order.customers?.email || 'Cliente'}</strong><small>{order.order_items?.map(item => `${item.product_name} × ${item.quantity}`).join(', ')}</small><small>{new Date(order.created_at).toLocaleString('ja-JP')} · {formatJPY(order.total)}</small></div><div className="admin-order-actions"><select value={order.status} onChange={event => onStatusChange(order.id, event.target.value)} aria-label={`Status do pedido ${order.id}`}>{readOnlyLabels[order.status] && <option value={order.status} disabled>{readOnlyLabels[order.status]}</option>}{Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><button className="print-order" onClick={() => printOrder(order)}>Imprimir nota</button></div></div>) : <p className="admin-empty">Nenhum pedido corresponde aos filtros.</p>}</div>
}
