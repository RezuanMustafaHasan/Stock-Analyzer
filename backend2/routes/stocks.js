import express from 'express';
import {
  listStocks,
  getStockByCode,
  fetchStockData,
  refreshStockData,
  getPERatio
} from '../controllers/stockController.js';
import { getFilteredStocks } from '../controllers/stockFilterController.js';

const router = express.Router();

// List all stocks
router.get('/', listStocks);

// PE Ratio - must come before /:tradingCode
router.get('/pe-ratio', getPERatio);

// Filter stocks using v_stock_financials
router.get('/filter', getFilteredStocks);
router.post('/filter', getFilteredStocks);

// Fetch and store stock data
router.post('/fetch', fetchStockData);

// Refresh specific stock data
router.post('/refresh/:tradingCode', refreshStockData);

// Get specific stock by trading code - must be last
router.get('/:tradingCode', getStockByCode);

export default router;
