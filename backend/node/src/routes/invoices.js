const router = require('express').Router()
const { Op } = require('sequelize')
const { Invoice, Payment } = require('../models')
const auth = require('../middleware/auth')
const PDFDocument = require('pdfkit')
const QRCode = require('qrcode')
const scope = (req) => req.user.isAdmin ? {} : { userId: req.user.id }

const calcInvoice = (data) => {
  const sub   = parseFloat(data.subtotal || 0)
  const rate  = parseFloat(data.taxRate || data.tax_rate || 0)
  const disc  = parseFloat(data.discount || 0)
  const tax   = sub * rate / 100
  const total = sub + tax - disc
  const paid  = parseFloat(data.amountPaid || data.amount_paid || 0)
  const bal   = total - paid
  return { taxAmount: tax, totalAmount: total, balanceDue: bal }
}

const updateStatus = (inv) => {
  const today   = new Date().toISOString().split('T')[0]
  const balance = parseFloat(inv.balanceDue || 0)
  const paid    = parseFloat(inv.amountPaid || 0)
  if (balance <= 0) return 'paid'
  if (paid > 0 && balance > 0) return inv.dueDate < today ? 'overdue' : 'partial'
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
  const today      = new Date().toISOString().split('T')[0]
  const isOverdue  = inv.dueDate < today && !['paid','cancelled'].includes(inv.status)
  const daysOverdue = isOverdue
    ? Math.floor((new Date(today) - new Date(inv.dueDate)) / 86400000) : 0

  const statusLabels = {
    draft: 'Draft', sent: 'Sent', paid: 'Paid',
    overdue: 'Overdue', partial: 'Partially Paid', cancelled: 'Cancelled'
  }

  return {
    ...inv.toJSON(),
    is_overdue:     isOverdue,
    days_overdue:   daysOverdue,
    status_display: statusLabels[inv.status] || inv.status,
    // snake_case aliases for React frontend
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
    const today      = new Date().toISOString().split('T')[0]
    const days       = parseInt(req.query.days || 7)
    const upcoming   = new Date()
    upcoming.setDate(upcoming.getDate() + days)
    const upcomingStr = upcoming.toISOString().split('T')[0]

    const overdue = await Invoice.findAll({
      where: {
        ...scope(req),
        dueDate: { [Op.lt]: today },
        status:  { [Op.in]: ['sent','partial','overdue'] },
      },
    })

    const dueSoon = await Invoice.findAll({
      where: {
        ...scope(req),
        dueDate: { [Op.gte]: today, [Op.lte]: upcomingStr },
        status:  { [Op.in]: ['draft','sent','partial'] },
      },
    })

    res.json({
      overdue:        overdue.map(formatInvoice),
      due_soon:       dueSoon.map(formatInvoice),
      overdue_count:  overdue.length,
      due_soon_count: dueSoon.length,
      overdue_amount: overdue.reduce((s, i) => s + parseFloat(i.balanceDue || 0), 0),
      due_soon_amount: dueSoon.reduce((s, i) => s + parseFloat(i.balanceDue || 0), 0),
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
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

    // Accept both snake_case and camelCase from React frontend
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

    if (!customerName) {
      return res.status(400).json({ error: 'Customer name is required' })
    }
    if (!dueDate) {
      return res.status(400).json({ error: 'Due date is required' })
    }

    const invoiceNumber = await generateInvoiceNumber()

    const data = {
      customerName, customerPhone, customerAddress,
      customerId, subtotal, taxRate, discount,
      issueDate, dueDate, notes, items,
      amountPaid: 0,
    }

    const { taxAmount, totalAmount, balanceDue } = calcInvoice(data)

    const inv = await Invoice.create({
      ...data,
      invoiceNumber,
      taxAmount,
      totalAmount,
      balanceDue,
      status: 'draft',
      userId: req.user.id,
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
    const updates = {
      customerName:    body.customerName    || body.customer_name    || inv.customerName,
      customerPhone:   body.customerPhone   || body.customer_phone   || inv.customerPhone,
      customerAddress: body.customerAddress || body.customer_address || inv.customerAddress,
      subtotal:        body.subtotal        !== undefined ? body.subtotal : inv.subtotal,
      taxRate:         body.taxRate         || body.tax_rate         || inv.taxRate,
      discount:        body.discount        !== undefined ? body.discount : inv.discount,
      dueDate:         body.dueDate         || body.due_date         || inv.dueDate,
      notes:           body.notes           !== undefined ? body.notes : inv.notes,
      items:           body.items           || inv.items,
    }

    await inv.update(updates)
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



// GET /api/invoices/:id/pdf


router.get('/:id/pdf', auth, async (req, res) => {
  try {
    const inv = await Invoice.findOne({
      where: { id: req.params.id, ...scope(req) },
      include: [{ model: Payment, as: 'payments' }],
    })

    if (!inv) return res.status(404).json({ error: 'Invoice not found' })

    const invoice = formatInvoice(inv)

    const doc = new PDFDocument({ margin: 40 })

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader(
      'Content-Disposition',
      `inline; filename=invoice_${invoice.invoice_number}.pdf`
    )

    doc.pipe(res)

    // 🔥 COMPANY HEADER
    doc.fontSize(20).text('WOODTRAK', { continued: true })
    doc.fontSize(10).text('  |  Wood Management System')

    doc.fontSize(9).text('Hyderabad, India')
    doc.text('GSTIN: 22AAAAA0000A1Z5')

    // 🔥 INVOICE META (RIGHT)
    doc.fontSize(14).text('INVOICE', 400, 40, { align: 'right' })
    doc.fontSize(10)
      .text(`Invoice #: ${invoice.invoice_number}`, { align: 'right' })
      .text(`Date: ${invoice.issue_date}`, { align: 'right' })
      .text(`Due: ${invoice.due_date}`, { align: 'right' })
      .text(`Status: ${invoice.status_display}`, { align: 'right' })

    doc.moveDown(2)

    // 👤 BILL TO
    doc.fontSize(11).text('Bill To:')
    doc.fontSize(10).text(invoice.customer_name)
    doc.text(invoice.customer_phone || '')
    doc.text(invoice.customer_address || '')

    doc.moveDown()

    // 📦 TABLE HEADER
    const tableTop = doc.y
    doc.rect(40, tableTop, 520, 20).fill('#f5f5f5')

    doc.fillColor('#000')
      .fontSize(10)
      .text('Description', 45, tableTop + 5)
      .text('Qty', 300, tableTop + 5, { width: 50, align: 'right' })
      .text('Rate', 350, tableTop + 5, { width: 80, align: 'right' })
      .text('Amount', 430, tableTop + 5, { width: 100, align: 'right' })

    let y = tableTop + 25

    // 📦 ITEMS
    if (invoice.items && invoice.items.length > 0) {
      invoice.items.forEach(item => {
        const amount = item.quantity * item.unit_price

        doc.text(item.description, 45, y)
        doc.text(item.quantity, 300, y, { width: 50, align: 'right' })
        doc.text(`₹${item.unit_price}`, 350, y, { width: 80, align: 'right' })
        doc.text(`₹${amount}`, 430, y, { width: 100, align: 'right' })

        y += 20

        // row line
        doc.moveTo(40, y).lineTo(560, y).strokeColor('#eee').stroke()
      })
    }

    doc.moveDown(2)

    // 💰 TOTAL BOX
    const summaryX = 350
    let summaryY = doc.y

    doc.fontSize(10)
      .text(`Subtotal: ₹${invoice.subtotal}`, summaryX, summaryY)
      .text(`Tax (${invoice.tax_rate}%): ₹${invoice.tax_amount}`, summaryX, summaryY + 15)
      .text(`Discount: ₹${invoice.discount}`, summaryX, summaryY + 30)

    doc.fontSize(14)
      .text(`Total: ₹${invoice.total_amount}`, summaryX, summaryY + 55)

    doc.fontSize(10)
      .text(`Paid: ₹${invoice.amount_paid}`, summaryX, summaryY + 75)
      .text(`Balance: ₹${invoice.balance_due}`, summaryX, summaryY + 90)

    //  QR CODE (UPI)
   let upiId

   if (invoice.type === 'sale') {
    upiId = 'yourbusiness@upi'        // YOU receive
   } else {
    upiId = invoice.customer_upi     // YOU pay
   }

   const upiLink = `upi://pay?pa=${upiId}&pn=WoodTrak&am=${invoice.balance_due}&tn=Invoice-${invoice.invoice_number}`

    const qrImage = await QRCode.toDataURL(upiLink)
    doc.image(qrImage, 40, summaryY, { width: 100 })

    doc.fontSize(8).text('Scan to Pay (UPI)', 40, summaryY + 110)

    doc.moveDown(4)

    //  FOOTER
    doc.fontSize(10).text('Thank you for your business!', { align: 'center' })

    doc.moveDown()
    doc.text('Authorized Signature', { align: 'right' })

    doc.end()

  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'PDF generation failed' })
  }
})

module.exports = router