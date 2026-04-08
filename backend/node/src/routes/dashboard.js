const router = require('express').Router()
const { Op } = require('sequelize')
const { Transaction, Invoice, Customer, Payment } = require('../models')
const auth = require('../middleware/auth')

router.get('/', auth, async (req, res) => {
  try {
    const uid = req.user.id
    const isAdmin = req.user.isAdmin
    const scope = isAdmin ? {} : { userId: uid }
    const today = new Date().toISOString().split('T')[0]

    // Core stats
    const allTxns = await Transaction.findAll({ where: scope })
    const allInvs = await Invoice.findAll({ where: scope })

    const totalSales = allTxns.filter(t => t.type === 'sell').reduce((s, t) => s + parseFloat(t.totalAmount || 0), 0)
    const totalPurchases = allTxns.filter(t => t.type === 'buy').reduce((s, t) => s + parseFloat(t.totalAmount || 0), 0)
    const totalPaid = allInvs.reduce((s, i) => s + parseFloat(i.amountPaid || 0), 0)
    const totalOutstanding = allInvs
      .filter(i => ['draft','sent','partial','overdue'].includes(i.status))
      .reduce((s, i) => s + parseFloat(i.balanceDue || 0), 0)

    const overdueInvs = allInvs.filter(i =>
      i.dueDate < today && ['sent','partial','overdue'].includes(i.status)
    )
    const overdueAmount = overdueInvs.reduce((s, i) => s + parseFloat(i.balanceDue || 0), 0)

    // Monthly data (last 6 months)
    const monthlySales = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date()
      d.setDate(1)
      d.setMonth(d.getMonth() - i)
      const start = d.toISOString().split('T')[0]
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0]

      const monthTxns = allTxns.filter(t => t.transactionDate >= start && t.transactionDate <= end)
      monthlySales.push({
        month: d.toLocaleString('en', { month: 'short', year: 'numeric' }),
        sales: monthTxns.filter(t => t.type === 'sell').reduce((s, t) => s + parseFloat(t.totalAmount || 0), 0),
        purchases: monthTxns.filter(t => t.type === 'buy').reduce((s, t) => s + parseFloat(t.totalAmount || 0), 0),
      })
    }

    // Top customers
    const customers = await Customer.findAll({
      where: scope,
      include: [{ model: Transaction, as: 'transactions', attributes: ['totalAmount'] }],
    })
    const topCustomers = customers
      .map(c => ({
        name: c.name,
        total: c.transactions.reduce((s, t) => s + parseFloat(t.totalAmount || 0), 0),
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5)

    // Recent transactions
    const recentTxns = await Transaction.findAll({
      where: scope,
      order: [['createdAt', 'DESC']],
      limit: 5,
    })

    res.json({
      total_sales: totalSales,
      total_purchases: totalPurchases,
      total_invoices: allInvs.length,
      total_paid: totalPaid,
      total_outstanding: totalOutstanding,
      overdue_count: overdueInvs.length,
      overdue_amount: overdueAmount,
      monthly_sales: monthlySales,
      top_customers: topCustomers,
      recent_transactions: recentTxns.map(t => ({
        ...t.toJSON(),
        transaction_type: t.type,
        transaction_date: t.transactionDate,
        total_amount: t.totalAmount,
        customer_name: t.customerName,
        product_name: t.productName,
      })),
      overdue_invoices: overdueInvs.slice(0, 5).map(i => ({
        ...i.toJSON(),
        is_overdue: true,
        days_overdue: Math.floor((new Date(today) - new Date(i.dueDate)) / 86400000),
        balance_due: i.balanceDue,
        invoice_number: i.invoiceNumber,
        customer_name: i.customerName,
      })),
    })
  } catch (err) {
    console.error('Dashboard error:', err)
    res.status(500).json({ error: err.message })
  }
})

router.get('/analytics', auth, async (req, res) => {
  try {
    const { from, to } = req.query

    const where = {
      issueDate: {
        [Op.between]: [from, to]
      }
    }

    const invoices = await Invoice.findAll({ where })

    let summary = {
      sales: 0,
      purchases: 0,
      received: 0,
      paid: 0,
      pending: 0
    }

    const daily = {}

    invoices.forEach(inv => {
      const date = inv.issueDate

      if (!daily[date]) {
        daily[date] = { sales: 0, purchases: 0 }
      }

      if (inv.type === 'sale') {
        summary.sales += inv.totalAmount
        summary.received += inv.amountPaid
        daily[date].sales += inv.totalAmount
      } else {
        summary.purchases += inv.totalAmount
        summary.paid += inv.amountPaid
        daily[date].purchases += inv.totalAmount
      }

      summary.pending += inv.balanceDue
    })

    res.json({
      summary,
      daily
    })

  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})
module.exports = router
