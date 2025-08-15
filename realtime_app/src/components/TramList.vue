<template>
  <el-table :data="trams" border stripe style="width: 100%; max-width: none;" class="table-fixed">
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
        <el-button type="primary" size="small" circle @click="$emit('edit', row)">
          <el-icon><Edit /></el-icon>
        </el-button>
        <el-button type="danger" size="small" circle @click="$emit('delete', row.id)">
          <el-icon><Delete /></el-icon>
        </el-button>
      </template>
    </el-table-column>
  </el-table>
</template>

<script setup>
import { Edit, Delete } from '@element-plus/icons-vue';
const props = defineProps({
  trams: Array,
  currentPage: Number,
  pageSize: Number,
});
defineEmits(['edit', 'delete', 'view']);

const getStatusIcon = (status) => {
  switch (status) {
    case 'active': return '🟢';
    case 'inactive': return '🔴';
    case 'error': return '⚠️';
    case 'maintenance': return '🛠';
    default: return '';
  }
};

const getStatusText = (status) => {
  switch (status) {
    case 'active': return 'Đang hoạt động';
    case 'inactive': return 'Không hoạt động';
    case 'error': return 'Lỗi';
    case 'maintenance': return 'Bảo trì';
    default: return 'Không xác định';
  }
};

const getStatusClass = (status) => {
  return {
    'active': 'text-green-600 font-semibold',
    'inactive': 'text-red-600 font-semibold',
    'error': 'text-yellow-600 font-semibold',
    'maintenance': 'text-blue-600 font-semibold',
  }[status] || '';
};
</script>