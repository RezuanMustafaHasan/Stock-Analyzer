import { pool } from '../db.js';

export const getMarketSnapshot = async (req, res) => {
  try {
    const qRaw = (req.query.q || '').trim();
    const hasQ = qRaw.length > 0;
    const qLike = `%${qRaw}%`;

    const baseSql = `
      SELECT trading_code, company_name, sector, last_price, change_percentage, volume, market_cap
      FROM latest_market_snapshot
      ${hasQ ? 'WHERE trading_code LIKE ? OR company_name LIKE ?' : ''}
      ORDER BY trading_code
    `;

    const params = hasQ ? [qLike, qLike] : [];
    const [rows] = await pool.query(baseSql, params);

    const result = rows.map(r => ({
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
    res.status(500).json({ message: e.message });
  }
};