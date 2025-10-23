import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { ensureSchema } from './db.js';

// Import routes
import healthRoutes from './routes/health.js';
import stockRoutes from './routes/stocks.js';
import bulkFetchRoutes from './routes/bulkFetch.js';
import sectorsRoutes from './routes/sectors.js'

// Ensure .env values override any existing environment variables
dotenv.config({ path: './.env', override: true });

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

const PORT = process.env.PORT || 5002;

// Mount routes
app.use('/api', healthRoutes);
app.use('/api/stocks', stockRoutes);
app.use('/api/stocks/bulk-fetch', bulkFetchRoutes);
app.use('/api/sectors', sectorsRoutes);

// Initialize schema and start server
ensureSchema().then(() => {
  app.listen(PORT, () => {
    console.log(`SQL Backend running on http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error('Failed to ensure schema', err);
  process.exit(1);
});