import { useEffect, useState, useMemo } from 'react'
import { dashboardAPI } from '../api/api'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'
import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`

function StatCard({ label, value, color, icon: Icon }) {
  return (
    <div style={{
      background: '#fff',
      padding: 20,
      borderRadius: 12,
      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      borderLeft: `4px solid ${color}`
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 12, color: '#666' }}>{label}</div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>{value}</div>
        </div>
        <Icon color={color} />
      </div>
    </div>
  )
}

export default function Dashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const navigate = useNavigate()

  const load = async () => {
    setLoading(true)
    const res = await dashboardAPI.analytics({ from, to })
    setData(res.data)
    setLoading(false)
  }

  useEffect(() => { load() }, [from, to])

  const chartData = useMemo(() => {
    if (!data?.daily) return []
    return Object.entries(data.daily).map(([date, val]) => ({
      date,
      ...val,
      profit: val.sales - val.purchases,
      cashflow: val.received - val.paid
    }))
  }, [data])

  if (loading) return <div style={{ padding: 40 }}>Loading...</div>

  return (
    <div style={{ padding: 28 }}>

      {/*  Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <button onClick={() => {
          const t = new Date().toISOString().split('T')[0]
          setFrom(t); setTo(t)
        }}>Today</button>

        <button onClick={() => {
          const d = new Date(); d.setDate(d.getDate() - 7)
          setFrom(d.toISOString().split('T')[0])
          setTo(new Date().toISOString().split('T')[0])
        }}>7 Days</button>

        <button onClick={() => {
          const d = new Date(); d.setDate(d.getDate() - 30)
          setFrom(d.toISOString().split('T')[0])
          setTo(new Date().toISOString().split('T')[0])
        }}>30 Days</button>

        <input type="date" onChange={(e) => setFrom(e.target.value)} />
        <input type="date" onChange={(e) => setTo(e.target.value)} />
      </div>

      {/*  KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 16 }}>
        <StatCard label="Sales" value={fmt(data.summary.sales)} color="#2d9d5f" icon={TrendingUp} />
        <StatCard label="Purchases" value={fmt(data.summary.purchases)} color="#1565c0" icon={TrendingDown} />
        <StatCard label="Profit" value={fmt(data.summary.profit)} color="#6a1b9a" icon={DollarSign} />
        <StatCard label="Cash Flow" value={fmt(data.summary.cashflow)} color="#00897b" icon={DollarSign} />
        <StatCard label="Pending" value={fmt(data.summary.pending)} color="#f57c00" icon={DollarSign} />
      </div>

      {/*  Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20, marginTop: 30 }}>

        {/* Revenue Chart */}
        <div style={{ background: '#fff', padding: 20, borderRadius: 12 }}>
          <h3>Revenue vs Purchases</h3>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Area dataKey="sales" stroke="#2d9d5f" fillOpacity={0.2} />
              <Area dataKey="purchases" stroke="#1565c0" fillOpacity={0.2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Profit Chart */}
        <div style={{ background: '#fff', padding: 20, borderRadius: 12 }}>
          <h3>Profit Trend</h3>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={chartData}>
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Area dataKey="profit" stroke="#6a1b9a" fillOpacity={0.2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

      </div>

      {/*  Cash Flow */}
      <div style={{ marginTop: 30, background: '#fff', padding: 20, borderRadius: 12 }}>
        <h3>Cash Flow</h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="received" fill="#2d9d5f" />
            <Bar dataKey="paid" fill="#d32f2f" />
          </BarChart>
        </ResponsiveContainer>
      </div>

    </div>
  )
}