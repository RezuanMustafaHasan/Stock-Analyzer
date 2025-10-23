import express from 'express';
import {
  startBulkFetch,
  getBulkFetchProgress,
  stopBulkFetch
} from '../controllers/bulkFetchController.js';

const router = express.Router();

// Start bulk fetch
router.post('/', startBulkFetch);

// Get bulk fetch progress
router.get('/progress', getBulkFetchProgress);

// Stop bulk fetch
router.post('/stop', stopBulkFetch);

export default router;
