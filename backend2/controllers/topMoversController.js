import { pool } from '../db.js';

// POST /api/market/top-movers
// Body: { top: number, order: 'ASC' | 'DESC' }
// Returns top N movers by change_percentage from latest_market_snapshot
export const getTopMovers = async (req, res) => {
  try {
    const { top, order } = req.body || {};

    // Validate and normalize inputs
    let limit = Number(top);
    if (!Number.isFinite(limit) || limit <= 0) limit = 10;
    if (limit > 200) limit = 200; // guardrail

    const dir = String(order || '').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    // Build SQL: cannot parameterize ASC/DESC, so validate and inject
    const sql = `
      SELECT trading_code, company_name, sector, last_price, change_percentage, volume, market_cap
      FROM latest_market_snapshot
      WHERE change_percentage IS NOT NULL
      ORDER BY change_percentage ${dir}
      LIMIT ?
    `;

    const [rows] = await pool.query(sql, [limit]);

    const result = rows.map((r) => ({
      trading_code: r.trading_code,
      company_name: r.company_name,
      sector: r.sector,
      last_price: r.last_price !== null ? Number(r.last_price) : null,
      change_percentage: r.change_percentage !== null ? Number(r.change_percentage) : null,
      volume: r.volume !== null ? Number(r.volume) : null,
      market_cap: r.market_cap !== null ? Number(r.market_cap) : null,
    }));

    res.json(result);
  } catch (e) {
    console.error('Error in getTopMovers:', e);
    res.status(500).json({ message: 'Failed to fetch top movers' });
  }
};