import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5002/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' }
});

export const stockAPI = {
  listStocks: async () => {
    const { data } = await api.get('/stocks');
    return data;
  },
  startBulkFetch: async () => {
    const { data } = await api.post('/stocks/bulk-fetch');
    return data;
  },
  getBulkFetchProgress: async () => {
    const { data } = await api.get('/stocks/bulk-fetch/progress');
    return data;
  },
  stopBulkFetch: async () => {
    const { data } = await api.post('/stocks/bulk-fetch/stop');
    return data;
  },
  getStockByCode: async (tradingCode) => {
    const { data } = await api.get(`/stocks/${tradingCode}`);
    return data;
  },
  fetchStockData: async (tradingCode) => {
    const { data } = await api.post('/stocks/fetch', { tradingCode });
    return data;
  },
  refreshStockData: async (tradingCode) => {
    const { data } = await api.post(`/stocks/refresh/${tradingCode}`);
      return data;
  },
  health: async () => {
    const { data } = await api.get('/health');
    return data;
  },
  getPERatio: async (year, order = 'ASC') => {
    const { data } = await api.get(`/stocks/pe-ratio?year=${year}&order=${order}`);
    return data;
  },
  getSectorsSummary: async () => {
    const { data } = await api.get('/sectors/summary');
    return data;
  }
};

export default api;