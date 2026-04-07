import { useState, useEffect, useCallback } from 'react'
import { transactionAPI, customerAPI, productAPI, downloadBlob } from '../api/api'
import { Plus, Search, Download, Edit2, Trash2, X, Filter } from 'lucide-react'
import toast from 'react-hot-toast'

const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`

const EMPTY = {
  transaction_type: 'sell', product_name: '', product: '',
  customer: '', customer_name: '', quantity: '', unit: 'cft',
  unit_price: '', notes: '', transaction_date: new Date().toISOString().split('T')[0], status: 'completed'
}

export default function Transactions() {
  const [transactions, setTransactions] = useState([])
  const [customers, setCustomers] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [filters, setFilters] = useState({ search: '', type: '', date_from: '', date_to: '' })
  const [summary, setSummary] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = {}
      if (filters.search) params.search = filters.search
      if (filters.type) params.type = filters.type
      if (filters.date_from) params.date_from = filters.date_from
      if (filters.date_to) params.date_to = filters.date_to
      const [txRes, sumRes] = await Promise.all([
        transactionAPI.list(params),
        transactionAPI.summary(params)
      ])
      setTransactions(txRes.data.results || txRes.data)
      setSummary(sumRes.data)
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    customerAPI.list({ page_size: 100 }).then(r => setCustomers(r.data.results || r.data))
    productAPI.list({ page_size: 100 }).then(r => setProducts(r.data.results || r.data))
  }, [])

  const openCreate = () => { setEditing(null); setForm(EMPTY); setModal(true) }
  const openEdit = (t) => { setEditing(t); setForm({ ...t, customer: t.customer || '', product: t.product || '' }); setModal(true) }

  const handleProductChange = (productId) => {
    const p = products.find(x => x.id == productId)
    setForm(f => ({
      ...f, product: productId,
      product_name: p ? p.name : f.product_name,
      unit_price: p ? p.price_per_unit : f.unit_price,
      unit: p ? p.unit : f.unit,
    }))
  }

  const handleCustomerChange = (customerId) => {
    const c = customers.find(x => x.id == customerId)
    setForm(f => ({ ...f, customer: customerId, customer_name: c ? c.name : f.customer_name }))
  }

  const handleSave = async () => {
    if (!form.product_name || !form.quantity || !form.unit_price) {
      toast.error('Please fill all required fields')
      return
    }
    setSaving(true)
    try {
      const payload = { ...form }
      if (!payload.customer) delete payload.customer
      if (!payload.product) delete payload.product

      if (editing) await transactionAPI.update(editing.id, payload)
      else await transactionAPI.create(payload)

      toast.success(editing ? 'Transaction updated!' : 'Transaction added!')
      setModal(false)
      load()
    } catch (err) {
      toast.error(err.response?.data ? JSON.stringify(err.response.data) : 'Error saving')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this transaction?')) return
    await transactionAPI.delete(id)
    toast.success('Deleted')
    load()
  }

  const handleExport = async () => {
    try {
      const { data } = await transactionAPI.export(filters)
      downloadBlob(data, `woodtrack_transactions_${Date.now()}.xlsx`)
      toast.success('Export downloaded!')
    } catch { toast.error('Export failed') }
  }

  const total = form.quantity && form.unit_price ? (parseFloat(form.quantity) * parseFloat(form.unit_price)).toFixed(2) : '0.00'

  return (
    <div style={{ padding: 28 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Transactions</h1>
          <p style={{ color: '#666', fontSize: 14, marginTop: 4 }}>Manage buy/sell records</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={handleExport} style={btnStyle('#fff', '#1a6b3a', true)}>
            <Download size={15} /> Export
          </button>
          <button onClick={openCreate} style={btnStyle('#1a6b3a', '#fff')}>
            <Plus size={15} /> New Transaction
          </button>
        </div>
      </div>

      {/* Summary cards */}
      {summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 20 }}>
          {[
            { label: 'Total Sales', value: fmt(summary.total_sales), color: '#2d9d5f' },
            { label: 'Total Purchases', value: fmt(summary.total_purchases), color: '#1565c0' },
            { label: 'Net Profit', value: fmt(summary.net), color: summary.net >= 0 ? '#2d9d5f' : '#d32f2f' },
          ].map(s => (
            <div key={s.label} style={{ background: '#fff', borderRadius: 10, padding: '14px 18px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', borderLeft: `3px solid ${s.color}` }}>
              <div style={{ fontSize: 12, color: '#888' }}>{s.label}</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div style={{ background: '#fff', borderRadius: 10, padding: '14px 18px', marginBottom: 16, display: 'flex', gap: 12, flexWrap: 'wrap', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#999' }} />
          <input placeholder="Search product, customer..." value={filters.search}
            onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
            style={{ ...inputStyle, paddingLeft: 30, width: '100%' }} />
        </div>
        <select value={filters.type} onChange={e => setFilters(f => ({ ...f, type: e.target.value }))} style={inputStyle}>
          <option value="">All Types</option>
          <option value="sell">Sales</option>
          <option value="buy">Purchases</option>
        </select>
        <input type="date" value={filters.date_from} onChange={e => setFilters(f => ({ ...f, date_from: e.target.value }))} style={inputStyle} placeholder="From" />
        <input type="date" value={filters.date_to} onChange={e => setFilters(f => ({ ...f, date_to: e.target.value }))} style={inputStyle} placeholder="To" />
        {(filters.search || filters.type || filters.date_from || filters.date_to) && (
          <button onClick={() => setFilters({ search: '', type: '', date_from: '', date_to: '' })} style={{ background: 'none', border: '1.5px solid #ddd', borderRadius: 7, padding: '6px 12px', cursor: 'pointer', color: '#666', fontSize: 12 }}>
            Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>Loading...</div>
        ) : transactions.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📦</div>
            <p style={{ color: '#999' }}>No transactions found</p>
            <button onClick={openCreate} style={{ ...btnStyle('#1a6b3a', '#fff'), marginTop: 16 }}><Plus size={14} /> Add First Transaction</button>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fdf9', borderBottom: '2px solid #e8f5e9' }}>
                {['Date', 'Type', 'Product', 'Customer', 'Qty', 'Unit Price', 'Total', 'Status', ''].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#1a6b3a', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {transactions.map((t, i) => (
                <tr key={t.id} style={{ borderBottom: '1px solid #f5f5f5', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                  <td style={tdStyle}>{t.transaction_date}</td>
                  <td style={tdStyle}>
                    <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: t.transaction_type === 'sell' ? '#e8f5e9' : '#e3f2fd', color: t.transaction_type === 'sell' ? '#2d9d5f' : '#1565c0' }}>
                      {t.transaction_type === 'sell' ? '↑ SELL' : '↓ BUY'}
                    </span>
                  </td>
                  <td style={{ ...tdStyle, fontWeight: 500 }}>{t.product_name}</td>
                  <td style={{ ...tdStyle, color: '#666' }}>{t.customer_name || '—'}</td>
                  <td style={tdStyle}>{t.quantity} {t.unit}</td>
                  <td style={tdStyle}>{fmt(t.unit_price)}</td>
                  <td style={{ ...tdStyle, fontWeight: 700, color: t.transaction_type === 'sell' ? '#2d9d5f' : '#1565c0' }}>{fmt(t.total_amount)}</td>
                  <td style={tdStyle}>
                    <span style={{ fontSize: 11, color: t.status === 'completed' ? '#2d9d5f' : '#f57c00' }}>{t.status}</span>
                  </td>
                  <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>
                    <button onClick={() => openEdit(t)} style={iconBtn}><Edit2 size={14} /></button>
                    <button onClick={() => handleDelete(t.id)} style={{ ...iconBtn, color: '#d32f2f' }}><Trash2 size={14} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <Modal title={editing ? 'Edit Transaction' : 'New Transaction'} onClose={() => setModal(false)}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label style={labelStyle}>Type *</label>
              <select value={form.transaction_type} onChange={e => setForm(f => ({ ...f, transaction_type: e.target.value }))} style={inputStyleFull}>
                <option value="sell">Sale (Sell)</option>
                <option value="buy">Purchase (Buy)</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Date *</label>
              <input type="date" value={form.transaction_date} onChange={e => setForm(f => ({ ...f, transaction_date: e.target.value }))} style={inputStyleFull} />
            </div>
            <div>
              <label style={labelStyle}>Product</label>
              <select value={form.product} onChange={e => handleProductChange(e.target.value)} style={inputStyleFull}>
                <option value="">Select product...</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name} {p.species ? `(${p.species})` : ''}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Product Name *</label>
              <input placeholder="Product name" value={form.product_name} onChange={e => setForm(f => ({ ...f, product_name: e.target.value }))} style={inputStyleFull} />
            </div>
            <div>
              <label style={labelStyle}>Customer</label>
              <select value={form.customer} onChange={e => handleCustomerChange(e.target.value)} style={inputStyleFull}>
                <option value="">Select customer...</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Customer Name</label>
              <input placeholder="Customer name" value={form.customer_name} onChange={e => setForm(f => ({ ...f, customer_name: e.target.value }))} style={inputStyleFull} />
            </div>
            <div>
              <label style={labelStyle}>Quantity *</label>
              <input type="number" min="0" step="0.01" placeholder="0.00" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} style={inputStyleFull} />
            </div>
            <div>
              <label style={labelStyle}>Unit</label>
              <select value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} style={inputStyleFull}>
                {['cft', 'ton', 'piece', 'sqft', 'kg'].map(u => <option key={u}>{u}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Unit Price (₹) *</label>
              <input type="number" min="0" step="0.01" placeholder="0.00" value={form.unit_price} onChange={e => setForm(f => ({ ...f, unit_price: e.target.value }))} style={inputStyleFull} />
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <div style={{ background: '#e8f5e9', borderRadius: 8, padding: '12px 16px', flex: 1 }}>
                <div style={{ fontSize: 11, color: '#666' }}>Total Amount</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#1a6b3a' }}>₹{total}</div>
              </div>
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>Notes</label>
              <textarea rows={2} placeholder="Optional notes..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} style={{ ...inputStyleFull, resize: 'vertical' }} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
            <button onClick={() => setModal(false)} style={btnStyle('#fff', '#666', true)}>Cancel</button>
            <button onClick={handleSave} disabled={saving} style={btnStyle('#1a6b3a', '#fff')}>
              {saving ? 'Saving...' : editing ? 'Update' : 'Save Transaction'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}

function Modal({ title, onClose, children }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: '#fff', borderRadius: 14, width: '100%', maxWidth: 580, maxHeight: '90vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 22px', borderBottom: '1px solid #eee' }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{title}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#666' }}><X size={18} /></button>
        </div>
        <div style={{ padding: '20px 22px' }}>{children}</div>
      </div>
    </div>
  )
}

const btnStyle = (bg, color, outlined) => ({
  display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px',
  background: bg, color: color, border: outlined ? `1.5px solid ${color}` : 'none',
  borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'inherit',
})
const tdStyle = { padding: '10px 16px', fontSize: 13 }
const iconBtn = { background: 'none', border: 'none', cursor: 'pointer', padding: 6, borderRadius: 6, color: '#666' }
const inputStyle = { padding: '8px 12px', border: '1.5px solid #e0e0e0', borderRadius: 7, fontSize: 13, outline: 'none', fontFamily: 'inherit', background: '#fff' }
const inputStyleFull = { ...inputStyle, width: '100%', display: 'block' }
const labelStyle = { display: 'block', fontSize: 12, fontWeight: 600, color: '#444', marginBottom: 5 }
