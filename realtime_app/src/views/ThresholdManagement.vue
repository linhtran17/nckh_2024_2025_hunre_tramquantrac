<template>
  <div class="threshold-manager p-6">
    <!-- Header: Card chứa tiêu đề và nút Thêm -->
    <el-card shadow="always" class="mb-6 rounded-lg">
      <div class="card-header flex justify-between items-center">
        <h2 class="text-3xl font-semibold text-gray-400 font-[Poppins] tracking-wide">Quản Lý Ngưỡng Cảnh Báo</h2>
        <el-tooltip content="Thêm Ngưỡng Mới" placement="top">
          <el-button type="success" round size="small" @click="openDialog">
            <template #icon>
              <Plus />
            </template>
            <span class="ml-2">Thêm Ngưỡng</span>
          </el-button>
        </el-tooltip>
      </div>
    </el-card>

    <!-- Bảng danh sách ngưỡng -->
    <el-table
      v-loading="loading"
      :data="paginatedThresholds"
      stripe
      border
      style="width: 100%;"
      class="threshold-table rounded-lg shadow-md"
    >
      <el-table-column label="STT" type="index" width="60" :index="indexMethod" />
      <el-table-column prop="parameter_type" label="Yếu Tố" min-width="130" />
      <el-table-column label="Ngưỡng Cảnh Báo" min-width="130">
        <template #default="scope">
          <span class="text-gray-700">{{ formatThreshold(scope.row) }}</span>
        </template>
      </el-table-column>
      <el-table-column prop="level" label="Mức Độ Cảnh Báo" min-width="150" />
      <el-table-column prop="message" label="Mô Tả Nguy Cơ" min-width="200" />
      <el-table-column prop="action" label="Hành Động Khuyến Nghị" min-width="200" />
      <el-table-column label="Hành Động" fixed="right" width="150">
        <template #default="scope">
          <el-tooltip content="Chỉnh sửa" placement="top">
            <el-button type="primary" round size="small" @click="editThreshold(scope.row)" class="mr-2">
              <template #icon>
                <Edit />
              </template>
            </el-button>
          </el-tooltip>
          <el-tooltip content="Xóa" placement="top">
            <el-button type="danger" round size="small" @click="deleteThreshold(scope.row)">
              <template #icon>
                <Delete />
              </template>
            </el-button>
          </el-tooltip>
        </template>
      </el-table-column>
    </el-table>

    <!-- Phân trang -->
    <el-pagination
      v-model:current-page="currentPage"
      v-model:page-size="pageSize"
      :page-sizes="[5, 10, 20, 50]"
      layout="total, sizes, prev, pager, next, jumper"
      :total="thresholds.length"
      class="mt-6 text-center"
      background
    />

    <!-- Dialog Form -->
    <el-dialog v-model="dialogVisible" :title="formTitle" width="600px" custom-class="threshold-dialog">
      <el-form
        :model="form"
        ref="formRef"
        label-width="150px"
        size="medium"
        label-position="top"
        class="threshold-form"
        :rules="rules"
      >
        <el-form-item label="Yếu Tố" prop="parameter_type">
          <el-input v-model="form.parameter_type" placeholder="VD: rainfall, wind, temperature..." />
        </el-form-item>
        <el-form-item label="Ngưỡng Thấp" prop="min_value">
          <el-input-number v-model="form.min_value" placeholder="Nhập giá trị thấp nhất" style="width: 100%;" />
        </el-form-item>
        <el-form-item label="Ngưỡng Cao" prop="max_value">
          <el-input-number v-model="form.max_value" placeholder="Nhập giá trị cao nhất" style="width: 100%;" />
        </el-form-item>
        <el-form-item label="Mức Độ Cảnh Báo" prop="level">
          <el-select v-model="form.level" placeholder="Chọn mức độ" style="width: 100%;">
            <el-option label="Nhẹ" value="Nhẹ" />
            <el-option label="Trung bình" value="Trung bình" />
            <el-option label="Nguy hiểm" value="Nguy hiểm" />
            <el-option label="Rất nguy hiểm" value="Rất nguy hiểm" />
          </el-select>
        </el-form-item>
        <el-form-item label="Mô Tả Nguy Cơ" prop="message">
          <el-input v-model="form.message" type="textarea" placeholder="Mô tả nguy cơ" />
        </el-form-item>
        <el-form-item label="Hành Động Khuyến Nghị" prop="action">
          <el-input v-model="form.action" type="textarea" placeholder="Hành động khuyến nghị" />
        </el-form-item>
        <el-form-item label="Tổ Hợp Điều Kiện (JSON)" prop="combined_conditions">
          <el-input
            v-model="form.combined_conditions"
            type="textarea"
            placeholder='VD: {"rainfall":50, "wind":10} (tuỳ chọn)'
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false" plain>Huỷ</el-button>
        <el-button type="primary" @click="submitThreshold">Xác Nhận</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, reactive, computed, onUnmounted } from 'vue';
