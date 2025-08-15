<template>
    <div class="flex h-screen">
      <!-- Sidebar -->
      <el-menu
        :default-active="activeParam"
        class="w-64 h-full bg-gray-50 border-r"
        @select="handleParamSelect"
      >
        <el-menu-item index="temperature">
          <span>Nhiệt độ (°C)</span>
        </el-menu-item>
        <el-menu-item index="humidity">
          <span>Độ ẩm (%)</span>
        </el-menu-item>
        <el-menu-item index="rain">
          <span>Lượng mưa (mm/h)</span>
        </el-menu-item>
        <el-menu-item index="wind">
          <span>Gió (m/s)</span>
        </el-menu-item>
      </el-menu>
  
      <!-- Nội dung chính -->
      <div class="flex-1 p-4 overflow-auto">
        <h2 class="text-2xl font-bold mb-4">Quản lý thông số: {{ paramLabels[activeParam] }}</h2>
  
        <!-- Khu vực cài đặt ngưỡng -->
        <div class="mb-6">
          <h3 class="text-lg font-semibold mb-2">Cài đặt ngưỡng cho {{ paramLabels[activeParam] }}</h3>
          <el-row :gutter="20">
            <el-col :span="8">
              <el-form label-position="top">
                <el-form-item label="Ngưỡng tối đa">
                  <el-input-number v-model="thresholds[activeParam].max" :min="0" :step="0.1" />
                </el-form-item>
              </el-form>
            </el-col>
            <el-col :span="8">
              <el-form label-position="top">
                <el-form-item label="Ngưỡng tối thiểu">
                  <el-input-number v-model="thresholds[activeParam].min" :min="0" :step="0.1" />
                </el-form-item>
              </el-form>
            </el-col>
            <el-col :span="8">
              <el-button type="primary" @click="saveThresholds" class="mt-6">Lưu cài đặt</el-button>
            </el-col>
          </el-row>
        </div>
  
        <!-- Thông số phần cứng -->
        <div class="mb-6">
          <h3 class="text-lg font-semibold mb-2">Thông số phần cứng hiện tại</h3>
          <el-row :gutter="20">
            <el-col :span="8">
              <el-card shadow="hover">
                <template #header>
                  <span>Giá trị tối đa</span>
                </template>
                <div class="text-xl">{{ hardwareParams[activeParam]?.maxValue ?? '-' }}</div>
              </el-card>
            </el-col>
            <el-col :span="8">
              <el-card shadow="hover">
                <template #header>
                  <span>Giá trị tối thiểu</span>
                </template>
                <div class="text-xl">{{ hardwareParams[activeParam]?.minValue ?? '-' }}</div>
              </el-card>
            </el-col>
            <el-col :span="8">
              <el-card shadow="hover">
                <template #header>
                  <span>Trạng thái cảm biến</span>
                </template>
                <div class="text-xl">{{ hardwareParams[activeParam]?.status ?? 'Không xác định' }}</div>
              </el-card>
            </el-col>
          </el-row>
        </div>
  
        <!-- Bảng dữ liệu -->
        <el-table :data="filteredData" border stripe style="width: 100%; max-width: none;">
          <el-table-column prop="id" label="ID" width="80" />
          <el-table-column prop="name" label="Tên trạm" min-width="200" />
          <el-table-column prop="location" label="Vị trí" min-width="300" />
          <el-table-column :label="paramLabels[activeParam]" min-width="150">
            <template #default="scope">
              <span :style="getColorStyle(activeParam, scope.row.weatherData[0]?.[activeParam])">
                {{ scope.row.weatherData[0]?.[activeParam] ?? '-' }}
              </span>
            </template>
          </el-table-column>
          <el-table-column label="Thời gian cập nhật" min-width="200">
            <template #default="scope">
              {{ scope.row.weatherData[0]?.created_at ? formatDate(scope.row.weatherData[0].created_at) : '-' }}
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>
  </template>
  
  <script setup>
  import { ref, onMounted, onUnmounted, computed } from 'vue';
  import { ElMessage } from 'element-plus';
  import { getAllStations } from '../api/tramApi';
  import io from 'socket.io-client';
  import axios from 'axios';
  
  const stations = ref([]);
  const activeParam = ref('temperature'); // Thông số mặc định
  const socket = io('http://localhost:3005', { reconnection: true });
  
  // Nhãn cho các thông số
  const paramLabels = {
    temperature: 'Nhiệt độ (°C)',
    humidity: 'Độ ẩm (%)',
    rain: 'Lượng mưa (mm/h)',
    wind: 'Gió (m/s)',
  };
  
  // Ngưỡng cài đặt (có thể chỉnh sửa)
  const thresholds = ref({
    temperature: { min: 15, max: 38 },
    humidity: { min: 40, max: 90 },
    rain: { min: 10, max: 50 },
    wind: { min: 8, max: 13.9 },
  });
  
  // Thông số phần cứng (lấy từ backend/phần cứng)
  const hardwareParams = ref({
    temperature: { maxValue: null, minValue: null, status: null },
    humidity: { maxValue: null, minValue: null, status: null },
    rain: { maxValue: null, minValue: null, status: null },
    wind: { maxValue: null, minValue: null, status: null },
  });
  
  // Ngưỡng màu cho các thông số (dựa trên TongQuanTram.vue)
  const thresholdsDisplay = {
    temperature: [
      { min: 38, level: 'Nguy hiểm', color: [255, 10, 0] },
      { min: 35, max: 38, level: 'Trung bình', color: [255, 155, 0] },
      { max: 15, level: 'Nguy hiểm', color: [255, 10, 0] },
    ],
    humidity: [
      { max: 40, level: 'Trung bình', color: [255, 155, 0] },
      { min: 90, condition: (h, t) => h > 90 && t > 32, level: 'Nguy hiểm', color: [255, 10, 0] },
    ],
    rain: [
      { min: 50, level: 'Nguy hiểm', color: [255, 10, 0] },
      { min: 30, max: 50, level: 'Trung bình', color: [255, 155, 0] },
      { min: 10, max: 30, level: 'Nhẹ', color: [250, 245, 140] },
    ],
    wind: [
      { min: 13.9, level: 'Nguy hiểm', color: [255, 10, 0] },
      { min: 8.0, max: 13.8, level: 'Trung bình', color: [255, 155, 0] },
    ],
  };
  
  // Dữ liệu hiển thị trong bảng (lọc theo thông số)
  const filteredData = computed(() => {
    return stations.value.map(station => ({
      ...station,
      weatherData: station.weatherData || [],
    }));
  });
  
  const formatDate = (dateStr) => new Date(dateStr).toLocaleString('vi-VN');
  
  const getColorStyle = (type, value, temp = null) => {
    if (value === undefined || value === null) return 'color: rgb(175, 225, 255)';
    const threshold = thresholdsDisplay[type].find(t =>
      ('min' in t && value >= t.min && (!('max' in t) || value <= t.max)) ||
      ('max' in t && value <= t.max && !('min' in t)) ||
      ('condition' in t && t.condition(value, temp))
    );
    return threshold ? `color: rgb(${threshold.color.join(',')})` : 'color: rgb(175, 225, 255)';
  };
  
  const handleParamSelect = (index) => {
    activeParam.value = index;
    fetchHardwareParams(); // Lấy thông số phần cứng khi chuyển thông số
  };
  
  // Lấy thông số phần cứng từ backend
  const fetchHardwareParams = async () => {
    try {
      const res = await axios.get(`http://localhost:3005/api/hardware/settings?param=${activeParam.value}`);
      hardwareParams.value[activeParam.value] = res.data || { maxValue: null, minValue: null, status: null };
      console.log('Thông số phần cứng:', hardwareParams.value[activeParam.value]);
    } catch (err) {
      ElMessage.error('Lỗi khi lấy thông số phần cứng: ' + (err.response?.data?.error || err.message));
      console.error('Lỗi:', err.response?.data || err);
    }
  };
  
  // Lưu ngưỡng cài đặt
  const saveThresholds = async () => {
    try {
      const payload = {
        param: activeParam.value,
        thresholds: {
          min: thresholds.value[activeParam.value].min,
          max: thresholds.value[activeParam.value].max,
        },
      };
      await axios.post('http://localhost:3005/api/hardware/settings', payload);
      ElMessage.success('Cài đặt ngưỡng thành công!');
      socket.emit('updateThresholds', payload); // Gửi qua Socket để cập nhật real-time
    } catch (err) {
      ElMessage.error('Lỗi khi lưu cài đặt: ' + (err.response?.data?.error || err.message));
      console.error('Lỗi:', err.response?.data || err);
    }
  };
  
  onMounted(async () => {
    try {
      const res = await getAllStations(1, 10); // Lấy dữ liệu với page=1, limit=10
      stations.value = res.data.stations || [];
      console.log('Dữ liệu trạm ban đầu:', JSON.stringify(stations.value, null, 2));
      await fetchHardwareParams(); // Lấy thông số phần cứng ban đầu
    } catch (err) {
      ElMessage.error('Lỗi khi tải danh sách trạm: ' + (err.response?.data?.error || err.message));
      console.error('Lỗi:', err.response?.data || err);
    }
  
    socket.on('connect', () => {
      console.log('Socket.IO connected');
    });
  
    socket.on('stationAdded', (newStation) => {
      stations.value.unshift(newStation);
      ElMessage.success('Có trạm mới được thêm: ' + newStation.name);
      console.log('Socket: Trạm mới:', newStation);
    });
  
    socket.on('stationUpdated', (updatedStation) => {
      const index = stations.value.findIndex((station) => station.id === updatedStation.id);
      if (index !== -1) {
        stations.value[index] = { ...stations.value[index], ...updatedStation };
        ElMessage.success('Trạm đã được cập nhật: ' + updatedStation.name);
        console.log('Socket: Trạm cập nhật:', updatedStation);
      }
    });
  
    socket.on('stationDeleted', ({ id }) => {
      stations.value = stations.value.filter((station) => station.id !== id);
      ElMessage.success('Trạm đã được xóa');
      console.log('Socket: Trạm xóa:', id);
    });
  
    socket.on('newData', (newData) => {
      const stationIndex = stations.value.findIndex((station) => station.id === newData.station_id);
      if (stationIndex !== -1) {
        const station = stations.value[stationIndex];
        station.weatherData = [newData, ...(station.weatherData || []).slice(0, 0)]; // Giới hạn 1 bản ghi mới nhất
        stations.value[stationIndex] = { ...station };
        console.log('Socket: Dữ liệu thời tiết mới:', newData);
      }
    });
  
    socket.on('hardwareParamsUpdate', (params) => {
      hardwareParams.value[params.param] = params.data;
      ElMessage.info(`Thông số phần cứng ${paramLabels[params.param]} đã được cập nhật`);
      console.log('Socket: Thông số phần cứng cập nhật:', params);
    });
  
    socket.on('connect_error', (err) => {
      console.error('Socket.IO lỗi kết nối:', err.message);
    });
  });
  
  onUnmounted(() => {
    socket.disconnect();
  });
  </script>
  
  <style scoped>
  .h-screen {
    height: 100vh;
  }
  
  .overflow-auto {
    overflow-y: auto;
  }
  </style>