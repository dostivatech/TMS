const router = require('express').Router()
const { Op } = require('sequelize')
const { Invoice, Payment } = require('../models')
const auth = require('../middleware/auth')
const { generateInvoicePDF } = require('../utils/pdfGenerator')

const scope = (req) => req.user.isAdmin ? {} : { userId: req.user.id }

const calcInvoice = (data) => {
  const sub   = parseFloat(data.subtotal  || 0)
  const rate  = parseFloat(data.taxRate   || data.tax_rate || 0)
  const disc  = parseFloat(data.discount  || 0)
  const tax   = sub * rate / 100
  const total = sub + tax - disc
  const paid  = parseFloat(data.amountPaid || data.amount_paid || 0)
  return { taxAmount: tax, totalAmount: total, balanceDue: total - paid }
}

const updateStatus = (inv) => {
  const today   = new Date().toISOString().split('T')[0]
  const balance = parseFloat(inv.balanceDue || 0)
  const paid    = parseFloat(inv.amountPaid || 0)
  if (balance <= 0) return 'paid'
  if (paid > 0)     return inv.dueDate < today ? 'overdue' : 'partial'
  if (inv.dueDate < today && !['paid','cancelled'].includes(inv.status)) return 'overdue'
  return inv.status || 'draft'
}

const generateInvoiceNumber = async () => {
  const year   = new Date().getFullYear()
  const prefix = `INV-${year}-`
  const last   = await Invoice.findOne({
    where: { invoiceNumber: { [Op.like]: `${prefix}%` } },
    order: [['invoiceNumber', 'DESC']],
  })
  const seq = last ? (parseInt(last.invoiceNumber.split('-').pop()) + 1) : 1
  return `${prefix}${String(seq).padStart(4, '0')}`
}

const formatInvoice = (inv) => {
  const today     = new Date().toISOString().split('T')[0]
  const isOverdue = inv.dueDate < today && !['paid','cancelled'].includes(inv.status)
  const labels    = { draft:'Draft', sent:'Sent', paid:'Paid', overdue:'Overdue', partial:'Partially Paid', cancelled:'Cancelled' }
  return {
    ...inv.toJSON(),
    is_overdue:       isOverdue,
    days_overdue:     isOverdue ? Math.floor((new Date(today) - new Date(inv.dueDate)) / 86400000) : 0,
    status_display:   labels[inv.status] || inv.status,
    invoice_number:   inv.invoiceNumber,
    customer_name:    inv.customerName,
    customer_phone:   inv.customerPhone,
    customer_address: inv.customerAddress,
    total_amount:     inv.totalAmount,
    amount_paid:      inv.amountPaid,
    balance_due:      inv.balanceDue,
    tax_rate:         inv.taxRate,
    tax_amount:       inv.taxAmount,
    issue_date:       inv.issueDate,
    due_date:         inv.dueDate,
  }
}

