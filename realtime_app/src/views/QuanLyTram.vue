<template>
  <div class="p-6 bg-gradient-to-br from-white to-gray-100 min-h-screen">
    <!-- Tiêu đề và nút thêm trạm -->
    <div class="flex justify-between items-center mb-10">
      <div class="header-section">
      <h2 class="table-title">Danh sách Trạm</h2>
    </div>
          <el-button type="primary" class="mr-4 hover:shadow-md transition-shadow" @click="moFormThem">
        <span class="text-sm">+ Thêm trạm</span>
      </el-button>
    </div>

    <!-- Bảng danh sách trạm với expandable row -->
    <el-table
      :data="danhSachTram"
      border
      stripe
      style="width: 100%"
      class="table-fixed rounded-lg shadow-md"
      row-key="id"
      :expand-row-keys="expandedRows"
      @expand-change="handleExpandChange"
    >
      <el-table-column type="expand" width="50">
        <template #default="{ row }">
          <!-- Tiêu đề và nút Thêm thông số -->
          <div class="p-4 bg-gray-50 flex justify-between items-center border-b border-gray-200">
            <h3 class="text-lg font-semibold text-center flex-1">
              {{ row.name }} - Danh sách Thông số
            </h3>
            <el-button type="primary" size="small" circle @click="moFormThemThongSo(row)">
              <el-icon><Plus /></el-icon>
            </el-button>
          </div>
          <!-- Bảng danh sách thông số -->
          <div class="p-4 bg-gray-50">
            <el-table
              :data="thongSoCuaTram[row.id] || []"
              style="width: 100%; margin-top: 10px"
              border
              :loading="loadingThongSo[row.id] || false"
              empty-text="Không có thông số"
              class="rounded-lg shadow-sm table-auto"
            >
              <el-table-column prop="id" label="ID" align="center" />
              <el-table-column prop="parameter_type" label="Loại Thông Số" align="center">
                <template #default="{ row }">
                  {{ getParameterTypeText(row.parameter_type) }}
                </template>
              </el-table-column>
              <el-table-column prop="unit" label="Đơn Vị" align="center" />
              <el-table-column label="Hành động" align="center">
                <template #default="{ row: thongSo }">
                  <el-tooltip content="Sửa" placement="top">
                    <el-button type="primary" size="small" circle @click="moFormSuaThongSo(thongSo)" class="mr-2">
                      <el-icon><Edit /></el-icon>
                    </el-button>
                  </el-tooltip>
                  <el-tooltip content="Xóa" placement="top">
                    <el-button type="danger" size="small" circle @click="xoaThongSo(thongSo.id)">
                      <el-icon><Delete /></el-icon>
                    </el-button>
                  </el-tooltip>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="STT" min-width="80">
        <template #default="{ $index }">
          {{ (currentPage - 1) * pageSize + $index + 1 }}
        </template>
      </el-table-column>
      <el-table-column prop="name" label="Tên trạm" min-width="200" />
      <el-table-column prop="location" label="Vị trí" min-width="300" />
      <el-table-column prop="latitude" label="Vĩ độ" min-width="120">
        <template #default="{ row }">
          {{ row.latitude.toFixed(4) }}
        </template>
      </el-table-column>
      <el-table-column prop="longitude" label="Kinh độ" min-width="120">
        <template #default="{ row }">
          {{ row.longitude.toFixed(4) }}
        </template>
      </el-table-column>
      <el-table-column label="Trạng thái" min-width="180">
        <template #default="{ row }">
          <span :class="getStatusClass(row.status)">
            {{ getStatusIcon(row.status) }} {{ getStatusText(row.status) }}
          </span>
        </template>
      </el-table-column>
      <el-table-column label="Hành động" min-width="150">
        <template #default="{ row }">
          <el-tooltip content="Sửa" placement="top">
            <el-button type="primary" size="small" circle @click="moFormSua(row)" class="mr-2">
              <el-icon><Edit /></el-icon>
            </el-button>
          </el-tooltip>
          <el-tooltip content="Xóa" placement="top">
            <el-button type="danger" size="small" circle @click="xoaTram(row.id)">
              <el-icon><Delete /></el-icon>
            </el-button>
          </el-tooltip>
        </template>
      </el-table-column>
    </el-table>

    <!-- Phân trang -->
    <el-pagination
      v-if="total > 0"
      layout="total, prev, pager, next, jumper"
      :total="total"
      :page-size="pageSize"
      v-model:current-page="currentPage"
      @current-change="handleCurrentChange"
      class="mt-6 text-center"
    />

    <!-- Form thêm/sửa trạm -->
    <TramForm
      :visible="hienForm"
      :modelValue="tramDangChon"
      @update:visible="hienForm = $event"
      @save="luuTram"
    />

    <!-- Form thêm/sửa thông số -->
    <el-dialog v-model="hienFormThongSo" title="Quản lý Thông số" width="30%">
      <el-form :model="thongSoDangChon" label-width="120px" :rules="rules" ref="thongSoForm">
        <el-form-item label="ID Thông số" prop="id">
          <el-input
            v-model="thongSoDangChon.id"
            :disabled="!!thongSoCuaTram[thongSoDangChon.station_id]?.some(ts => ts.id === thongSoDangChon.id)"
            placeholder="Nhập ID thông số"
          />
        </el-form-item>
        <el-form-item label="Loại Thông Số" prop="parameter_type">
          <el-select v-model="thongSoDangChon.parameter_type" placeholder="Chọn loại thông số">
            <el-option label="Lượng mưa" value="rainfall" />
            <el-option label="Tốc độ gió" value="wind" />
            <el-option label="Nhiệt độ" value="temperature" />
            <el-option label="Độ ẩm" value="humidity" />
          </el-select>
        </el-form-item>
        <el-form-item label="Đơn Vị" prop="unit">
          <el-input v-model="thongSoDangChon.unit" readonly />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="hienFormThongSo = false">Hủy</el-button>
        <el-button type="primary" @click="luuThongSo">Lưu</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue';
