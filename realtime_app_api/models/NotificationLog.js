const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Station = require('./Station');

const NotificationLog = sequelize.define('NotificationLog', {
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
  channel: {
    type: DataTypes.STRING(20),
    allowNull: false,
  },
  message: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  created_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'notification_logs',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,
});

// Thiết lập quan hệ
NotificationLog.belongsTo(Station, { foreignKey: 'station_id', as: 'Station' });

module.exports = NotificationLog;