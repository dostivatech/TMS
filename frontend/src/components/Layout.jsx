import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  LayoutDashboard, ArrowLeftRight, FileText, CreditCard,
  Bell, Users, Package, LogOut, TreePine, ChevronRight, Menu, X
} from 'lucide-react'
import { useState } from 'react'

const NAV = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/transactions', icon: ArrowLeftRight, label: 'Transactions' },
  { to: '/invoices', icon: FileText, label: 'Invoices' },
  { to: '/payments', icon: CreditCard, label: 'Payments' },
  { to: '/reminders', icon: Bell, label: 'Reminders' },
  { to: '/customers', icon: Users, label: 'Customers' },
  { to: '/products', icon: Package, label: 'Products' },
  { to: '/users', icon: Users, label: 'Users' },
]

export default function Layout() { 
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Sidebar */}
      <aside style={{
        width: collapsed ? 64 : 240,
        background: 'linear-gradient(180deg, #0d4a27 0%, #1a6b3a 100%)',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.2s ease',
        flexShrink: 0,
        boxShadow: '2px 0 8px rgba(0,0,0,0.15)',
      }}>
        {/* Logo */}
        <div style={{
          padding: '20px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          justifyContent: collapsed ? 'center' : 'space-between',
        }}>
          {!collapsed && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <TreePine size={26} color="#4ade80" />
              <div>
                <div style={{ color: '#fff', fontWeight: 700, fontSize: 16, lineHeight: 1 }}>WoodTrack</div>
                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>Trading Management</div>
              </div>
            </div>
          )}
          {collapsed && <TreePine size={26} color="#4ade80" />}
          <button
            onClick={() => setCollapsed(!collapsed)}
            style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', padding: 4 }}
          >
            {collapsed ? <ChevronRight size={16} /> : <Menu size={16} />}
          </button>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '12px 8px', overflow: 'auto' }}>
          {NAV.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              title={collapsed ? label : undefined}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 10px',
                borderRadius: 8,
                marginBottom: 2,
                color: isActive ? '#fff' : 'rgba(255,255,255,0.65)',
                background: isActive ? 'rgba(255,255,255,0.15)' : 'transparent',
                textDecoration: 'none',
                fontSize: 14,
                fontWeight: isActive ? 600 : 400,
                transition: 'all 0.15s',
                justifyContent: collapsed ? 'center' : 'flex-start',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
              })}
            >
              <Icon size={18} />
              {!collapsed && label}
            </NavLink>
          ))}
        </nav>

        {/* User + Logout */}
        <div style={{ padding: '12px 8px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          {!collapsed && (
            <div style={{ padding: '8px 10px', marginBottom: 4 }}>
              <div style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>
                {user?.first_name || user?.username}
              </div>
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>
                {user?.is_staff ? 'Admin' : 'Trader'}
              </div>
            </div>
          )}
          <button
            onClick={handleLogout}
            title="Logout"
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              width: '100%', padding: '8px 10px', borderRadius: 8,
              background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)',
              cursor: 'pointer', fontSize: 13, justifyContent: collapsed ? 'center' : 'flex-start',
            }}
          >
            <LogOut size={16} />
            {!collapsed && 'Logout'}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, overflow: 'auto', background: '#f0f4f0' }}>
        <Outlet />
      </main>
    </div>
  )
}
