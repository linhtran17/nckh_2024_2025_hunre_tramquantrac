<template>
  <div class="home-container">
    <!-- Header Section -->
  
    <!-- Thống kê nhanh -->
    <div class="stats-section">
      <div class="stat-card">
        <h3>Số trạm hoạt động</h3>
        <p class="stat-value">{{ activeStations }}</p>
      </div>
      <div class="stat-card">
        <h3>Số cảnh báo hiện tại</h3>
        <p class="stat-value">{{ currentAlerts }}</p>
      </div>
      <div class="stat-card">
        <h3>Dữ liệu mới nhất</h3>
        <p class="stat-value">{{ latestUpdate ? moment(latestUpdate).format('YYYY-MM-DD HH:mm:ss') : 'N/A' }}</p>
      </div>
    </div>

    <!-- Nút dẫn hướng -->
    <div class="nav-buttons">
      <el-button type="primary" @click="$router.push('/theo-doi-tram')">Theo dõi Trạm</el-button>
      <el-button type="primary" @click="$router.push('/thong-ke')">Thống Kê</el-button>
      <el-button type="primary" @click="$router.push('/map')">Bản đồ</el-button>
      <el-button type="primary" @click="$router.push('/quan-ly-data')">Quản Lý Dữ Liệu</el-button>
    </div>

    <!-- Phần minh họa (bản đồ hoặc biểu đồ) -->
    <div class="visual-section">
      <h3>Tổng quan nhiệt độ trung bình</h3>
      <div id="chart" style="width: 100%; height: 300px;"></div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from "vue";
import { ElMessage } from "element-plus";
import axios from "axios";
import moment from "moment-timezone";
import { io } from "socket.io-client";
import * as echarts from "echarts";

const socket = io("http://localhost:3005", {
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});

const activeStations = ref(0);
const currentAlerts = ref(0);
const latestUpdate = ref(null);
let chartInstance = null;

// Lấy dữ liệu ban đầu
const fetchInitialData = async () => {
  try {
    const stationsResponse = await axios.get("http://localhost:3005/api/stations?page=1&limit=100");
    activeStations.value = stationsResponse.data.stations.length || 0;

    const alertsResponse = await axios.get("http://localhost:3005/api/alerts");
    currentAlerts.value = alertsResponse.data.length || 0;

    const weatherResponse = await axios.get("http://localhost:3005/api/weather/latest");
    latestUpdate.value = weatherResponse.data[0]?.created_at || null;

    initChart();
  } catch (error) {
    console.error("Lỗi khi lấy dữ liệu ban đầu:", error.message);
    ElMessage.error("Không thể lấy dữ liệu ban đầu!");
  }
};

// Khởi tạo biểu đồ
const initChart = () => {
  const chartDom = document.getElementById("chart");
  if (chartInstance) chartInstance.dispose();
  chartInstance = echarts.init(chartDom);

  const option = {
    title: { text: "Nhiệt độ trung bình (°C)" },
    xAxis: { type: "category", data: ["Trạm 1", "Trạm 2", "Trạm 3"] },
    yAxis: { type: "value" },
    series: [{ name: "Nhiệt độ", type: "bar", data: [25, 27, 23] }],
    color: ["#2e7d32"],
  };

  chartInstance.setOption(option);
  window.addEventListener("resize", () => chartInstance.resize());
};

// Cập nhật dữ liệu thời gian thực
const handleNewWeatherData = (weatherData) => {
  latestUpdate.value = weatherData.created_at;
  // Cập nhật biểu đồ (giả lập)
  chartInstance.setOption({
    series: [{ data: [Math.random() * 10 + 20, Math.random() * 10 + 20, Math.random() * 10 + 20] }],
  });
};

const handleNewAlert = (alert) => {
  currentAlerts.value += 1;
};

// Lifecycle hooks
onMounted(() => {
  fetchInitialData();
  socket.on("connect", () => console.log("Socket.IO connected"));
  socket.on("newWeatherData", handleNewWeatherData);
  socket.on("newAlert", handleNewAlert);
});

onUnmounted(() => {
  socket.off("connect");
  socket.off("newWeatherData", handleNewWeatherData);
  socket.off("newAlert", handleNewAlert);
  socket.disconnect();
  if (chartInstance) chartInstance.dispose();
});
</script>

<style scoped>
.home-container {
  padding: 20px;
  background-color: #f5f7fa;
  min-height: 100vh;
  max-width: 1200px;
  margin: 0 auto;
  border-radius: 5px;
}

.header-section {
  display: flex;
  align-items: center;
  margin-bottom: 30px;
  padding: 20px;
  background-color: #ffffff;
  border: 1px solid #e0e0e0;
  border-radius: 5px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.logo {
  margin-right: 20px;
}

.title-section {
  flex-grow: 1;
}

.main-title {
  font-size: 28px;
  color: #2c3e50;
  font-weight: 600;
  margin: 0;
}

.subtitle {
  font-size: 16px;
  color: #7f8c8d;
  margin: 5px 0 0;
}

.stats-section {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.stat-card {
  background-color: #ffffff;
  padding: 20px;
  border: 1px solid #e0e0e0;
  border-radius: 5px;
  text-align: center;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.stat-card h3 {
  font-size: 16px;
  color: #2c3e50;
  margin: 0 0 10px;
}

.stat-value {
  font-size: 24px;
  font-weight: 600;
  color: #2e7d32;
  margin: 0;
}

.nav-buttons {
  display: flex;
  gap: 15px;
  margin-bottom: 30px;
  flex-wrap: wrap;
}

.visual-section {
  background-color: #ffffff;
  padding: 20px;
  border: 1px solid #e0e0e0;
  border-radius: 5px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.visual-section h3 {
  font-size: 18px;
  color: #2c3e50;
  margin-bottom: 15px;
}
</style>