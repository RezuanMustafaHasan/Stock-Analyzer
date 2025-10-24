import { pool } from '../db.js';

// Sector-level summary using aggregate functions, GROUP BY, and HAVING
export const getSectorsSummary = async (req, res) => {
  try {
    const query = `
      SELECT 
        s.sector AS sectorName,
        SUM(IFNULL(m.days_trade_count, 0)) AS totalTrade,
        SUM(IFNULL(m.days_volume, 0)) AS totalVolume,
        SUM(CASE WHEN IFNULL(m.change_amount, 0) > 0 THEN 1 ELSE 0 END) AS gainers,
        SUM(CASE WHEN IFNULL(m.change_amount, 0) < 0 THEN 1 ELSE 0 END) AS losers,
        SUM(IFNULL(m.market_capitalization, 0)) AS totalMarketCapital,
        (SUM(IFNULL(m.market_capitalization, 0)) / NULLIF(t.grandTotalMarketCap, 0)) * 100 AS marketCapitalPct
      FROM stocks s
      LEFT JOIN market_information m ON m.stock_id = s.id
      CROSS JOIN (
        SELECT SUM(IFNULL(m2.market_capitalization, 0)) AS grandTotalMarketCap
        FROM stocks s2
        LEFT JOIN market_information m2 ON m2.stock_id = s2.id
      ) t
      GROUP BY s.sector
      HAVING COUNT(s.id) > 0
      ORDER BY s.sector
    `;

    const [rows] = await pool.query(query);

    // Ensure consistent numeric types for frontend
    const result = rows.map(r => ({
      sectorName: r.sectorName,
      totalTrade: Number(r.totalTrade ?? 0),
      totalVolume: Number(r.totalVolume ?? 0),
      gainers: Number(r.gainers ?? 0),
      losers: Number(r.losers ?? 0),
      totalMarketCapital: Number(r.totalMarketCapital ?? 0),
      marketCapitalPct: Number(r.marketCapitalPct ?? 0)
    }));

    res.json(result);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};