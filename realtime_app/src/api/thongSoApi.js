import axios from 'axios';

export const getAllParameters = async (params) => {
  return await axios.get('http://localhost:3005/api/station-parameters', { params });
};

export const createParameter = async (data) => {
  if (!data.id) {
    throw new Error('ID thông số là bắt buộc');
  }
  console.log('Dữ liệu gửi POST /station-parameters:', data);
  return await axios.post('http://localhost:3005/api/station-parameters', data);
};

export const updateParameter = async (id, data) => {
  console.log('Dữ liệu gửi PUT /station-parameters:', data);
  return await axios.put(`http://localhost:3005/api/station-parameters/${id}`, data);
};

export const deleteParameter = async (id) => {
  console.log('Xóa thông số với ID:', id);
  return await axios.delete(`http://localhost:3005/api/station-parameters/${id}`);
};