import { pool } from '../db.js';

// GET/POST /api/stocks/filter
// Accepts filters via query (GET) or JSON body (POST)
export async function getFilteredStocks(req, res) {
  try {
    const source = req.method === 'GET' ? req.query : req.body || {};

    const {
      sector,
      sectors, // array of sectors (for multiple selection)
      sectorMode, // 'all' | 'single' | 'multiple'
      pe_min,
      pe_max,
      market_cap_min,
      dividend_min,
      // Shareholding constraints (latest values)
      sponsor_min,
      sponsor_max,
      government_min,
      government_max,
      institute_min,
      institute_max,
      foreign_min,
      foreign_max,
      public_min,
      public_max,
      // Loan filters
      short_term_loan_min,
      short_term_loan_max,
      long_term_loan_min,
      long_term_loan_max
    } = source;

    let sql = `
      SELECT 
        v.id,
        v.trading_code,
        v.company_name,
        v.sector,
        v.closing_price,
        v.market_capitalization,
        (v.closing_price / NULLIF(v.latest_eps, 0)) AS pe_ratio,
        (v.face_value * v.latest_dividend_percentage) / NULLIF(v.closing_price, 0) AS dividend_yield,
        (SELECT sh.sponsor_director FROM shareholding sh WHERE sh.stock_id = v.id ORDER BY sh.as_on DESC LIMIT 1) AS sh_sponsor_director,
        (SELECT sh.government FROM shareholding sh WHERE sh.stock_id = v.id ORDER BY sh.as_on DESC LIMIT 1) AS sh_government,
        (SELECT sh.institute FROM shareholding sh WHERE sh.stock_id = v.id ORDER BY sh.as_on DESC LIMIT 1) AS sh_institute,
        (SELECT sh.foreign_share FROM shareholding sh WHERE sh.stock_id = v.id ORDER BY sh.as_on DESC LIMIT 1) AS sh_foreign_share,
        (SELECT sh.public FROM shareholding sh WHERE sh.stock_id = v.id ORDER BY sh.as_on DESC LIMIT 1) AS sh_public,
        fh.short_term_loan AS short_term_loan,
        fh.long_term_loan AS long_term_loan
      FROM v_stock_financials v
      LEFT JOIN financial_highlights fh ON fh.stock_id = v.id
      WHERE 1=1
    `;

    const params = [];

    // Sector filtering
    const mode = (sectorMode || '').toLowerCase();
    if (mode === 'single' && sector && String(sector).trim().length > 0) {
      sql += ` AND v.sector = ?`;
      params.push(String(sector).trim());
    } else if (mode === 'multiple' && Array.isArray(sectors) && sectors.length > 0) {
      const cleaned = sectors.map((s) => String(s).trim()).filter(Boolean);
      if (cleaned.length > 0) {
        sql += ` AND v.sector IN (${cleaned.map(() => '?').join(',')})`;
        params.push(...cleaned);
      }
    }
    // mode === 'all' => no sector condition

    // Market cap filter
    if (market_cap_min != null && market_cap_min !== '' && !Number.isNaN(Number(market_cap_min))) {
      sql += ` AND v.market_capitalization >= ?`;
      params.push(Number(market_cap_min));
    }

    // Loan filters (on base columns)
    if (short_term_loan_min != null && short_term_loan_min !== '' && !Number.isNaN(Number(short_term_loan_min))) {
      sql += ` AND fh.short_term_loan >= ?`;
      params.push(Number(short_term_loan_min));
    }
    if (short_term_loan_max != null && short_term_loan_max !== '' && !Number.isNaN(Number(short_term_loan_max))) {
      sql += ` AND fh.short_term_loan <= ?`;
      params.push(Number(short_term_loan_max));
    }
    if (long_term_loan_min != null && long_term_loan_min !== '' && !Number.isNaN(Number(long_term_loan_min))) {
      sql += ` AND fh.long_term_loan >= ?`;
      params.push(Number(long_term_loan_min));
    }
    if (long_term_loan_max != null && long_term_loan_max !== '' && !Number.isNaN(Number(long_term_loan_max))) {
      sql += ` AND fh.long_term_loan <= ?`;
      params.push(Number(long_term_loan_max));
    }

    // HAVING filters for computed fields and latest shareholding aliases
    const havingClauses = [];
    if (pe_min != null && pe_min !== '' && !Number.isNaN(Number(pe_min))) {
      havingClauses.push(`pe_ratio >= ?`);
      params.push(Number(pe_min));
    }
    if (pe_max != null && pe_max !== '' && !Number.isNaN(Number(pe_max))) {
      havingClauses.push(`pe_ratio <= ?`);
      params.push(Number(pe_max));
    }
    if (dividend_min != null && dividend_min !== '' && !Number.isNaN(Number(dividend_min))) {
      havingClauses.push(`dividend_yield >= ?`);
      params.push(Number(dividend_min));
    }

    // Shareholding latest constraints
    if (sponsor_min != null && sponsor_min !== '' && !Number.isNaN(Number(sponsor_min))) {
      havingClauses.push(`sh_sponsor_director >= ?`);
      params.push(Number(sponsor_min));
    }
    if (sponsor_max != null && sponsor_max !== '' && !Number.isNaN(Number(sponsor_max))) {
      havingClauses.push(`sh_sponsor_director <= ?`);
      params.push(Number(sponsor_max));
    }
    if (government_min != null && government_min !== '' && !Number.isNaN(Number(government_min))) {
      havingClauses.push(`sh_government >= ?`);
      params.push(Number(government_min));
    }
    if (government_max != null && government_max !== '' && !Number.isNaN(Number(government_max))) {
      havingClauses.push(`sh_government <= ?`);
      params.push(Number(government_max));
    }
    if (institute_min != null && institute_min !== '' && !Number.isNaN(Number(institute_min))) {
      havingClauses.push(`sh_institute >= ?`);
      params.push(Number(institute_min));
    }
    if (institute_max != null && institute_max !== '' && !Number.isNaN(Number(institute_max))) {
      havingClauses.push(`sh_institute <= ?`);
      params.push(Number(institute_max));
    }
    if (foreign_min != null && foreign_min !== '' && !Number.isNaN(Number(foreign_min))) {
      havingClauses.push(`sh_foreign_share >= ?`);
      params.push(Number(foreign_min));
    }
    if (foreign_max != null && foreign_max !== '' && !Number.isNaN(Number(foreign_max))) {
      havingClauses.push(`sh_foreign_share <= ?`);
      params.push(Number(foreign_max));
    }
    if (public_min != null && public_min !== '' && !Number.isNaN(Number(public_min))) {
      havingClauses.push(`sh_public >= ?`);
      params.push(Number(public_min));
    }
    if (public_max != null && public_max !== '' && !Number.isNaN(Number(public_max))) {
      havingClauses.push(`sh_public <= ?`);
      params.push(Number(public_max));
    }

    if (havingClauses.length > 0) {
      sql += ` HAVING ` + havingClauses.join(' AND ');
    }

    sql += ` ORDER BY v.trading_code ASC`;

    const [rows] = await pool.query(sql, params);

    const result = rows.map((r) => ({
      id: r.id,
      trading_code: r.trading_code,
      company_name: r.company_name,
      sector: r.sector,
      closing_price: r.closing_price !== null ? Number(r.closing_price) : null,
      market_capitalization: r.market_capitalization !== null ? Number(r.market_capitalization) : null,
      pe_ratio: r.pe_ratio !== null ? Number(r.pe_ratio) : null,
      dividend_yield: r.dividend_yield !== null ? Number(r.dividend_yield) : null,
      short_term_loan: r.short_term_loan !== null ? Number(r.short_term_loan) : null,
      long_term_loan: r.long_term_loan !== null ? Number(r.long_term_loan) : null,
      shareholding: {
        sponsor_director: r.sh_sponsor_director !== null ? Number(r.sh_sponsor_director) : null,
        government: r.sh_government !== null ? Number(r.sh_government) : null,
        institute: r.sh_institute !== null ? Number(r.sh_institute) : null,
        foreign_share: r.sh_foreign_share !== null ? Number(r.sh_foreign_share) : null,
        public: r.sh_public !== null ? Number(r.sh_public) : null
      }
    }));

    res.json(result);
  } catch (err) {
    console.error('Error in getFilteredStocks:', err);
    res.status(500).json({ error: 'Failed to fetch filtered stocks' });
  }
}