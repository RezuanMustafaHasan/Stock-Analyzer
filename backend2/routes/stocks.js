import express from 'express';
import {
  listStocks,
  getStockByCode,
  fetchStockData,
  refreshStockData,
  getPERatio
} from '../controllers/stockController.js';

const router = express.Router();

// List all stocks
router.get('/', listStocks);

// PE Ratio - must come before /:tradingCode
router.get('/pe-ratio', getPERatio);

// Fetch and store stock data
router.post('/fetch', fetchStockData);

// Refresh specific stock data
router.post('/refresh/:tradingCode', refreshStockData);

// Get specific stock by trading code - must be last
router.get('/:tradingCode', getStockByCode);

export default router;
