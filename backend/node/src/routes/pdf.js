const PDFDocument = require('pdfkit')
const pool = require('../db') // your postgres connection

app.get('/api/invoices/:id/pdf', async (req, res) => {
  try {
    const { id } = req.params

    // 🧾 Fetch invoice
    const invoiceResult = await pool.query(
      `SELECT * FROM invoices WHERE id = $1`,
      [id]
    )

    if (invoiceResult.rows.length === 0) {
      return res.status(404).json({ message: 'Invoice not found' })
    }

    const invoice = invoiceResult.rows[0]

    // 🧾 Fetch items
    const itemsResult = await pool.query(
      `SELECT * FROM invoice_items WHERE invoice_id = $1`,
      [id]
    )

    const items = itemsResult.rows

    // 🧾 Fetch customer
    const customerResult = await pool.query(
      `SELECT * FROM customers WHERE id = $1`,
      [invoice.customer_id]
    )

    const customer = customerResult.rows[0]

    // 📄 Create PDF
    const doc = new PDFDocument({ margin: 40 })

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader(
      'Content-Disposition',
      `inline; filename=invoice_${invoice.invoice_number}.pdf`
    )

    doc.pipe(res)

    // 🏢 Header
    doc.fontSize(20).text('WoodTrak', { align: 'center' })
    doc.moveDown()

    doc.fontSize(12).text(`Invoice: ${invoice.invoice_number}`)
    doc.text(`Date: ${invoice.issue_date}`)
    doc.moveDown()

    // 👤 Customer
    doc.text(`Customer: ${customer.name}`)
    doc.text(`Phone: ${customer.phone}`)
    doc.moveDown()

    // 📦 Items
    doc.text('Items:', { underline: true })
    doc.moveDown(0.5)

    let total = 0

    items.forEach(item => {
      const amount = item.quantity * item.unit_price
      total += amount

      doc.text(
        `${item.description} | ${item.quantity} x ₹${item.unit_price} = ₹${amount}`
      )
    })

    doc.moveDown()

    // 💰 Totals
    doc.text(`Subtotal: ₹${invoice.subtotal}`)
    doc.text(`Tax: ₹${invoice.tax_amount}`)
    doc.text(`Discount: ₹${invoice.discount}`)
    doc.moveDown()

    doc.fontSize(14).text(`Total: ₹${invoice.total_amount}`, {
      bold: true
    })

    doc.moveDown()
    doc.text(`Paid: ₹${invoice.amount_paid}`)
    doc.text(`Balance: ₹${invoice.balance_due}`)

    doc.end()

  } catch (err) {
    console.error(err)
    res.status(500).send('PDF generation failed')
  }
})