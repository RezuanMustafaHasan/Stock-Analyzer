import { pool } from '../db.js';

export async function upsertStock(data) {
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
      await conn.query('REPLACE INTO corporate_actions SET ?', {
        stock_id: stockId,
        last_agm_date: lastAGM,
        for_year_ended: yearEnded
      });
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
        if (!asOn) continue;
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
