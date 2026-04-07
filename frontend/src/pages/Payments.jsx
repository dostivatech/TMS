import { useState, useEffect } from 'react'
import { paymentAPI } from '../api/api'
import { useNavigate } from 'react-router-dom'
import { CreditCard, Eye } from 'lucide-react'

const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`

const METHOD_ICONS = { cash: '💵', bank_transfer: '🏦', cheque: '📝', upi: '📱', other: '💳' }

export default function Payments() {
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    paymentAPI.list().then(({ data }) => setPayments(data.results || data)).finally(() => setLoading(false))
  }, [])

  const totalPaid = payments.reduce((s, p) => s + parseFloat(p.amount), 0)

  return (
    <div style={{ padding: 28 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Payments</h1>
        <p style={{ color: '#666', fontSize: 14, marginTop: 4 }}>All payment transactions recorded</p>
      </div>

      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 24 }}>
        <div style={{ background: '#fff', borderRadius: 10, padding: '16px 18px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', borderLeft: '4px solid #2d9d5f' }}>
          <div style={{ fontSize: 12, color: '#888' }}>Total Received</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#2d9d5f' }}>{fmt(totalPaid)}</div>
        </div>
        <div style={{ background: '#fff', borderRadius: 10, padding: '16px 18px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', borderLeft: '4px solid #1565c0' }}>
          <div style={{ fontSize: 12, color: '#888' }}>Total Records</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#1565c0' }}>{payments.length}</div>
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>Loading...</div>
        ) : payments.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>💳</div>
            <p style={{ color: '#999' }}>No payments recorded yet</p>
            <button onClick={() => navigate('/invoices')} style={{ marginTop: 12, background: '#1a6b3a', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontSize: 13 }}>
              Go to Invoices
            </button>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fdf9', borderBottom: '2px solid #e8f5e9' }}>
                {['Date', 'Invoice', 'Customer', 'Method', 'Reference', 'Amount', ''].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#1a6b3a' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {payments.map((p, i) => (
                <tr key={p.id} style={{ borderBottom: '1px solid #f5f5f5', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                  <td style={td}>{p.payment_date}</td>
                  <td style={{ ...td, fontWeight: 600, color: '#1a6b3a' }}>{p.invoice_detail?.invoice_number || `#${p.invoice}`}</td>
                  <td style={td}>{p.invoice_detail?.customer_name || '—'}</td>
                  <td style={td}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                      {METHOD_ICONS[p.payment_method] || '💳'} {p.payment_method_display || p.payment_method}
                    </span>
                  </td>
                  <td style={{ ...td, color: '#666' }}>{p.reference_number || '—'}</td>
                  <td style={{ ...td, fontWeight: 700, color: '#2d9d5f', fontSize: 14 }}>{fmt(p.amount)}</td>
                  <td style={td}>
                    <button onClick={() => navigate(`/invoices/${p.invoice}`)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#1a6b3a' }}>
                      <Eye size={15} />
                    </button>
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

const td = { padding: '10px 16px', fontSize: 13 }
