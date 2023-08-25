const { Sequelize } = require('sequelize');

const sequelize = new Sequelize({
  dialect: 'postgres',
  database: 'Recipe_data',
  username: 'postgres',
  password: 'root',
  host: 'localhost',
  port: 5432,
});

module.exports = sequelize;
