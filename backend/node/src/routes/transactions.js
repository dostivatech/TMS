const router = require('express').Router()
const { Op } = require('sequelize')
const { Transaction, Customer } = require('../models')
const auth = require('../middleware/auth')

const scope = (req) => req.user.isAdmin ? {} : { userId: req.user.id }

// GET /api/transactions
router.get('/', auth, async (req, res) => {
  try {
    const where = { ...scope(req) }
    const { type, date_from, date_to, search } = req.query

    if (type) where.type = type
    if (date_from) where.transactionDate = { ...where.transactionDate, [Op.gte]: date_from }
    if (date_to) where.transactionDate = { ...where.transactionDate, [Op.lte]: date_to }
    if (search) {
      where[Op.or] = [
        { productName: { [Op.like]: `%${search}%` } },
        { customerName: { [Op.like]: `%${search}%` } },
      ]
    }

    const transactions = await Transaction.findAll({
      where, order: [['transactionDate', 'DESC'], ['createdAt', 'DESC']],
    })
    res.json({ results: transactions, count: transactions.length })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/transactions/summary
router.get('/summary', auth, async (req, res) => {
  try {
    const { sequelize } = require('../models')
    const where = { ...scope(req) }
    const { type, date_from, date_to } = req.query
    if (type) where.type = type
    if (date_from) where.transactionDate = { ...where.transactionDate, [Op.gte]: date_from }
    if (date_to) where.transactionDate = { ...where.transactionDate, [Op.lte]: date_to }

    const all = await Transaction.findAll({ where })
    const sales = all.filter(t => t.type === 'sell').reduce((s, t) => s + parseFloat(t.totalAmount || 0), 0)
    const purchases = all.filter(t => t.type === 'buy').reduce((s, t) => s + parseFloat(t.totalAmount || 0), 0)

    res.json({ total_sales: sales, total_purchases: purchases, net: sales - purchases, count: all.length })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/transactions
router.post('/', auth, async (req, res) => {
  try {
    const body = req.body
    const type            = body.type || body.transaction_type
    const productName     = body.productName || body.product_name
    const customerName    = body.customerName || body.customer_name || ''
    const customerId      = body.customerId || body.customer || null
    const quantity        = body.quantity
    const unit            = body.unit || 'cft'
    const unitPrice       = body.unitPrice || body.unit_price
    const notes           = body.notes || ''
    const transactionDate = body.transactionDate || body.transaction_date || new Date()
    const status          = body.status || 'completed'
    const totalAmount     = parseFloat(quantity) * parseFloat(unitPrice)

    if (!type || !productName || !quantity || !unitPrice) {
      return res.status(400).json({ error: 'Type, product name, quantity and unit price are required' })
    }

    const txn = await Transaction.create({
      type, productName, customerName,
      customerId, quantity, unit,
      unitPrice, totalAmount, notes,
      transactionDate, status,
      userId: req.user.id,
    })
    res.status(201).json(txn)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// PUT /api/transactions/:id
router.put('/:id', auth, async (req, res) => {
  try {
    const txn = await Transaction.findOne({ where: { id: req.params.id, ...scope(req) } })
    if (!txn) return res.status(404).json({ error: 'Not found' })

    const { quantity, unitPrice } = req.body
    if (quantity && unitPrice) req.body.totalAmount = parseFloat(quantity) * parseFloat(unitPrice)

    await txn.update(req.body)
    res.json(txn)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// DELETE /api/transactions/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const txn = await Transaction.findOne({ where: { id: req.params.id, ...scope(req) } })
    if (!txn) return res.status(404).json({ error: 'Not found' })
    await txn.destroy()
    res.status(204).send()
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
