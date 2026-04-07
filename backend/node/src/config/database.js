const { Sequelize } = require('sequelize')
const path = require('path')
require('dotenv').config()

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.resolve(process.env.DB_PATH || './woodtrack.db'),
  logging: false,
})

module.exports = sequelize