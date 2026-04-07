import { useEffect, useState } from 'react'
import { dashboardAPI } from '../api/api'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts'
import { TrendingUp, TrendingDown, FileText, AlertCircle, DollarSign, Clock } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`

function StatCard({ label, value, icon: Icon, color, sub, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: '#fff', borderRadius: 12, padding: '20px 22px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)', cursor: onClick ? 'pointer' : 'default',
        borderLeft: `4px solid ${color}`, transition: 'transform 0.15s, box-shadow 0.15s',
      }}
      onMouseEnter={e => onClick && (e.currentTarget.style.transform = 'translateY(-2px)')}
      onMouseLeave={e => onClick && (e.currentTarget.style.transform = 'none')}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>{label}</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#1a1a1a' }}>{value}</div>
          {sub && <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>{sub}</div>}
        </div>
        <div style={{ background: `${color}20`, borderRadius: 10, padding: 10 }}>
          <Icon size={22} color={color} />
        </div>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    dashboardAPI.get()
      .then(({ data }) => setData(data))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <PageLoader />
  if (!data) return <div style={{ padding: 32 }}>Failed to load dashboard.</div>

  const STATUS_COLORS = {
    paid: '#2d9d5f', overdue: '#d32f2f', partial: '#f57c00', sent: '#1565c0', draft: '#999'
  }

  return (
    <div style={{ padding: 28 }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1a1a1a', margin: 0 }}>Dashboard</h1>
        <p style={{ color: '#666', fontSize: 14, marginTop: 4 }}>Overview of your wood trading business</p>
      </div>

      {/* Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 28 }}>
        <StatCard label="Total Sales" value={fmt(data.total_sales)} icon={TrendingUp} color="#2d9d5f"
          sub="All time revenue" onClick={() => navigate('/transactions?type=sell')} />
        <StatCard label="Total Purchases" value={fmt(data.total_purchases)} icon={TrendingDown} color="#1565c0"
          sub="All time purchases" onClick={() => navigate('/transactions?type=buy')} />
        <StatCard label="Outstanding" value={fmt(data.total_outstanding)} icon={DollarSign} color="#f57c00"
          sub={`${data.total_invoices} total invoices`} onClick={() => navigate('/invoices')} />
        <StatCard label="Overdue" value={fmt(data.overdue_amount)} icon={AlertCircle} color="#d32f2f"
          sub={`${data.overdue_count} overdue invoices`} onClick={() => navigate('/reminders')} />
      </div>

      {/* Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20, marginBottom: 20 }}>
        {/* Monthly Chart */}
        <div style={{ background: '#fff', borderRadius: 12, padding: 22, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <h3 style={{ margin: '0 0 18px', fontSize: 14, fontWeight: 600, color: '#333' }}>Sales vs Purchases (Last 6 Months)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={data.monthly_sales}>
              <defs>
                <linearGradient id="cSales" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2d9d5f" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#2d9d5f" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="cBuy" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#1565c0" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#1565c0" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v) => fmt(v)} />
              <Legend />
              <Area type="monotone" dataKey="sales" name="Sales" stroke="#2d9d5f" fill="url(#cSales)" strokeWidth={2} />
              <Area type="monotone" dataKey="purchases" name="Purchases" stroke="#1565c0" fill="url(#cBuy)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Top Customers */}
        <div style={{ background: '#fff', borderRadius: 12, padding: 22, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <h3 style={{ margin: '0 0 18px', fontSize: 14, fontWeight: 600, color: '#333' }}>Top Customers</h3>
          {data.top_customers.length === 0 ? (
            <p style={{ color: '#999', fontSize: 13, textAlign: 'center', marginTop: 40 }}>No customers yet</p>
          ) : (
            data.top_customers.map((c, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%',
                    background: `hsl(${i * 60}, 50%, 45%)`, color: '#fff',
                    fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>{c.name[0]}</div>
                  <span style={{ fontSize: 13, color: '#333' }}>{c.name}</span>
                </div>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#1a6b3a' }}>{fmt(c.total)}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Bottom Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Recent Transactions */}
        <div style={{ background: '#fff', borderRadius: 12, padding: 22, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#333' }}>Recent Transactions</h3>
            <button onClick={() => navigate('/transactions')} style={{ background: 'none', border: 'none', color: '#1a6b3a', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>View All →</button>
          </div>
          {data.recent_transactions.length === 0 ? (
            <p style={{ color: '#999', fontSize: 13 }}>No transactions yet</p>
          ) : (
            data.recent_transactions.map(t => (
              <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f5f5f5' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{t.product_name}</div>
                  <div style={{ fontSize: 11, color: '#999' }}>{t.transaction_date} · {t.customer_name || '—'}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: t.transaction_type === 'sell' ? '#2d9d5f' : '#1565c0' }}>
                    {t.transaction_type === 'sell' ? '+' : '-'}{fmt(t.total_amount)}
                  </div>
                  <div style={{ fontSize: 10, color: '#999', textTransform: 'uppercase' }}>{t.transaction_type}</div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Overdue Invoices */}
        <div style={{ background: '#fff', borderRadius: 12, padding: 22, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#333' }}>⚠️ Overdue Invoices</h3>
            <button onClick={() => navigate('/reminders')} style={{ background: 'none', border: 'none', color: '#d32f2f', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>View All →</button>
          </div>
          {data.overdue_invoices.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
              <p style={{ color: '#2d9d5f', fontSize: 13, fontWeight: 600 }}>No overdue invoices!</p>
            </div>
          ) : (
            data.overdue_invoices.map(inv => (
              <div key={inv.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f5f5f5' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{inv.customer_name}</div>
                  <div style={{ fontSize: 11, color: '#d32f2f' }}>{inv.days_overdue} days overdue · {inv.invoice_number}</div>
                </div>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#d32f2f' }}>{fmt(inv.balance_due)}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

function PageLoader() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column', gap: 12 }}>
      <div style={{ width: 36, height: 36, border: '3px solid #e0e0e0', borderTopColor: '#1a6b3a', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      <span style={{ color: '#999', fontSize: 13 }}>Loading dashboard...</span>
    </div>
  )
}
