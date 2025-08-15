<template>
    <div>
      <h2>Dự báo thời tiết</h2>
      <ul v-if="forecast.length">
        <li v-for="(item, index) in forecast" :key="index">
          <strong>{{ item.date }}</strong> - Nhiệt độ: {{ item.temp }}°C, Độ ẩm: {{ item.humidity }}%
        </li>
      </ul>
      <p v-else>Đang tải dữ liệu dự báo...</p>
    </div>
  </template>
  
  <script setup>
  import { ref, onMounted } from 'vue';
import { getForecast } from '../../services/api';
  
  const forecast = ref([]);
  
  onMounted(async () => {
    const res = await getForecast();
    forecast.value = res.data;
  });
  </script>
  
  <style scoped>
  h2 {
    margin-bottom: 1rem;
  }
  li {
    margin-bottom: 0.5rem;
  }
  </style>
  