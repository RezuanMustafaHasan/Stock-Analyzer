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
  },
  getMarketSnapshot: async (q = '') => {
    const qs = q ? `?q=${encodeURIComponent(q)}` : '';
    const { data } = await api.get(`/market/snapshot${qs}`);
    return data;
  },
  getFilteredStocks: async (options = {}) => {
    const params = new URLSearchParams();
    if (options.sector) params.append('sector', options.sector);
    if (options.pe_min != null && options.pe_min !== '') params.append('pe_min', options.pe_min);
    if (options.pe_max != null && options.pe_max !== '') params.append('pe_max', options.pe_max);
    if (options.market_cap_min != null && options.market_cap_min !== '') params.append('market_cap_min', options.market_cap_min);
    if (options.dividend_min != null && options.dividend_min !== '') params.append('dividend_min', options.dividend_min);

    const qs = params.toString() ? `?${params.toString()}` : '';
    const { data } = await api.get(`/stocks/filter${qs}`);
    return data;
  },
  postFilteredStocks: async (options = {}) => {
    const { data } = await api.post('/stocks/filter', options);
    return data;
  },
  postTopMovers: async ({ top = 10, order = 'DESC' } = {}) => {
    const { data } = await api.post('/market/top-movers', { top, order });
    return data;
  }
};

export default api;