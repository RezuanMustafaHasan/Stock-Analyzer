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
        SUM(IFNULL(b.authorized_capital, 0)) AS totalAuthorizedCapital,
        (SUM(IFNULL(b.authorized_capital, 0)) / NULLIF(t.grandTotal, 0)) * 100 AS authorizedCapitalPct
      FROM stocks s
      LEFT JOIN market_information m ON m.stock_id = s.id
      LEFT JOIN basic_information b ON b.stock_id = s.id
      CROSS JOIN (
        SELECT SUM(IFNULL(b2.authorized_capital, 0)) AS grandTotal
        FROM stocks s2
        LEFT JOIN basic_information b2 ON b2.stock_id = s2.id
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
      totalAuthorizedCapital: Number(r.totalAuthorizedCapital ?? 0),
      authorizedCapitalPct: Number(r.authorizedCapitalPct ?? 0)
    }));

    res.json(result);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};