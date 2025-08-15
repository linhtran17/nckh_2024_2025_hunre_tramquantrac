const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Station = require('./Station');

const StationParameter = sequelize.define('StationParameter', {
  id: {
    type: DataTypes.STRING(255),
    primaryKey: true,
    allowNull: false,
  },
  station_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Station,
      key: 'id',
    },
  },
  parameter_type: {
    type: DataTypes.STRING(50), // Sửa lỗi: thêm type
    allowNull: false,
  },
  unit: {
    type: DataTypes.STRING(20),
    allowNull: false,
  },
}, {
  tableName: 'station_parameters',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

// Thiết lập quan hệ
StationParameter.belongsTo(Station, { foreignKey: 'station_id', as: 'Station' });

module.exports = StationParameter;