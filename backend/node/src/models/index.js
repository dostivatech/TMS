const { DataTypes } = require('sequelize')
const sequelize = require('../config/database')

// ── User ─────────────────────────────────────────────────────────────────────
const User = sequelize.define('User', {
  id:        { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  username:  { type: DataTypes.STRING, unique: true, allowNull: false },
  email:     { type: DataTypes.STRING, defaultValue: '' },
  firstName: { type: DataTypes.STRING, defaultValue: '' },
  lastName:  { type: DataTypes.STRING, defaultValue: '' },
  password:  { type: DataTypes.STRING, allowNull: false },
  isAdmin:   { type: DataTypes.BOOLEAN, defaultValue: false },
  isActive:  { type: DataTypes.BOOLEAN, defaultValue: true },
})

// ── WoodProduct ───────────────────────────────────────────────────────────────
const WoodProduct = sequelize.define('WoodProduct', {
  userId: { type: DataTypes.INTEGER },
  id:           { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name:         { type: DataTypes.STRING, allowNull: false },
  species:      { type: DataTypes.STRING, defaultValue: '' },
  unit:         { type: DataTypes.ENUM('cft','ton','piece','sqft','kg'), defaultValue: 'cft' },
  pricePerUnit: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  stockQty:     { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  description:  { type: DataTypes.TEXT, defaultValue: '' },
  isActive:     { type: DataTypes.BOOLEAN, defaultValue: true },
})

// ── Customer ──────────────────────────────────────────────────────────────────
const Customer = sequelize.define('Customer', {
  userId: { type: DataTypes.INTEGER },
  id:      { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name:    { type: DataTypes.STRING, allowNull: false },
  phone:   { type: DataTypes.STRING, defaultValue: '' },
  email:   { type: DataTypes.STRING, defaultValue: '' },
  address: { type: DataTypes.TEXT, defaultValue: '' },
  gstin:   { type: DataTypes.STRING, defaultValue: '' },
  notes:   { type: DataTypes.TEXT, defaultValue: '' },
})

// ── Transaction ───────────────────────────────────────────────────────────────
const Transaction = sequelize.define('Transaction', {
  userId: { type: DataTypes.INTEGER },
  customerId: { type: DataTypes.INTEGER },
  id:              { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  type:            { type: DataTypes.ENUM('buy','sell'), allowNull: false },
  productName:     { type: DataTypes.STRING, allowNull: false },
  customerName:    { type: DataTypes.STRING, defaultValue: '' },
  quantity:        { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  unit:            { type: DataTypes.STRING, defaultValue: 'cft' },
  unitPrice:       { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  totalAmount:     { type: DataTypes.DECIMAL(12, 2) },
  notes:           { type: DataTypes.TEXT, defaultValue: '' },
  status:          { type: DataTypes.ENUM('pending','completed','cancelled'), defaultValue: 'completed' },
  transactionDate: { type: DataTypes.DATEONLY, defaultValue: DataTypes.NOW },
})

// ── Invoice ───────────────────────────────────────────────────────────────────
const Invoice = sequelize.define('Invoice', {
  userId: { type: DataTypes.INTEGER },
  customerId: { type: DataTypes.INTEGER },
  id:              { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  invoiceNumber:   { type: DataTypes.STRING, unique: true },
  customerName:    { type: DataTypes.STRING, allowNull: false },
  customerPhone:   { type: DataTypes.STRING, defaultValue: '' },
  customerAddress: { type: DataTypes.TEXT, defaultValue: '' },
  items:           { type: DataTypes.JSON, defaultValue: [] },
  subtotal:        { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
  taxRate:         { type: DataTypes.DECIMAL(5, 2), defaultValue: 0 },
  taxAmount:       { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
  discount:        { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
  totalAmount:     { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
  amountPaid:      { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
  balanceDue:      { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
  status:          { type: DataTypes.ENUM('draft','sent','paid','overdue','partial','cancelled'), defaultValue: 'draft' },
  issueDate:       { type: DataTypes.DATEONLY, defaultValue: DataTypes.NOW },
  dueDate:         { type: DataTypes.DATEONLY, allowNull: false },
  notes:           { type: DataTypes.TEXT, defaultValue: '' },
})

// ── Payment ───────────────────────────────────────────────────────────────────
const Payment = sequelize.define('Payment', {
  userId: { type: DataTypes.INTEGER },
  invoiceId: { type: DataTypes.INTEGER },
  id:              { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  amount:          { type: DataTypes.DECIMAL(12, 2), allowNull: false },
  paymentMethod:   { type: DataTypes.ENUM('cash','bank_transfer','cheque','upi','other'), defaultValue: 'cash' },
  referenceNumber: { type: DataTypes.STRING, defaultValue: '' },
  paymentDate:     { type: DataTypes.DATEONLY, defaultValue: DataTypes.NOW },
  notes:           { type: DataTypes.TEXT, defaultValue: '' },
})

// ── Associations ──────────────────────────────────────────────────────────────
User.hasMany(WoodProduct,  { foreignKey: 'userId', as: 'products' })
User.hasMany(Customer,     { foreignKey: 'userId', as: 'customers' })
User.hasMany(Transaction,  { foreignKey: 'userId', as: 'transactions' })
User.hasMany(Invoice,      { foreignKey: 'userId', as: 'invoices' })
User.hasMany(Payment,      { foreignKey: 'userId', as: 'payments' })

WoodProduct.belongsTo(User, { foreignKey: 'userId' })
Customer.belongsTo(User,    { foreignKey: 'userId' })
Transaction.belongsTo(User, { foreignKey: 'userId' })
Invoice.belongsTo(User,     { foreignKey: 'userId' })
Payment.belongsTo(User,     { foreignKey: 'userId' })

Customer.hasMany(Transaction, { foreignKey: 'customerId', as: 'transactions' })
Customer.hasMany(Invoice,     { foreignKey: 'customerId', as: 'invoices' })
Transaction.belongsTo(Customer, { foreignKey: 'customerId', as: 'customer' })
Invoice.belongsTo(Customer,     { foreignKey: 'customerId', as: 'customer' })

Invoice.hasMany(Payment, { foreignKey: 'invoiceId', as: 'payments' })
Payment.belongsTo(Invoice, { foreignKey: 'invoiceId', as: 'invoice' })

module.exports = { User, WoodProduct, Customer, Transaction, Invoice, Payment, sequelize }
