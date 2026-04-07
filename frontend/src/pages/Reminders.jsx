import { useState, useEffect } from 'react'
import { invoiceAPI } from '../api/api'
import { useNavigate } from 'react-router-dom'
import { Bell, AlertTriangle, Clock, Eye, RefreshCw } from 'lucide-react'

const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`

export default function Reminders() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [days, setDays] = useState(7)
  const navigate = useNavigate()

  const load = () => {
    setLoading(true)
    invoiceAPI.reminders(days).then(({ data }) => setData(data)).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [days])

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>Loading reminders...</div>

  return (
    <div style={{ padding: 28 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Payment Reminders</h1>
          <p style={{ color: '#666', fontSize: 14, marginTop: 4 }}>Overdue and upcoming invoice alerts</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <select value={days} onChange={e => setDays(e.target.value)} style={{ padding: '8px 12px', border: '1.5px solid #e0e0e0', borderRadius: 7, fontSize: 13, outline: 'none', fontFamily: 'inherit' }}>
            <option value={3}>Due in 3 days</option>
            <option value={7}>Due in 7 days</option>
            <option value={14}>Due in 14 days</option>
            <option value={30}>Due in 30 days</option>
          </select>
          <button onClick={load} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: '#1a6b3a', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}>
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 28 }}>
        <SummaryCard
          icon={AlertTriangle} iconColor="#d32f2f"
          bg="#ffebee" title="Overdue"
          count={data?.overdue_count || 0}
          amount={fmt(data?.overdue_amount || 0)}
          label="Immediate action required"
        />
        <SummaryCard
          icon={Clock} iconColor="#f57c00"
          bg="#fff3e0" title="Due Soon"
          count={data?.due_soon_count || 0}
          amount={fmt(data?.due_soon_amount || 0)}
          label={`Within ${days} days`}
        />
        <SummaryCard
          icon={Bell} iconColor="#1a6b3a"
          bg="#e8f5e9" title="Total At Risk"
          count={(data?.overdue_count || 0) + (data?.due_soon_count || 0)}
          amount={fmt((parseFloat(data?.overdue_amount || 0)) + (parseFloat(data?.due_soon_amount || 0)))}
          label="Requires follow-up"
        />
      </div>

      {/* Overdue Section */}
      <InvoiceSection
        title="🚨 Overdue Invoices"
        invoices={data?.overdue || []}
        color="#d32f2f"
        bg="#ffebee"
        emptyMsg="No overdue invoices! 🎉"
        onView={(id) => navigate(`/invoices/${id}`)}
        showDaysOverdue
      />

      {/* Due Soon Section */}
      <div style={{ marginTop: 24 }}>
        <InvoiceSection
          title={`⏰ Due in Next ${days} Days`}
          invoices={data?.due_soon || []}
          color="#f57c00"
          bg="#fff3e0"
          emptyMsg="No invoices due soon"
          onView={(id) => navigate(`/invoices/${id}`)}
        />
      </div>
    </div>
  )
}

function SummaryCard({ icon: Icon, iconColor, bg, title, count, amount, label }) {
  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: '20px 22px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', borderTop: `4px solid ${iconColor}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#333', marginBottom: 2 }}>{title}</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: iconColor }}>{count}</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#555', marginTop: 2 }}>{amount}</div>
          <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>{label}</div>
        </div>
        <div style={{ background: bg, borderRadius: 10, padding: 10 }}>
          <Icon size={22} color={iconColor} />
        </div>
      </div>
    </div>
  )
}

function InvoiceSection({ title, invoices, color, bg, emptyMsg, onView, showDaysOverdue }) {
  return (
    <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
      <div style={{ padding: '16px 22px', borderBottom: '2px solid #f5f5f5', background: bg }}>
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color }}>{title}</h3>
      </div>
      {invoices.length === 0 ? (
        <div style={{ padding: '30px 22px', textAlign: 'center', color: '#2d9d5f', fontSize: 14, fontWeight: 500 }}>{emptyMsg}</div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#fafafa' }}>
              {['Invoice #', 'Customer', 'Issue Date', 'Due Date', showDaysOverdue ? 'Days Overdue' : 'Days Remaining', 'Balance Due', ''].map(h => (
                <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#666' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv, i) => {
              const daysRemaining = showDaysOverdue ? inv.days_overdue : Math.ceil((new Date(inv.due_date) - new Date()) / 86400000)
              return (
                <tr key={inv.id} style={{ borderBottom: '1px solid #f5f5f5', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                  <td style={{ padding: '10px 16px', fontSize: 13, fontWeight: 600, color: '#1a6b3a' }}>{inv.invoice_number}</td>
                  <td style={{ padding: '10px 16px', fontSize: 13, fontWeight: 500 }}>{inv.customer_name}</td>
                  <td style={{ padding: '10px 16px', fontSize: 13, color: '#666' }}>{inv.issue_date}</td>
                  <td style={{ padding: '10px 16px', fontSize: 13, color }}>{inv.due_date}</td>
                  <td style={{ padding: '10px 16px', fontSize: 13, fontWeight: 700, color }}>
                    {showDaysOverdue ? `${daysRemaining} days` : `${daysRemaining} days`}
                  </td>
                  <td style={{ padding: '10px 16px', fontSize: 14, fontWeight: 700, color }}>{`₹${Number(inv.balance_due).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`}</td>
                  <td style={{ padding: '10px 16px' }}>
                    <button onClick={() => onView(inv.id)} style={{ display: 'flex', alignItems: 'center', gap: 5, background: color + '15', border: `1px solid ${color}40`, borderRadius: 6, padding: '5px 10px', cursor: 'pointer', color, fontSize: 12, fontWeight: 600 }}>
                      <Eye size={13} /> View
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}
