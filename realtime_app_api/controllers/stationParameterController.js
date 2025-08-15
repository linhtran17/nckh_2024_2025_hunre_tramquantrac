const { StationParameter, Station } = require('../models');

// Lấy danh sách thông số của trạm
const getAllParameters = async (req, res) => {
  try {
    const { station_id } = req.query;
    const where = station_id ? { station_id } : {};
    const parameters = await StationParameter.findAll({ where });
    res.json(parameters);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Lấy thông số theo ID
const getParameterById = async (req, res) => {
  try {
    const parameter = await StationParameter.findByPk(req.params.id);
    if (!parameter) {
      return res.status(404).json({ error: 'Thông số không tồn tại' });
    }
    res.json(parameter);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Tạo thông số mới
const createParameter = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { id, station_id, parameter_type, unit } = req.body;
    if (!id) {
      return res.status(400).json({ error: 'ID thông số là bắt buộc' });
    }
    const station = await Station.findByPk(station_id);
    if (!station) {
      return res.status(404).json({ error: 'Trạm không tồn tại' });
    }
    const existingParameter = await StationParameter.findByPk(id);
    if (existingParameter) {
      return res.status(400).json({ error: 'ID thông số đã tồn tại' });
    }
    const parameter = await StationParameter.create({
      id,
      station_id,
      parameter_type,
      unit,
    });
    io.emit('updateParameters', { station_id });
    res.status(201).json(parameter);
  } catch (err) {
    console.error('Lỗi tạo thông số:', err);
    res.status(500).json({ error: `Không thể tạo thông số: ${err.message}` });
  }
};

// Cập nhật thông số
const updateParameter = async (req, res) => {
  const io = req.app.get('io');
  try {
    const parameter = await StationParameter.findByPk(req.params.id);
    if (!parameter) {
      return res.status(404).json({ error: 'Thông số không tồn tại' });
    }
    const { parameter_type, unit } = req.body;
    await parameter.update({ parameter_type, unit });
    io.emit('updateParameters', { station_id: parameter.station_id });
    res.json(parameter);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Xóa thông số
const deleteParameter = async (req, res) => {
  const io = req.app.get('io');
  try {
    const parameter = await StationParameter.findByPk(req.params.id);
    if (!parameter) {
      return res.status(404).json({ error: 'Thông số không tồn tại' });
    }
    const station_id = parameter.station_id;
    await parameter.destroy();
    io.emit('updateParameters', { station_id });
    res.json({ message: 'Xóa thông số thành công' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  getAllParameters,
  getParameterById,
  createParameter,
  updateParameter,
  deleteParameter,
};