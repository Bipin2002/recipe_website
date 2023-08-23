const { Sequelize } = require('sequelize');

const sequelize = new Sequelize({
  dialect: 'postgres', // Use the appropriate database dialect
  database: 'Recipe_data',
  username: 'postgres',
  password: 'Iamdon',
  host: 'localhost', // Update with your database host
  port: 8000, // Update with your database port
});

module.exports = sequelize;
