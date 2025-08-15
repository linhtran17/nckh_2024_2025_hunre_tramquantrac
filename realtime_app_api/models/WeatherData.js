const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Station = require('./Station');

const WeatherData = sequelize.define('WeatherData', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
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
    type: DataTypes.STRING(50),
    allowNull: false,
  },
  value: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  created_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
  },
}, {
  tableName: 'weather_data',
  underscored: true,
  timestamps: false, // Tắt timestamps để không thêm updated_at
});

WeatherData.belongsTo(Station, { foreignKey: 'station_id', as: 'Station' });

module.exports = WeatherData;