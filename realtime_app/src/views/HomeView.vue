<template>
  <div class="main-container" style="padding: 20px">
    <!-- Dòng chứa tiêu đề và thời gian -->
    <el-row justify="space-between" align="middle" style="margin-bottom: 20px;">
      <el-col :span="12">
        <h1 style="font-size: 24px; font-weight: bold; color: #1f9d55">
          Dữ liệu Thời tiết Realtime
        </h1>
      </el-col>
      <el-col :span="12" style="text-align: right">
        <div style="font-size: 14px; color: #555; background: #fff; padding: 6px 12px; border: 1px solid #ccc; border-radius: 4px; display: inline-block;">
          {{ currentDateTime }}
        </div>
      </el-col>
    </el-row>

    <!-- Nội dung tiếp theo -->
    <Dashboard />
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted, onUnmounted } from 'vue';
import Dashboard from '@/components/Dashboard.vue';

const currentDateTime = ref('');

const updateDateTime = () => {
  const now = new Date();
  currentDateTime.value = now.toLocaleString('vi-VN', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
};

let intervalId: number | null = null;
onMounted(() => {
  updateDateTime();
  intervalId = setInterval(updateDateTime, 1000);
});

onUnmounted(() => {
  if (intervalId) clearInterval(intervalId);
});
</script>
