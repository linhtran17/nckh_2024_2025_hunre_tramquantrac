<template>
  <div class="weather-charts-page">
    <!-- Tiêu đề và Filter -->
    <div class="header-section">
      <h1 class="page-title">Biểu đồ Dữ liệu Thời tiết</h1>
      <div class="filter-section">
        <el-select
          v-model="selectedStation"
          placeholder="Chọn trạm"
          @change="fetchDataByRange"
          style="width: 200px; margin-right: 10px;"
        >
          <el-option
            v-for="station in stations"
            :key="station.id"
            :label="station.name"
            :value="station.id"
          ></el-option>
        </el-select>
        <el-select
          v-model="selectedRange"
          placeholder="Chọn khoảng thời gian"
          @change="fetchDataByRange"
          style="width: 200px;"
        >
          <el-option label="Ngày hiện tại" value="current"></el-option>
          <el-option label="7 ngày trước" value="last7days"></el-option>
          <el-option label="30 ngày trước" value="last30days"></el-option>
        </el-select>
      </div>
    </div>

    <!-- Container cho 4 biểu đồ -->
    <div class="charts-container">
      <div v-for="param in parameters" :key="param" class="chart-item">
        <h2 class="chart-title">{{ parameterNameMap[param] || param }}</h2>
        <div v-if="chartData[param].length === 0" class="no-data-message">
          Không có dữ liệu cho {{ parameterNameMap[param] || param }}
          trong khoảng {{ rangeNameMap[selectedRange] }}
          tại {{ selectedStationName }}
        </div>
        <div v-else class="chart-wrapper">
          <canvas :ref="el => chartRefs[param] = el"></canvas>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue';
import { io } from 'socket.io-client';
import Chart from 'chart.js/auto';
import axios from 'axios';
import moment from 'moment-timezone';

// Constants
const STATIONS_API_URL = 'http://localhost:3005/api/stations';
const WEATHER_RANGE_API_URL = 'http://localhost:3005/api/weather/filter-by-range';
const socket = io('http://localhost:3005', {
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  transports: ['websocket', 'polling'],
});

// Danh sách thông số
const parameters = ['temperature', 'humidity', 'rainfall', 'wind'];

// Dữ liệu và state
const stations = ref([]); // Danh sách trạm
const selectedStation = ref(null); // Trạm được chọn
const selectedStationName = ref(''); // Tên trạm được chọn
const selectedRange = ref('current'); // Mặc định là ngày hiện tại
const chartData = ref({
  temperature: [],
  humidity: [],
  rainfall: [],
  wind: [],
});
const chartInstances = ref({
  temperature: null,
  humidity: null,
  rainfall: null,
  wind: null,
});
const chartRefs = ref({});

// Mapping tên thông số và khoảng thời gian
const parameterNameMap = {
  temperature: 'Nhiệt độ (°C)',
  humidity: 'Độ ẩm (%)',
  rainfall: 'Lượng mưa (mm/h)',
  wind: 'Tốc độ gió (m/s)',
};
const rangeNameMap = {
  current: 'ngày hiện tại',
  last7days: '7 ngày trước',
  last30days: '30 ngày trước',
};

// Lấy danh sách trạm
const fetchStations = async () => {
  try {
    const response = await axios.get(STATIONS_API_URL);
    stations.value = response.data;
    if (stations.value.length > 0) {
      selectedStation.value = stations.value[0].id; // Chọn trạm đầu tiên mặc định
      selectedStationName.value = stations.value[0].name;
      await fetchDataByRange(); // Lấy dữ liệu mặc định khi tải trang
    }
  } catch (error) {
    console.error('Error fetching stations:', error.response?.data || error.message);
    stations.value = [];
  }
};

// Lấy dữ liệu theo trạm và khoảng thời gian
const fetchDataByRange = async () => {
  if (!selectedStation.value || !selectedRange.value) return;

  // Reset hoàn toàn dữ liệu và biểu đồ trước khi gọi API
  for (const param of parameters) {
    chartData.value[param] = [];
    if (chartInstances.value[param]) {
      chartInstances.value[param].destroy();
      chartInstances.value[param] = null;
    }
  }

  // Cập nhật tên trạm
  const station = stations.value.find(s => s.id === selectedStation.value);
  selectedStationName.value = station ? station.name : '';

  // Gọi API đồng thời cho tất cả thông số
  try {
    const requests = parameters.map(param =>
      axios.get(WEATHER_RANGE_API_URL, {
        params: {
          station_id: selectedStation.value,
          range: selectedRange.value,
          parameter_type: param,
        },
      })
    );

    const responses = await Promise.all(requests);

    responses.forEach((response, index) => {
      const param = parameters[index];
      console.log(`Data for ${param} (${selectedRange.value}):`, response.data); // Log dữ liệu từ API
      const data = response.data.map(item => ({
        time: moment(item.created_at).tz('Asia/Ho_Chi_Minh').format('YYYY-MM-DD HH:mm'),
        value: item.value,
      }));
      chartData.value[param] = data;
      updateChart(param);
    });
  } catch (error) {
    console.error('Error fetching data:', error.response?.data || error.message);
    for (const param of parameters) {
      chartData.value[param] = [];
    }
  }
};

