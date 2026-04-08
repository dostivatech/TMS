const PDFDocument = require('pdfkit')

app.get('/api/invoices/:id/pdf', async (req, res) => {
  try {
    const { id } = req.params

    // 🔥 Replace this with DB fetch
    const invoice = {
      invoice_number: `INV-${id}`,
      customer_name: "Ravi Kumar",
      customer_phone: "9876543210",
      date: "2026-04-08",
      items: [
        { description: "Teak Wood", qty: 2, price: 5000 },
        { description: "Plywood", qty: 5, price: 1000 }
      ]
    }

    const doc = new PDFDocument()

    // ✅ Set headers
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader(
      'Content-Disposition',
      `inline; filename=invoice_${id}.pdf`
    )

    doc.pipe(res)

    // 🧾 Invoice Content
    doc.fontSize(20).text('WoodTrak Invoice', { align: 'center' })
    doc.moveDown()

    doc.fontSize(12).text(`Invoice No: ${invoice.invoice_number}`)
    doc.text(`Customer: ${invoice.customer_name}`)
    doc.text(`Phone: ${invoice.customer_phone}`)
    doc.text(`Date: ${invoice.date}`)
    doc.moveDown()

    doc.text('Items:')
    doc.moveDown()

    let total = 0

    invoice.items.forEach(item => {
      const amount = item.qty * item.price
      total += amount

      doc.text(
        `${item.description} - ${item.qty} x ₹${item.price} = ₹${amount}`
      )
    })

    doc.moveDown()
    doc.fontSize(14).text(`Total: ₹${total}`, { bold: true })

    doc.end()

  } catch (err) {
    console.error(err)
    res.status(500).send('PDF generation failed')
  }
})