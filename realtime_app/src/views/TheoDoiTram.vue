<template>
  <div class="theo-doi-tram-container">
    <!-- Tiêu đề -->
    <div class="header-section">
      <h2 class="table-title">Theo Dõi Trạm Quan Trắc</h2>
      <span class="connection-status">
        {{ socketConnected ? '🟢 Kết nối Socket' : '🔴 Mất kết nối Socket' }}
      </span>
    </div>

    <!-- Bảng hiển thị trạm và thông số -->
    <el-table
      :data="paginatedData"
      style="width: 100%"
      border
      :loading="loading"
      empty-text="Không có dữ liệu để hiển thị"
      class="custom-table"
      :header-cell-style="{ color: '#000000', fontWeight: 'bold' }"
      :row-class-name="tableRowClassName"
    >
      <el-table-column label="Tên Trạm" width="280" align="center">
        <template #default="{ row }">
          <span :class="{ 'alert-station': hasAlert(row.station_id) }" class="station-name">
            {{ hasAlert(row.station_id) ? '🔴' : '🟢' }} {{ row.stationName || 'N/A' }}
          </span>
        </template>
      </el-table-column>
      <el-table-column label="Nhiệt Độ (°C)" width="165" align="center">
        <template #default="{ row }">
          <span :style="getAlertStyle(row.station_id, 'temperature')">
            {{ row.temperature !== null && row.temperature !== undefined ? row.temperature.toFixed(1) : 'N/A' }}
          </span>
        </template>
      </el-table-column>
      <el-table-column label="Độ Ẩm (%)" width="165" align="center">
        <template #default="{ row }">
          <span :style="getAlertStyle(row.station_id, 'humidity')">
            {{ row.humidity !== null && row.humidity !== undefined ? row.humidity.toFixed(1) : 'N/A' }}
          </span>
        </template>
      </el-table-column>
      <el-table-column label="Gió (m/s)" width="165" align="center">
        <template #default="{ row }">
          <span :style="getAlertStyle(row.station_id, 'wind')">
            {{ row.wind !== null && row.wind !== undefined ? row.wind.toFixed(1) : 'N/A' }}
          </span>
        </template>
      </el-table-column>
      <el-table-column label="Lượng Mưa (mm/h)" width="165" align="center">
        <template #default="{ row }">
          <span :style="getAlertStyle(row.station_id, 'rainfall')">
            {{ row.rainfall !== null && row.rainfall !== undefined ? row.rainfall.toFixed(1) : 'N/A' }}
          </span>
        </template>
      </el-table-column>
      <el-table-column label="Trạng Thái Cảnh Báo" width="220" align="center">
        <template #default="{ row }">
          <span :style="getCombinedAlertStyle(row.station_id)">
            {{ getCombinedAlertLevel(row.station_id) || 'Bình thường' }}
          </span>
        </template>
      </el-table-column>
    </el-table>

    <!-- Phân trang -->
    <div class="pagination-container">
      <el-pagination
        background
        layout="prev, pager, next, sizes, total"
        :total="tableData.length"
        :page-size="pageSize"
        :page-sizes="[5, 10, 20, 50]"
        v-model:current-page="currentPage"
        @size-change="handlePageSizeChange"
        @current-change="handlePageChange"
      />
    </div>
    <WeatherChart />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue';
import axios from 'axios';
import { ElMessage } from 'element-plus';
import { io } from 'socket.io-client';
import WeatherChart from '@/components/WeatherChart.vue';

const STATIONS_API_URL = 'http://localhost:3005/api/stations';
const THRESHOLDS_API_URL = 'http://localhost:3005/api/thresholds';
const socket = io('http://localhost:3005', {
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  transports: ['websocket', 'polling'],
});

const tableData = ref([]);
const thresholds = ref([]);
const loading = ref(false);
const currentPage = ref(1);
const pageSize = ref(10);
const socketConnected = ref(false);

// Tính toán dữ liệu phân trang
const paginatedData = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  const end = start + pageSize.value;
  return tableData.value.slice(start, end);
});

// Hàm xử lý phân trang
const handlePageSizeChange = (newSize) => {
  pageSize.value = newSize;
  currentPage.value = 1;
};

const handlePageChange = (newPage) => {
  currentPage.value = newPage;
};

// Lấy danh sách trạm ban đầu
const fetchStations = async () => {
  loading.value = true;
  try {
    const stationsResponse = await axios.get(`${STATIONS_API_URL}?page=1&limit=100`);
    const stations = stationsResponse.data.stations || [];

    const initialData = stations.map(station => ({
      station_id: station.id,
      stationName: station.name,
      temperature: null,
      humidity: null,
      wind: null,
      rainfall: null,
      lastUpdated: null,
    }));
    tableData.value = initialData;
    console.log('Initial stations loaded:', tableData.value);

    stations.forEach(station => {
      socket.emit('requestInitialData', station.id);
    });
  } catch (error) {
    console.error('Fetch stations error:', error.response ? error.response.data : error.message);
    ElMessage.error({
      message: 'Không thể lấy danh sách trạm! Kiểm tra server hoặc API.',
      type: 'error',
      duration: 3000,
    });
  } finally {
    loading.value = false;
  }
};

