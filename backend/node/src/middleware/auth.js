const jwt = require('jsonwebtoken')
const { User } = require('../models')
require('dotenv').config()

const auth = async (req, res, next) => {
  try {
    const header = req.headers.authorization
    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' })
    }

    const token = header.split(' ')[1]
    const decoded = jwt.verify(token, process.env.JWT_SECRET)

    const user = await User.findByPk(decoded.id)
    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'User not found or inactive' })
    }

    req.user = user
    next()
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' })
  }
}

module.exports = auth
