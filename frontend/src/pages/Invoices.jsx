import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { invoiceAPI, customerAPI, downloadBlob } from '../api/api'
import { Plus, Search, Download, Eye, FileDown, X, Send, XCircle } from 'lucide-react'
import toast from 'react-hot-toast'

const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`

const STATUS_BADGE = {
  paid:      { bg: '#e8f5e9', color: '#2d9d5f', label: 'Paid' },
  overdue:   { bg: '#ffebee', color: '#d32f2f', label: 'Overdue' },
  partial:   { bg: '#fff3e0', color: '#f57c00', label: 'Partial' },
  sent:      { bg: '#e3f2fd', color: '#1565c0', label: 'Sent' },
  draft:     { bg: '#f5f5f5', color: '#666',    label: 'Draft' },
  cancelled: { bg: '#f5f5f5', color: '#999',    label: 'Cancelled' },
}

const EMPTY_INVOICE = {
  customer: '', customer_name: '', customer_phone: '', customer_address: '',
  subtotal: '', tax_rate: '0', discount: '0',
  issue_date: new Date().toISOString().split('T')[0],
  due_date: '', notes: '',
  items: [{ description: '', quantity: 1, unit: 'cft', unit_price: '' }],
}

export default function Invoices() {
  const navigate = useNavigate()
  const [invoices, setInvoices] = useState([])
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(EMPTY_INVOICE)
  const [saving, setSaving] = useState(false)
  const [filters, setFilters] = useState({ search: '', status: '' })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = {}
      if (filters.search) params.search = filters.search
      if (filters.status) params.status = filters.status
      const { data } = await invoiceAPI.list(params)
      setInvoices(data.results || data)
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    customerAPI.list({ page_size: 100 }).then(r => setCustomers(r.data.results || r.data))
  }, [])

  const calcSubtotal = (items) => items.reduce((s, it) => s + (parseFloat(it.quantity || 0) * parseFloat(it.unit_price || 0)), 0)

  const updateItem = (i, field, value) => {
    const items = [...form.items]
    items[i] = { ...items[i], [field]: value }
    const sub = calcSubtotal(items)
    setForm(f => ({ ...f, items, subtotal: sub.toFixed(2) }))
  }

  const addItem = () => setForm(f => ({ ...f, items: [...f.items, { description: '', quantity: 1, unit: 'cft', unit_price: '' }] }))
  const removeItem = (i) => {
    const items = form.items.filter((_, idx) => idx !== i)
    setForm(f => ({ ...f, items, subtotal: calcSubtotal(items).toFixed(2) }))
  }

  const handleCustomerChange = (id) => {
    const c = customers.find(x => x.id == id)
    setForm(f => ({
      ...f, customer: id,
      customer_name: c?.name || '',
      customer_phone: c?.phone || '',
      customer_address: c?.address || '',
    }))
  }

  const handleSave = async () => {
    if (!form.customer_name || !form.due_date) {
      toast.error('Customer name and due date are required')
      return
    }
    setSaving(true)
    try {
      const payload = { ...form }
      if (!payload.customer) delete payload.customer
      await invoiceAPI.create(payload)
      toast.success('Invoice created!')
      setModal(false)
      setForm(EMPTY_INVOICE)
      load()
    } catch (err) {
      toast.error(err.response?.data ? JSON.stringify(err.response.data) : 'Error creating invoice')
    } finally {
      setSaving(false)
    }
  }

  const handlePDF = async (id, invNum) => {
    try {
      const { data } = await invoiceAPI.pdf(id)
      downloadBlob(data, `invoice_${invNum}.pdf`)
    } catch { toast.error('PDF generation failed') }
  }

  const handleExport = async () => {
    try {
      const { data } = await invoiceAPI.export(filters)
      downloadBlob(data, `woodtrack_invoices_${Date.now()}.xlsx`)
      toast.success('Export downloaded!')
    } catch { toast.error('Export failed') }
  }

  const gross = parseFloat(form.subtotal || 0)
  const tax = gross * parseFloat(form.tax_rate || 0) / 100
  const discount = parseFloat(form.discount || 0)
  const total = gross + tax - discount

  return (
    <div style={{ padding: 28 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Invoices</h1>
          <p style={{ color: '#666', fontSize: 14, marginTop: 4 }}>Create and manage customer invoices</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={handleExport} style={btnStyle('#fff', '#1a6b3a', true)}><Download size={15} /> Export</button>
          <button onClick={() => { setForm(EMPTY_INVOICE); setModal(true) }} style={btnStyle('#1a6b3a', '#fff')}><Plus size={15} /> New Invoice</button>
        </div>
      </div>

      {/* Filters */}
      <div style={{ background: '#fff', borderRadius: 10, padding: '14px 18px', marginBottom: 16, display: 'flex', gap: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#999' }} />
          <input placeholder="Search invoice or customer..." value={filters.search}
            onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
            style={{ ...inputStyle, paddingLeft: 30, width: '100%' }} />
        </div>
        <select value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))} style={inputStyle}>
          <option value="">All Status</option>
          {Object.entries(STATUS_BADGE).map(([v, { label }]) => <option key={v} value={v}>{label}</option>)}
        </select>
      </div>

      {/* Table */}
      <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>Loading...</div>
        ) : invoices.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🧾</div>
            <p style={{ color: '#999' }}>No invoices yet</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fdf9', borderBottom: '2px solid #e8f5e9' }}>
                {['Invoice #', 'Customer', 'Issue Date', 'Due Date', 'Total', 'Paid', 'Balance', 'Status', ''].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#1a6b3a' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv, i) => {
                const badge = STATUS_BADGE[inv.status] || STATUS_BADGE.draft
                return (
                  <tr key={inv.id} style={{ borderBottom: '1px solid #f5f5f5', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                    <td style={{ ...tdStyle, fontWeight: 600, color: '#1a6b3a' }}>{inv.invoice_number}</td>
                    <td style={tdStyle}>{inv.customer_name}</td>
                    <td style={tdStyle}>{inv.issue_date}</td>
                    <td style={{ ...tdStyle, color: inv.is_overdue ? '#d32f2f' : '#333' }}>
                      {inv.due_date}
                      {inv.is_overdue && <span style={{ fontSize: 10, color: '#d32f2f', marginLeft: 4 }}>({inv.days_overdue}d late)</span>}
                    </td>
                    <td style={{ ...tdStyle, fontWeight: 600 }}>{fmt(inv.total_amount)}</td>
                    <td style={{ ...tdStyle, color: '#2d9d5f' }}>{fmt(inv.amount_paid)}</td>
                    <td style={{ ...tdStyle, fontWeight: inv.balance_due > 0 ? 700 : 400, color: inv.balance_due > 0 ? '#d32f2f' : '#999' }}>{fmt(inv.balance_due)}</td>
                    <td style={tdStyle}>
                      <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: badge.bg, color: badge.color }}>
                        {badge.label}
                      </span>
                    </td>
                    <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>
                      <button title="View" onClick={() => navigate(`/invoices/${inv.id}`)} style={iconBtn}><Eye size={14} /></button>
                      <button title="Download PDF" onClick={() => handlePDF(inv.id, inv.invoice_number)} style={iconBtn}><FileDown size={14} /></button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Create Invoice Modal */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 14, width: '100%', maxWidth: 680, maxHeight: '92vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 22px', borderBottom: '1px solid #eee', position: 'sticky', top: 0, background: '#fff', zIndex: 1 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Create New Invoice</h3>
              <button onClick={() => setModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <div style={{ padding: '20px 22px' }}>
              {/* Customer section */}
              <div style={{ background: '#f8fdf9', borderRadius: 8, padding: 16, marginBottom: 18 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#1a6b3a', marginBottom: 12 }}>Customer Details</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={labelStyle}>Select Customer</label>
                    <select value={form.customer} onChange={e => handleCustomerChange(e.target.value)} style={inputStyleFull}>
                      <option value="">Choose existing...</option>
                      {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Customer Name *</label>
                    <input value={form.customer_name} onChange={e => setForm(f => ({ ...f, customer_name: e.target.value }))} style={inputStyleFull} placeholder="Customer name" />
                  </div>
                  <div>
                    <label style={labelStyle}>Phone</label>
                    <input value={form.customer_phone} onChange={e => setForm(f => ({ ...f, customer_phone: e.target.value }))} style={inputStyleFull} placeholder="Phone number" />
                  </div>
                  <div>
                    <label style={labelStyle}>Address</label>
                    <input value={form.customer_address} onChange={e => setForm(f => ({ ...f, customer_address: e.target.value }))} style={inputStyleFull} placeholder="Address" />
                  </div>
                </div>
              </div>

              {/* Dates */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 18 }}>
                <div>
                  <label style={labelStyle}>Issue Date *</label>
                  <input type="date" value={form.issue_date} onChange={e => setForm(f => ({ ...f, issue_date: e.target.value }))} style={inputStyleFull} />
                </div>
                <div>
                  <label style={labelStyle}>Due Date *</label>
                  <input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} style={inputStyleFull} />
                </div>
              </div>

              {/* Items */}
              <div style={{ marginBottom: 18 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#1a6b3a', marginBottom: 10 }}>Line Items</div>
                {form.items.map((item, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '3fr 1fr 1fr 2fr auto', gap: 8, marginBottom: 8, alignItems: 'flex-end' }}>
                    <div>
                      {i === 0 && <label style={labelStyle}>Description</label>}
                      <input placeholder="Item description" value={item.description} onChange={e => updateItem(i, 'description', e.target.value)} style={inputStyleFull} />
                    </div>
                    <div>
                      {i === 0 && <label style={labelStyle}>Qty</label>}
                      <input type="number" min="0" step="0.01" value={item.quantity} onChange={e => updateItem(i, 'quantity', e.target.value)} style={inputStyleFull} />
                    </div>
                    <div>
                      {i === 0 && <label style={labelStyle}>Unit</label>}
                      <select value={item.unit} onChange={e => updateItem(i, 'unit', e.target.value)} style={inputStyleFull}>
                        {['cft', 'ton', 'piece', 'sqft', 'kg'].map(u => <option key={u}>{u}</option>)}
                      </select>
                    </div>
                    <div>
                      {i === 0 && <label style={labelStyle}>Unit Price (₹)</label>}
                      <input type="number" min="0" step="0.01" placeholder="0.00" value={item.unit_price} onChange={e => updateItem(i, 'unit_price', e.target.value)} style={inputStyleFull} />
                    </div>
                    <button onClick={() => removeItem(i)} disabled={form.items.length === 1} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#d32f2f', paddingBottom: 6 }}>
                      <X size={16} />
                    </button>
                  </div>
                ))}
                <button onClick={addItem} style={{ ...btnStyle('#e8f5e9', '#1a6b3a', false), fontSize: 12, padding: '6px 12px', marginTop: 4 }}><Plus size={12} /> Add Item</button>
              </div>

              {/* Totals */}
              <div style={{ background: '#f8fdf9', borderRadius: 8, padding: 14, marginBottom: 14 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={labelStyle}>Tax Rate (%)</label>
                    <input type="number" min="0" max="100" step="0.01" value={form.tax_rate} onChange={e => setForm(f => ({ ...f, tax_rate: e.target.value }))} style={inputStyleFull} />
                  </div>
                  <div>
                    <label style={labelStyle}>Discount (₹)</label>
                    <input type="number" min="0" step="0.01" value={form.discount} onChange={e => setForm(f => ({ ...f, discount: e.target.value }))} style={inputStyleFull} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 11, color: '#666' }}>Total Amount</div>
                      <div style={{ fontSize: 20, fontWeight: 700, color: '#1a6b3a' }}>₹{total.toFixed(2)}</div>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label style={labelStyle}>Notes</label>
                <textarea rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} style={{ ...inputStyleFull, resize: 'vertical' }} placeholder="Optional notes..." />
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
                <button onClick={() => setModal(false)} style={btnStyle('#fff', '#666', true)}>Cancel</button>
                <button onClick={handleSave} disabled={saving} style={btnStyle('#1a6b3a', '#fff')}>
                  {saving ? 'Creating...' : 'Create Invoice'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const btnStyle = (bg, color, outlined) => ({
  display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px',
  background: bg, color, border: outlined ? `1.5px solid ${color}` : 'none',
  borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'inherit',
})
const tdStyle = { padding: '10px 16px', fontSize: 13 }
const iconBtn = { background: 'none', border: 'none', cursor: 'pointer', padding: 6, borderRadius: 6, color: '#555' }
const inputStyle = { padding: '8px 12px', border: '1.5px solid #e0e0e0', borderRadius: 7, fontSize: 13, outline: 'none', fontFamily: 'inherit', background: '#fff' }
const inputStyleFull = { ...inputStyle, width: '100%', display: 'block' }
const labelStyle = { display: 'block', fontSize: 12, fontWeight: 600, color: '#444', marginBottom: 5 }