// Lấy ngưỡng ban đầu
const fetchThresholds = async () => {
  try {
    const thresholdsResponse = await axios.get(THRESHOLDS_API_URL);
    thresholds.value = thresholdsResponse.data || [];
    console.log('Thresholds loaded:', thresholds.value);
  } catch (error) {
    console.error('Error fetching thresholds:', error.response ? error.response.data : error.message);
    ElMessage.error({
      message: 'Không thể lấy ngưỡng! Kiểm tra server hoặc API.',
      type: 'error',
      duration: 3000,
    });
  }
};

// Xử lý dữ liệu từ Socket.IO
const handleNewWeatherData = (weatherData) => {
  console.log('Received newWeatherData:', weatherData);
  if (!weatherData.station_id || !weatherData.parameter_type || weatherData.value === undefined) {
    console.error('Invalid weather data format:', weatherData);
    return;
  }

  let station = tableData.value.find((s) => s.station_id === weatherData.station_id);
  if (!station) {
    station = {
      station_id: weatherData.station_id,
      stationName: `Trạm ${weatherData.station_id}`,
      temperature: null,
      humidity: null,
      wind: null,
      rainfall: null,
      lastUpdated: weatherData.created_at || new Date().toISOString(),
    };
    tableData.value.push(station);
  }

  station[weatherData.parameter_type] = weatherData.value;
  station.lastUpdated = weatherData.created_at || new Date().toISOString();
  console.log('Updated station:', station);

  tableData.value = [...tableData.value];
};

// Kiểm tra xem trạm có cảnh báo không
const hasAlert = (stationId) => {
  const station = tableData.value.find((s) => s.station_id === stationId);
  if (!station) return false;

  return ['temperature', 'humidity', 'wind', 'rainfall'].some((param) => {
    const value = station[param];
    if (value === null || value === undefined) return false;
    const rule = getMatchingThreshold(param, value);
    return rule && rule.level !== 'Bình thường';
  });
};

// Lấy ngưỡng phù hợp
const getMatchingThreshold = (parameterType, value) => {
  let matchingRule = null;
  const levelsPriority = [
    'Bình thường',
    'Nhẹ',
    'Trung bình',
    'Nguy hiểm',
    'Rất nguy hiểm cấp 4',
    'Rất nguy hiểm cấp 5',
  ];

  for (const rule of thresholds.value) {
    if (rule.parameter_type !== parameterType || rule.combined_conditions) continue;

    let shouldMatch = false;
    if (rule.min_value !== null && rule.max_value !== null) {
      shouldMatch = value >= rule.min_value && value < rule.max_value;
    } else if (rule.min_value !== null && value >= rule.min_value) {
      shouldMatch = true;
    } else if (rule.max_value !== null && value < rule.max_value) {
      shouldMatch = true;
    }

    if (shouldMatch) {
      const currentLevelIndex = levelsPriority.indexOf(rule.level);
      if (!matchingRule || currentLevelIndex > levelsPriority.indexOf(matchingRule.level)) {
        matchingRule = rule;
      }
    }
  }

  if (!matchingRule && value > (thresholds.value.find(r => r.parameter_type === parameterType && r.max_value !== null)?.max_value || 0)) {
    const highestRule = thresholds.value.find(r => r.parameter_type === parameterType && r.level === 'Rất nguy hiểm cấp 5');
    if (highestRule) {
      matchingRule = { ...highestRule, message: `${parameterType} vượt ngưỡng nghiêm trọng` };
    }
  }

  return matchingRule;
};

// Lấy cấp độ cảnh báo
const getAlertLevel = (stationId, parameterType) => {
  const station = tableData.value.find((s) => s.station_id === stationId);
  if (!station || station[parameterType] === null || station[parameterType] === undefined) return null;

  const value = station[parameterType];
  const rule = getMatchingThreshold(parameterType, value);
  return rule ? rule.level : null;
};

// Lấy cấp độ cảnh báo cao nhất
const getCombinedAlertLevel = (stationId) => {
  const station = tableData.value.find((s) => s.station_id === stationId);
  if (!station) return null;

  const levelsPriority = [
    'Bình thường',
    'Nhẹ',
    'Trung bình',
    'Nguy hiểm',
    'Rất nguy hiểm cấp 4',
    'Rất nguy hiểm cấp 5',
  ];
  let highestLevel = 'Bình thường';

  for (const param of ['temperature', 'humidity', 'wind', 'rainfall']) {
    const value = station[param];
    if (value !== null && value !== undefined) {
      const rule = getMatchingThreshold(param, value);
      if (rule && rule.level) {
        const currentLevelIndex = levelsPriority.indexOf(rule.level);
        const highestLevelIndex = levelsPriority.indexOf(highestLevel);
        if (currentLevelIndex > highestLevelIndex) {
          highestLevel = rule.level;
        }
      }
    }
  }

  return highestLevel;
};

