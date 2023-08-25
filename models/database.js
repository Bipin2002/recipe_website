const { Sequelize } = require('sequelize');

const sequelize = new Sequelize({
  dialect: 'postgres', // Use the appropriate database dialect
  database: 'Recipe_data',
  username: 'postgres',
  password: 'root',
  host: 'localhost', // Update with your database host
  port: 5432, // Update with your database port
});

module.exports = sequelize;
