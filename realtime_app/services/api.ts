// services/api.ts (hoặc src/api.js nếu chưa chuyển sang TypeScript)
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3005',
});

export const getForecast = async () => {
  const res = await api.get('/api/weather'); // dùng instance api đã tạo
  return res.data;
};

export default api;
