import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import axios from 'axios';
import scraper from './services/stockScraper.js';
import tradingCodes from './data/tradingCodes.js';
import { pool, ensureSchema } from './db.js';

// Ensure .env values override any existing environment variables
dotenv.config({ path: './.env', override: true });

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

const PORT = process.env.PORT || 5002;
const SOURCE_API_URL = process.env.SOURCE_API_URL || 'http://localhost:5001/api';

// Helpers to upsert stock and nested data
async function upsertStock(data) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [stockRows] = await conn.query(
      'SELECT id FROM stocks WHERE trading_code = ?',
      [data.tradingCode]
    );
    let stockId;
    if (stockRows.length) {
      stockId = stockRows[0].id;
      await conn.query(
        'UPDATE stocks SET company_name=?, scrip_code=?, sector=?, last_updated=NOW() WHERE id=?',
        [data.companyName, data.scripCode, data.sector, stockId]
      );
    } else {
      const [res] = await conn.query(
        'INSERT INTO stocks (company_name, trading_code, scrip_code, sector) VALUES (?,?,?,?)',
        [data.companyName, data.tradingCode, data.scripCode, data.sector]
      );
      stockId = res.insertId;
    }

    // 1:1 tables
    if (data.marketInformation) {
      const m = data.marketInformation;
      await conn.query('REPLACE INTO market_information SET ?', {
        stock_id: stockId,
        as_of_date: m.asOfDate?.slice(0, 10),
        last_trading_price: m.lastTradingPrice,
        closing_price: m.closingPrice,
        change_amount: m.change,
        change_percentage: m.changePercentage,
        opening_price: m.openingPrice,
        adjusted_opening_price: m.adjustedOpeningPrice,
        yesterdays_closing_price: m.yesterdaysClosingPrice,
        days_range_low: m.daysRange?.low,
        days_range_high: m.daysRange?.high,
        fifty_two_weeks_low: m.fiftyTwoWeeksMovingRange?.low,
        fifty_two_weeks_high: m.fiftyTwoWeeksMovingRange?.high,
        days_value: m.daysValue,
        days_volume: m.daysVolume,
        days_trade_count: m.daysTradeCount,
        market_capitalization: m.marketCapitalization
      });
    }

    if (data.basicInformation) {
      const b = data.basicInformation;
      await conn.query('REPLACE INTO basic_information SET ?', {
        stock_id: stockId,
        authorized_capital: b.authorizedCapital,
        paid_up_capital: b.paidUpCapital,
        face_value: b.faceValue,
        total_outstanding_securities: b.totalOutstandingSecurities,
        type_of_instrument: b.typeOfInstrument,
        market_lot: b.marketLot,
        listing_year: b.listingYear,
        market_category: b.marketCategory,
        is_electronic_share: b.isElectronicShare
      });
    }

    if (data.corporateActions) {
      const c = data.corporateActions;
      const lastAGM = c.lastAGMDate?.slice(0, 10) || null;
      const yearEnded = c.forYearEnded?.slice(0, 10) || null;
      // Upsert corporate_actions header even if one or both dates are missing (columns now nullable)
      await conn.query('REPLACE INTO corporate_actions SET ?', {
        stock_id: stockId,
        last_agm_date: lastAGM,
        for_year_ended: yearEnded
      });
      // Lists do not depend on corporate_actions header row; upsert independently
      await conn.query('DELETE FROM cash_dividends WHERE stock_id=?', [stockId]);
      await conn.query('DELETE FROM bonus_issues WHERE stock_id=?', [stockId]);
      await conn.query('DELETE FROM right_issues WHERE stock_id=?', [stockId]);
      for (const d of c.cashDividends || []) {
        await conn.query('INSERT INTO cash_dividends (stock_id, year, percentage) VALUES (?,?,?)', [stockId, d.year, d.percentage]);
      }
      for (const d of c.bonusIssues || []) {
        await conn.query('INSERT INTO bonus_issues (stock_id, year, percentage) VALUES (?,?,?)', [stockId, d.year, d.percentage]);
      }
      for (const r of c.rightIssues || []) {
        await conn.query('INSERT INTO right_issues (stock_id, year, ratio) VALUES (?,?,?)', [stockId, r.year, r.ratio]);
      }
    }

    if (data.financialHighlights) {
      const f = data.financialHighlights;
      // Fallback date parsing if loanStatus.asOn missing; try yearEnd
      const parseDateFlexible = (t) => {
        if (!t) return null;
        const spelled = t.match(/([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})/);
        if (spelled) {
          const d = new Date(`${spelled[1]} ${spelled[2]}, ${spelled[3]}`);
          if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
        }
        const numeric = t.match(/(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{4})/);
        if (numeric) {
          const day = parseInt(numeric[1], 10);
          const month = parseInt(numeric[2], 10);
          const year = parseInt(numeric[3], 10);
          const d = new Date(year, month - 1, day);
          if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
        }
        return null;
      };
      const loanAsOn = f.loanStatus?.asOn ? f.loanStatus.asOn.slice(0, 10) : parseDateFlexible(f.yearEnd);
      await conn.query('REPLACE INTO financial_highlights SET ?', {
        stock_id: stockId,
        year_end: f.yearEnd,
        loan_as_on: loanAsOn ?? null,
        short_term_loan: f.loanStatus?.shortTermLoan ?? 0,
        long_term_loan: f.loanStatus?.longTermLoan ?? 0
      });
    }

    if (data.shareholding) {
      await conn.query('DELETE FROM shareholding WHERE stock_id=?', [stockId]);
      for (const s of data.shareholding) {
        const asOn = s.asOn ? s.asOn.slice(0, 10) : null;
        if (!asOn) continue; // Skip invalid rows to avoid NOT NULL violation
        await conn.query(
          'INSERT INTO shareholding (stock_id, as_on, sponsor_director, government, institute, foreign_share, public) VALUES (?,?,?,?,?,?,?)',
          [stockId, asOn, s.sponsorDirector, s.government, s.institute, s.foreign, s.public]
        );
      }
    }

    if (data.corporateInformation) {
      const ci = data.corporateInformation;
      await conn.query('REPLACE INTO corporate_information SET ?', {
        stock_id: stockId,
        address: ci.address,
        email: ci.email,
        website: ci.website,
        company_secretary_name: ci.companySecretary?.name,
        company_secretary_cell: ci.companySecretary?.cell,
        company_secretary_telephone: ci.companySecretary?.telephone,
        company_secretary_email: ci.companySecretary?.email
      });
      await conn.query('DELETE FROM corporate_phone WHERE stock_id=?', [stockId]);
      for (const p of ci.phone || []) {
        await conn.query('INSERT INTO corporate_phone (stock_id, phone) VALUES (?,?)', [stockId, p]);
      }
    }

    if (data.links) {
      const l = data.links;
      await conn.query('REPLACE INTO links SET ?', {
        stock_id: stockId,
        financial_statements: l.financialStatements,
        price_sensitive_information: l.priceSensitiveInformation
      });
    }

    if (data.financialPerformance) {
      const fp = data.financialPerformance;
      await conn.query('DELETE FROM interim_eps WHERE stock_id=?', [stockId]);
      for (const e of fp.interimEPS || []) {
        await conn.query(
          'INSERT INTO interim_eps (stock_id, year, period, ending_on, basic, diluted) VALUES (?,?,?,?,?,?)',
          [stockId, e.year, e.period, e.endingOn?.slice(0, 10), e.basic, e.diluted]
        );
      }
      await conn.query('DELETE FROM period_end_market_price WHERE stock_id=?', [stockId]);
      for (const p of fp.periodEndMarketPrice || []) {
        await conn.query(
          'INSERT INTO period_end_market_price (stock_id, period, price) VALUES (?,?,?)',
          [stockId, p.period, p.price]
        );
      }
      for (const a of fp.auditedEPS || []) {
        await conn.query(
          'INSERT INTO audited_eps (stock_id, year, eps) VALUES (?,?,?) ON DUPLICATE KEY UPDATE eps=VALUES(eps)',
          [stockId, a.year, a.eps]
        );
      }
    }

    await conn.commit();
    return { id: stockId };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