import { ElMessage } from 'element-plus';
import io from 'socket.io-client';
import TramForm from '../components/TramForm.vue';
import { getAllStations, addStation, updateStation, deleteStation } from '../api/tramApi';
import { getAllParameters, createParameter, updateParameter, deleteParameter } from '../api/thongSoApi';
import { Edit, Delete, Plus } from '@element-plus/icons-vue';

const danhSachTram = ref([]);
const thongSoCuaTram = ref({});
const loadingThongSo = ref({});
const expandedRows = ref([]);
const hienForm = ref(false);
const tramDangChon = ref({ id: null, name: '', location: '', status: 'active', latitude: 0.0, longitude: 0.0 });
const hienFormThongSo = ref(false);
const thongSoDangChon = ref({ id: '', station_id: null, parameter_type: '', unit: '' });
const thongSoForm = ref(null);
const socket = io('http://localhost:3005', { reconnection: true });
const currentPage = ref(1);
const pageSize = ref(5);
const total = ref(0);

const rules = ref({
  id: [{ required: true, message: 'ID thông số là bắt buộc', trigger: 'blur' }],
  parameter_type: [{ required: true, message: 'Vui lòng chọn loại thông số', trigger: 'change' }],
  unit: [{ required: true, message: 'Vui lòng nhập đơn vị', trigger: 'blur' }],
});

const taiDanhSachTram = async () => {
  try {
    const res = await getAllStations(currentPage.value, pageSize.value);
    danhSachTram.value = res.data.stations;
    total.value = res.data.total;
    console.log('Danh sách trạm:', res.data);
  } catch (err) {
    ElMessage.error('Lỗi khi tải danh sách trạm: ' + (err.response?.data?.error || err.message));
    console.error('Lỗi tải danh sách:', err.response?.data || err);
  }
};

const handleExpandChange = async (row, expanded) => {
  if (expanded) {
    expandedRows.value = [row.id];
    await taiDanhSachThongSo(row.id);
  } else {
    expandedRows.value = [];
  }
};

const taiDanhSachThongSo = async (stationId) => {
  loadingThongSo.value[stationId] = true;
  try {
    const res = await getAllParameters({ station_id: stationId });
    thongSoCuaTram.value[stationId] = res.data;
    console.log(`Thông số của trạm ${stationId}:`, res.data);
  } catch (err) {
    ElMessage.error('Lỗi khi tải thông số: ' + (err.response?.data?.error || err.message));
    console.error('Lỗi tải thông số:', err.response?.data || err);
  } finally {
    loadingThongSo.value[stationId] = false;
  }
};

const moFormThem = () => {
  tramDangChon.value = { id: null, name: '', location: '', status: 'active', latitude: 0.0, longitude: 0.0 };
  hienForm.value = true;
};

const moFormSua = (tram) => {
  tramDangChon.value = { ...tram };
  hienForm.value = true;
};

