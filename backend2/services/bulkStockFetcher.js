import scraper from './stockScraper.js';
import { pool } from '../db.js';

class BulkStockFetcher {
  constructor(codes) {
    this.codes = codes;
    this.isRunning = false;
    this.completed = 0;
    this.total = codes.length;
    this.current = null;
    this.errors = [];
    this.startedAt = null;
    this.stopped = false;
  }

  async upsert(stock) {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const [res] = await conn.query(
        'INSERT INTO stocks (trading_code, company_name, sector) VALUES (?,?,?) ON DUPLICATE KEY UPDATE company_name=VALUES(company_name), sector=VALUES(sector)',
        [stock.tradingCode, stock.companyName, stock.sector]
      );
      const stockId = res.insertId || (await conn.query('SELECT id FROM stocks WHERE trading_code=?', [stock.tradingCode]))[0][0]?.id;

      // Minimal upsert to ensure presence; detailed upsert handled by server.js upsertStock
      await conn.commit();
      return stockId;
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }
  }

  async fetchAll() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.startedAt = new Date().toISOString();
    this.completed = 0;
    this.errors = [];
    this.stopped = false;

    for (const code of this.codes) {
      if (this.stopped) break;
      this.current = code;
      try {
        const data = await scraper.fetchStockData(code);
        await this.upsert(data);
        this.completed += 1;
      } catch (err) {
        this.errors.push({ code, error: err.message });
      }
      await new Promise(r => setTimeout(r, 800));
    }
    this.isRunning = false;
    this.current = null;
  }

  stop() {
    this.stopped = true;
  }

  getProgress() {
    return {
      isRunning: this.isRunning,
      total: this.total,
      completed: this.completed,
      current: this.current,
      startedAt: this.startedAt,
      stopped: this.stopped,
      errors: this.errors
    };
  }
}

export default BulkStockFetcher;