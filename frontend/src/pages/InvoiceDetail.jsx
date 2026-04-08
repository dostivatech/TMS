import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { invoiceAPI, paymentAPI, downloadBlob } from '../api/api'
import { ArrowLeft, FileDown, Send, XCircle, Plus, Trash2, X } from 'lucide-react'
import toast from 'react-hot-toast'

const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`

const STATUS_BADGE = {
  paid:      { bg: '#e8f5e9', color: '#2d9d5f' },
  overdue:   { bg: '#ffebee', color: '#d32f2f' },
  partial:   { bg: '#fff3e0', color: '#f57c00' },
  sent:      { bg: '#e3f2fd', color: '#1565c0' },
  draft:     { bg: '#f5f5f5', color: '#666' },
  cancelled: { bg: '#f5f5f5', color: '#999' },
}

export default function InvoiceDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [invoice, setInvoice] = useState(null)
  const [loading, setLoading] = useState(true)
  const [payModal, setPayModal] = useState(false)
  const [payForm, setPayForm] = useState({ amount: '', payment_method: 'cash', reference_number: '', payment_date: new Date().toISOString().split('T')[0], notes: '' })
  const [saving, setSaving] = useState(false)

  const load = () => {
    setLoading(true)
    invoiceAPI.get(id).then(({ data }) => setInvoice(data)).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [id])

  const handlePDF = async () => {
    try {
      const { data } = await invoiceAPI.pdf(id)
      downloadBlob(data, `invoice_${invoice.invoice_number}.pdf`)
    } catch { toast.error('PDF failed') }
  }

  const handleMarkSent = async () => {
    await invoiceAPI.markSent(id)
    toast.success('Marked as Sent')
    load()
  }

  const handleCancel = async () => {
    if (!confirm('Cancel this invoice?')) return
    await invoiceAPI.cancel(id)
    toast.success('Invoice cancelled')
    load()
  }

  const handleAddPayment = async () => {
    if (!payForm.amount || parseFloat(payForm.amount) <= 0) {
      toast.error('Enter a valid amount')
      return
    }
    setSaving(true)
    try {
      await paymentAPI.create({ ...payForm, invoice: parseInt(id) })
      toast.success('Payment recorded!')
      setPayModal(false)
      setPayForm({ amount: '', payment_method: 'cash', reference_number: '', payment_date: new Date().toISOString().split('T')[0], notes: '' })
      load()
    } catch (err) {
      toast.error('Failed to record payment')
    } finally {
      setSaving(false)
    }
  }

  const handlePrint = async () => {
  try {
    const { data } = await invoiceAPI.pdf(id)

    const blob = new Blob([data], { type: 'application/pdf' })
    const url = window.URL.createObjectURL(blob)

    const printWindow = window.open(url)

    printWindow.onload = () => {
      printWindow.focus()
      printWindow.print()
    }
  } catch {
    toast.error('Print failed')
  }
}

  const handleDeletePayment = async (pid) => {
    if (!confirm('Delete this payment?')) return
    await paymentAPI.delete(pid)
    toast.success('Payment deleted')
    load()
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>Loading...</div>
  if (!invoice) return <div style={{ padding: 40 }}>Invoice not found.</div>

  const badge = STATUS_BADGE[invoice.status] || STATUS_BADGE.draft
  const progress = invoice.total_amount > 0 ? (invoice.amount_paid / invoice.total_amount) * 100 : 0

  return (
    <div style={{ padding: 28, maxWidth: 900, margin: '0 auto' }}>
      {/* Back */}
      <button onClick={() => navigate('/invoices')} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: '#666', fontSize: 13, marginBottom: 20, padding: 0 }}>
        <ArrowLeft size={16} /> Back to Invoices
      </button>

      {/* Header */}
      <div style={{ background: '#fff', borderRadius: 12, padding: 24, marginBottom: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
              <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>{invoice.invoice_number}</h1>
              <span style={{ padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700, background: badge.bg, color: badge.color }}>
                {invoice.get_status_display || invoice.status.toUpperCase()}
              </span>
            </div>
            <div style={{ color: '#666', fontSize: 13 }}>
              <strong>{invoice.customer_name}</strong>
              {invoice.customer_phone && ` · ${invoice.customer_phone}`}
            </div>
            {invoice.customer_address && <div style={{ color: '#999', fontSize: 12, marginTop: 2 }}>{invoice.customer_address}</div>}
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button onClick={handlePDF} style={btnStyle('#fff', '#1a6b3a', true)}><FileDown size={14} /> PDF</button>
            <button onClick={handlePrint} style={btnStyle('#fff', '#000', true)}> 🖨️ Print</button>
            {invoice.status === 'draft' && (
              <button onClick={handleMarkSent} style={btnStyle('#1565c0', '#fff')}><Send size={14} /> Mark Sent</button>
            )}
            {!['paid', 'cancelled'].includes(invoice.status) && invoice.balance_due > 0 && (
              <button onClick={() => setPayModal(true)} style={btnStyle('#1a6b3a', '#fff')}><Plus size={14} /> Add Payment</button>
            )}
            {!['paid', 'cancelled'].includes(invoice.status) && (
              <button onClick={handleCancel} style={btnStyle('#fff', '#d32f2f', true)}><XCircle size={14} /> Cancel</button>
            )}
          </div>
        </div>

        {/* Amount summary */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 14, marginTop: 24 }}>
          {[
            { label: 'Subtotal', value: fmt(invoice.subtotal) },
            { label: `Tax (${invoice.tax_rate}%)`, value: fmt(invoice.tax_amount) },
            { label: 'Discount', value: fmt(invoice.discount) },
            { label: 'Total', value: fmt(invoice.total_amount), bold: true, color: '#1a1a1a' },
            { label: 'Paid', value: fmt(invoice.amount_paid), color: '#2d9d5f' },
            { label: 'Balance Due', value: fmt(invoice.balance_due), bold: true, color: invoice.balance_due > 0 ? '#d32f2f' : '#2d9d5f' },
          ].map(s => (
            <div key={s.label} style={{ background: '#f8fdf9', borderRadius: 8, padding: '12px 14px' }}>
              <div style={{ fontSize: 11, color: '#888' }}>{s.label}</div>
              <div style={{ fontSize: 16, fontWeight: s.bold ? 700 : 500, color: s.color || '#333', marginTop: 2 }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Progress bar */}
        <div style={{ marginTop: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#888', marginBottom: 4 }}>
            <span>Payment Progress</span>
            <span>{progress.toFixed(0)}%</span>
          </div>
          <div style={{ height: 8, background: '#e0e0e0', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${Math.min(progress, 100)}%`, background: progress >= 100 ? '#2d9d5f' : '#f57c00', borderRadius: 4, transition: 'width 0.3s' }} />
          </div>
        </div>

        {/* Dates */}
        <div style={{ display: 'flex', gap: 20, marginTop: 14, fontSize: 13, color: '#666' }}>
          <span>📅 Issued: <strong>{invoice.issue_date}</strong></span>
          <span style={{ color: invoice.is_overdue ? '#d32f2f' : '#666' }}>
            ⏰ Due: <strong>{invoice.due_date}</strong>
            {invoice.is_overdue && <span style={{ color: '#d32f2f', marginLeft: 6, fontSize: 11 }}>({invoice.days_overdue} days overdue)</span>}
          </span>
        </div>
      </div>

      {/* Items */}
      {invoice.items && invoice.items.length > 0 && (
        <div style={{ background: '#fff', borderRadius: 12, padding: 22, marginBottom: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <h3 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 700 }}>Items</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fdf9' }}>
                {['Description', 'Qty', 'Unit', 'Rate', 'Amount'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: h === 'Description' ? 'left' : 'right', fontSize: 12, fontWeight: 600, color: '#1a6b3a' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f5f5f5' }}>
                  <td style={{ padding: '10px 14px', fontSize: 13 }}>{item.description}</td>
                  <td style={{ padding: '10px 14px', fontSize: 13, textAlign: 'right' }}>{item.quantity}</td>
                  <td style={{ padding: '10px 14px', fontSize: 13, textAlign: 'right' }}>{item.unit}</td>
                  <td style={{ padding: '10px 14px', fontSize: 13, textAlign: 'right' }}>{fmt(item.unit_price)}</td>
                  <td style={{ padding: '10px 14px', fontSize: 13, textAlign: 'right', fontWeight: 600 }}>
                    {fmt(parseFloat(item.quantity) * parseFloat(item.unit_price))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Payments */}
      <div style={{ background: '#fff', borderRadius: 12, padding: 22, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <h3 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 700 }}>Payment History</h3>
        {!invoice.payments || invoice.payments.length === 0 ? (
          <p style={{ color: '#999', fontSize: 13 }}>No payments recorded yet.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fdf9' }}>
                {['Date', 'Method', 'Reference', 'Amount', ''].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#1a6b3a' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {invoice.payments.map(p => (
                <tr key={p.id} style={{ borderBottom: '1px solid #f5f5f5' }}>
                  <td style={{ padding: '10px 14px', fontSize: 13 }}>{p.payment_date}</td>
                  <td style={{ padding: '10px 14px', fontSize: 13 }}>{p.payment_method_display || p.payment_method}</td>
                  <td style={{ padding: '10px 14px', fontSize: 13, color: '#666' }}>{p.reference_number || '—'}</td>
                  <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 700, color: '#2d9d5f' }}>{fmt(p.amount)}</td>
                  <td style={{ padding: '10px 14px' }}>
                    <button onClick={() => handleDeletePayment(p.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#d32f2f' }}><Trash2 size={14} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Payment Modal */}
      {payModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 14, width: '100%', maxWidth: 440, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 22px', borderBottom: '1px solid #eee' }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Record Payment</h3>
              <button onClick={() => setPayModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <div style={{ padding: '20px 22px' }}>
              <div style={{ background: '#f8fdf9', borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 13 }}>
                Balance due: <strong style={{ color: '#d32f2f', fontSize: 16 }}>{fmt(invoice.balance_due)}</strong>
              </div>
              <div style={{ display: 'grid', gap: 12 }}>
                <div>
                  <label style={labelStyle}>Amount (₹) *</label>
                  <input type="number" min="0" step="0.01" placeholder="0.00" value={payForm.amount} onChange={e => setPayForm(f => ({ ...f, amount: e.target.value }))} style={inputStyleFull} autoFocus />
                </div>
                <div>
                  <label style={labelStyle}>Payment Method</label>
                  <select value={payForm.payment_method} onChange={e => setPayForm(f => ({ ...f, payment_method: e.target.value }))} style={inputStyleFull}>
                    <option value="cash">Cash</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="cheque">Cheque</option>
                    <option value="upi">UPI</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Payment Date</label>
                  <input type="date" value={payForm.payment_date} onChange={e => setPayForm(f => ({ ...f, payment_date: e.target.value }))} style={inputStyleFull} />
                </div>
                <div>
                  <label style={labelStyle}>Reference Number</label>
                  <input placeholder="Cheque/UPI ref..." value={payForm.reference_number} onChange={e => setPayForm(f => ({ ...f, reference_number: e.target.value }))} style={inputStyleFull} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
                <button onClick={() => setPayModal(false)} style={btnStyle('#fff', '#666', true)}>Cancel</button>
                <button onClick={handleAddPayment} disabled={saving} style={btnStyle('#1a6b3a', '#fff')}>
                  {saving ? 'Saving...' : 'Record Payment'}
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
  display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
  background: bg, color, border: outlined ? `1.5px solid ${color}` : 'none',
  borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'inherit',
})
const inputStyle = { padding: '9px 12px', border: '1.5px solid #e0e0e0', borderRadius: 7, fontSize: 13, outline: 'none', fontFamily: 'inherit', background: '#fff' }
const inputStyleFull = { ...inputStyle, width: '100%', display: 'block' }
const labelStyle = { display: 'block', fontSize: 12, fontWeight: 600, color: '#444', marginBottom: 5 }
