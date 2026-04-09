const cron = require('node-cron')
const { Invoice } = require('../models')
const { Op } = require('sequelize')

//  Generate message
const generateMessage = (invoice) => {
  const amount = `₹${invoice.balanceDue}`

  if (invoice.type === 'sale') {
    return `Hi ${invoice.customerName},

Payment of ${amount} is due today for Invoice ${invoice.invoiceNumber}.

Please pay today.

- TMS`
  } else {
    return `Hi ${invoice.customerName},

Payment of ${amount} is due today for Invoice ${invoice.invoiceNumber}.

We will process it today.

- TMS`
  }
}

// Replace with real WhatsApp API later
const sendWhatsApp = async (phone, message) => {
  console.log(`Sending to ${phone}`)
  console.log(message)
}

//  Run daily at 9 AM
cron.schedule('0 9 * * *', async () => {
  console.log('Running due date reminders...')

  const today = new Date().toISOString().split('T')[0]

  const invoices = await Invoice.findAll({
    where: {
      dueDate: today,
      balanceDue: { [Op.gt]: 0 },
      status: { [Op.notIn]: ['paid', 'cancelled'] },
       reminderSent: false,
    }
  })

  for (let inv of invoices) {
    const msg = generateMessage(inv)

    await sendWhatsApp(inv.customerPhone, msg)
    await inv.update({ reminderSent: true })
    console.log(`Reminder sent for ${inv.invoiceNumber}`)
  }
})