import express from 'express';
import { getMarketSnapshot } from '../controllers/marketSnapshotController.js';
import { getTopMovers } from '../controllers/topMoversController.js';

const router = express.Router();

router.get('/snapshot', getMarketSnapshot);
router.post('/top-movers', getTopMovers);

export default router;