import axios from 'axios';
import { ElMessageBox, ElMessage } from 'element-plus';
import { Plus, Edit, Delete } from '@element-plus/icons-vue';
import io from 'socket.io-client';

const API_URL = 'http://localhost:3005/api/thresholds';
const socket = io('http://localhost:3005');

const thresholds = ref([]);
const loading = ref(false);
const dialogVisible = ref(false); // Sử dụng ref trực tiếp
const formTitle = ref('Thêm Ngưỡng');
const currentPage = ref(1);
const pageSize = ref(10);

const formRef = ref(null);
const form = reactive({
  id: null,
  parameter_type: '',
  min_value: null,
  max_value: null,
  level: '',
  message: '',
  action: '',
  combined_conditions: '',
});

const rules = reactive({
  parameter_type: [
    { required: true, message: 'Vui lòng nhập yếu tố', trigger: 'blur' },
    { pattern: /^[a-zA-Z_]+$/, message: 'Yếu tố chỉ chứa chữ cái và dấu gạch dưới', trigger: 'blur' },
  ],
  level: [{ required: true, message: 'Vui lòng chọn mức độ cảnh báo', trigger: 'change' }],
  min_value: [
    {
      validator: (rule, value, callback) => {
        if (form.max_value !== null && value !== null && value > form.max_value) {
          callback(new Error('Ngưỡng thấp phải nhỏ hơn hoặc bằng ngưỡng cao'));
        } else {
          callback();
        }
      },
      trigger: 'blur',
    },
  ],
  max_value: [
    {
      validator: (rule, value, callback) => {
        if (form.min_value !== null && value !== null && value < form.min_value) {
          callback(new Error('Ngưỡng cao phải lớn hơn hoặc bằng ngưỡng thấp'));
        } else {
          callback();
        }
      },
      trigger: 'blur',
    },
  ],
  combined_conditions: [
    {
      validator: (rule, value, callback) => {
        if (!value) {
          callback();
          return;
        }
        try {
          JSON.parse(value);
          callback();
        } catch (e) {
          callback(new Error('Tổ hợp điều kiện phải là JSON hợp lệ'));
        }
      },
      trigger: 'blur',
    },
  ],
});

// Tính toán dữ liệu phân trang
const paginatedThresholds = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  const end = start + pageSize.value;
  return thresholds.value.slice(start, end);
});

// Tính toán chỉ số STT dựa trên trang
const indexMethod = (index) => {
  return (currentPage.value - 1) * pageSize.value + index + 1;
};

const loadThresholds = async () => {
  loading.value = true;
  try {
    const res = await axios.get(API_URL);
    thresholds.value = res.data || [];
  } catch (error) {
    console.error('Lỗi tải danh sách ngưỡng:', error);
    ElMessage.error('Tải danh sách ngưỡng thất bại.');
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  loadThresholds();

  socket.on('thresholdUpdated', () => {
    console.log('Threshold updated event received');
    loadThresholds();
  });

  socket.on('connect', () => {
    console.log('Connected to Socket.IO server');
  });

  socket.on('connect_error', (error) => {
    console.error('Socket.IO connection error:', error);
  });
});

onUnmounted(() => {
  socket.disconnect();
});

const openDialog = () => {
  console.log('Open dialog triggered, setting dialogVisible to true');
  dialogVisible.value = true; // Đảm bảo gán giá trị
  formTitle.value = 'Thêm Ngưỡng';
  form.id = null;
  form.parameter_type = '';
  form.min_value = null;
  form.max_value = null;
  form.level = '';
  form.message = '';
  form.action = '';
  form.combined_conditions = '';
};

