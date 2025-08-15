<template>
  <div class="p-4">
    <!-- Tiêu đề -->
    <h2 class="text-2xl font-bold mb-4 text-gray-800">Bản đồ Trạm Đo Thời Tiết</h2>

    <!-- Bản đồ -->
    <div id="map" class="rounded shadow-lg border border-gray-300" style="height: 500px; width: 100%"></div>

    <!-- Ghi chú màu -->
    <div class="mt-6">
      <h3 class="text-lg font-semibold mb-3 text-gray-700">Thang rủi ro thời tiết</h3>
      <!-- <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <div v-for="level in riskLevels" :key="level.name" class="flex items-center p-3 bg-gray-50 rounded-lg shadow-sm">
          <div class="w-6 h-6 mr-3 rounded-full" :style="{ backgroundColor: level.color }"></div>
          <span class="text-sm font-medium text-gray-700">{{ level.name }}</span>
        </div>
      </div> -->
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue';
import L from 'leaflet';
import axios from 'axios';
import { ElMessage } from 'element-plus';
import { io } from 'socket.io-client';

// Khởi tạo Socket.IO
const socket = io('http://localhost:3005', {
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});

// Khai báo các biến reactive
const tableData = ref([]);
const thresholds = ref([]);
const alerts = ref({});
const map = ref(null);
const loading = ref(false);
const connectionFailed = ref(false);

// Định nghĩa các endpoint API
const STATIONS_API_URL = 'http://localhost:3005/api/stations';
const PARAMETERS_API_URL = 'http://localhost:3005/api/station-parameters';
const WEATHER_API_URL = 'http://localhost:3005/api/weather/latest';
const THRESHOLDS_API_URL = 'http://localhost:3005/api/thresholds';

// Định nghĩa bảng mapping hiển thị
const displayMapping = {
  rainfall: 'Lượng mưa (mm/h)',
  wind: 'Tốc độ gió (m/s)',
  temperature: 'Nhiệt độ (°C)',
  humidity: 'Độ ẩm (%)',
};

// Danh sách mức độ rủi ro và màu sắc
const riskLevels = [
  { name: 'Không xác định', color: '#808080' },
  { name: 'Bình thường', color: '#000000' }, // Đổi thành đen
  { name: 'Nhẹ', color: '#3498DB' },
  { name: 'Trung bình', color: '#F1C40F' },
  { name: 'Nguy hiểm', color: '#E67E22' },
  { name: 'Rất nguy hiểm cấp 4', color: '#E74C3C' },
  { name: 'Rất nguy hiểm cấp 5', color: '#8E44AD' },
];

// Tải dữ liệu ban đầu
const fetchInitialData = async () => {
  loading.value = true;
  try {
    const stationsResponse = await axios.get(`${STATIONS_API_URL}?page=1&limit=100`);
    const stations = stationsResponse.data.stations || [];
    if (stations.length === 0) {
      ElMessage.warning({
        message: 'Không có dữ liệu trạm nào được tải.',
        type: 'warning',
        duration: 3000,
      });
    }

    const thresholdsResponse = await axios.get(THRESHOLDS_API_URL);
    thresholds.value = thresholdsResponse.data || [];
    console.log('Thresholds loaded:', thresholds.value);

    const data = [];
    for (const station of stations) {
      const stationData = {
        station_id: station.id,
        stationName: station.name,
        latitude: station.latitude || 21.0352,
        longitude: station.longitude || 105.7989,
        temperature: null,
        humidity: null,
        wind: null,
        rainfall: null,
        units: { temperature: '°C', humidity: '%', wind: 'm/s', rainfall: 'mm/h' },
      };

      const paramsResponse = await axios.get(`${PARAMETERS_API_URL}?station_id=${station.id}`);
      const parameters = paramsResponse.data.filter((param) =>
        ['temperature', 'humidity', 'wind', 'rainfall'].includes(param.parameter_type)
      );

      for (const param of parameters) {
        try {
          const weatherResponse = await axios.get(
            `${WEATHER_API_URL}?station_id=${station.id}&parameter_type=${param.parameter_type}`
          );
          const weatherData = weatherResponse.data;
          if (weatherData && weatherData.value !== undefined) {
            stationData[param.parameter_type] = weatherData.value;
            stationData[`${param.parameter_type}_time`] = weatherData.created_at;
          }
        } catch (error) {
          console.warn(
            `Không có dữ liệu mới cho station ${station.id}, param ${param.parameter_type}:`,
            error.response ? error.response.data : error.message
          );
        }
      }

      data.push(stationData);
    }

    tableData.value = data;
    console.log('Initial table data:', tableData.value);
  } catch (error) {
    console.error('Fetch error:', error.response ? error.response.data : error.message);
    ElMessage.error({
      message: 'Không thể lấy dữ liệu! Kiểm tra server hoặc API.',
      type: 'error',
      duration: 3000,
    });
  } finally {
    loading.value = false;
  }
};

