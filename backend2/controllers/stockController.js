import { pool } from '../db.js';
import scraper from '../services/stockScraper.js';
import { upsertStock } from '../services/stockService.js';

export const listStocks = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM stocks');
    res.json(rows);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

export const getStockByCode = async (req, res) => {
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
};

export const fetchStockData = async (req, res) => {
  const { tradingCode } = req.body;
  if (!tradingCode) return res.status(400).json({ message: 'tradingCode required' });
  
  try {
    const stockData = await scraper.fetchStockData(tradingCode.toUpperCase());
    await upsertStock(stockData);
    res.json({ message: 'Stored', data: stockData });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

export const refreshStockData = async (req, res) => {
  const { tradingCode } = req.params;
  try {
    const stockData = await scraper.fetchStockData(tradingCode.toUpperCase());
    await upsertStock(stockData);
    res.json({ message: 'Refreshed', data: stockData });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

export const getPERatio = async (req, res) => {
  const { year, order = 'ASC' } = req.query;
  
  if (!year) {
    return res.status(400).json({ message: 'Year parameter is required' });
  }
  
  const orderBy = order.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
  
  try {
    const query = `
      SELECT 
        s.trading_code,
        s.company_name,
        m.last_trading_price AS ltp,
        a.eps,
        CASE 
          WHEN a.eps IS NOT NULL AND a.eps != 0 THEN m.last_trading_price / a.eps
          ELSE NULL
        END AS pe_ratio,
        cd.percentage AS cash_dividend,
        bi.percentage AS bonus_issue
      FROM stocks s
      LEFT JOIN market_information m ON s.id = m.stock_id
      LEFT JOIN audited_eps a ON s.id = a.stock_id AND a.year = ?
      LEFT JOIN cash_dividends cd ON s.id = cd.stock_id AND cd.year = ?
      LEFT JOIN bonus_issues bi ON s.id = bi.stock_id AND bi.year = ?
      WHERE m.last_trading_price IS NOT NULL 
        AND a.eps IS NOT NULL 
        AND a.eps != 0
      ORDER BY pe_ratio ${orderBy}
    `;
    
    const [rows] = await pool.query(query, [year, year, year]);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};
