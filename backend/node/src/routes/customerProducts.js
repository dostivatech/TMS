const express = require('express')
const { Op } = require('sequelize')
const { Customer, WoodProduct, Transaction } = require('../models')
const auth = require('../middleware/auth')

const scope = (req) => req.user.isAdmin ? {} : { userId: req.user.id }

// ── CUSTOMERS ─────────────────────────────────────────────────────────────────

const custRouter = express.Router()

custRouter.get('/', auth, async (req, res) => {
  try {
    const where = { ...scope(req) }
    if (req.query.search) {
      where[Op.or] = [
        { name:  { [Op.like]: `%${req.query.search}%` } },
        { phone: { [Op.like]: `%${req.query.search}%` } },
        { email: { [Op.like]: `%${req.query.search}%` } },
      ]
    }

    const customers = await Customer.findAll({
      where,
      include: [{ model: Transaction, as: 'transactions', attributes: ['id', 'totalAmount'] }],
      order: [['name', 'ASC']],
    })

    const formatted = customers.map(c => ({
      ...c.toJSON(),
      total_transactions: c.transactions.length,
      total_amount: c.transactions.reduce((s, t) => s + parseFloat(t.totalAmount || 0), 0),
      transactions: undefined,
    }))

    res.json({ results: formatted, count: formatted.length })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

custRouter.get('/:id', auth, async (req, res) => {
  try {
    const c = await Customer.findOne({ where: { id: req.params.id, ...scope(req) } })
    if (!c) return res.status(404).json({ error: 'Not found' })
    res.json(c)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

custRouter.post('/', auth, async (req, res) => {
  try {
    if (!req.body.name) return res.status(400).json({ error: 'Name is required' })
    const c = await Customer.create({ ...req.body, userId: req.user.id })
    res.status(201).json(c)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

custRouter.put('/:id', auth, async (req, res) => {
  try {
    const c = await Customer.findOne({ where: { id: req.params.id, ...scope(req) } })
    if (!c) return res.status(404).json({ error: 'Not found' })
    await c.update(req.body)
    res.json(c)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

custRouter.delete('/:id', auth, async (req, res) => {
  try {
    const c = await Customer.findOne({ where: { id: req.params.id, ...scope(req) } })
    if (!c) return res.status(404).json({ error: 'Not found' })
    await c.destroy()
    res.status(204).send()
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── PRODUCTS ──────────────────────────────────────────────────────────────────

const prodRouter = express.Router()

prodRouter.get('/', auth, async (req, res) => {
  try {
    const where = { ...scope(req) }
    if (req.query.search) {
      where[Op.or] = [
        { name:    { [Op.like]: `%${req.query.search}%` } },
        { species: { [Op.like]: `%${req.query.search}%` } },
      ]
    }
    const products = await WoodProduct.findAll({ where, order: [['name', 'ASC']] })
    res.json({ results: products, count: products.length })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

prodRouter.post('/', auth, async (req, res) => {
  try {
    const body = req.body

    const name         = body.name
    const species      = body.species || ''
    const unit         = body.unit || 'cft'
    const pricePerUnit = body.pricePerUnit || body.price_per_unit
    const stockQty     = body.stockQty !== undefined ? body.stockQty
                        : body.stock_quantity !== undefined ? body.stock_quantity : 0
    const description  = body.description || ''
    const isActive     = body.isActive !== undefined ? body.isActive
                        : body.is_active !== undefined ? body.is_active : true

    if (!name)         return res.status(400).json({ error: 'Name is required' })
    if (!pricePerUnit) return res.status(400).json({ error: 'Price is required' })

    const p = await WoodProduct.create({
      name, species, unit, pricePerUnit,
      stockQty, description, isActive,
      userId: req.user.id,
    })
    res.status(201).json(p)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

prodRouter.put('/:id', auth, async (req, res) => {
  try {
    const p = await WoodProduct.findOne({ where: { id: req.params.id, ...scope(req) } })
    if (!p) return res.status(404).json({ error: 'Not found' })

    const body = req.body
    const updates = {
      name:         body.name         !== undefined ? body.name         : p.name,
      species:      body.species      !== undefined ? body.species      : p.species,
      unit:         body.unit         !== undefined ? body.unit         : p.unit,
      pricePerUnit: body.pricePerUnit || body.price_per_unit            || p.pricePerUnit,
      stockQty:     body.stockQty     !== undefined ? body.stockQty
                  : body.stock_quantity !== undefined ? body.stock_quantity : p.stockQty,
      description:  body.description  !== undefined ? body.description  : p.description,
      isActive:     body.isActive     !== undefined ? body.isActive
                  : body.is_active    !== undefined ? body.is_active    : p.isActive,
    }

    await p.update(updates)
    res.json(p)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

prodRouter.delete('/:id', auth, async (req, res) => {
  try {
    const p = await WoodProduct.findOne({ where: { id: req.params.id, ...scope(req) } })
    if (!p) return res.status(404).json({ error: 'Not found' })
    await p.destroy()
    res.status(204).send()
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = { custRouter, prodRouter }