// API routes mirroring /api/stocks
app.get('/api/health', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT 1 AS ok');
    res.json({ status: 'ok', db: rows[0].ok === 1 });
  } catch (e) {
    res.status(500).json({ status: 'error', message: e.message });
  }
});

app.post('/api/stocks/fetch', async (req, res) => {
  const { tradingCode } = req.body;
  if (!tradingCode) return res.status(400).json({ message: 'tradingCode required' });
  try {
    const stockData = await scraper.fetchStockData(tradingCode.toUpperCase());
    await upsertStock(stockData);
    res.json({ message: 'Stored', data: stockData });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

app.post('/api/stocks/refresh/:tradingCode', async (req, res) => {
  const { tradingCode } = req.params;
  try {
    const stockData = await scraper.fetchStockData(tradingCode.toUpperCase());
    await upsertStock(stockData);
    res.json({ message: 'Refreshed', data: stockData });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

app.get('/api/stocks', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM stocks');
    res.json(rows);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

app.get('/api/stocks/:tradingCode', async (req, res) => {
  const { tradingCode } = req.params;
  try {
    const [stocks] = await pool.query('SELECT * FROM stocks WHERE trading_code=?', [tradingCode]);
    if (!stocks.length) return res.status(404).json({ message: 'Not found' });
    const stockId = stocks[0].id;
    const [market] = await pool.query('SELECT * FROM market_information WHERE stock_id=?', [stockId]);
    const [basic] = await pool.query('SELECT * FROM basic_information WHERE stock_id=?', [stockId]);
    const [corpActions] = await pool.query('SELECT * FROM corporate_actions WHERE stock_id=?', [stockId]);
    const [cashDividends] = await pool.query('SELECT year, percentage FROM cash_dividends WHERE stock_id=? ORDER BY year', [stockId]);
    const [bonusIssues] = await pool.query('SELECT year, percentage FROM bonus_issues WHERE stock_id=? ORDER BY year', [stockId]);
    const [rightIssues] = await pool.query('SELECT year, ratio FROM right_issues WHERE stock_id=? ORDER BY year', [stockId]);
    const [links] = await pool.query('SELECT * FROM links WHERE stock_id=?', [stockId]);
    const [highlights] = await pool.query('SELECT * FROM financial_highlights WHERE stock_id=?', [stockId]);
    const [phones] = await pool.query('SELECT phone FROM corporate_phone WHERE stock_id=?', [stockId]);
    const [corpInfo] = await pool.query('SELECT * FROM corporate_information WHERE stock_id=?', [stockId]);
    const [interimEPS] = await pool.query('SELECT year, period, ending_on AS endingOn, basic, diluted FROM interim_eps WHERE stock_id=? ORDER BY year, period', [stockId]);
    const [periodEndPrice] = await pool.query('SELECT period, price FROM period_end_market_price WHERE stock_id=? ORDER BY id', [stockId]);
    const [auditedEPS] = await pool.query('SELECT year, eps FROM audited_eps WHERE stock_id=? ORDER BY year', [stockId]);
    const [shareholdingRows] = await pool.query('SELECT as_on AS asOn, sponsor_director AS sponsorDirector, government, institute, foreign_share AS foreignShare, public FROM shareholding WHERE stock_id=? ORDER BY as_on', [stockId]);

    const apiData = {
      companyName: stocks[0].company_name,
      tradingCode: stocks[0].trading_code,
      scripCode: stocks[0].scrip_code,
      sector: stocks[0].sector,
      marketInformation: market[0] ? {
        asOfDate: market[0].as_of_date,
        lastTradingPrice: market[0].last_trading_price,
        closingPrice: market[0].closing_price,
        change: market[0].change_amount,
        changePercentage: market[0].change_percentage,
        openingPrice: market[0].opening_price,
        adjustedOpeningPrice: market[0].adjusted_opening_price,
        yesterdaysClosingPrice: market[0].yesterdays_closing_price,
        daysRange: { low: market[0].days_range_low, high: market[0].days_range_high },
        fiftyTwoWeeksMovingRange: { low: market[0].fifty_two_weeks_low, high: market[0].fifty_two_weeks_high },
        daysValue: market[0].days_value,
        daysVolume: market[0].days_volume,
        daysTradeCount: market[0].days_trade_count,
        marketCapitalization: market[0].market_capitalization
      } : null,
      basicInformation: basic[0] ? {
        authorizedCapital: basic[0].authorized_capital,
        paidUpCapital: basic[0].paid_up_capital,
        faceValue: basic[0].face_value,
        totalOutstandingSecurities: basic[0].total_outstanding_securities,
        typeOfInstrument: basic[0].type_of_instrument,
        marketLot: basic[0].market_lot,
        listingYear: basic[0].listing_year,
        marketCategory: basic[0].market_category,
        isElectronicShare: !!basic[0].is_electronic_share
      } : null,
      financialPerformance: {
        interimEPS: interimEPS,
        periodEndMarketPrice: periodEndPrice,
        auditedEPS: auditedEPS
      },
      // Always return lists even if corporate_actions header row is missing
      corporateActions: {
        lastAGMDate: corpActions[0]?.last_agm_date || null,
        forYearEnded: corpActions[0]?.for_year_ended || null,
        cashDividends: cashDividends,
        bonusIssues: bonusIssues,
        rightIssues: rightIssues
      },
      financialHighlights: highlights[0] ? {
        yearEnd: highlights[0].year_end,
        loanStatus: {
          asOn: highlights[0].loan_as_on,
          shortTermLoan: highlights[0].short_term_loan,
          longTermLoan: highlights[0].long_term_loan
        }
      } : null,
      shareholding: shareholdingRows,
      corporateInformation: corpInfo[0] ? {
        address: corpInfo[0].address,
        phone: phones.map(p => p.phone),
        email: corpInfo[0].email,
        website: corpInfo[0].website,
        companySecretary: {
          name: corpInfo[0].company_secretary_name,
          cell: corpInfo[0].company_secretary_cell,
          telephone: corpInfo[0].company_secretary_telephone,
          email: corpInfo[0].company_secretary_email
        }
      } : null,
      links: links[0] || null
    };

    res.json(apiData);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// Bulk fetch state and endpoints
let bulkState = {
  isRunning: false,
  total: 0,
  completed: 0,
  current: null,
  startedAt: null,
  stopped: false,
  errors: []
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

app.post('/api/stocks/bulk-fetch', async (req, res) => {
  try {
    if (bulkState.isRunning) {
      return res.status(409).json({ success: false, message: 'Bulk fetch is already running', data: bulkState });
    }
    bulkState = {
      isRunning: true,
      total: tradingCodes.length,
      completed: 0,
      current: null,
      startedAt: new Date().toISOString(),
      stopped: false,
      errors: []
    };

    // Start background job without blocking response
    (async () => {
      for (const code of tradingCodes) {
        if (bulkState.stopped) break;
        bulkState.current = code;
        try {
          const data = await scraper.fetchStockData(code);
          await upsertStock(data);
          bulkState.completed += 1;
        } catch (err) {
          bulkState.errors.push({ code, error: err.message });
        }
        // Be gentle to DSE website
        await sleep(800);
      }
      bulkState.isRunning = false;
      bulkState.current = null;
    })().catch(err => {
      bulkState.errors.push({ code: bulkState.current, error: err.message });
      bulkState.isRunning = false;
      bulkState.current = null;
    });

    res.json({ success: true, message: 'Bulk fetch started', data: bulkState });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/api/stocks/bulk-fetch/progress', (req, res) => {
  res.json({ success: true, data: bulkState });
});

app.post('/api/stocks/bulk-fetch/stop', (req, res) => {
  bulkState.stopped = true;
  res.json({ success: true, message: 'Stopping bulk fetch', data: bulkState });
});

// Initialize schema and start server
ensureSchema().then(() => {
  app.listen(PORT, () => {
    console.log(`SQL Backend running on http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error('Failed to ensure schema', err);
  process.exit(1);
});