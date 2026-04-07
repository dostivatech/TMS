const PDFDocument = require('pdfkit')

const generateInvoicePDF = (invoice) => {
  return new Promise((resolve, reject) => {
    try {
      const doc     = new PDFDocument({ margin: 50, size: 'A4' })
      const buffers = []

      doc.on('data',  chunk => buffers.push(chunk))
      doc.on('end',   ()    => resolve(Buffer.concat(buffers)))
      doc.on('error', reject)

      const GREEN       = '#1a6b3a'
      const LIGHT_GREEN = '#e8f5e9'
      const GRAY        = '#666666'
      const LIGHT_GRAY  = '#f5f5f5'
      const BLACK       = '#1a1a1a'
      const pageW       = doc.page.width - 100

      // ── Header ────────────────────────────────────────────────────────────────
      doc.rect(0, 0, doc.page.width, 90).fill(GREEN)
      doc.fontSize(24).fillColor('#ffffff').font('Helvetica-Bold').text('WoodTrack', 50, 25)
      doc.fontSize(10).fillColor('rgba(255,255,255,0.7)').font('Helvetica').text('Wood Trading Management', 50, 56)
      doc.fontSize(20).fillColor('#ffffff').font('Helvetica-Bold').text('INVOICE', 350, 20, { width: 200, align: 'right' })
      doc.fontSize(11).fillColor('#ffffff').font('Helvetica').text(invoice.invoiceNumber || invoice.invoice_number || '', 350, 50, { width: 200, align: 'right' })

      // ── Info Bar ──────────────────────────────────────────────────────────────
      const infoY = 105
      doc.rect(50, infoY, pageW, 55).fill(LIGHT_GREEN)

      const issueDate  = invoice.issueDate  || invoice.issue_date  || ''
      const dueDate    = invoice.dueDate    || invoice.due_date    || ''
      const status     = (invoice.status || 'draft').toUpperCase()
      const balanceDue = parseFloat(invoice.balanceDue || invoice.balance_due || 0)

      const statusColor = { PAID: '#2d9d5f', OVERDUE: '#d32f2f', PARTIAL: '#f57c00', SENT: '#1565c0' }[status] || GRAY

      doc.fontSize(8).fillColor(GRAY).font('Helvetica')
      doc.text('ISSUE DATE', 65,  infoY + 8)
      doc.text('DUE DATE',   210, infoY + 8)
      doc.text('STATUS',     355, infoY + 8)
      doc.text('BALANCE DUE',450, infoY + 8)

      doc.fontSize(11).font('Helvetica-Bold')
      doc.fillColor(BLACK).text(issueDate, 65, infoY + 24)
      doc.fillColor(BLACK).text(dueDate,   210, infoY + 24)
      doc.fillColor(statusColor).text(status, 355, infoY + 24)
      doc.fillColor(balanceDue > 0 ? '#d32f2f' : '#2d9d5f')
        .text(`Rs.${balanceDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 450, infoY + 22)

      // ── Bill To ───────────────────────────────────────────────────────────────
      const billY          = 178
      const customerName   = invoice.customerName    || invoice.customer_name    || ''
      const customerPhone  = invoice.customerPhone   || invoice.customer_phone   || ''
      const customerAddr   = invoice.customerAddress || invoice.customer_address || ''

      doc.fontSize(8).fillColor(GREEN).font('Helvetica-Bold').text('BILL TO', 50, billY)
      doc.moveTo(50, billY + 12).lineTo(250, billY + 12).stroke(GREEN)
      doc.fontSize(13).fillColor(BLACK).font('Helvetica-Bold').text(customerName, 50, billY + 18)
      doc.fontSize(9).fillColor(GRAY).font('Helvetica')
      if (customerPhone) doc.text(`Phone: ${customerPhone}`, 50, billY + 36)
      if (customerAddr)  doc.text(customerAddr, 50, billY + (customerPhone ? 50 : 36), { width: 250 })

      // ── Items Table ───────────────────────────────────────────────────────────
      const tableY = 268
      const c = { num: 50, desc: 72, qty: 310, unit: 352, rate: 400, amount: 465 }

      doc.rect(50, tableY, pageW, 22).fill(GREEN)
      doc.fontSize(8).fillColor('#ffffff').font('Helvetica-Bold')
      doc.text('#',           c.num,    tableY + 7)
      doc.text('Description', c.desc,   tableY + 7)
      doc.text('Qty',         c.qty,    tableY + 7)
      doc.text('Unit',        c.unit,   tableY + 7)
      doc.text('Rate',        c.rate,   tableY + 7)
      doc.text('Amount',      c.amount, tableY + 7)

      const items = invoice.items || []
      let rowY = tableY + 22

      if (items.length === 0) {
        doc.rect(50, rowY, pageW, 22).fill(LIGHT_GRAY)
        doc.fontSize(9).fillColor(BLACK).font('Helvetica')
        doc.text('1', c.num, rowY + 7)
        doc.text(customerName || 'Service', c.desc, rowY + 7, { width: 230 })
        doc.text('-', c.qty,    rowY + 7)
        doc.text('-', c.unit,   rowY + 7)
        doc.text('-', c.rate,   rowY + 7)
        doc.text(`Rs.${parseFloat(invoice.subtotal || 0).toFixed(2)}`, c.amount, rowY + 7)
        rowY += 22
      } else {
        items.forEach((item, i) => {
          doc.rect(50, rowY, pageW, 22).fill(i % 2 === 0 ? '#ffffff' : LIGHT_GRAY)
          const qty    = parseFloat(item.quantity  || 0)
          const price  = parseFloat(item.unit_price || item.unitPrice || 0)
          const amount = qty * price
          doc.fontSize(9).fillColor(BLACK).font('Helvetica')
          doc.text(String(i + 1),              c.num,    rowY + 7)
          doc.text(item.description || '',     c.desc,   rowY + 7, { width: 230 })
          doc.text(qty.toString(),             c.qty,    rowY + 7)
          doc.text(item.unit || 'cft',         c.unit,   rowY + 7)
          doc.text(`Rs.${price.toFixed(2)}`,   c.rate,   rowY + 7)
          doc.text(`Rs.${amount.toFixed(2)}`,  c.amount, rowY + 7)
          rowY += 22
        })
      }

      doc.rect(50, tableY, pageW, rowY - tableY).stroke('#dddddd')

      // ── Totals ────────────────────────────────────────────────────────────────
      rowY += 12
      const lx = 380
      const vx = 490

      const subtotal    = parseFloat(invoice.subtotal    || 0)
      const taxRate     = parseFloat(invoice.taxRate     || invoice.tax_rate    || 0)
      const taxAmount   = parseFloat(invoice.taxAmount   || invoice.tax_amount  || 0)
      const discount    = parseFloat(invoice.discount    || 0)
      const totalAmount = parseFloat(invoice.totalAmount || invoice.total_amount|| 0)
      const amountPaid  = parseFloat(invoice.amountPaid  || invoice.amount_paid || 0)

      const rows = [
        { label: 'Subtotal',             value: subtotal,    bold: false, color: GRAY   },
        { label: `Tax (${taxRate}%)`,    value: taxAmount,   bold: false, color: GRAY   },
        { label: 'Discount',             value: discount,    bold: false, color: GRAY   },
        { label: 'TOTAL',                value: totalAmount, bold: true,  color: BLACK  },
      ]
      if (amountPaid > 0) {
        rows.push({ label: 'Amount Paid',  value: amountPaid,  bold: false, color: '#2d9d5f' })
        rows.push({ label: 'BALANCE DUE', value: balanceDue,  bold: true,  color: balanceDue > 0 ? '#d32f2f' : '#2d9d5f' })
      }

      rows.forEach(row => {
        if (row.bold) doc.rect(lx - 10, rowY, pageW - lx + 60, 20).fill(LIGHT_GREEN)
        doc.fontSize(row.bold ? 11 : 9)
          .fillColor(row.color)
          .font(row.bold ? 'Helvetica-Bold' : 'Helvetica')
          .text(row.label, lx, rowY + 5, { width: 80, align: 'right' })
          .text(`Rs.${Math.abs(row.value).toFixed(2)}`, vx, rowY + 5, { width: 55, align: 'right' })
        rowY += 20
      })

      // ── Notes ─────────────────────────────────────────────────────────────────
      if (invoice.notes) {
        rowY += 15
        doc.fontSize(8).fillColor(GREEN).font('Helvetica-Bold').text('NOTES', 50, rowY)
        doc.fontSize(9).fillColor(GRAY).font('Helvetica').text(invoice.notes, 50, rowY + 13, { width: pageW })
      }

      // ── Footer ────────────────────────────────────────────────────────────────
      const fy = doc.page.height - 55
      doc.moveTo(50, fy).lineTo(50 + pageW, fy).stroke('#dddddd')
      doc.fontSize(8).fillColor(GRAY).font('Helvetica')
        .text('Generated by WoodTrack • Wood Trading Management System', 50, fy + 10, { width: pageW, align: 'center' })

      doc.end()
    } catch (err) {
      reject(err)
    }
  })
}

module.exports = { generateInvoicePDF }
