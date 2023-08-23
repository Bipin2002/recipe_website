const { DataTypes } = require('sequelize');
const sequelize = require('./database');

const recipes = sequelize.define('recipes', {
    title: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
    ingredients: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
    instructions: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
    image: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
});

module.exports = recipes;