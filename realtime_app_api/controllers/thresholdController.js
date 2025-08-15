const { Threshold, WeatherData, Alert, Station, NotificationLog } = require('../models');
const { Op } = require('sequelize');
const moment = require('moment-timezone');
const { sendEmail } = require('../utils/email');
const { sendTelegramMessage } = require('../utils/telegram');
const { sendDiscordMessage } = require('../utils/discord');

const toLocalTime = (date) => {
  return moment(date).tz('Asia/Ho_Chi_Minh').format();
};

// Hàm translateParameterType
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

// Các hàm không thay đổi: getAllThresholds, getThresholdById, createThreshold, updateThreshold, deleteThreshold
const getAllThresholds = async (req, res) => {
  try {
    const rules = await Threshold.findAll();
    const modifiedRules = rules.map(rule => {
      const ruleData = rule.toJSON();
      if (ruleData.combined_conditions) {
        try {
          ruleData.combined_conditions = JSON.parse(ruleData.combined_conditions);
        } catch (error) {
          console.error('Lỗi phân tích combined_conditions:', error);
        }
      }
      return ruleData;
    });
    res.json(modifiedRules);
  } catch (err) {
    console.error('Lỗi lấy danh sách ngưỡng:', err);
    res.status(500).json({ error: 'Không thể lấy danh sách ngưỡng' });
  }
};

const getThresholdById = async (req, res) => {
  try {
    const rule = await Threshold.findByPk(req.params.id);
    if (!rule) {
      return res.status(404).json({ error: 'Quy tắc ngưỡng không tồn tại' });
    }
    const ruleData = rule.toJSON();
    if (ruleData.combined_conditions) {
      try {
        ruleData.combined_conditions = JSON.parse(ruleData.combined_conditions);
      } catch (error) {
        console.error('Lỗi phân tích combined_conditions:', error);
      }
    }
    res.json(ruleData);
  } catch (err) {
    console.error('Lỗi lấy quy tắc ngưỡng:', err);
    res.status(500).json({ error: 'Không thể lấy quy tắc ngưỡng' });
  }
};

const createThreshold = async (req, res) => {
  try {
    const { parameter_type, min_value, max_value, level, message, action, combined_conditions } = req.body;
    if (!parameter_type || !/^[a-zA-Z_]+$/.test(parameter_type)) {
      return res.status(400).json({ error: 'Yếu tố không hợp lệ, chỉ chứa chữ cái và dấu gạch dưới' });
    }
    if (min_value !== null && max_value !== null && min_value > max_value) {
      return res.status(400).json({ error: 'Ngưỡng thấp phải nhỏ hơn hoặc bằng ngưỡng cao' });
    }
    if (combined_conditions && typeof combined_conditions === 'object') {
      try {
        JSON.stringify(combined_conditions);
      } catch (error) {
        return res.status(400).json({ error: 'combined_conditions không phải JSON hợp lệ' });
      }
    }

    const rule = await Threshold.create({
      parameter_type,
      min_value,
      max_value,
      level,
      message,
      action,
      combined_conditions: combined_conditions ? JSON.stringify(combined_conditions) : null,
    });

    req.app.get('io').emit('thresholdUpdated', { id: rule.id });
    res.status(201).json(rule);
  } catch (err) {
    console.error('Lỗi tạo quy tắc ngưỡng:', err);
    res.status(500).json({ error: 'Không thể tạo quy tắc ngưỡng' });
  }
};

const updateThreshold = async (req, res) => {
  try {
    const rule = await Threshold.findByPk(req.params.id);
    if (!rule) {
      return res.status(404).json({ error: 'Quy tắc ngưỡng không tồn tại' });
    }

    const { parameter_type, min_value, max_value, level, message, action, combined_conditions } = req.body;
    if (!parameter_type || !/^[a-zA-Z_]+$/.test(parameter_type)) {
      return res.status(400).json({ error: 'Yếu tố không hợp lệ, chỉ chứa chữ cái và dấu gạch dưới' });
    }
    if (min_value !== null && max_value !== null && min_value > max_value) {
      return res.status(400).json({ error: 'Ngưỡng thấp phải nhỏ hơn hoặc bằng ngưỡng cao' });
    }
    if (combined_conditions && typeof combined_conditions === 'object') {
      try {
        JSON.stringify(combined_conditions);
      } catch (error) {
        return res.status(400).json({ error: 'combined_conditions không phải JSON hợp lệ' });
      }
    }

    await rule.update({
      parameter_type,
      min_value,
      max_value,
      level,
      message,
      action,
      combined_conditions: combined_conditions ? JSON.stringify(combined_conditions) : null,
    });

    req.app.get('io').emit('thresholdUpdated', { id: rule.id });
    res.json(rule);
  } catch (err) {
    console.error('Lỗi cập nhật quy tắc ngưỡng:', err);
    res.status(500).json({ error: 'Không thể cập nhật quy tắc ngưỡng' });
  }
};

const deleteThreshold = async (req, res) => {
  try {
    const rule = await Threshold.findByPk(req.params.id);
    if (!rule) {
      return res.status(404).json({ error: 'Quy tắc ngưỡng không tồn tại' });
    }
    await rule.destroy();
    req.app.get('io').emit('thresholdUpdated', { id: req.params.id });
    res.json({ message: 'Xóa quy tắc ngưỡng thành công' });
  } catch (err) {
    console.error('Lỗi xóa quy tắc ngưỡng:', err);
    res.status(500).json({ error: 'Không thể xóa quy tắc ngưỡng' });
  }
};

