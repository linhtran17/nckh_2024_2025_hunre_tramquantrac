const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Station = sequelize.define('Station', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  location: {
    type: DataTypes.STRING(255),
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive', 'error', 'maintenance'),
    allowNull: false,
    defaultValue: 'active',
  },
  latitude: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0.0,
  },
  longitude: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0.0,
  },
}, {
  tableName: 'stations',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

module.exports = Station;