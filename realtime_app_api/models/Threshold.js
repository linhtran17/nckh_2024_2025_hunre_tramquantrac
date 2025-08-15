const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Threshold = sequelize.define('Threshold', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  parameter_type: {
    type: DataTypes.STRING(50),
    allowNull: false,
    validate: {
      is: /^[a-zA-Z_]+$/ // Chỉ chứa chữ cái và dấu gạch dưới
    }
  },
  min_value: {
    type: DataTypes.FLOAT,
    allowNull: true, // NULL biểu thị không có giới hạn dưới
  },
  max_value: {
    type: DataTypes.FLOAT,
    allowNull: true, // NULL biểu thị không có giới hạn trên
  },
  level: {
    type: DataTypes.STRING(20),
    allowNull: false, // Bình thường, Nhẹ, Trung bình, Nguy hiểm, Rất nguy hiểm cấp 4, Rất nguy hiểm cấp 5
  },
  message: {
    type: DataTypes.STRING(255),
    allowNull: false, // Thông điệp cảnh báo
  },
  action: {
    type: DataTypes.STRING(255),
    allowNull: false, // Hành động khuyến nghị
  },
  combined_conditions: {
    type: DataTypes.STRING, // Lưu JSON dưới dạng chuỗi (ví dụ: '{"rainfall": 60, "wind": 10.0}')
    allowNull: true,
  },
}, {
  tableName: 'thresholds',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

module.exports = Threshold;