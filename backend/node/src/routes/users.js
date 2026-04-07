const router = require('express').Router()
const bcrypt = require('bcryptjs')
const { User } = require('../models')
const auth = require('../middleware/auth')

// Admin only middleware
const adminOnly = (req, res, next) => {
  if (!req.user.isAdmin) {
    return res.status(403).json({ error: 'Admin access required' })
  }
  next()
}

// GET all users (admin only)
router.get('/', auth, adminOnly, async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: ['id', 'username', 'email', 'firstName', 'lastName', 'isAdmin', 'isActive', 'createdAt']
    })
    res.json({ results: users, count: users.length })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST create user (admin only)
router.post('/', auth, adminOnly, async (req, res) => {
  try {
    const { username, password, email, firstName, lastName, isAdmin , phone} = req.body

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' })
    }

    const exists = await User.findOne({ where: { username } })
    if (exists) return res.status(400).json({ error: 'Username already taken' })

    const hashed = await bcrypt.hash(password, 10)
    const user = await User.create({
      username, email: email || '',
      firstName: firstName || '',
      lastName: lastName || '',
      password: hashed,
      phone: phone || '',
      isAdmin: isAdmin || false,
      isActive: true,
    })

    res.status(201).json({
      id: user.id, username: user.username,
      email: user.email, isAdmin: user.isAdmin
    })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// PUT update user (admin only)
router.put('/:id', auth, adminOnly, async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id)
    if (!user) return res.status(404).json({ error: 'User not found' })

    const { password, ...rest } = req.body
    if (password) rest.password = await bcrypt.hash(password, 10)

    await user.update(rest)
    res.json({
      id: user.id, username: user.username,
      email: user.email, isAdmin: user.isAdmin, isActive: user.isActive
    })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// DELETE user (admin only)
router.delete('/:id', auth, adminOnly, async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id)
    if (!user) return res.status(404).json({ error: 'User not found' })
    if (user.id === req.user.id) return res.status(400).json({ error: 'Cannot delete yourself' })
    await user.destroy()
    res.status(204).send()
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PATCH toggle active status (admin only)
router.patch('/:id/toggle', auth, adminOnly, async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id)
    if (!user) return res.status(404).json({ error: 'User not found' })
    await user.update({ isActive: !user.isActive })
    res.json({ id: user.id, username: user.username, isActive: user.isActive })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router