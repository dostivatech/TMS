import axios from 'axios'
import AsyncStorage from '@react-native-async-storage/async-storage'

export const BASE_URL = 'http://172.23.32.134:8000/api'

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
})

// Attach token to every request
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Auto-refresh on 401
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config
    if (err.response?.status === 401 && !original._retry) {
      original._retry = true
      const refresh = await AsyncStorage.getItem('refresh_token')
      if (refresh) {
        try {
          const { data } = await axios.post(`${BASE_URL}/auth/refresh/`, { refresh })
          await AsyncStorage.setItem('access_token', data.access)
          original.headers.Authorization = `Bearer ${data.access}`
          return api(original)
        } catch {
          await AsyncStorage.clear()
        }
      }
    }
    return Promise.reject(err)
  }
)

export default api

// ── Auth ─────────────────────────────────────────────────────────────────────
export const authAPI = {
  login: (data) => axios.post(`${BASE_URL}/auth/login/`, data),
  me: () => api.get('/auth/me/'),
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
export const dashboardAPI = {
  get: () => api.get('/dashboard/'),
}

// ── Transactions ──────────────────────────────────────────────────────────────
export const transactionAPI = {
  list: (params) => api.get('/transactions/', { params }),
  create: (data) => api.post('/transactions/', data),
  update: (id, data) => api.put(`/transactions/${id}/`, data),
  delete: (id) => api.delete(`/transactions/${id}/`),
  summary: (params) => api.get('/transactions/summary/', { params }),
}

// ── Invoices ──────────────────────────────────────────────────────────────────
export const invoiceAPI = {
  list: (params) => api.get('/invoices/', { params }),
  get: (id) => api.get(`/invoices/${id}/`),
  create: (data) => api.post('/invoices/', data),
  markSent: (id) => api.post(`/invoices/${id}/mark_sent/`),
  cancel: (id) => api.post(`/invoices/${id}/cancel/`),
  reminders: (days) => api.get('/invoices/reminders/', { params: { days } }),
}

// ── Payments ──────────────────────────────────────────────────────────────────
export const paymentAPI = {
  list: (params) => api.get('/payments/', { params }),
  create: (data) => api.post('/payments/', data),
  delete: (id) => api.delete(`/payments/${id}/`),
}

// ── Customers ─────────────────────────────────────────────────────────────────
export const customerAPI = {
  list: (params) => api.get('/customers/', { params }),
  create: (data) => api.post('/customers/', data),
  update: (id, data) => api.put(`/customers/${id}/`, data),
  delete: (id) => api.delete(`/customers/${id}/`),
}

// ── Products ──────────────────────────────────────────────────────────────────
export const productAPI = {
  list: (params) => api.get('/products/', { params }),
  create: (data) => api.post('/products/', data),
  update: (id, data) => api.put(`/products/${id}/`, data),
  delete: (id) => api.delete(`/products/${id}/`),
}

// ── Helpers ───────────────────────────────────────────────────────────────────
export const fmt = (n) =>
  `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
