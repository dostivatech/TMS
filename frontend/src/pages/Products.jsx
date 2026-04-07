import { useState, useEffect, useCallback } from 'react'
import { productAPI } from '../api/api'
import { Plus, Search, Edit2, Trash2, X, Package } from 'lucide-react'
import toast from 'react-hot-toast'

const EMPTY = { name: '', species: '', unit: 'cft', price_per_unit: '', stock_quantity: '0', description: '', is_active: true }
const UNITS = ['cft', 'ton', 'piece', 'sqft', 'kg']

export default function Products() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await productAPI.list(search ? { search } : {})
    setProducts(data.results || data)
    setLoading(false)
  }, [search])

  useEffect(() => { load() }, [load])

  const openCreate = () => { setEditing(null); setForm(EMPTY); setModal(true) }
  const openEdit = (p) => { setEditing(p); setForm(p); setModal(true) }

  const handleSave = async () => {
    if (!form.name || !form.price_per_unit) { toast.error('Name and price are required'); return }
    setSaving(true)
    try {
      if (editing) await productAPI.update(editing.id, form)
      else await productAPI.create(form)
      toast.success(editing ? 'Product updated!' : 'Product added!')
      setModal(false)
      load()
    } catch { toast.error('Error saving product') } finally { setSaving(false) }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this product?')) return
    await productAPI.delete(id)
    toast.success('Deleted')
    load()
  }

  return (
    <div style={{ padding: 28 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Products</h1>
          <p style={{ color: '#666', fontSize: 14, marginTop: 4 }}>Wood products catalog & pricing</p>
        </div>
        <button onClick={openCreate} style={btnGreen}><Plus size={15} /> New Product</button>
      </div>

      {/* Search */}
      <div style={{ background: '#fff', borderRadius: 10, padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
        <Search size={15} color="#999" />
        <input placeholder="Search products..." value={search} onChange={e => setSearch(e.target.value)}
          style={{ border: 'none', outline: 'none', fontSize: 14, flex: 1, fontFamily: 'inherit' }} />
      </div>

      {/* Table */}
      <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>Loading...</div>
        ) : products.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center' }}>
            <Package size={48} color="#e0e0e0" style={{ margin: '0 auto 12px', display: 'block' }} />
            <p style={{ color: '#999' }}>No products added yet</p>
            <button onClick={openCreate} style={{ ...btnGreen, margin: '12px auto 0', display: 'inline-flex' }}><Plus size={14} /> Add Product</button>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fdf9', borderBottom: '2px solid #e8f5e9' }}>
                {['Product', 'Species', 'Unit', 'Price/Unit', 'Stock', 'Status', ''].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#1a6b3a' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {products.map((p, i) => (
                <tr key={p.id} style={{ borderBottom: '1px solid #f5f5f5', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 600, fontSize: 13 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 20 }}>🌲</span> {p.name}
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: '#666' }}>{p.species || '—'}</td>
                  <td style={{ padding: '12px 16px', fontSize: 13 }}>
                    <span style={{ background: '#e8f5e9', color: '#1a6b3a', padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600 }}>{p.unit}</span>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 700, color: '#1a6b3a' }}>
                    ₹{Number(p.price_per_unit).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 13 }}>{p.stock_quantity} {p.unit}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: p.is_active ? '#2d9d5f' : '#999', background: p.is_active ? '#e8f5e9' : '#f5f5f5', padding: '3px 10px', borderRadius: 12 }}>
                      {p.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <button onClick={() => openEdit(p)} style={iconBtn}><Edit2 size={14} /></button>
                    <button onClick={() => handleDelete(p.id)} style={{ ...iconBtn, color: '#d32f2f' }}><Trash2 size={14} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 14, width: '100%', maxWidth: 480, maxHeight: '90vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 22px', borderBottom: '1px solid #eee' }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{editing ? 'Edit Product' : 'New Product'}</h3>
              <button onClick={() => setModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <div style={{ padding: '20px 22px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Product Name *</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={inputFull} placeholder="e.g. Teak Wood" />
              </div>
              <div>
                <label style={labelStyle}>Species</label>
                <input value={form.species} onChange={e => setForm(f => ({ ...f, species: e.target.value }))} style={inputFull} placeholder="e.g. Burma Teak" />
              </div>
              <div>
                <label style={labelStyle}>Unit</label>
                <select value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} style={inputFull}>
                  {UNITS.map(u => <option key={u}>{u}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Price per Unit (₹) *</label>
                <input type="number" min="0" step="0.01" value={form.price_per_unit} onChange={e => setForm(f => ({ ...f, price_per_unit: e.target.value }))} style={inputFull} placeholder="0.00" />
              </div>
              <div>
                <label style={labelStyle}>Stock Quantity</label>
                <input type="number" min="0" step="0.01" value={form.stock_quantity} onChange={e => setForm(f => ({ ...f, stock_quantity: e.target.value }))} style={inputFull} placeholder="0" />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Description</label>
                <textarea rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} style={{ ...inputFull, resize: 'vertical' }} placeholder="Optional description..." />
              </div>
              <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="checkbox" id="is_active" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} style={{ cursor: 'pointer' }} />
                <label htmlFor="is_active" style={{ fontSize: 13, cursor: 'pointer' }}>Active (visible in transaction forms)</label>
              </div>
              <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 10, marginTop: 8, justifyContent: 'flex-end' }}>
                <button onClick={() => setModal(false)} style={{ padding: '9px 16px', background: '#fff', border: '1.5px solid #ccc', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}>Cancel</button>
                <button onClick={handleSave} disabled={saving} style={{ padding: '9px 18px', background: '#1a6b3a', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'inherit' }}>
                  {saving ? 'Saving...' : editing ? 'Update' : 'Add Product'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const btnGreen = { display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', background: '#1a6b3a', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'inherit' }
const iconBtn = { background: 'none', border: 'none', cursor: 'pointer', padding: 6, borderRadius: 6, color: '#666' }
const inputFull = { width: '100%', padding: '9px 12px', border: '1.5px solid #e0e0e0', borderRadius: 7, fontSize: 13, outline: 'none', fontFamily: 'inherit', display: 'block' }
const labelStyle = { display: 'block', fontSize: 12, fontWeight: 600, color: '#444', marginBottom: 5 }
