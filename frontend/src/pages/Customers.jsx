import { useState, useEffect, useCallback } from 'react'
import { customerAPI } from '../api/api'
import { Plus, Search, Edit2, Trash2, X, Users } from 'lucide-react'
import toast from 'react-hot-toast'
import { useNavigate } from "react-router-dom";

const EMPTY = { name: '', phone: '', email: '', address: '', gstin: '', notes: '' }

export default function Customers() {
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const params = search ? { search } : {}
    const { data } = await customerAPI.list(params)
    setCustomers(data.results || data)
    setLoading(false)
  }, [search])

  useEffect(() => { load() }, [load])

  const openCreate = () => { setEditing(null); setForm(EMPTY); setModal(true) }
  const openEdit = (c) => { setEditing(c); setForm(c); setModal(true) }

  const handleSave = async () => {
    if (!form.name) { toast.error('Name is required'); return }
    setSaving(true)
    try {
      if (editing) await customerAPI.update(editing.id, form)
      else await customerAPI.create(form)
      toast.success(editing ? 'Customer updated!' : 'Customer added!')
      setModal(false)
      load()
    } catch { toast.error('Error saving customer') } finally { setSaving(false) }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this customer?')) return
    await customerAPI.delete(id)
    toast.success('Deleted')
    load()
  }

const navigate = useNavigate();

const handleClick = (customer) => {
  navigate(`/customers/${customer.id}`);
};

  return (
    <div style={{ padding: 28 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Customers</h1>
          <p style={{ color: '#666', fontSize: 14, marginTop: 4 }}>Manage your customer directory</p>
        </div>
        <button onClick={openCreate} style={btnGreen}><Plus size={15} /> New Customer</button>
      </div>

      {/* Search */}
      <div style={{ background: '#fff', borderRadius: 10, padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
        <Search size={15} color="#999" />
        <input placeholder="Search by name, phone, email..." value={search} onChange={e => setSearch(e.target.value)}
          style={{ border: 'none', outline: 'none', fontSize: 14, flex: 1, fontFamily: 'inherit' }} />
      </div>

      {/* Grid */}
      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>Loading...</div>
      ) : customers.length === 0 ? (
        <div style={{ padding: 60, textAlign: 'center' }}>
          <Users size={48} color="#e0e0e0" style={{ margin: '0 auto 12px', display: 'block' }} />
          <p style={{ color: '#999' }}>No customers found</p>
          <button onClick={openCreate} style={{ ...btnGreen, margin: '12px auto 0', display: 'inline-flex' }}><Plus size={14} /> Add Customer</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {customers.map(c => (
            <div key={c.id} style={{ background: '#fff', borderRadius: 12, padding: 18, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', transition: 'box-shadow 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.1)'}
              onMouseLeave={e => e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)'}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: `hsl(${c.name.charCodeAt(0) * 7}, 50%, 45%)`, color: '#fff', fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                          onClick={() => handleClick(c)}>
                    {c.name[0].toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{c.name}</div>
                    {c.phone && <div style={{ fontSize: 12, color: '#666' }}>{c.phone}</div>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button onClick={() => openEdit(c)} style={iconBtn}><Edit2 size={13} /></button>
                  <button onClick={() => handleDelete(c.id)} style={{ ...iconBtn, color: '#d32f2f' }}><Trash2 size={13} /></button>
                </div>
              </div>
              {c.email && <div style={{ fontSize: 12, color: '#888', marginTop: 10 }}>✉️ {c.email}</div>}
              {c.address && <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>📍 {c.address.split('\n')[0]}</div>}
              {c.gstin && <div style={{ fontSize: 11, color: '#aaa', marginTop: 4 }}>GST: {c.gstin}</div>}
              <div style={{ display: 'flex', gap: 12, marginTop: 12, paddingTop: 12, borderTop: '1px solid #f5f5f5' }}>
                <div style={{ fontSize: 12, color: '#666' }}>
                  <span style={{ fontWeight: 600, color: '#1a6b3a' }}>{c.total_transactions || 0}</span> txns
                </div>
                {c.total_amount > 0 && (
                  <div style={{ fontSize: 12, color: '#666' }}>
                    ₹<span style={{ fontWeight: 600, color: '#1a6b3a' }}>{Number(c.total_amount).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span> total
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 14, width: '100%', maxWidth: 480, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 22px', borderBottom: '1px solid #eee' }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{editing ? 'Edit Customer' : 'New Customer'}</h3>
              <button onClick={() => setModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <div style={{ padding: '20px 22px', display: 'grid', gap: 12 }}>
              {[
                { label: 'Name *', key: 'name', type: 'text', placeholder: 'Customer name' },
                { label: 'Phone', key: 'phone', type: 'tel', placeholder: 'Phone number' },
                { label: 'Email', key: 'email', type: 'email', placeholder: 'Email address' },
                { label: 'GSTIN', key: 'gstin', type: 'text', placeholder: 'GST number' },
              ].map(f => (
                <div key={f.key}>
                  <label style={labelStyle}>{f.label}</label>
                  <input type={f.type} placeholder={f.placeholder} value={form[f.key]} onChange={e => setForm(x => ({ ...x, [f.key]: e.target.value }))} style={inputFull} />
                </div>
              ))}
              <div>
                <label style={labelStyle}>Address</label>
                <textarea rows={2} placeholder="Full address" value={form.address} onChange={e => setForm(x => ({ ...x, address: e.target.value }))} style={{ ...inputFull, resize: 'vertical' }} />
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 8, justifyContent: 'flex-end' }}>
                <button onClick={() => setModal(false)} style={{ padding: '9px 16px', background: '#fff', border: '1.5px solid #ccc', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}>Cancel</button>
                <button onClick={handleSave} disabled={saving} style={{ padding: '9px 18px', background: '#1a6b3a', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'inherit' }}>
                  {saving ? 'Saving...' : editing ? 'Update' : 'Add Customer'}
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
const iconBtn = { background: 'none', border: 'none', cursor: 'pointer', padding: 5, borderRadius: 6, color: '#666' }
const inputFull = { width: '100%', padding: '9px 12px', border: '1.5px solid #e0e0e0', borderRadius: 7, fontSize: 13, outline: 'none', fontFamily: 'inherit', display: 'block' }
const labelStyle = { display: 'block', fontSize: 12, fontWeight: 600, color: '#444', marginBottom: 5 }