const luuTram = async (tram) => {
  try {
    if (!tram.name || !tram.status) {
      ElMessage.error('Tên trạm và trạng thái là bắt buộc');
      return;
    }
    if (tram.id) {
      await updateStation(tram.id, tram);
      ElMessage.success('Cập nhật trạm thành công');
    } else {
      await addStation(tram);
      ElMessage.success('Thêm trạm thành công');
    }
    await taiDanhSachTram();
    hienForm.value = false;
  } catch (err) {
    ElMessage.error('Lỗi khi lưu trạm: ' + (err.response?.data?.error || err.message));
    console.error('Lỗi lưu trạm:', err.response?.data || err);
  }
};

const xoaTram = async (id) => {
  if (!confirm('Bạn có chắc muốn xóa trạm này?')) return;
  try {
    await deleteStation(id);
    ElMessage.success('Xóa trạm thành công');
    await taiDanhSachTram();
    expandedRows.value = [];
  } catch (err) {
    ElMessage.error('Lỗi khi xóa trạm: ' + (err.response?.data?.error || err.message));
    console.error('Lỗi xóa trạm:', err.response?.data || err);
  }
};

const moFormThemThongSo = (tram) => {
  thongSoDangChon.value = {
    id: '',
    station_id: tram.id,
    parameter_type: '',
    unit: '',
  };
  console.log('Khởi tạo thông số mới:', thongSoDangChon.value);
  hienFormThongSo.value = true;
};

const moFormSuaThongSo = (thongSo) => {
  thongSoDangChon.value = { ...thongSo };
  console.log('Thông số đang sửa:', thongSoDangChon.value);
  hienFormThongSo.value = true;
};

// Tự động điền đơn vị dựa trên loại thông số
watch(
  () => thongSoDangChon.value.parameter_type,
  (newVal) => {
    switch (newVal) {
      case 'rainfall':
        thongSoDangChon.value.unit = 'mm/h';
        break;
      case 'wind':
        thongSoDangChon.value.unit = 'm/s';
        break;
      case 'temperature':
        thongSoDangChon.value.unit = '°C';
        break;
      case 'humidity':
        thongSoDangChon.value.unit = '%';
        break;
      default:
        thongSoDangChon.value.unit = '';
    }
  }
);

const luuThongSo = async () => {
  try {
    await thongSoForm.value.validate(async (valid) => {
      if (valid) {
        console.log('Dữ liệu gửi đi:', thongSoDangChon.value);
        const existing = Object.values(thongSoCuaTram.value).flat().some(ts => ts.id === thongSoDangChon.value.id);
        if (existing) {
          await updateParameter(thongSoDangChon.value.id, {
            station_id: thongSoDangChon.value.station_id,
            parameter_type: thongSoDangChon.value.parameter_type,
            unit: thongSoDangChon.value.unit,
          });
          ElMessage.success('Cập nhật thông số thành công');
        } else {
          await createParameter({
            id: thongSoDangChon.value.id,
            station_id: thongSoDangChon.value.station_id,
            parameter_type: thongSoDangChon.value.parameter_type,
            unit: thongSoDangChon.value.unit,
          });
          ElMessage.success('Thêm thông số thành công');
        }
        await taiDanhSachThongSo(thongSoDangChon.value.station_id);
        hienFormThongSo.value = false;
      } else {
        ElMessage.error('Vui lòng kiểm tra lại thông tin nhập vào');
      }
    });
  } catch (err) {
    ElMessage.error('Lỗi khi lưu thông số: ' + (err.response?.data?.error || err.message));
    console.error('Lỗi lưu thông số:', err.response?.data || err);
  }
};

const xoaThongSo = async (id) => {
  if (!confirm('Bạn có chắc muốn xóa thông số này?')) return;
  try {
    const thongSo = Object.values(thongSoCuaTram.value).flat().find((ts) => ts.id === id);
    await deleteParameter(id);
    ElMessage.success('Xóa thông số thành công');
    await taiDanhSachThongSo(thongSo.station_id);
  } catch (err) {
    ElMessage.error('Lỗi khi xóa thông số: ' + (err.response?.data?.error || err.message));
    console.error('Lỗi xóa thông số:', err.response?.data || err);
  }
};

const handleCurrentChange = (val) => {
  currentPage.value = val;
  taiDanhSachTram();
};

const getStatusIcon = (status) => {
  switch (status) {
    case 'active':
      return '🟢';
    case 'inactive':
      return '🔴';
    case 'error':
      return '⚠️';
    case 'maintenance':
      return '🛠';
    default:
      return '';
  }
};