// Lắng nghe dữ liệu thời tiết mới từ Socket.IO
const handleNewWeatherData = (weatherData) => {
  console.log('Received newWeatherData:', weatherData);
  let station = tableData.value.find((s) => s.station_id === weatherData.station_id);

  if (!station) {
    station = {
      station_id: weatherData.station_id,
      stationName: `Trạm ${weatherData.station_id}`,
      latitude: 21.0352,
      longitude: 105.7989,
      temperature: null,
      humidity: null,
      wind: null,
      rainfall: null,
      units: { temperature: '°C', humidity: '%', wind: 'm/s', rainfall: 'mm/h' },
    };
    tableData.value.push(station);
  }

  if (weatherData.parameter_type) {
    station[weatherData.parameter_type] = weatherData.value;
    station[`${weatherData.parameter_type}_time`] = weatherData.created_at;
    tableData.value = [...tableData.value];
    updateMarkers();
  }
};

// Khởi tạo bản đồ
const initMap = async () => {
  await nextTick();
  const mapElement = document.getElementById('map');
  if (!mapElement) {
    console.error('Map container not found');
    ElMessage.error({
      message: 'Không tìm thấy container bản đồ!',
      type: 'error',
      duration: 3000,
    });
    return;
  }

  const defaultStation = tableData.value[0] || { latitude: 21.0352, longitude: 105.7989 };
  map.value = L.map('map').setView([defaultStation.latitude, defaultStation.longitude], 12);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
  }).addTo(map.value);

  updateMarkers();
};

// Lấy ngưỡng phù hợp
const getMatchingThreshold = (parameterType, value) => {
  for (const rule of thresholds.value) {
    if (rule.parameter_type !== parameterType || rule.combined_conditions) continue;
    if (
      rule.level === 'Bình thường' &&
      rule.min_value !== null &&
      rule.max_value !== null &&
      value >= rule.min_value &&
      value <= rule.max_value
    ) {
      return rule;
    }
  }

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

  return matchingRule || { level: 'Không xác định' };
};

// Lấy cấp độ cảnh báo
const getAlertLevel = (stationId, parameterType) => {
  const alertKey = `${stationId}_${parameterType}`;
  const alert = alerts.value[alertKey];
  if (alert && alert.level) {
    return alert.level;
  }

  const station = tableData.value.find((s) => s.station_id === stationId);
  if (!station || station[parameterType] === null) return 'Không xác định';

  const value = station[parameterType];
  const rule = getMatchingThreshold(parameterType, value);
  return rule.level;
};

// Lấy mức rủi ro cao nhất
const getCombinedAlertLevel = (stationId) => {
  const station = tableData.value.find((s) => s.station_id === stationId);
  if (!station) return 'Không xác định';

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
    const level = getAlertLevel(stationId, param);
    const currentLevelIndex = levelsPriority.indexOf(level);
    const highestLevelIndex = levelsPriority.indexOf(highestLevel);
    if (currentLevelIndex > highestLevelIndex) {
      highestLevel = level;
    }
  }

  const hasData = ['temperature', 'humidity', 'wind', 'rainfall'].some(
    (param) => station[param] !== null
  );
  if (!hasData && !Object.values(alerts.value).some((a) => a.station_id === stationId)) {
    return 'Không xác định';
  }

  return highestLevel;
};

