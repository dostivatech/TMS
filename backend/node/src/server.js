require('dotenv').config()
const express = require('express')
const cors = require('cors')
const bcrypt = require('bcryptjs')

const app = express()
const PORT = process.env.PORT || 8000

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({ origin: '*', credentials: true }))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth',         require('./routes/auth'))
app.use('/api/transactions', require('./routes/transactions'))
app.use('/api/invoices',     require('./routes/invoices'))
app.use('/api/payments',     require('./routes/payments'))
app.use('/api/dashboard',    require('./routes/dashboard'))
app.use('/api/users', require('./routes/users'))

const { custRouter, prodRouter } = require('./routes/customerProducts')
app.use('/api/customers', custRouter)
app.use('/api/products',  prodRouter)

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/api/', (req, res) => {
  res.json({ message: '🌲 WoodTrack API is running!', version: '1.0.0' })
})

// ── Start + Sync DB ───────────────────────────────────────────────────────────
const { sequelize, User } = require('./models')

const start = async () => {
  try {
    await sequelize.sync({ alter: false }) // Set to true to auto-update tables (use with caution in production)
    console.log('✅ Database synced')

    // Create default admin if no users exist
    const exists = await User.findOne({ where: { username: 'admin' } })
    if (!exists) {
      const hashed = await bcrypt.hash('admin123', 10)
      await User.create({
        username: 'admin',
        email: 'admin@woodtrack.com',
        firstName: 'Admin',
        lastName: 'User',
        password: hashed,
        isAdmin: true,
      })
      console.log('✅ Default admin created')
      console.log('   Username: admin')
      console.log('   Password: admin123')
    }

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`\n🚀 WoodTrack API running on http://0.0.0.0:${PORT}`)
      console.log(`📱 Mobile URL: http://YOUR_IP:${PORT}/api`)
      console.log(`🌐 Web URL:    http://localhost:${PORT}/api\n`)
    })
  } catch (err) {
    console.error('❌ Failed to start:', err)
    process.exit(1)
  }
}

start()
