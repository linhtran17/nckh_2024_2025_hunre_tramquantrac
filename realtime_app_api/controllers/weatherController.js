const { WeatherData, Station, Threshold, Alert, StationParameter, NotificationLog, sequelize } = require('../models');
const { Op } = require('sequelize');
const moment = require('moment-timezone');
const { sendEmail } = require('../utils/email');
const { sendTelegramMessage } = require('../utils/telegram');
const { sendDiscordMessage } = require('../utils/discord');

const toLocalTime = (date) => {
  return moment(date).tz('Asia/Ho_Chi_Minh').format();
};

// Các hàm không thay đổi: getAllWeatherData, getLatestWeatherData, createWeatherData, 
// filterDataByTimeRange, filterDataByDateRange, exportFilteredDataToExcel, getAlertsByStation
const getAllWeatherData = async (req, res) => {
  try {
    const { station_id, parameter_type } = req.query;
    const where = {};
    if (station_id) where.station_id = station_id;
    if (parameter_type) where.parameter_type = parameter_type;
    const weatherData = await WeatherData.findAll({ where });
    const weatherDataJSON = weatherData.map(data => {
      const json = data.toJSON();
      json.created_at = toLocalTime(json.created_at);
      return json;
    });
    res.json(weatherDataJSON);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getLatestWeatherData = async (req, res) => {
  try {
    const { station_id, parameter_type } = req.query;
    if (!station_id || !parameter_type) {
      return res.status(400).json({ error: 'station_id và parameter_type là bắt buộc' });
    }
    const weatherData = await WeatherData.findOne({
      where: { station_id, parameter_type },
      order: [['created_at', 'DESC']],
    });
    if (!weatherData) {
      return res.status(404).json({ error: 'Không tìm thấy dữ liệu thời tiết' });
    }
    const weatherDataJSON = weatherData.toJSON();
    weatherDataJSON.created_at = toLocalTime(weatherDataJSON.created_at);
    res.json(weatherDataJSON);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const createWeatherData = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const weatherDataArray = Array.isArray(req.body) ? req.body : [req.body];
    if (weatherDataArray.length === 0) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Dữ liệu không hợp lệ hoặc rỗng' });
    }

    const stationId = weatherDataArray[0].station_id;
    for (const data of weatherDataArray) {
      const { station_id, parameter_type, value } = data;
      if (!station_id || !parameter_type || value === undefined || station_id !== stationId) {
        await transaction.rollback();
        return res.status(400).json({ error: 'station_id, parameter_type và value là bắt buộc, tất cả phải cùng station_id' });
      }

      const station = await Station.findByPk(station_id, { transaction });
      if (!station) {
        await transaction.rollback();
        return res.status(404).json({ error: 'Trạm không tồn tại' });
      }

      const parameter = await StationParameter.findOne({
        where: { station_id, parameter_type },
        transaction,
      });
      if (!parameter) {
        await transaction.rollback();
        return res.status(400).json({ error: 'Thông số chưa được cấu hình cho trạm này' });
      }

      const weatherData = await WeatherData.create(
        { station_id, parameter_type, value },
        { transaction }
      );

      const weatherDataJSON = weatherData.toJSON();
      weatherDataJSON.created_at = toLocalTime(weatherDataJSON.created_at);
      req.app.get('io').emit('newWeatherData', weatherDataJSON);
    }

    for (const data of weatherDataArray) {
      await checkThresholdAndCreateAlert(req.app.get('io'), data.station_id, data.parameter_type, data.value, transaction);
    }

    await transaction.commit();
    res.status(201).json({ message: 'Dữ liệu được tạo thành công', data: weatherDataArray });
  } catch (err) {
    await transaction.rollback();
    res.status(500).json({ error: err.message });
  }
};

const filterDataByTimeRange = async (req, res) => {
  try {
    const { station_id, range, parameter_type } = req.query;
    const stationId = parseInt(station_id);
    if (isNaN(stationId) || !stationId) {
      return res.status(400).json({ error: 'station_id phải là số nguyên và không được rỗng' });
    }

    if (!range || !['current', 'last7days', 'last30days', 'last24hours'].includes(range)) {
      return res.status(400).json({ error: 'Tham số range phải là "current", "last7days", "last30days" hoặc "last24hours"' });
    }

    if (!parameter_type || !['temperature', 'humidity', 'rainfall', 'wind'].includes(parameter_type)) {
      return res.status(400).json({ error: 'Tham số parameter_type phải là "temperature", "humidity", "rainfall" hoặc "wind"' });
    }

    const station = await Station.findByPk(stationId);
    if (!station) {
      return res.status(404).json({ error: `Trạm với ID ${stationId} không tồn tại` });
    }

    let startDate, endDate;
    const now = moment.tz('Asia/Ho_Chi_Minh');
    if (range === 'current') {
      startDate = now.startOf('day').toDate();
      endDate = now.endOf('day').toDate();
    } else if (range === 'last7days') {
      startDate = now.clone().subtract(7, 'days').startOf('day').toDate();
      endDate = now.endOf('day').toDate();
    } else if (range === 'last30days') {
      startDate = now.clone().subtract(30, 'days').startOf('day').toDate();
      endDate = now.endOf('day').toDate();
    } else if (range === 'last24hours') {
      startDate = now.clone().subtract(24, 'hours').toDate();
      endDate = now.toDate();
    }

    const data = await WeatherData.findAll({
      where: {
        station_id: stationId,
        parameter_type,
        created_at: {
          [Op.between]: [startDate, endDate],
        },
      },
      order: [['created_at', 'ASC']],
    });

    const dataJSON = data.map(item => {
      const json = item.toJSON();
      json.created_at = toLocalTime(json.created_at);
      return json;
    });

    res.json(dataJSON.length > 0 ? dataJSON : []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const filterDataByDateRange = async (req, res) => {
  try {
    const { station_id, type, start_date, end_date, parameter_type } = req.query;
    const stationId = parseInt(station_id);
    if (isNaN(stationId)) {
      return res.status(400).json({ error: 'station_id phải là số nguyên' });
    }

    if (!stationId) {
      return res.status(400).json({ error: 'Tham số station_id là bắt buộc' });
    }
    if (!type || !['weather', 'alert'].includes(type)) {
      return res.status(400).json({ error: 'Tham số type phải là "weather" hoặc "alert"' });
    }
    if (!start_date || !end_date) {
      return res.status(400).json({ error: 'Tham số start_date và end_date là bắt buộc (định dạng YYYY-MM-DD)' });
    }

    const station = await Station.findByPk(stationId);
    if (!station) {
      return res.status(404).json({ error: `Trạm với ID ${stationId} không tồn tại` });
    }

    if (!moment(start_date, 'YYYY-MM-DD', true).isValid() || !moment(end_date, 'YYYY-MM-DD', true).isValid()) {
      return res.status(400).json({ error: 'start_date và end_date phải có định dạng YYYY-MM-DD' });
    }

    const startDate = moment.tz(start_date, 'Asia/Ho_Chi_Minh').startOf('day').toDate();
    const endDate = moment.tz(end_date, 'Asia/Ho_Chi_Minh').endOf('day').toDate();

    let data;
    if (type === 'weather') {
      const whereClause = {
        station_id: stationId,
        created_at: {
          [Op.between]: [startDate, endDate],
        },
      };
      if (parameter_type) {
        whereClause.parameter_type = parameter_type;
      }
      data = await WeatherData.findAll({
        where: whereClause,
        order: [['created_at', 'ASC']],
      });
    } else if (type === 'alert') {
      data = await Alert.findAll({
        where: {
          station_id: stationId,
          created_at: {
            [Op.between]: [startDate, endDate],
          },
        },
        order: [['created_at', 'DESC']],
      });
    }

    const dataJSON = data.map(item => {
      const json = item.toJSON();
      json.created_at = toLocalTime(json.created_at);
      return json;
    });

    res.json(dataJSON);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const exportFilteredDataToExcel = async (req, res) => {
  try {
    const { data, type } = req.body;
    if (!data || !Array.isArray(data) || data.length === 0) {
      return res.status(400).json({ error: 'Dữ liệu cần xuất không hợp lệ hoặc rỗng' });
    }
    if (!type || !['weather', 'alert'].includes(type)) {
      return res.status(400).json({ error: 'Tham số type phải là "weather" hoặc "alert"' });
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(type === 'weather' ? 'Weather Data' : 'Alert Data');

    worksheet.columns = [
      { header: 'ID', key: 'id', width: 10 },
      { header: 'Station ID', key: 'station_id', width: 15 },
      { header: type === 'weather' ? 'Parameter Type' : 'Type', key: type === 'weather' ? 'parameter_type' : 'type', width: 20 },
      { header: 'Value', key: 'value', width: 15 },
      { header: 'Created At', key: 'created_at', width: 25 },
    ];

    if (type === 'alert') {
      worksheet.columns.push(
        { header: 'Message', key: 'message', width: 30 },
        { header: 'Level', key: 'level', width: 15 },
        { header: 'Action', key: 'action', width: 25 }
      );
    }

    data.forEach(item => {
      const row = {
        id: item.id,
        station_id: item.station_id,
        [type === 'weather' ? 'parameter_type' : 'type']: type === 'weather' ? item.parameter_type : item.type,
        value: item.value,
        created_at: item.created_at,
      };
      if (type === 'alert') {
        row.message = item.message;
        row.level = item.level;
        row.action = item.action;
      }
      worksheet.addRow(row);
    });

    const buffer = await workbook.xlsx.writeBuffer();
    res.setHeader('Content-Disposition', `attachment; filename=${type}_data_${data[0].station_id}_${moment().format('YYYY-MM-DD')}.xlsx`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getAlertsByStation = async (req, res) => {
  try {
    const { station_id } = req.params;
    if (!station_id) {
      return res.status(400).json({ error: 'Tham số station_id là bắt buộc' });
    }

    const alerts = await Alert.findAll({
      where: { station_id },
      order: [['created_at', 'DESC']],
    });

    const alertsJSON = alerts.map(alert => {
      const json = alert.toJSON();
      json.created_at = toLocalTime(json.created_at);
      return json;
    });

    res.json(alertsJSON);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Thêm hàm translateParameterType
const translateParameterType = (parameter_type) => {
  const translations = {
    rainfall: 'mưa',
    wind: 'gió',
    wind_gust: 'gió giật',
    temperature: 'nhiệt độ',
    humidity: 'độ ẩm',
    combined_humidity_temp: 'độ ẩm và nhiệt độ',
    combined_rain_wind_temp_4: 'mưa, gió và nhiệt độ',
    combined_rain_wind_temp_humidity_5: 'mưa, gió, nhiệt độ và độ ẩm'
  };
  return translations[parameter_type] || parameter_type;
};

// Hàm checkThresholdAndCreateAlert với Telegram được kích hoạt
const checkThresholdAndCreateAlert = async (io, station_id, parameter_type, value, transaction) => {
  const transactionInstance = transaction || await sequelize.transaction();
  try {
    const station = await Station.findByPk(station_id, { transaction: transactionInstance });
    const stationName = station ? station.name : `Trạm ${station_id}`;
    const parameters = await station.getParameters({ transaction: transactionInstance });

    // Lấy dữ liệu thời tiết mới nhất trong 5 phút
    const latestWeatherData = await WeatherData.findAll({
      where: {
        station_id,
        parameter_type: { [Op.in]: parameters.map(p => p.parameter_type) },
        created_at: {
          [Op.gte]: moment().subtract(5, 'minutes').toDate()
        }
      },
      order: [['created_at', 'DESC']],
      transaction: transactionInstance,
    });

    const latestTimestamp = latestWeatherData[0]?.created_at;
    const values = latestWeatherData
      .filter(data => moment(data.created_at).isSame(latestTimestamp))
      .reduce((acc, data) => {
        acc[data.parameter_type] = data.value;
        return acc;
      }, {});

    values[parameter_type] = value;

    const rules = await Threshold.findAll({ transaction: transactionInstance });
    let highestAlert = null;
    const levelsPriority = [
      'Bình thường',
      'Nhẹ',
      'Trung bình',
      'Nguy hiểm',
      'Rất nguy hiểm cấp 4',
      'Rất nguy hiểm cấp 5'
    ];

    // Bước 1: Kiểm tra tổ hợp cấp 5
    const combinedRules5 = rules.filter(rule => rule.parameter_type === 'combined_rain_wind_temp_humidity_5');
    for (const rule of combinedRules5) {
      try {
        const conditions = JSON.parse(rule.combined_conditions);
        let allConditionsMet = true;
        for (const [param, threshold] of Object.entries(conditions)) {
          if (values[param] === undefined || values[param] < threshold) {
            allConditionsMet = false;
            break;
          }
        }
        if (allConditionsMet) {
          highestAlert = {
            level: rule.level,
            message: rule.message,
            action: rule.action,
            type: rule.parameter_type,
            value: null
          };
          break;
        }
      } catch (error) {
        console.error('Lỗi phân tích combined_conditions cho cấp 5:', error);
      }
    }

    // Bước 2: Kiểm tra tổ hợp cấp 4
    if (!highestAlert) {
      const combinedRules4 = rules.filter(rule => rule.parameter_type === 'combined_rain_wind_temp_4');
      for (const rule of combinedRules4) {
        try {
          const conditions = JSON.parse(rule.combined_conditions);
          let allConditionsMet = true;
          for (const [param, threshold] of Object.entries(conditions)) {
            if (values[param] === undefined || values[param] < threshold) {
              allConditionsMet = false;
              break;
            }
          }
          if (allConditionsMet) {
            highestAlert = {
              level: rule.level,
              message: rule.message,
              action: rule.action,
              type: rule.parameter_type,
              value: null
            };
            break;
          }
        } catch (error) {
          console.error('Lỗi phân tích combined_conditions cho cấp 4:', error);
        }
      }
    }

    // Bước 3: Kiểm tra tổ hợp độ ẩm + nhiệt độ
    if (!highestAlert) {
      const combinedHumidityTemp = rules.filter(rule => rule.parameter_type === 'combined_humidity_temp');
      for (const rule of combinedHumidityTemp) {
        try {
          const conditions = JSON.parse(rule.combined_conditions);
          let allConditionsMet = true;
          for (const [param, threshold] of Object.entries(conditions)) {
            if (values[param] === undefined || values[param] < threshold) {
              allConditionsMet = false;
              break;
            }
          }
          if (allConditionsMet) {
            highestAlert = {
              level: rule.level,
              message: rule.message,
              action: rule.action,
              type: rule.parameter_type,
              value: null
            };
            break;
          }
        } catch (error) {
          console.error('Lỗi phân tích combined_conditions cho độ ẩm + nhiệt độ:', error);
        }
      }
    }

    // Bước 4: Kiểm tra ngưỡng đơn lẻ
    if (!highestAlert) {
      const singleRules = rules.filter(rule => !rule.combined_conditions && rule.parameter_type === parameter_type);
      let isNormal = false;

      for (const rule of singleRules) {
        if (
          rule.level === 'Bình thường' &&
          rule.min_value !== null &&
          rule.max_value !== null &&
          value >= rule.min_value &&
          value <= rule.max_value
        ) {
          isNormal = true;
          highestAlert = {
            level: rule.level,
            message: rule.message,
            action: rule.action,
            type: rule.parameter_type,
            value
          };
          break;
        }
      }

      if (!isNormal) {
        for (const rule of singleRules) {
          let shouldAlert = false;
          let message = rule.message;
          let level = rule.level;
          let action = rule.action;

          if (rule.min_value !== null && rule.max_value !== null) {
            if (value >= rule.min_value && value < rule.max_value && level !== 'Bình thường') {
              shouldAlert = true;
            }
          } else if (rule.min_value !== null && value >= rule.min_value) {
            shouldAlert = true;
          } else if (rule.max_value !== null && value < rule.max_value) {
            shouldAlert = true;
          }

          if (shouldAlert) {
            const currentLevelIndex = levelsPriority.indexOf(level);
            if (!highestAlert || currentLevelIndex > levelsPriority.indexOf(highestAlert.level)) {
              highestAlert = {
                level,
                message,
                action,
                type: rule.parameter_type,
                value
              };
            }
          }
        }
      }
    }

    // Bước 5: Xử lý cảnh báo
    const lastAlert = await Alert.findOne({
      where: { station_id, type: highestAlert?.type, active: true },
      order: [['created_at', 'DESC']],
      transaction: transactionInstance,
    });

    if (highestAlert && highestAlert.level !== 'Bình thường') {
      let shouldCreateAlert = false;
      let minInterval = 60; // Mặc định cho Nhẹ/Trung bình

      if (highestAlert.level === 'Rất nguy hiểm cấp 4' || highestAlert.level === 'Rất nguy hiểm cấp 5') {
        minInterval = 5; // Mỗi 5 phút
      } else if (highestAlert.level === 'Nguy hiểm') {
        minInterval = 10; // Mỗi 10 phút
      }

      if (!lastAlert) {
        shouldCreateAlert = true;
      } else {
        const lastAlertTime = moment(lastAlert.created_at);
        const currentTime = moment();
        const minutesSinceLastAlert = currentTime.diff(lastAlertTime, 'minutes', true);

        shouldCreateAlert = (
          minutesSinceLastAlert >= minInterval ||
          levelsPriority.indexOf(highestAlert.level) > levelsPriority.indexOf(lastAlert.level)
        );
      }

      if (shouldCreateAlert) {
        const isReminder = lastAlert && lastAlert.level === highestAlert.level ? true : false;
        console.log('Tạo cảnh báo với is_reminder:', isReminder);
        const newAlert = await Alert.create(
          {
            station_id,
            type: highestAlert.type || 'unknown',
            message: highestAlert.message,
            value: highestAlert.value,
            level: highestAlert.level,
            action: highestAlert.action,
            active: true,
            is_reminder: isReminder,
          },
          { transaction: transactionInstance }
        );

        // Gửi thông báo
        if (io) {
          const alertJSON = newAlert.toJSON();
          alertJSON.created_at = toLocalTime(alertJSON.created_at);
          io.emit('newAlert', alertJSON);
          console.log('Phát newAlert:', alertJSON);
        }

        const message = `${stationName}: ${highestAlert.message} - ${highestAlert.action}`;
        const subject = `Cảnh báo thời tiết từ ${stationName}${newAlert.is_reminder ? ' (Nhắc nhở)' : ''}`;

        const lastNotification = await NotificationLog.findOne({
          where: {
            station_id,
            type: highestAlert.type,
            channel: { [Op.in]: ['email', 'discord', 'telegram'] },
            created_at: { [Op.gte]: moment().subtract(minInterval, 'minutes').toDate() }
          },
          transaction: transactionInstance,
        });

        if (!lastNotification) {
          // Gửi qua Email
          const emailRecipient = process.env.EMAIL_RECIPIENT;
          if (emailRecipient) {
            try {
              await sendEmail(emailRecipient, subject, message);
              await NotificationLog.create(
                { station_id, type: highestAlert.type, channel: 'email', message },
                { transaction: transactionInstance }
              );
              console.log(`Đã gửi cảnh báo qua email đến ${emailRecipient}: ${message}`);
            } catch (emailError) {
              console.error(`Lỗi gửi cảnh báo qua email đến ${emailRecipient}:`, emailError.message);
            }
          } else {
            console.warn('EMAIL_RECIPIENT không được định nghĩa, bỏ qua gửi email');
          }

          // Gửi qua Discord
          try {
            const discordSent = await sendDiscordMessage(message);
            if (discordSent) {
              await NotificationLog.create(
                { station_id, type: highestAlert.type, channel: 'discord', message },
                { transaction: transactionInstance }
              );
              console.log(`Đã gửi cảnh báo qua Discord: ${message}`);
            }
          } catch (discordError) {
            console.error('Lỗi gửi cảnh báo qua Discord:', discordError.message);
          }

          // Gửi qua Telegram
          try {
            const telegramSent = await sendTelegramMessage(message);
            if (telegramSent) {
              await NotificationLog.create(
                { station_id, type: highestAlert.type, channel: 'telegram', message },
                { transaction: transactionInstance }
              );
              console.log(`Đã gửi cảnh báo qua Telegram: ${message}`);
            }
          } catch (telegramError) {
            console.error('Lỗi gửi cảnh báo qua Telegram:', telegramError.message);
          }
        }
      }
    } else if (highestAlert && highestAlert.level === 'Bình thường' && lastAlert) {
      // Cập nhật cảnh báo hiện tại thành không hoạt động
      await Alert.update(
        { active: false },
        {
          where: { station_id, type: lastAlert.type, active: true },
          transaction: transactionInstance,
        }
      );

      // Tạo thông báo kết thúc thân thiện hơn
      const translatedType = translateParameterType(lastAlert.type);
      const endMessage = `${stationName}: ${translatedType.charAt(0).toUpperCase() + translatedType.slice(1)} đã trở về bình thường.`;
      const endSubject = `Hết cảnh báo ${translatedType} từ ${stationName}`;

      if (io) {
        io.emit('endAlert', { station_id, type: lastAlert.type, message: endMessage });
        console.log('Phát endAlert:', { station_id, type: lastAlert.type, message: endMessage });
      }

      // Kiểm tra thời gian gửi thông báo kết thúc
      const lastEndNotification = await NotificationLog.findOne({
        where: {
          station_id,
          type: lastAlert.type,
          channel: { [Op.in]: ['email', 'discord', 'telegram'] },
          message: { [Op.like]: '%đã trở về bình thường%' },
          created_at: { [Op.gte]: moment().subtract(60, 'minutes').toDate() }
        },
        transaction: transactionInstance,
      });

      if (!lastEndNotification) {
        // Gửi qua Email
        const emailRecipient = process.env.EMAIL_RECIPIENT;
        if (emailRecipient) {
          try {
            await sendEmail(emailRecipient, endSubject, endMessage);
            await NotificationLog.create(
              { station_id, type: lastAlert.type, channel: 'email', message: endMessage },
              { transaction: transactionInstance }
            );
            console.log(`Đã gửi thông báo hết cảnh báo qua email đến ${emailRecipient}: ${endMessage}`);
          } catch (emailError) {
            console.error(`Lỗi gửi thông báo hết cảnh báo qua email:`, emailError.message);
          }
        }

        // Gửi qua Discord
        try {
          const discordSent = await sendDiscordMessage(endMessage);
          if (discordSent) {
            await NotificationLog.create(
              { station_id, type: lastAlert.type, channel: 'discord', message: endMessage },
              { transaction: transactionInstance }
            );
            console.log(`Đã gửi thông báo hết cảnh báo qua Discord: ${endMessage}`);
          }
        } catch (discordError) {
          console.error('Lỗi gửi thông báo hết cảnh báo qua Discord:', discordError.message);
        }

        // Gửi qua Telegram
        try {
          const telegramSent = await sendTelegramMessage(endMessage);
          if (telegramSent) {
            await NotificationLog.create(
              { station_id, type: lastAlert.type, channel: 'telegram', message: endMessage },
              { transaction: transactionInstance }
            );
            console.log(`Đã gửi thông báo hết cảnh báo qua Telegram: ${endMessage}`);
          }
        } catch (telegramError) {
          console.error('Lỗi gửi thông báo hết cảnh báo qua Telegram:', telegramError.message);
        }
      }
    }

    if (!transaction) await transactionInstance.commit();
  } catch (err) {
    if (!transaction) await transactionInstance.rollback();
    throw err;
  }
};

module.exports = {
  getAllWeatherData,
  getLatestWeatherData,
  createWeatherData,
  filterDataByTimeRange,
  filterDataByDateRange,
  exportFilteredDataToExcel,
  getAlertsByStation,
  checkThresholdAndCreateAlert,
};