// Tạo icon marker
const getMarkerIcon = (riskLevel) => {
  const colors = {
    'Không xác định': '#808080',
    'Bình thường': '#000000', // Đổi thành đen
    'Nhẹ': '#3498DB',
    'Trung bình': '#F1C40F',
    'Nguy hiểm': '#E67E22',
    'Rất nguy hiểm cấp 4': '#E74C3C',
    'Rất nguy hiểm cấp 5': '#8E44AD',
  };

  const color = colors[riskLevel] || '#808080';

  const iconSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
      <path fill="${color}" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 010-5 2.5 2.5 0 010 5z"/>
    </svg>
  `;

  return L.divIcon({
    html: iconSvg,
    className: 'custom-marker',
    iconSize: [24, 24],
    iconAnchor: [12, 24],
    popupAnchor: [0, -24],
  });
};

// Cập nhật marker
const updateMarkers = () => {
  if (!map.value) return;

  map.value.eachLayer((layer) => {
    if (layer instanceof L.Marker) map.value.removeLayer(layer);
  });

  tableData.value.forEach((station) => {
    const coordinates = [station.latitude, station.longitude];
    const riskLevel = getCombinedAlertLevel(station.station_id);
    const marker = L.marker(coordinates, { icon: getMarkerIcon(riskLevel) }).addTo(map.value);

    let popupContent = `
      <div class="flex items-center">
        <span class="icon w-4 h-4 mr-2 rounded-full" style="background-color: ${getColorForLevel(riskLevel)}"></span>
        <b>${station.stationName}</b>
      </div>
    `;
    ['temperature', 'humidity', 'wind', 'rainfall'].forEach((param) => {
      const value = station[param] !== null ? station[param].toFixed(1) : '-';
      popupContent += `${displayMapping[param]}: ${value} ${station.units[param]}<br>`;
    });
    popupContent += `Thời gian: ${
      station.temperature_time
        ? new Date(station.temperature_time).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })
        : '-'
    }<br>`;
    popupContent += `Mức rủi ro: ${riskLevel}`;

    marker.bindPopup(popupContent);
  });
};

// Hàm lấy màu theo mức độ
const getColorForLevel = (level) => {
  const colors = {
    'Không xác định': '#808080',
    'Bình thường': '#000000', // Đổi thành đen
    'Nhẹ': '#3498DB',
    'Trung bình': '#F1C40F',
    'Nguy hiểm': '#E67E22',
    'Rất nguy hiểm cấp 4': '#E74C3C',
    'Rất nguy hiểm cấp 5': '#8E44AD',
  };
  return colors[level] || '#808080';
};

// Lifecycle hooks
onMounted(async () => {
  let reconnectAttempts = 0;
  const maxAttempts = 5;

  socket.on('connect', () => {
    console.log('Socket.IO connected');
    reconnectAttempts = 0;
    ElMessage.success({
      message: 'Đã kết nối với server Socket.IO!',
      type: 'success',
      duration: 3000,
    });
  });

  socket.on('connect_error', (error) => {
    console.error('Socket.IO connection error:', error);
    reconnectAttempts++;
    if (reconnectAttempts >= maxAttempts) {
      connectionFailed.value = true;
      ElMessage.error({
        message: 'Không thể kết nối với server Socket.IO sau nhiều lần thử lại!',
        type: 'error',
        duration: 3000,
      });
    }
  });

  socket.on('reconnect_attempt', (attempt) => {
    console.log(`Reconnection attempt ${attempt} of ${maxAttempts}`);
  });

  socket.on('reconnect_failed', () => {
    console.error('Socket.IO reconnection failed');
    connectionFailed.value = true;
    ElMessage.error({
      message: 'Không thể kết nối lại với server Socket.IO!',
      type: 'error',
      duration: 3000,
    });
  });

  try {
    await fetchInitialData();
    await initMap();
  } catch (error) {
    console.error('Lỗi trong quá trình khởi tạo:', error);
    ElMessage.error({
      message: 'Lỗi khi khởi tạo bản đồ hoặc tải dữ liệu!',
      type: 'error',
      duration: 3000,
    });
  }

  socket.on('newWeatherData', handleNewWeatherData);
  socket.on('newAlert', (alert) => {
    console.log('New alert received:', alert);
    const key = `${alert.station_id}_${alert.type}`;
    alerts.value[key] = alert;
    ElMessage.warning({
      message: `Cảnh báo mới: ${alert.message} (${alert.level})`,
      type: 'warning',
      duration: 5000,
    });
    updateMarkers();
  });
  socket.on('updateParameters', async ({ station_id }) => {
    console.log('Parameters updated for station:', station_id);
    try {
      const paramsResponse = await axios.get(`${PARAMETERS_API_URL}?station_id=${station_id}`);
      const parameters = paramsResponse.data.filter((param) =>
        ['temperature', 'humidity', 'wind', 'rainfall'].includes(param.parameter_type)
      );
      let station = tableData.value.find((s) => s.station_id === station_id);
      if (station) {
        for (const param of parameters) {
          try {
            const weatherResponse = await axios.get(
              `${WEATHER_API_URL}?station_id=${station_id}&parameter_type=${param.parameter_type}`
            );
            if (weatherResponse.data && weatherResponse.data.value !== undefined) {
              station[param.parameter_type] = weatherResponse.data.value;
              station[`${param.parameter_type}_time`] = weatherResponse.data.created_at;
            }
          } catch (error) {
            console.warn(`Không thể cập nhật ${param.parameter_type} cho station ${station_id}`);
          }
        }
        tableData.value = [...tableData.value];
        updateMarkers();
      }
    } catch (error) {
      console.error('Lỗi khi cập nhật thông số trạm:', error);
    }
  });
  socket.on('disconnect', () => {
    console.log('Socket.IO disconnected');
    ElMessage.warning({
      message: 'Mất kết nối với server Socket.IO!',
      type: 'warning',
      duration: 3000,
    });
  });
});

onUnmounted(() => {
  socket.off('connect');
  socket.off('newWeatherData');
  socket.off('newAlert');
  socket.off('updateParameters');
  socket.off('disconnect');
  socket.off('connect_error');
  socket.off('reconnect_attempt');
  socket.off('reconnect_failed');
  socket.disconnect();
  if (map.value) {
    map.value.remove();
  }
});

// Theo dõi thay đổi để cập nhật marker
watch([tableData, thresholds, alerts], () => {
  if (map.value) {
    updateMarkers();
  }
});
</script>

<style scoped>
@import 'leaflet/dist/leaflet.css';

.icon {
  display: inline-block;
  width: 12px;
  height: 12px;
}

#map {
  z-index: 0;
}

.custom-marker {
  background: none !important;
  border: none !important;
}

.grid-cols-5 > div {
  transition: transform 0.2s ease;
}

.grid-cols-5 > div:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}
</style>