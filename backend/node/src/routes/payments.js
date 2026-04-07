const router = require('express').Router()
const { Payment, Invoice } = require('../models')
const auth = require('../middleware/auth')

const scope = (req) => req.user.isAdmin ? {} : { userId: req.user.id }

const METHOD_LABELS = {
  cash: 'Cash', bank_transfer: 'Bank Transfer',
  cheque: 'Cheque', upi: 'UPI', other: 'Other'
}

const syncInvoice = async (invoiceId) => {
  const invoice = await Invoice.findByPk(invoiceId, {
    include: [{ model: Payment, as: 'payments' }],
  })
  if (!invoice) return

  const totalPaid = invoice.payments.reduce((s, p) => s + parseFloat(p.amount || 0), 0)
  const balance   = parseFloat(invoice.totalAmount || 0) - totalPaid
  const today     = new Date().toISOString().split('T')[0]

  let status = invoice.status
  if (balance <= 0)         status = 'paid'
  else if (totalPaid > 0)   status = invoice.dueDate < today ? 'overdue' : 'partial'
  else if (invoice.dueDate < today && !['paid','cancelled'].includes(invoice.status)) status = 'overdue'

  await invoice.update({ amountPaid: totalPaid, balanceDue: balance, status })
}

// GET /api/payments
router.get('/', auth, async (req, res) => {
  try {
    const where = { ...scope(req) }
    if (req.query.invoice) where.invoiceId = req.query.invoice

    const payments = await Payment.findAll({
      where,
      include: [{
        model: Invoice, as: 'invoice',
        attributes: ['id', 'invoiceNumber', 'customerName']
      }],
      order: [['paymentDate', 'DESC']],
    })

    const formatted = payments.map(p => ({
      ...p.toJSON(),
      payment_method:         p.paymentMethod,
      payment_method_display: METHOD_LABELS[p.paymentMethod] || p.paymentMethod,
      payment_date:           p.paymentDate,
      reference_number:       p.referenceNumber,
      invoice_detail: p.invoice ? {
        invoice_number: p.invoice.invoiceNumber,
        customer_name:  p.invoice.customerName,
      } : null,
    }))

    res.json({ results: formatted, count: formatted.length })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/payments
router.post('/', auth, async (req, res) => {
  try {
    const body = req.body

    // Accept both snake_case and camelCase
    const invoiceId       = body.invoiceId      || body.invoice
    const amount          = body.amount
    const paymentMethod   = body.paymentMethod  || body.payment_method  || 'cash'
    const referenceNumber = body.referenceNumber|| body.reference_number|| ''
    const paymentDate     = body.paymentDate    || body.payment_date    || new Date().toISOString().split('T')[0]
    const notes           = body.notes          || ''

    if (!invoiceId) return res.status(400).json({ error: 'Invoice is required' })
    if (!amount || parseFloat(amount) <= 0) return res.status(400).json({ error: 'Valid amount is required' })

    // Verify invoice belongs to user
    const invoice = await Invoice.findOne({ where: { id: invoiceId, ...scope(req) } })
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' })

    if (['paid', 'cancelled'].includes(invoice.status)) {
      return res.status(400).json({ error: 'Cannot add payment to a paid or cancelled invoice' })
    }

    const payment = await Payment.create({
      invoiceId, amount, paymentMethod,
      referenceNumber, paymentDate, notes,
      userId: req.user.id,
    })

    // Sync invoice balance and status
    await syncInvoice(invoiceId)

    // Return payment with display fields
    res.status(201).json({
      ...payment.toJSON(),
      payment_method_display: METHOD_LABELS[payment.paymentMethod] || payment.paymentMethod,
      payment_date:     payment.paymentDate,
      reference_number: payment.referenceNumber,
    })
  } catch (err) {
    console.error('Payment error:', err)
    res.status(400).json({ error: err.message })
  }
})

// DELETE /api/payments/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const payment = await Payment.findOne({ where: { id: req.params.id, ...scope(req) } })
    if (!payment) return res.status(404).json({ error: 'Not found' })

    const invoiceId = payment.invoiceId
    await payment.destroy()
    await syncInvoice(invoiceId)

    res.status(204).send()
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router