<template>
  <div class="thong-ke-container">
    <!-- Tiêu đề -->
    <div class="header-section">
      <h2 class="table-title"> Dữ Liệu Trạm Quan Trắc</h2>
    </div>

    <!-- Bộ lọc -->
    <div class="filter-section">
      <div class="filter-group">
        <label for="stationSelect">Chọn trạm:</label>
        <el-select v-model="selectedStation" placeholder="Chọn trạm" id="stationSelect" @change="onStationChange">
          <el-option
            v-for="station in stations"
            :key="station.id"
            :label="station.name"
            :value="station.id"
          />
        </el-select>
      </div>

      <div class="filter-group">
        <label for="dataTypeSelect">Loại dữ liệu:</label>
        <el-select v-model="selectedDataType" placeholder="Chọn loại dữ liệu" id="dataTypeSelect">
          <el-option label="Dữ liệu thời tiết" value="weather" />
          <el-option label="Dữ liệu cảnh báo" value="alert" />
        </el-select>
      </div>

      <div class="filter-group">
        <label for="startDatePicker">Từ ngày:</label>
        <el-date-picker
          v-model="startDate"
          type="date"
          placeholder="Chọn ngày"
          id="startDatePicker"
        />
      </div>

      <div class="filter-group">
        <label for="endDatePicker">Đến ngày:</label>
        <el-date-picker
          v-model="endDate"
          type="date"
          placeholder="Chọn ngày"
          id="endDatePicker"
        />
      </div>

      <div class="filter-group buttons">
        <el-button @click="filterData" :disabled="!isFilterEnabled">Lọc dữ liệu</el-button>
        <el-button @click="exportToExcel" :disabled="!filteredData.length">Xuất Excel</el-button>
      </div>
    </div>

    <!-- Bảng dữ liệu thời tiết -->
    <div v-if="selectedDataType === 'weather' && paginatedData.length" class="data-table">
      <el-table
        :data="paginatedData"
        style="width: 100%"
        border
        :header-cell-style="{ fontWeight: 'bold' }"
      >
        <el-table-column label="Thời gian" width="180" align="center">
          <template #default="{ row }">
            <span>{{ row.created_at }}</span>
          </template>
        </el-table-column>
        <el-table-column label="Nhiệt độ (°C)" width="150" align="center">
          <template #default="{ row }">
            <span :style="getAlertStyle(row.station_id, 'temperature', row.temperature)">
              {{ row.temperature || '-' }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="Độ ẩm (%)" width="150" align="center">
          <template #default="{ row }">
            <span :style="getAlertStyle(row.station_id, 'humidity', row.humidity)">
              {{ row.humidity || '-' }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="Lượng mưa (mm)" width="150" align="center">
          <template #default="{ row }">
            <span :style="getAlertStyle(row.station_id, 'rainfall', row.rainfall)">
              {{ row.rainfall || '-' }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="Gió (m/s)" width="150" align="center">
          <template #default="{ row }">
            <span :style="getAlertStyle(row.station_id, 'wind', row.wind)">
              {{ row.wind || '-' }}
            </span>
          </template>
        </el-table-column>
      </el-table>
      <!-- Phân trang -->
      <div class="pagination-container">
        <el-pagination
          background
          layout="prev, pager, next, sizes, total"
          :total="pivotedData.length"
          :page-size="pageSize"
          :page-sizes="[5, 10, 20, 50]"
          v-model:current-page="currentPage"
          @size-change="handlePageSizeChange"
          @current-change="handlePageChange"
        />
      </div>
    </div>

    <!-- Bảng dữ liệu cảnh báo -->
    <div v-else-if="selectedDataType === 'alert' && paginatedData.length" class="data-table">
      <el-table
        :data="paginatedData"
        style="width: 100%"
        border
        :header-cell-style="{ fontWeight: 'bold' }"
      >
        <el-table-column label="ID" width="100" align="center" prop="id" />
        <el-table-column label="Trạm" width="150" align="center">
          <template #default="{ row }">
            <span :style="getStationAlertStyle(row.station_id)">
              {{ getStationName(row.station_id) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="Loại" width="120" align="center" prop="type" />
        <el-table-column label="Giá trị" width="120" align="center" prop="value" />
        <el-table-column label="Thông báo" width="200" align="center" prop="message" />
        <el-table-column label="Mức độ" width="150" align="center">
          <template #default="{ row }">
            <span :style="getAlertLevelStyle(row.level)">
              {{ row.level }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="Hành động" width="150" align="center" prop="action" />
        <el-table-column label="Thời gian" width="180" align="center" prop="created_at" />
      </el-table>
      <!-- Phân trang -->
      <div class="pagination-container">
        <el-pagination
          background
          layout="prev, pager, next, sizes, total"
          :total="filteredData.length"
          :page-size="pageSize"
          :page-sizes="[5, 10, 20, 50]"
          v-model:current-page="currentPage"
          @size-change="handlePageSizeChange"
          @current-change="handlePageChange"
        />
      </div>
    </div>

    <!-- Thông báo không có dữ liệu -->
    <p v-else>Không có dữ liệu để hiển thị.</p>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from "vue";
import axios from "axios";
import moment from "moment-timezone";
import { io } from "socket.io-client";

const socket = io("http://localhost:3005", {
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});

const stations = ref([]);
const selectedStation = ref("");
const selectedDataType = ref("");
const startDate = ref("");
const endDate = ref("");
const filteredData = ref([]);
const pivotedData = ref([]);
const thresholds = ref([]);
const currentPage = ref(1);
const pageSize = ref(10);

// Tính toán dữ liệu phân trang
const paginatedData = computed(() => {
  const dataToPaginate = selectedDataType.value === "weather" ? pivotedData.value : filteredData.value;
  const start = (currentPage.value - 1) * pageSize.value;
  const end = start + pageSize.value;
  return dataToPaginate.slice(start, end);
});

// Kiểm tra điều kiện lọc
const isFilterEnabled = computed(() => {
  return selectedStation.value && selectedDataType.value && startDate.value && endDate.value;
});

// Lấy danh sách trạm
const fetchStations = async () => {
  try {
    const response = await axios.get("http://localhost:3005/api/stations?page=1&limit=100");
    stations.value = response.data.stations || [];
    if (stations.value.length > 0) {
      selectedStation.value = stations.value[0].id;
    }
  } catch (error) {
    console.error("Lỗi khi lấy danh sách trạm:", error.message);
    stations.value = [];
  }
};

// Lấy ngưỡng
const fetchThresholds = async () => {
  try {
    const response = await axios.get("http://localhost:3005/api/thresholds");
    thresholds.value = response.data || [];
  } catch (error) {
    console.error("Lỗi khi lấy ngưỡng:", error.message);
    thresholds.value = [];
  }
};

// Lọc dữ liệu
const filterData = async () => {
  if (!isFilterEnabled.value) {
    alert("Vui lòng chọn trạm, loại dữ liệu, và khoảng thời gian!");
    return;
  }
  try {
    const response = await axios.get("http://localhost:3005/api/weather/filter", {
      params: {
        station_id: selectedStation.value,
        type: selectedDataType.value,
        start_date: moment(startDate.value).format("YYYY-MM-DD"),
        end_date: moment(endDate.value).format("YYYY-MM-DD"),
      },
    });
    filteredData.value = response.data;
    currentPage.value = 1;

    if (selectedDataType.value === "weather") {
      pivotWeatherData();
    } else {
      pivotedData.value = [];
    }
  } catch (error) {
    console.error("Lỗi khi lọc dữ liệu:", error.response?.data || error.message);
    filteredData.value = [];
    pivotedData.value = [];
    alert("Có lỗi xảy ra khi lọc dữ liệu: " + (error.response?.data?.error || error.message));
  }
};

// Pivot dữ liệu thời tiết
const pivotWeatherData = () => {
  const groupedData = {};
  filteredData.value.forEach((item) => {
    const timeKey = moment(item.created_at).tz("Asia/Ho_Chi_Minh").format("YYYY-MM-DD HH:mm:ss");
    if (!groupedData[timeKey]) {
      groupedData[timeKey] = { created_at: timeKey, station_id: item.station_id };
    }
    groupedData[timeKey][item.parameter_type] = item.value;
  });
  pivotedData.value = Object.values(groupedData);
};

// Xuất Excel
const exportToExcel = async () => {
  try {
    const dataToExport = selectedDataType.value === "weather" ? filteredData.value : filteredData.value;
    const response = await axios.post(
      "http://localhost:3005/api/weather/export",
      {
        data: dataToExport,
        type: selectedDataType.value,
      },
      { responseType: "blob" }
    );

    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `${selectedDataType.value}_thongke_${selectedStation.value}_${startDate.value}_to_${endDate.value}.xlsx`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error("Lỗi khi xuất Excel:", error.message);
    alert("Có lỗi xảy ra khi xuất Excel: " + error.message);
  }
};

// Xử lý khi thay đổi trạm
const onStationChange = () => {
  filteredData.value = [];
  pivotedData.value = [];
  currentPage.value = 1;
};

// Phân trang
const handlePageSizeChange = (newSize) => {
  pageSize.value = newSize;
  currentPage.value = 1;
};

const handlePageChange = (newPage) => {
  currentPage.value = newPage;
};

// Kiểm tra cảnh báo
const hasAlert = (stationId) => {
  const stationData = pivotedData.value.filter((row) => row.station_id === stationId);
  if (!stationData.length) return false;

  return ["temperature", "humidity", "wind", "rainfall"].some((param) => {
    const value = stationData[0][param];
    if (value === null) return false;
    const rule = getMatchingThreshold(param, value);
    return rule && rule.level !== "Bình thường";
  });
};

// Lấy ngưỡng phù hợp
const getMatchingThreshold = (parameterType, value) => {
  let matchingRule = null;
  const levelsPriority = ["Bình thường", "Nhẹ", "Trung bình", "Nguy hiểm", "Rất nguy hiểm"];

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

  return matchingRule;
};

// Lấy style cho thông số vượt ngưỡng
const getAlertStyle = (stationId, parameterType, value) => {
  if (value === null || value === undefined) return { color: "#34495e" };
  const rule = getMatchingThreshold(parameterType, value);
  const level = rule ? rule.level : "Bình thường";
  const colorMap = {
    "Nhẹ": "rgb(175, 225, 255)",
    "Trung bình": "rgb(250, 245, 140)",
    "Nguy hiểm": "rgb(255, 155, 0)",
    "Rất nguy hiểm": "rgb(255, 10, 0)",
  };
  return level !== "Bình thường" ? { color: colorMap[level] } : { color: "#34495e" };
};

// Lấy style cho mức độ cảnh báo
const getAlertLevelStyle = (level) => {
  const colorMap = {
    "Nhẹ": "rgb(175, 225, 255)",
    "Trung bình": "rgb(250, 245, 140)",
    "Nguy hiểm": "rgb(255, 155, 0)",
    "Rất nguy hiểm": "rgb(255, 10, 0)",
  };
  return level !== "Bình thường" ? { color: colorMap[level] } : { color: "#34495e" };
};

// Lấy style cho tên trạm
const getStationAlertStyle = (stationId) => {
  return hasAlert(stationId) ? { color: "rgb(255, 10, 0)" } : { color: "#34495e" };
};

// Lấy tên trạm
const getStationName = (stationId) => {
  const station = stations.value.find((s) => s.id === stationId);
  return station ? station.name : "N/A";
};

// Xử lý Socket.IO
const handleNewWeatherData = (weatherData) => {
  if (weatherData.station_id === selectedStation.value) {
    filterData(); // Cập nhật lại dữ liệu khi có dữ liệu mới
  }
};

const handleNewAlert = (alert) => {
  if (alert.station_id === selectedStation.value && selectedDataType.value === "alert") {
    filterData(); // Cập nhật lại dữ liệu cảnh báo
  }
};

// Lifecycle hooks
onMounted(() => {
  fetchStations();
  fetchThresholds();
  socket.on("connect", () => {
    console.log("Socket.IO connected");
  });
  socket.on("newWeatherData", handleNewWeatherData);
  socket.on("newAlert", handleNewAlert);
});

onUnmounted(() => {
  socket.off("connect");
  socket.off("newWeatherData", handleNewWeatherData);
  socket.off("newAlert", handleNewAlert);
  socket.disconnect();
});
</script>

<style scoped>
.thong-ke-container {
  padding: 20px;
  background-color: #ffffff;
  border: 1px solid #e0e0e0;
  border-radius: 5px;
  margin: 10px auto;
  max-width: 1200px;
}

.header-section {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 15px;
  padding: 10px;
  border-bottom: 1px solid #e0e0e0;
}

.table-title {
  font-size: 22px;
  color: #2c3e50;
  font-weight: 600;
  margin: 0;
}

.filter-section {
  display: flex;
  flex-wrap: wrap;
  gap: 15px;
  margin-bottom: 20px;
  border: 1px solid #e0e0e0;
  padding: 15px;
  border-radius: 5px;
}

.filter-group {
  display: flex;
  align-items: center;
  gap: 10px;
}

.filter-group label {
  font-weight: 600;
}

.buttons {
  margin-left: auto;
}

.data-table {
  border-radius: 5px;
  overflow: hidden;
}

:deep(.el-table__cell) {
  padding: 12px 0;
  font-size: 14px;
  color: #34495e;
}

:deep(.el-table th, .el-table td) {
  text-align: center;
  border: 1px solid #e0e0e0;
}

:deep(.el-table th) {
  font-weight: bold;
  text-transform: uppercase;
  font-size: 14px;
  background-color: transparent;
  color: #2c3e50;
}

:deep(.el-table__row:hover) {
  background-color: #f5f7fa;
  transition: background-color 0.3s ease;
}

.pagination-container {
  display: flex;
  justify-content: center;
  margin-top: 20px;
  padding: 10px 0;
  border-top: 1px solid #e0e0e0;
}

:deep(.el-pagination .el-pager li) {
  font-size: 14px;
  margin: 0 4px;
  border-radius: 3px;
  min-width: 28px;
  text-align: center;
  border: 1px solid #e0e0e0;
}

:deep(.el-pagination .el-pager li.active) {
  font-weight: bold;
  border-color: #2c3e50;
  color: #2c3e50;
  background-color: #fff;
}
</style>