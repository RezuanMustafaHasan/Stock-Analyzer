import scraper from '../services/stockScraper.js';
import tradingCodes from '../data/tradingCodes.js';
import { upsertStock } from '../services/stockService.js';

let bulkState = {
  isRunning: false,
  total: 0,
  completed: 0,
  current: null,
  startedAt: null,
  stopped: false,
  errors: []
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export const startBulkFetch = async (req, res) => {
  try {
    if (bulkState.isRunning) {
      return res.status(409).json({ 
        success: false, 
        message: 'Bulk fetch is already running', 
        data: bulkState 
      });
    }
    
    bulkState = {
      isRunning: true,
      total: tradingCodes.length,
      completed: 0,
      current: null,
      startedAt: new Date().toISOString(),
      stopped: false,
      errors: []
    };

    // Start background job without blocking response
    (async () => {
      for (const code of tradingCodes) {
        if (bulkState.stopped) break;
        bulkState.current = code;
        try {
          const data = await scraper.fetchStockData(code);
          await upsertStock(data);
          bulkState.completed += 1;
        } catch (err) {
          bulkState.errors.push({ code, error: err.message });
        }
        // Be gentle to DSE website
        await sleep(800);
      }
      bulkState.isRunning = false;
      bulkState.current = null;
    })().catch(err => {
      bulkState.errors.push({ code: bulkState.current, error: err.message });
      bulkState.isRunning = false;
      bulkState.current = null;
    });

    res.json({ success: true, message: 'Bulk fetch started', data: bulkState });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getBulkFetchProgress = (req, res) => {
  res.json({ success: true, data: bulkState });
};

export const stopBulkFetch = (req, res) => {
  bulkState.stopped = true;
  res.json({ success: true, message: 'Stopping bulk fetch', data: bulkState });
};