// Lấy style màu sắc
const getAlertStyle = (stationId, parameterType) => {
  const level = getAlertLevel(stationId, parameterType);
  const colorMap = {
    'Không xác định': '#808080',
    'Bình thường': '#000000', // Đổi thành đen
    'Nhẹ': '#3498DB',
    'Trung bình': '#F1C40F',
    'Nguy hiểm': '#E67E22',
    'Rất nguy hiểm cấp 4': '#E74C3C',
    'Rất nguy hiểm cấp 5': '#8E44AD',
  };
  return { color: colorMap[level] || '#808080' };
};

// Lấy style cho cột Trạng Thái Cảnh Báo
const getCombinedAlertStyle = (stationId) => {
  const level = getCombinedAlertLevel(stationId);
  const colorMap = {
    'Không xác định': '#808080',
    'Bình thường': '#000000', // Đổi thành đen
    'Nhẹ': '#3498DB',
    'Trung bình': '#F1C40F',
    'Nguy hiểm': '#E67E22',
    'Rất nguy hiểm cấp 4': '#E74C3C',
    'Rất nguy hiểm cấp 5': '#8E44AD',
  };
  return { color: colorMap[level] || '#808080' };
};

// Lớp cho hàng bảng
const tableRowClassName = ({ row }) => {
  const level = getCombinedAlertLevel(row.station_id);
  switch (level) {
    case 'Nhẹ':
      return 'light-alert-row';
    case 'Trung bình':
      return 'medium-alert-row';
    case 'Nguy hiểm':
      return 'danger-alert-row';
    case 'Rất nguy hiểm cấp 4':
      return 'severe-alert-row';
    case 'Rất nguy hiểm cấp 5':
      return 'extreme-alert-row';
    default:
      return '';
  }
};

// Lifecycle hooks
onMounted(() => {
  fetchStations();
  fetchThresholds();

  socket.on('connect', () => {
    console.log('Socket.IO connected');
    socketConnected.value = true;
  });

  socket.on('newWeatherData', handleNewWeatherData);
  socket.on('newAlert', (alert) => {
    console.log('New alert received:', alert);
    ElMessage.warning({
      message: `Cảnh báo mới: ${alert.message} (${alert.level})`,
      type: 'warning',
      duration: 5000,
    });
  });
  socket.on('disconnect', () => {
    console.log('Socket.IO disconnected');
    socketConnected.value = false;
  });
  socket.on('connect_error', (error) => {
    console.error('Socket.IO error:', error.message);
    socketConnected.value = false;
  });
});

onUnmounted(() => {
  socket.off('connect');
  socket.off('newWeatherData', handleNewWeatherData);
  socket.off('newAlert');
  socket.off('disconnect');
  socket.off('connect_error');
  socket.disconnect();
});
</script>

<style scoped>
.theo-doi-tram-container {
  padding: 20px;
  background-color: #ffffff;
  border: 1.5px solid #e0e0e0;
  border-radius: 5px;
  margin: 10px auto;
  max-width: 1200px;
  display: flex;
  flex-direction: column;
}

.header-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.table-title {
  font-size: 24px;
  color: #34495e;
  font-weight: bold;
  margin: 0;
}

.connection-status {
  font-size: 14px;
  font-weight: 500;
}

.custom-table {
  border-radius: 5px;
}

:deep(.el-table__header) {
  background-color: #409EFF !important;
}

:deep(.el-table__cell) {
  padding: 10px 0;
  font-size: 14px;
  color: #34495e;
}

.light-alert-row {
  background-color: rgba(52, 152, 219, 0.1) !important;
}

.medium-alert-row {
  background-color: rgba(241, 196, 15, 0.1) !important;
}

.danger-alert-row {
  background-color: rgba(230, 126, 34, 0.1) !important;
}

.severe-alert-row {
  background-color: rgba(231, 76, 60, 0.2) !important;
}

.extreme-alert-row {
  background-color: rgba(142, 68, 173, 0.2) !important;
}

.alert-station {
  color: #E74C3C !important;
  font-weight: bold;
}

:deep(.el-table__row:hover) {
  background-color: #e6f7ff;
}

.station-name {
  font-weight: 500;
  color: #2980b9;
}

:deep(.el-table th, .el-table td) {
  text-align: center;
}

.pagination-container {
  display: flex;
  justify-content: center;
  margin-top: 15px;
}

:deep(.el-pagination) {
  padding: 10px 0;
}

:deep(.el-pagination .el-pager li) {
  font-size: 14px;
  margin: 0 4px;
  border-radius: 3px;
  min-width: 28px;
  text-align: center;
}

:deep(.el-table__empty-text) {
  font-size: 15px;
  color: #7f8c8d;
}
</style>