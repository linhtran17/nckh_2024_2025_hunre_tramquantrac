const { Station } = require('../models');

// Lấy danh sách trạm (có phân trang)
const getAllStations = async (req, res) => {
  try {
    const { page, limit } = req.query;

    if (page && limit) {
      // Nếu có phân trang
      const pageNum = parseInt(page, 10) || 1;
      const limitNum = parseInt(limit, 10) || 5;
      const offset = (pageNum - 1) * limitNum;

      const stations = await Station.findAndCountAll({
        limit: limitNum,
        offset: offset,
      });

      return res.json({
        stations: stations.rows,
        total: stations.count,
        currentPage: pageNum,
        totalPages: Math.ceil(stations.count / limitNum),
      });
    } else {
      // Nếu không có phân trang, lấy tất cả trạm
      const stations = await Station.findAll({
        attributes: ['id', 'name', 'location', 'status', 'latitude', 'longitude'],
        order: [['id', 'ASC']],
      });

      if (!stations || stations.length === 0) {
        return res.status(404).json({ error: 'Không tìm thấy trạm nào' });
      }

      return res.json(stations);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
// Lấy trạm theo ID
const getStationById = async (req, res) => {
  try {
    const station = await Station.findByPk(req.params.id);
    if (!station) {
      return res.status(404).json({ error: 'Trạm không tồn tại' });
    }
    res.json(station);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Tạo trạm mới
const createStation = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { name, location, status, latitude, longitude } = req.body;
    const station = await Station.create({
      name,
      location,
      status,
      latitude,
      longitude,
    });

    // Phát tín hiệu Socket.IO
    io.emit('stationAdded', { station });

    res.status(201).json(station);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Cập nhật trạm
const updateStation = async (req, res) => {
  const io = req.app.get('io');
  try {
    const station = await Station.findByPk(req.params.id);
    if (!station) {
      return res.status(404).json({ error: 'Trạm không tồn tại' });
    }
    const { name, location, status, latitude, longitude } = req.body;
    await station.update({ name, location, status, latitude, longitude });

    // Phát tín hiệu Socket.IO
    io.emit('stationUpdated', { station });

    res.json(station);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Xóa trạm
const deleteStation = async (req, res) => {
  const io = req.app.get('io');
  try {
    const station = await Station.findByPk(req.params.id);
    if (!station) {
      return res.status(404).json({ error: 'Trạm không tồn tại' });
    }
    await station.destroy();

    // Phát tín hiệu Socket.IO
    io.emit('stationDeleted', { station_id: req.params.id });

    res.json({ message: 'Xóa trạm thành công' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  getAllStations,
  getStationById,
  createStation,
  updateStation,
  deleteStation,
};