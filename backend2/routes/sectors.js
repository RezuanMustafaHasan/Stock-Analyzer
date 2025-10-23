import express from 'express';
import { getSectorsSummary } from '../controllers/sectorsController.js';

const router = express.Router();

// Sectors summary
router.get('/summary', getSectorsSummary);

export default router;