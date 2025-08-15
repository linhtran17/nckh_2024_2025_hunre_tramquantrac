<template>
    <div>
      <h2>Realtime Weather Data</h2>
      <ul>
        <li v-for="item in weatherData" :key="item.id">
  Temp: {{ item.temperature }} °C,
  Humidity: {{ item.humidity }} %,
  Rain: {{ item.rain }} mm,
  Wind: {{ item.wind }} m/s,
  Time: {{ formatDate(item.createdAt) }}
</li>

      </ul>
    </div>
  </template>
  
  <script setup>
  import { ref, onMounted, onBeforeUnmount } from 'vue';
  import { io } from 'socket.io-client';
  
  const weatherData = ref([]);
  const socket = io('http://localhost:3005');
  
  function formatDate(dateString) {
    const d = new Date(dateString);
    return d.toLocaleString();
  }
  
  async function fetchInitialData() {
    try {
      const res = await fetch('http://localhost:3005/api/data');
      const data = await res.json();
      weatherData.value = data;
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  }
  
  onMounted(() => {
    fetchInitialData();
  
    socket.on('newData', (newData) => {
      weatherData.value.unshift(newData);
    });
  });
  
  onBeforeUnmount(() => {
    socket.off('newData');
  });
  </script>
  