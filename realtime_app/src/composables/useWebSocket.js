import { ref, onUnmounted } from 'vue';
import { io } from 'socket.io-client';

export function useWebSocket(url = 'http://localhost:3005') {
  const latestData = ref(null);
  const socket = io(url);

  socket.on('connect', () => {
    console.log('✅ WebSocket connected:', socket.id);
  });

  socket.on('newData', (data) => {
    console.log('📡 Received new data from WebSocket:', data);
    latestData.value = {
      time: new Date(data.created_at),
      temperature: data.temperature,
      humidity: data.humidity,
      rain: data.rain,
      wind: data.wind
    };
  });

  socket.on('disconnect', () => {
    console.log('❌ WebSocket disconnected');
  });

  onUnmounted(() => {
    socket.disconnect();
  });

  return { latestData };
}