const getStatusText = (status) => {
  switch (status) {
    case 'active':
      return 'Đang hoạt động';
    case 'inactive':
      return 'Không hoạt động';
    case 'error':
      return 'Lỗi';
    case 'maintenance':
      return 'Bảo trì';
    default:
      return 'Không xác định';
  }
};

const getStatusClass = (status) => {
  return {
    active: 'text-green-600 font-semibold',
    inactive: 'text-red-600 font-semibold',
    error: 'text-yellow-600 font-semibold',
    maintenance: 'text-blue-600 font-semibold',
  }[status] || '';
};

const getParameterTypeText = (parameterType) => {
  switch (parameterType) {
    case 'rainfall':
      return 'Lượng mưa';
    case 'wind':
      return 'Tốc độ gió';
    case 'temperature':
      return 'Nhiệt độ';
    case 'humidity':
      return 'Độ ẩm';
    default:
      return parameterType;
  }
};

socket.on('connect', () => {
  console.log('Socket.IO connected');
});

socket.on('stationAdded', async () => {
  await taiDanhSachTram();
  ElMessage.success('Có trạm mới được thêm');
});

socket.on('stationUpdated', async () => {
  await taiDanhSachTram();
  ElMessage.success('Trạm đã được cập nhật');
});

socket.on('stationDeleted', async () => {
  await taiDanhSachTram();
  ElMessage.success('Trạm đã được xóa');
});

socket.on('updateParameters', async (data) => {
  if (expandedRows.value.length > 0 && expandedRows.value[0] === data.station_id) {
    await taiDanhSachThongSo(expandedRows.value[0]);
    ElMessage.success('Thông số đã được cập nhật');
  }
});

socket.on('connect_error', (err) => {
  console.error('Socket.IO lỗi kết nối:', err.message);
});

watch(hienForm, (newVal) => {
  console.log('hienForm thay đổi thành:', newVal);
});

onMounted(() => {
  taiDanhSachTram();
});

onUnmounted(() => {
  socket.disconnect();
});
</script>

<style scoped>
.bg-gray-50 {
  background-color: #f9fafb;
  border: 1px solid #e0e6f0;
  border-radius: 8px;
  margin: 0 10px;
  padding: 16px;
}
.header-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}
/* Đảm bảo bảng thông số căn đều */
:deep(.table-auto) {
  table-layout: auto;
  width: 100%;
}

:deep(.table-auto .el-table__cell) {
  padding: 14px 10px;
  font-size: 14px;
  color: #333;
  border-bottom: 1px solid #e0e6f0;
  text-align: center;
}

/* Điều chỉnh chiều rộng cột để căn đều */
:deep(.table-auto .el-table__header-wrapper th) {
  padding: 14px 10px;
  font-size: 14px;
  background-color: #4caf50;
  color: white;
  font-weight: 600;
  text-align: center;
}

/* Hover effect cho hàng */
:deep(.table-auto .el-table__row:hover) {
  background-color: #e6f3ff;
  transition: background-color 0.2s ease;
}

/* Điều chỉnh tiêu đề và nút Thêm */
:deep(.flex.justify-between) {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

/* Đảm bảo tiêu đề căn giữa chính xác */
:deep(.text-center.flex-1) {
  flex: 1;
  text-align: center;
  margin: 0;
}

/* Nút Thêm thông số ở góc phải */
:deep(.el-button--circle) {
  margin-left: auto;
}

/* Các style khác */
:deep(.el-table__cell) {
  padding: 14px 10px;
  font-size: 14px;
  color: #333;
  border-bottom: 1px solid #e0e6f0;
}

:deep(.el-table__row:hover) {
  background-color: #e6f3ff;
  transition: background-color 0.2s ease;
}

:deep(.el-table__header) {
  background-color: #4caf50;
  color: white;
  font-weight: 600;
}

:deep(.el-button--circle) {
  margin: 0 4px;
}

:deep(.el-pagination) {
  padding: 10px 0;
}

:deep(.el-pagination .btn-prev, .el-pagination .btn-next, .el-pagination .el-pager li) {
  min-width: 32px;
  height: 32px;
  line-height: 32px;
  margin: 0 4px;
  font-size: 13px;
  background-color: #fff;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  transition: all 0.3s ease;
}

:deep(.el-pagination .btn-prev:hover, .el-pagination .btn-next:hover, .el-pagination .el-pager li:hover) {
  background-color: #4caf50;
  color: #fff;
  border-color: #4caf50;
}

:deep(.el-dialog) {
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}
</style>