const editThreshold = (row) => {
  console.log('Edit threshold triggered for:', row.id);
  dialogVisible.value = true; // Đảm bảo gán giá trị
  formTitle.value = 'Cập nhật Ngưỡng';
  form.id = row.id;
  form.parameter_type = row.parameter_type;
  form.min_value = row.min_value;
  form.max_value = row.max_value;
  form.level = row.level;
  form.message = row.message;
  form.action = row.action;
  form.combined_conditions = row.combined_conditions
    ? JSON.stringify(row.combined_conditions, null, 2)
    : '';
};

const submitThreshold = () => {
  console.log('Submit threshold triggered');
  formRef.value.validate(async (valid) => {
    if (!valid) {
      console.log('Validation failed');
      return;
    }
    try {
      let combined = null;
      if (form.combined_conditions) {
        combined = JSON.parse(form.combined_conditions);
      }
      const dataToSend = {
        parameter_type: form.parameter_type,
        min_value: form.min_value,
        max_value: form.max_value,
        level: form.level,
        message: form.message,
        action: form.action,
        combined_conditions: combined,
      };
      if (form.id) {
        await axios.put(`${API_URL}/${form.id}`, dataToSend);
        ElMessage.success('Cập nhật ngưỡng thành công.');
      } else {
        await axios.post(API_URL, dataToSend);
        ElMessage.success('Thêm ngưỡng thành công.');
      }
      await loadThresholds();
      dialogVisible.value = false; // Đóng dialog sau khi submit
    } catch (error) {
      console.error('Lỗi submit ngưỡng:', error);
      ElMessage.error('Có lỗi xảy ra. Vui lòng thử lại.');
    }
  });
};

const deleteThreshold = async (row) => {
  console.log('Delete threshold triggered for:', row.id);
  try {
    await ElMessageBox.confirm(
      'Bạn có muốn xóa ngưỡng này không?',
      'Xác nhận xóa',
      {
        confirmButtonText: 'Xóa',
        cancelButtonText: 'Hủy',
        type: 'warning',
      }
    );
    await axios.delete(`${API_URL}/${row.id}`);
    await loadThresholds();
    ElMessage.success('Xóa ngưỡng thành công.');
  } catch (error) {
    if (error !== 'cancel') {
      console.error('Lỗi xóa ngưỡng:', error);
      ElMessage.error('Xóa ngưỡng thất bại.');
    }
  }
};

const formatThreshold = (row) => {
  if (row.min_value != null && row.max_value != null) {
    return `${row.min_value} - ${row.max_value}`;
  } else if (row.min_value != null) {
    return `>= ${row.min_value}`;
  } else if (row.max_value != null) {
    return `<= ${row.max_value}`;
  }
  return '-';
};
</script>

<style scoped>
.threshold-manager {
  background: #f7f8fa; /* Nền nhạt, nhẹ nhàng */
  min-height: 100vh;
  /* padding: 1px; */
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.threshold-table {
  margin-top: 7px;
  background: #ffffff; /* Nền trắng cho bảng */
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); /* Tạo bóng đổ nhẹ */
}

.threshold-table :deep(.el-table__header th) {
  background-color: #4caf50; /* Xanh lá cây trung bình cho header bảng */
  color: #ffffff; /* Chữ trắng */
  font-weight: 600;
}

.threshold-table :deep(.el-table__body tr:hover) {
  background-color: #e8f5e9; /* Xanh lá nhạt khi hover */
}

.threshold-form {
  padding: 10px;
}

.threshold-dialog :deep(.el-dialog__body) {
  padding: 10px;
  background: #ffffff;
  border-radius: 8px;
}

.threshold-dialog :deep(.el-form-item__label) {
  color: #333333; /* Chữ label đậm hơn */
  font-weight: 500;
}

.el-button + .el-button {
  margin-left: 8px;
}

:deep(.el-table__row) .el-button {
  margin: 0 4px;
  transition: all 0.3s ease; /* Hiệu ứng mượt mà */
}

:deep(.el-table__row) .el-button:hover {
  transform: scale(1.1); /* Phóng to nhẹ khi hover */
}

.el-pagination {
  background: #ffffff;
  padding: 5px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.el-pagination :deep(.el-pager li) {
  color: #4caf50; /* Màu xanh lá cho số trang */
}

.el-pagination :deep(.el-pager li.active) {
  background-color: #388e3c; /* Xanh lá đậm cho trang hiện tại */
  color: #ffffff;
}
</style>