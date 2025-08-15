const { Alert } = require('../models');

// Lấy danh sách cảnh báo
const getAllAlerts = async (req, res) => {
  try {
    const { station_id } = req.query;
    const where = station_id ? { station_id } : {};
    const alerts = await Alert.findAll({ where });
    res.json(alerts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Lấy cảnh báo theo ID
const getAlertById = async (req, res) => {
  try {
    const alert = await Alert.findByPk(req.params.id);
    if (!alert) {
      return res.status(404).json({ error: 'Cảnh báo không tồn tại' });
    }
    res.json(alert);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Tạo cảnh báo mới (thường được gọi tự động trong weatherController)
const createAlert = async (req, res) => {
  try {
    const { station_id, type, message, value, level, action, active = true, is_reminder = false } = req.body;
    const alert = await Alert.create({
      station_id,
      type,
      message,
      value,
      level,
      action,
      active,
      is_reminder,
    });
    res.status(201).json(alert);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Xóa cảnh báo
const deleteAlert = async (req, res) => {
  try {
    const alert = await Alert.findByPk(req.params.id);
    if (!alert) {
      return res.status(404).json({ error: 'Cảnh báo không tồn tại' });
    }
    await alert.destroy();
    res.json({ message: 'Xóa cảnh báo thành công' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
const exportAlerts = async (req, res) => {
  try {
    const { station_id, from, to } = req.query;
    const where = {};
    if (station_id) where.station_id = station_id;
    if (from && to) {
      where.created_at = {
        [Op.between]: [new Date(from), new Date(to)],
      };
    }

    const data = await Alert.findAll({ where, include: [Station] });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Alerts');

    sheet.columns = [
      { header: 'ID', key: 'id' },
      { header: 'Station', key: 'station_name' },
      { header: 'Type', key: 'type' },
      { header: 'Message', key: 'message' },
      { header: 'Level', key: 'level' },
      { header: 'Value', key: 'value' },
      { header: 'Time', key: 'created_at' },
    ];

    data.forEach((row) => {
      sheet.addRow({
        id: row.id,
        station_name: row.Station?.name || 'N/A',
        type: row.type,
        message: row.message,
        level: row.level,
        value: row.value,
        created_at: moment(row.created_at).tz('Asia/Ho_Chi_Minh').format(),
      });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="alerts_export_${Date.now()}.xlsx"`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


module.exports = {
  getAllAlerts,
  getAlertById,
  createAlert,
  deleteAlert,
  exportAlerts,
};