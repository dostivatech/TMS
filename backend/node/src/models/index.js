const { Sequelize, DataTypes } = require('sequelize')

const sequelize = new Sequelize(process.env.DB_URL, {
  dialect: 'postgres',
  protocol: 'postgres',
  logging: false,
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false,
    },
  },
})

// ── User ─────────────────────────────────
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

// ── WoodProduct ─────────────────────────
const WoodProduct = sequelize.define('WoodProduct', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING, allowNull: false },
  species: { type: DataTypes.STRING, defaultValue: '' },
  unit: { type: DataTypes.ENUM('cft','ton','piece','sqft','kg'), defaultValue: 'cft' },
  pricePerUnit: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  stockQty: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
})

// ── Customer ────────────────────────────
const Customer = sequelize.define('Customer', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING, allowNull: false },
  phone: { type: DataTypes.STRING, defaultValue: '' },
  email: { type: DataTypes.STRING, defaultValue: '' },
})

// ── Associations ───────────────────────
User.hasMany(Customer)
Customer.belongsTo(User)

module.exports = {
  sequelize,
  User,
  WoodProduct,
  Customer,
}