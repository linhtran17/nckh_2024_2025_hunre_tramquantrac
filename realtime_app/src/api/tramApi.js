import axios from 'axios';

const API_URL = 'http://localhost:3005/api/stations';

export const getAllStations = async (page = 1, limit = 5) => {
  return await axios.get(`${API_URL}?page=${page}&limit=${limit}`);
};

export const addStation = async (station) => {
  return await axios.post(`${API_URL}`, station);
};

export const updateStation = async (id, station) => {
  return await axios.put(`${API_URL}/${id}`, station);
};

export const deleteStation = async (id) => {
  return await axios.delete(`${API_URL}/${id}`);
};