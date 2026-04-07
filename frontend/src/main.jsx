import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { Toaster } from 'react-hot-toast'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 3500,
        style: { borderRadius: '8px', fontSize: '14px' },
        success: { style: { background: '#e8f5e9', color: '#1a6b3a', border: '1px solid #2d9d5f' } },
        error: { style: { background: '#ffebee', color: '#d32f2f', border: '1px solid #d32f2f' } },
      }}
    />
  </React.StrictMode>
)