// Hàm checkThresholds với Telegram được kích hoạt
const checkThresholds = async (io) => {
  try {
    const stations = await Station.findAll();
    const levelsPriority = [
      'Bình thường',
      'Nhẹ',
      'Trung bình',
      'Nguy hiểm',
      'Rất nguy hiểm cấp 4',
      'Rất nguy hiểm cấp 5'
    ];

    for (const station of stations) {
      const station_id = station.id;
      const stationName = station.name || `Trạm ${station_id}`;
      const parameters = await station.getParameters();

      const latestWeatherData = await WeatherData.findAll({
        where: {
          station_id,
          parameter_type: { [Op.in]: parameters.map(p => p.parameter_type) },
          created_at: {
            [Op.gte]: moment().subtract(5, 'minutes').toDate()
          }
        },
        order: [['created_at', 'DESC']],
      });

      const latestTimestamp = latestWeatherData[0]?.created_at;
      const values = latestWeatherData
        .filter(data => moment(data.created_at).isSame(latestTimestamp))
        .reduce((acc, data) => {
          acc[data.parameter_type] = data.value;
          return acc;
        }, {});

      if (Object.keys(values).length === 0) {
        console.log(`Không có dữ liệu thời tiết mới cho trạm ${station_id}`);
        continue;
      }

      const rules = await Threshold.findAll();
      let highestAlert = null;

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
        const singleRules = rules.filter(rule => !rule.combined_conditions);
        let isNormal = false;

        for (const rule of singleRules) {
          const value = values[rule.parameter_type];
          if (value === undefined) continue;

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
            const value = values[rule.parameter_type];
            if (value === undefined) continue;

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
          const newAlert = await Alert.create({
            station_id,
            type: highestAlert.type,
            message: highestAlert.message,
            value: highestAlert.value,
            level: highestAlert.level,
            action: highestAlert.action,
            active: true,
            is_reminder: lastAlert && lastAlert.level === highestAlert.level,
          });

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
          });

          if (!lastNotification) {
            // Gửi qua Email
            const emailRecipient = process.env.EMAIL_RECIPIENT;
            if (emailRecipient) {
              try {
                await sendEmail(emailRecipient, subject, message);
                await NotificationLog.create({ station_id, type: highestAlert.type, channel: 'email', message });
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
                await NotificationLog.create({ station_id, type: highestAlert.type, channel: 'discord', message });
                console.log(`Đã gửi cảnh báo qua Discord: ${message}`);
              }
            } catch (discordError) {
              console.error('Lỗi gửi cảnh báo qua Discord:', discordError.message);
            }

            // Gửi qua Telegram
            try {
              const telegramSent = await sendTelegramMessage(message);
              if (telegramSent) {
                await NotificationLog.create({ station_id, type: highestAlert.type, channel: 'telegram', message });
                console.log(`Đã gửi cảnh báo qua Telegram: ${message}`);
              }
            } catch (telegramError) {
              console.error('Lỗi gửi cảnh báo qua Telegram:', telegramError.message);
            }
          }
        }
      } else if (highestAlert && highestAlert.level === 'Bình thường' && lastAlert) {
        await Alert.update(
          { active: false },
          {
            where: { station_id, type: lastAlert.type, active: true },
          }
        );

        const translatedType = translateParameterType(lastAlert.type);
        const endMessage = `${stationName}: ${translatedType.charAt(0).toUpperCase() + translatedType.slice(1)} đã trở về bình thường.`;
        const endSubject = `Hết cảnh báo ${translatedType} từ ${stationName}`;

        if (io) {
          io.emit('endAlert', { station_id, type: lastAlert.type, message: endMessage });
          console.log('Phát endAlert:', { station_id, type: lastAlert.type, message: endMessage });
        }

        const lastEndNotification = await NotificationLog.findOne({
          where: {
            station_id,
            type: lastAlert.type,
            channel: { [Op.in]: ['email', 'discord', 'telegram'] },
            message: { [Op.like]: '%đã trở về bình thường%' },
            created_at: { [Op.gte]: moment().subtract(60, 'minutes').toDate() }
          },
        });

        if (!lastEndNotification) {
          // Gửi qua Email
          const emailRecipient = process.env.EMAIL_RECIPIENT;
          if (emailRecipient) {
            try {
              await sendEmail(emailRecipient, endSubject, endMessage);
              await NotificationLog.create({ station_id, type: lastAlert.type, channel: 'email', message: endMessage });
              console.log(`Đã gửi thông báo hết cảnh báo qua email đến ${emailRecipient}: ${endMessage}`);
            } catch (emailError) {
              console.error(`Lỗi gửi thông báo hết cảnh báo qua email:`, emailError.message);
            }
          }

          // Gửi qua Discord
          try {
            const discordSent = await sendDiscordMessage(endMessage);
            if (discordSent) {
              await NotificationLog.create({ station_id, type: lastAlert.type, channel: 'discord', message: endMessage });
              console.log(`Đã gửi thông báo hết cảnh báo qua Discord: ${endMessage}`);
            }
          } catch (discordError) {
            console.error('Lỗi gửi thông báo hết cảnh báo qua Discord:', discordError.message);
          }

          // Gửi qua Telegram
          try {
            const telegramSent = await sendTelegramMessage(endMessage);
            if (telegramSent) {
              await NotificationLog.create({ station_id, type: lastAlert.type, channel: 'telegram', message: endMessage });
              console.log(`Đã gửi thông báo hết cảnh báo qua Telegram: ${endMessage}`);
            }
          } catch (telegramError) {
            console.error('Lỗi gửi thông báo hết cảnh báo qua Telegram:', telegramError.message);
          }
        }
      }
    }
  } catch (error) {
    console.error('Lỗi trong checkThresholds:', error);
    throw error;
  }
};

// Các hàm khác giữ nguyên
module.exports = {
  getAllThresholds,
  getThresholdById,
  createThreshold,
  updateThreshold,
  deleteThreshold,
  checkThresholds,
};