// GET /api/invoices
router.get('/', auth, async (req, res) => {
  try {
    const where = { ...scope(req) }
    const { status, date_from, date_to, search } = req.query
    if (status)    where.status    = status
    if (date_from) where.issueDate = { ...where.issueDate, [Op.gte]: date_from }
    if (date_to)   where.issueDate = { ...where.issueDate, [Op.lte]: date_to }
    if (search) {
      where[Op.or] = [
        { invoiceNumber: { [Op.like]: `%${search}%` } },
        { customerName:  { [Op.like]: `%${search}%` } },
      ]
    }
    const invoices = await Invoice.findAll({
      where,
      include: [{ model: Payment, as: 'payments' }],
      order: [['issueDate', 'DESC']],
    })
    res.json({ results: invoices.map(formatInvoice), count: invoices.length })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/invoices/reminders
router.get('/reminders', auth, async (req, res) => {
  try {
    const today       = new Date().toISOString().split('T')[0]
    const days        = parseInt(req.query.days || 7)
    const upcoming    = new Date()
    upcoming.setDate(upcoming.getDate() + days)
    const upcomingStr = upcoming.toISOString().split('T')[0]

    const overdue = await Invoice.findAll({
      where: { ...scope(req), dueDate: { [Op.lt]: today }, status: { [Op.in]: ['sent','partial','overdue'] } },
    })
    const dueSoon = await Invoice.findAll({
      where: { ...scope(req), dueDate: { [Op.gte]: today, [Op.lte]: upcomingStr }, status: { [Op.in]: ['draft','sent','partial'] } },
    })

    res.json({
      overdue:         overdue.map(formatInvoice),
      due_soon:        dueSoon.map(formatInvoice),
      overdue_count:   overdue.length,
      due_soon_count:  dueSoon.length,
      overdue_amount:  overdue.reduce((s, i) => s + parseFloat(i.balanceDue || 0), 0),
      due_soon_amount: dueSoon.reduce((s, i) => s + parseFloat(i.balanceDue || 0), 0),
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/invoices/:id/pdf  ← PDF Download
router.get('/:id/pdf', auth, async (req, res) => {
  try {
    const inv = await Invoice.findOne({
      where: { id: req.params.id, ...scope(req) },
      include: [{ model: Payment, as: 'payments' }],
    })
    if (!inv) return res.status(404).json({ error: 'Invoice not found' })

    const pdfBuffer = await generateInvoicePDF(formatInvoice(inv))

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `inline; filename="invoice_${inv.invoiceNumber}.pdf"`)
    res.setHeader('Content-Length', pdfBuffer.length)
    res.send(pdfBuffer)
  } catch (err) {
    console.error('PDF error:', err)
    res.status(500).json({ error: 'Failed to generate PDF' })
  }
})

// GET /api/invoices/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const inv = await Invoice.findOne({
      where: { id: req.params.id, ...scope(req) },
      include: [{ model: Payment, as: 'payments' }],
    })
    if (!inv) return res.status(404).json({ error: 'Not found' })
    res.json(formatInvoice(inv))
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/invoices
router.post('/', auth, async (req, res) => {
  try {
    const body = req.body
    const customerName    = body.customerName    || body.customer_name
    const customerPhone   = body.customerPhone   || body.customer_phone   || ''
    const customerAddress = body.customerAddress || body.customer_address || ''
    const customerId      = body.customerId      || body.customer         || null
    const subtotal        = body.subtotal        || 0
    const taxRate         = body.taxRate         || body.tax_rate         || 0
    const discount        = body.discount        || 0
    const issueDate       = body.issueDate       || body.issue_date       || new Date().toISOString().split('T')[0]
    const dueDate         = body.dueDate         || body.due_date
    const notes           = body.notes           || ''
    const items           = body.items           || []

    if (!customerName) return res.status(400).json({ error: 'Customer name is required' })
    if (!dueDate)      return res.status(400).json({ error: 'Due date is required' })

    const invoiceNumber = await generateInvoiceNumber()
    const data = { customerName, customerPhone, customerAddress, customerId, subtotal, taxRate, discount, issueDate, dueDate, notes, items, amountPaid: 0 }
    const { taxAmount, totalAmount, balanceDue } = calcInvoice(data)

    const inv = await Invoice.create({
      ...data, invoiceNumber, taxAmount, totalAmount, balanceDue, status: 'draft', userId: req.user.id,
    })
    res.status(201).json(formatInvoice(inv))
  } catch (err) {
    console.error('Invoice create error:', err)
    res.status(400).json({ error: err.message })
  }
})

// PUT /api/invoices/:id
router.put('/:id', auth, async (req, res) => {
  try {
    const inv = await Invoice.findOne({ where: { id: req.params.id, ...scope(req) } })
    if (!inv) return res.status(404).json({ error: 'Not found' })
    const body = req.body
    await inv.update({
      customerName:    body.customerName    || body.customer_name    || inv.customerName,
      customerPhone:   body.customerPhone   || body.customer_phone   || inv.customerPhone,
      customerAddress: body.customerAddress || body.customer_address || inv.customerAddress,
      subtotal:        body.subtotal        !== undefined ? body.subtotal : inv.subtotal,
      taxRate:         body.taxRate         || body.tax_rate         || inv.taxRate,
      discount:        body.discount        !== undefined ? body.discount : inv.discount,
      dueDate:         body.dueDate         || body.due_date         || inv.dueDate,
      notes:           body.notes           !== undefined ? body.notes : inv.notes,
      items:           body.items           || inv.items,
    })
    const calcs = calcInvoice(inv)
    await inv.update({ ...calcs, status: updateStatus({ ...inv.toJSON(), ...calcs }) })
    const updated = await Invoice.findByPk(inv.id, { include: [{ model: Payment, as: 'payments' }] })
    res.json(formatInvoice(updated))
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// POST /api/invoices/:id/mark_sent
router.post('/:id/mark_sent', auth, async (req, res) => {
  try {
    const inv = await Invoice.findOne({ where: { id: req.params.id, ...scope(req) } })
    if (!inv) return res.status(404).json({ error: 'Not found' })
    if (inv.status === 'draft') await inv.update({ status: 'sent' })
    res.json(formatInvoice(inv))
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/invoices/:id/cancel
router.post('/:id/cancel', auth, async (req, res) => {
  try {
    const inv = await Invoice.findOne({ where: { id: req.params.id, ...scope(req) } })
    if (!inv) return res.status(404).json({ error: 'Not found' })
    await inv.update({ status: 'cancelled' })
    res.json(formatInvoice(inv))
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// DELETE /api/invoices/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const inv = await Invoice.findOne({ where: { id: req.params.id, ...scope(req) } })
    if (!inv) return res.status(404).json({ error: 'Not found' })
    await inv.destroy()
    res.status(204).send()
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
