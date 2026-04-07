const router = require('express').Router()
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { User } = require('../models')
require('dotenv').config()

const generateTokens = (user) => {
  const access = jwt.sign(
    { id: user.id, username: user.username, isAdmin: user.isAdmin },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
  )
  const refresh = jwt.sign(
    { id: user.id },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d' }
  )
  return { access, refresh }
}

// ── POST /api/auth/login ──────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body

    if (!username || !password) {
      return res.status(400).json({ detail: 'Username and password required' })
    }

    const user = await User.findOne({ where: { username } })
    if (!user) {
      return res.status(401).json({ detail: 'Invalid credentials' })
    }

    const valid = await bcrypt.compare(password, user.password)
    if (!valid) {
      return res.status(401).json({ detail: 'Invalid credentials' })
    }

    if (!user.isActive) {
      return res.status(401).json({ detail: 'Account is disabled' })
    }

    const tokens = generateTokens(user)
    res.json(tokens)
  } catch (err) {
    console.error('Login error:', err)
    res.status(500).json({ detail: 'Server error' })
  }
})

// ── POST /api/auth/refresh ────────────────────────────────────────────────────
router.post('/refresh', async (req, res) => {
  try {
    const { refresh } = req.body
    if (!refresh) return res.status(400).json({ detail: 'Refresh token required' })

    const decoded = jwt.verify(refresh, process.env.JWT_SECRET)
    const user = await User.findByPk(decoded.id)
    if (!user) return res.status(401).json({ detail: 'User not found' })

    const tokens = generateTokens(user)
    res.json(tokens)
  } catch (err) {
    res.status(401).json({ detail: 'Invalid refresh token' })
  }
})

// ── POST /api/auth/register ───────────────────────────────────────────────────
router.post('/register', async (req, res) => {
  try {
    const { username, email, firstName, lastName, password, password2, phone } = req.body

    if (!username || !password) {
      return res.status(400).json({ detail: 'Username and password required' })
    }

    if (password !== password2) {
      return res.status(400).json({ password: 'Passwords do not match' })
    }

    if (password.length < 6) {
      return res.status(400).json({ password: 'Password must be at least 6 characters' })
    }

    const exists = await User.findOne({ where: { username } })
    if (exists) {
      return res.status(400).json({ username: 'Username already taken' })
    }

    const hashed = await bcrypt.hash(password, 10)
    const user = await User.create({
      username, email: email || '',
      firstName: firstName || '',
      phone: phone || '',
      lastName: lastName || '',
      password: hashed,
    })

    res.status(201).json({
      id: user.id,
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      phone: user.phone,
      lastName: user.lastName,
      isAdmin: user.isAdmin,
    })
  } catch (err) {
    console.error('Register error:', err)
    res.status(500).json({ detail: 'Server error' })
  }
})

// ── GET /api/auth/me ──────────────────────────────────────────────────────────
router.get('/me', require('../middleware/auth'), async (req, res) => {
  const u = req.user
  res.json({
    id: u.id,
    username: u.username,
    email: u.email,
    firstName: u.firstName,
    lastName: u.lastName,
    isAdmin: u.isAdmin,
    is_staff: u.isAdmin, // compatibility with frontend
    first_name: u.firstName,
    last_name: u.lastName,
  })
})

module.exports = router