// Cập nhật biểu đồ
const updateChart = (param) => {
  if (chartData.value[param].length === 0) {
    if (chartInstances.value[param]) {
      chartInstances.value[param].destroy();
      chartInstances.value[param] = null;
    }
    return;
  }

  const canvas = chartRefs.value[param];
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  if (chartInstances.value[param]) {
    chartInstances.value[param].destroy();
  }

  chartInstances.value[param] = new Chart(ctx, {
    type: 'line',
    data: {
      labels: chartData.value[param].map(data => data.time),
      datasets: [
        {
          label: parameterNameMap[param] || param,
          data: chartData.value[param].map(data => data.value),
          borderColor: getColorForParameter(param),
          backgroundColor: getColorForParameter(param, 0.2),
          fill: false,
          tension: 0.1,
          pointRadius: 4,
          pointBackgroundColor: getColorForParameter(param),
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          title: {
            display: true,
            text: 'Ngày (YYYY-MM-DD HH:mm)',
          },
          ticks: {
            maxTicksLimit: 10,
          },
        },
        y: {
          title: {
            display: true,
            text: parameterNameMap[param] || param,
          },
          beginAtZero: true,
        },
      },
      plugins: {
        legend: {
          display: true,
        },
        tooltip: {
          callbacks: {
            label: context => `${context.raw} ${param === 'temperature' ? '°C' : param === 'humidity' ? '%' : param === 'rainfall' ? 'mm/h' : 'm/s'}`,
          },
        },
      },
    },
  });
};

// Hàm lấy màu cho từng thông số
const getColorForParameter = (param, opacity = 1) => {
  const colors = {
    temperature: `rgba(255, 99, 132, ${opacity})`,
    humidity: `rgba(54, 162, 235, ${opacity})`,
    rainfall: `rgba(75, 192, 192, ${opacity})`,
    wind: `rgba(255, 206, 86, ${opacity})`,
  };
  return colors[param] || `rgba(0, 0, 0, ${opacity})`;
};

// Xử lý dữ liệu realtime từ Socket.IO
const handleNewWeatherData = (weatherData) => {
  if (
    weatherData.station_id === selectedStation.value &&
    parameters.includes(weatherData.parameter_type) &&
    selectedRange.value === 'current' // Chỉ cập nhật realtime cho ngày hiện tại
  ) {
    const param = weatherData.parameter_type;
    const newDataPoint = {
      time: moment(weatherData.created_at).tz('Asia/Ho_Chi_Minh').format('YYYY-MM-DD HH:mm'),
      value: weatherData.value,
    };
    console.log('New realtime data:', newDataPoint); // Log dữ liệu realtime

    chartData.value[param].push(newDataPoint);
    chartData.value[param].sort((a, b) =>
      moment(a.time, 'YYYY-MM-DD HH:mm').diff(moment(b.time, 'YYYY-MM-DD HH:mm'))
    );
    updateChart(param);
  }
};

// Watch để tự động fetch khi thay đổi trạm hoặc khoảng thời gian
watch([selectedStation, selectedRange], async () => {
  await fetchDataByRange();
});

// Lifecycle hooks
onMounted(() => {
  fetchStations(); // Lấy danh sách trạm khi component được mount

  socket.on('connect', () => {
    console.log('Socket.IO connected');
  });

  socket.on('newWeatherData', handleNewWeatherData);

  socket.on('disconnect', () => {
    console.log('Socket.IO disconnected');
  });

  socket.on('connect_error', (error) => {
    console.error('Socket.IO connection error:', error.message);
  });
});

onUnmounted(() => {
  socket.off('connect');
  socket.off('newWeatherData', handleNewWeatherData);
  socket.off('disconnect');
  socket.off('connect_error');
  socket.disconnect();

  for (const param of parameters) {
    if (chartInstances.value[param]) {
      chartInstances.value[param].destroy();
    }
  }
});
</script>

<style scoped>
.weather-charts-page {
  padding: 20px;
  background-color: #f5f5f5;
  min-height: 100vh;
}

.header-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  background-color: #ffffff;
  padding: 15px;
  border-radius: 5px;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
}

.page-title {
  font-size: 28px;
  color: #2c3e50;
  font-weight: 600;
  margin: 0;
}

.filter-section {
  display: flex;
  align-items: center;
  gap: 10px;
}

.charts-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(500px, 1fr));
  gap: 20px;
}

.chart-item {
  background-color: #ffffff;
  padding: 15px;
  border: 1px solid #e0e0e0;
  border-radius: 5px;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
}

.chart-title {
  font-size: 20px;
  color: #2c3e50;
  font-weight: 500;
  margin-bottom: 10px;
  text-align: center;
}

.chart-wrapper {
  position: relative;
  height: 300px;
  width: 100%;
}

.no-data-message {
  text-align: center;
  color: #888;
  font-size: 16px;
  padding: 20px;
}
</style>