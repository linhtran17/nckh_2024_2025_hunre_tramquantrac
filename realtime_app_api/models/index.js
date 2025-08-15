const { Sequelize } = require('sequelize');
const sequelize = require('../config/database');

const Station = require('./Station');
const StationParameter = require('./StationParameter');
const WeatherData = require('./WeatherData');
const Threshold = require('./Threshold');
const Alert = require('./Alert');
const NotificationLog = require('./NotificationLog');

const db = {
  Station,
  StationParameter,
  WeatherData,
  Threshold,
  Alert,
  NotificationLog,
  sequelize,
  Sequelize,
};

Station.hasMany(StationParameter, { foreignKey: 'station_id', as: 'parameters' });
StationParameter.belongsTo(Station, { foreignKey: 'station_id' });

Station.hasMany(WeatherData, { foreignKey: 'station_id', as: 'weatherData' });
WeatherData.belongsTo(Station, { foreignKey: 'station_id' });

Station.hasMany(Alert, { foreignKey: 'station_id', as: 'alerts' });
Alert.belongsTo(Station, { foreignKey: 'station_id' });

Station.hasMany(NotificationLog, { foreignKey: 'station_id', as: 'notificationLogs' });
NotificationLog.belongsTo(Station, { foreignKey: 'station_id' });

module.exports = db;