import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { TreePine, Eye, EyeOff } from 'lucide-react'
import toast from 'react-hot-toast'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ username: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [showPw, setShowPw] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await login(form.username, form.password)
      navigate('/')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Invalid credentials')
    } finally {
      setLoading(false)
    }
  }

  const s = {
    page: {
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: 'linear-gradient(135deg, #0d4a27 0%, #1a6b3a 50%, #2d9d5f 100%)',
    },
    card: {
      background: '#fff', borderRadius: 16, padding: '40px 36px',
      width: '100%', maxWidth: 400, boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
    },
    logo: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28, justifyContent: 'center' },
    title: { color: '#1a6b3a', fontWeight: 800, fontSize: 24, margin: 0 },
    sub: { color: '#666', fontSize: 13, margin: 0 },
    label: { display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600, color: '#333' },
    inputWrap: { position: 'relative', marginBottom: 18 },
    input: {
      width: '100%', padding: '11px 14px', border: '1.5px solid #e0e0e0',
      borderRadius: 8, fontSize: 14, outline: 'none', transition: 'border 0.2s',
      fontFamily: 'inherit',
    },
    btn: {
      width: '100%', padding: '12px', background: 'linear-gradient(135deg, #1a6b3a, #2d9d5f)',
      color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 700,
      cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1,
      fontFamily: 'inherit', marginTop: 4,
    },
  }

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.logo}>
          <TreePine size={36} color="#1a6b3a" />
          <div>
            <h1 style={s.title}>WoodTrack</h1>
            <p style={s.sub}>Wood Trading Management</p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={s.inputWrap}>
            <label style={s.label}>Username</label>
            <input
              style={s.input}
              type="text"
              placeholder="Enter username"
              value={form.username}
              onChange={e => setForm({ ...form, username: e.target.value })}
              required
              onFocus={e => e.target.style.borderColor = '#1a6b3a'}
              onBlur={e => e.target.style.borderColor = '#e0e0e0'}
            />
          </div>

          <div style={s.inputWrap}>
            <label style={s.label}>Password</label>
            <div style={{ position: 'relative' }}>
              <input
                style={{ ...s.input, paddingRight: 40 }}
                type={showPw ? 'text' : 'password'}
                placeholder="Enter password"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                required
                onFocus={e => e.target.style.borderColor = '#1a6b3a'}
                onBlur={e => e.target.style.borderColor = '#e0e0e0'}
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#999' }}
              >
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button type="submit" style={s.btn} disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 12, color: '#999' }}>
          WoodTrack v1.0 • Secure Multi-User Platform
        </p>
      </div>
    </div>
  )
}
