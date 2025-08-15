const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Station = require('./Station');

const Alert = sequelize.define('Alert', {
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
  type: {
    type: DataTypes.STRING(50),
    allowNull: false,
  },
  message: {
    type: DataTypes.STRING(255),
    allowNull: true, // Cho phép null vì cảnh báo tổ hợp có thể không có message
  },
  value: {
    type: DataTypes.FLOAT,
    allowNull: true, // Cho phép null vì cảnh báo tổ hợp không có value
  },
  level: {
    type: DataTypes.STRING(50), // Tăng độ dài để chứa "Rất nguy hiểm cấp 4/5"
    allowNull: false,
  },
  action: {
    type: DataTypes.STRING(255),
    allowNull: true, // Cho phép null vì cảnh báo tổ hợp có thể không có action
  },
  active: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  },
 is_reminder: {
  type: DataTypes.BOOLEAN,
  allowNull: false,
  defaultValue: false,
},
}, {
  tableName: 'alerts',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,
});

// Thiết lập quan hệ
Alert.belongsTo(Station, { foreignKey: 'station_id', as: 'Station' });

module.exports = Alert;