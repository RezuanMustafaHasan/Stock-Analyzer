import axios from 'axios';
import * as cheerio from 'cheerio';

class StockScraper {
  constructor() {
    this.baseUrl = 'https://www.dsebd.org/displayCompany.php';
  }

  async fetchStockData(tradingCode) {
    try {
      const url = `${this.baseUrl}?name=${tradingCode}`;
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });

      const $ = cheerio.load(response.data);
      // Debug: top-level indicators
      const bodyHeadCount = $('h2.BodyHead').length;
      const tableCount = $('table.table-bordered').length;
      const firstHead = $('h2.BodyHead').first().text().trim().slice(0, 80);
      console.log(`[Scrape ${tradingCode}] BodyHead: ${bodyHeadCount}, tables: ${tableCount}, first: ${firstHead}`);

      const companyName = this.extractCompanyName($);
      const scripCode = this.extractScripCode($);
      const sector = this.extractSector($);
      const marketInformation = this.extractMarketInformation($);
      const basicInformation = this.extractBasicInformation($);
      const financialPerformance = this.extractFinancialPerformance($);
      const corporateActions = this.extractCorporateActions($);
      const financialHighlights = this.extractFinancialHighlights($);
      const shareholding = this.extractShareholding($);
      const corporateInformation = this.extractCorporateInformation($);
      const links = this.extractLinks($, tradingCode);

      return {
        companyName,
        tradingCode,
        scripCode,
        sector,
        marketInformation,
        basicInformation,
        financialPerformance,
        corporateActions,
        financialHighlights,
        shareholding,
        corporateInformation,
        links,
        lastUpdated: new Date()
      };
    } catch (error) {
      throw new Error(`Failed to fetch data for ${tradingCode}: ${error.message}`);
    }
  }

  extractCompanyName($) {
    // Prefer the BodyHead heading: "Company Name: <i>...</i>"
    const bodyHead = $('h2.BodyHead:contains("Company Name:")');
    if (bodyHead.length > 0) {
      const italic = bodyHead.find('i').first().text().trim();
      if (italic) return italic;
      // Fallback: parse text after label
      const txt = bodyHead.text();
      const m = txt.match(/Company Name:\s*(.+?)(?:\s*Trading Code:|$)/);
      if (m && m[1]) return m[1].trim();
    }
    // Backup approaches similar to original backend
    let companyNameText = $('td:contains("Company Name:")').next().text().trim();
    if (!companyNameText) {
      const el = $('*:contains("Company Name:")').first();
      if (el.length) {
        const full = el.text();
        const m = full.match(/Company Name:\s*(.+?)(?:\s*Trading Code:|$)/);
        if (m && m[1]) companyNameText = m[1].trim();
      }
    }
    if (companyNameText) companyNameText = companyNameText.replace(/\.$/, '').trim();
    return companyNameText || 'N/A';
  }

  extractScripCode($) {
    const scripCodeText = $('td:contains("Scrip Code:")').next().text().trim();
    return scripCodeText || 'N/A';
  }

  extractSector($) {
    // Sector appears in Basic Information table; anchor by the BodyHead heading
    const basicHead = $('h2.BodyHead:contains("Basic Information")');
    let table = null;
    if (basicHead.length) {
      table = basicHead.nextAll('.table-responsive').first().find('table.table-bordered');
    }
    if (!table || table.length === 0) {
      table = $('table.table-bordered').filter((i, el) => $(el).find('th:contains("Authorized Capital")').length > 0);
    }
    const sectorText = table.find('th:contains("Sector")').next('td').text().trim();
    return sectorText || 'Unknown';
  }

  extractMarketInformation($) {
    const extractNumber = (text) => {
      if (!text) return 0;
      const cleaned = (text || '').replace(/[\s,]+/g, '').replace(/[^\d.-]/g, '');
      const val = parseFloat(cleaned);
      return isNaN(val) ? 0 : val;
    };

    const marketTable = $('table.table-bordered').filter((i, el) => {
      return $(el).find('th:contains("Last Trading Price")').length > 0;
    });

    const lastTradingPrice = extractNumber(marketTable.find('th:contains("Last Trading Price")').next('td').text());
    const closingPrice = extractNumber(marketTable.find('th:contains("Closing Price")').next('td').text());
    const openingPrice = extractNumber(marketTable.find('th:contains("Opening Price")').next('td').text());
    const adjustedOpeningPrice = extractNumber(marketTable.find('th:contains("Adjusted Opening Price")').next('td').text());
    const yesterdaysClosingPrice = extractNumber(marketTable.find('th:contains("Yesterday\'s Closing Price")').next('td').text());

    const changeCell = marketTable.find('th:contains("Change")').next('td');
    const change = extractNumber(changeCell.text());
    const changePercentageCell = changeCell.parent().next('tr').find('td').first();
    const changePercentage = extractNumber(changePercentageCell.text());

    const parseRange = (rangeText) => {
      const parts = (rangeText || '')
        .split(/\s*[-–—]\s*/)
        .map(part => extractNumber(part));
      return { low: parts[0] || 0, high: parts[1] || parts[0] || 0 };
    };

    const daysRangeText = marketTable.find('th:contains("Day\'s Range")').next('td').text();
    const daysRange = parseRange(daysRangeText);

    const fiftyTwoWeeksRangeText = marketTable.find('th:contains("52 Weeks\' Moving Range")').next('td').text();
    const fiftyTwoWeeksMovingRange = parseRange(fiftyTwoWeeksRangeText);

    const daysValue = extractNumber(marketTable.find('th:contains("Day\'s Value")').next('td').text()) * 1000000;
    const daysVolume = extractNumber(marketTable.find('th:contains("Day\'s Volume")').next('td').text());
    const daysTradeCount = extractNumber(marketTable.find('th:contains("Day\'s Trade")').next('td').text());
    const marketCapitalization = extractNumber(marketTable.find('th:contains("Market Capitalization")').next('td').text()) * 1000000;

    return {
      asOfDate: new Date().toISOString(),
      lastTradingPrice,
      closingPrice,
      change,
      changePercentage,
      openingPrice,
      adjustedOpeningPrice,
      yesterdaysClosingPrice,
      daysRange,
      fiftyTwoWeeksMovingRange,
      daysValue,
      daysVolume,
      daysTradeCount,
      marketCapitalization
    };
  }

  extractBasicInformation($) {
    const extractNumber = (text) => {
      if (!text) return 0;
      const cleaned = text.replace(/[^\d.-]/g, '');
      return parseFloat(cleaned) || 0;
    };

    const basicTable = $('table.table-bordered').filter((i, el) => {
      return $(el).find('th:contains("Authorized Capital")').length > 0;
    });

    const otherInfoTable = $('table.table-bordered').filter((i, el) => {
      return $(el).find('td:contains("Listing Year")').length > 0;
    });

    const authorizedCapital = extractNumber(basicTable.find('th:contains("Authorized Capital")').next('td').text());
    const paidUpCapital = extractNumber(basicTable.find('th:contains("Paid-up Capital")').next('td').text());
    const faceValue = extractNumber(basicTable.find('th:contains("Face/par Value")').next('td').text());
    const totalOutstandingSecurities = extractNumber(basicTable.find('th:contains("Total No. of Outstanding Securities")').next('td').text());
    const typeOfInstrument = basicTable.find('th:contains("Type of Instrument")').next('td').text().trim() || 'Equity';
    const marketLot = extractNumber(basicTable.find('th:contains("Market Lot")').next('td').text()) || 1;
    const marketCategory = otherInfoTable.find('td:contains("Market Category")').next('td').text().trim() || 'N/A';
    const listingYear = extractNumber(otherInfoTable.find('td:contains("Listing Year")').next('td').text()) || 2000;
    const isElectronicShare = (otherInfoTable.find('td:contains("Electronic Share")').next('td').text().trim() || '').toLowerCase().includes('yes');

    return {
      authorizedCapital,
      paidUpCapital,
      faceValue,
      totalOutstandingSecurities,
      typeOfInstrument,
      marketLot,
      listingYear,
      marketCategory,
      isElectronicShare
    };
  }

  extractFinancialPerformance($) {
    const extractNumber = (text) => {
      if (!text) return null;
      const cleaned = text.replace(/[^\d.-]/g, '');
      const num = parseFloat(cleaned);
      return isNaN(num) ? null : num;
    };

    let interimTable = null;
    let auditedTable = null;
    $('h2.BodyHead').each((i, el) => {
      const headingText = $(el).text();
      if (headingText.includes('Interim Financial Performance')) {
        interimTable = $(el).nextAll('.table-responsive').first().find('table.table-bordered');
        console.log(`[Scrape] Found interim heading, tables=${interimTable.length}, rows=${interimTable.find('tr').length}`);
      }
      if (headingText.includes('Financial Performance as per Audited Financial Statements')) {
        auditedTable = $(el).nextAll('.table-responsive').first().find('table.table-bordered');
        console.log(`[Scrape] Found audited heading, tables=${auditedTable.length}, rows=${auditedTable.find('tr').length}`);
      }
    });

    const interimEPS = [];
    const periodEndMarketPrice = [];
    const auditedEPS = [];

    if (interimTable && interimTable.length > 0) {
      let foundEPSHeader = false;
      interimTable.find('tr').each((i, row) => {
        const $row = $(row);
        if ($row.hasClass('header') && $row.find('td').text().includes('Earnings Per Share (EPS)') && !$row.find('td').text().includes('continuing operations')) {
          foundEPSHeader = true;
          return true;
        }
        if (foundEPSHeader && $row.find('td').first().text().trim() === 'Basic') {
          const epsCells = $row.find('td');
          epsCells.each((index, cell) => {
            if (index > 0) {
              const cellText = $(cell).text().trim();
              const value = extractNumber(cellText);
              if (value !== null && cellText !== '-') {
                const periodName = index === 1 ? 'Q1' : index === 2 ? 'Q2' : index === 3 ? 'Half Yearly' : index === 4 ? 'Q3' : index === 5 ? '9 Months' : 'Annual';
                interimEPS.push({
                  year: new Date().getFullYear(),
                  period: periodName,
                  endingOn: new Date().toISOString(),
                  basic: value,
                  diluted: null
                });
              }
            }
          });
          foundEPSHeader = false;
          return false;
        }
      });

      const priceHeaderRow = interimTable.find('tr').filter((i, el) => $(el).text().includes('Market price per share at period end'));
      const priceRow = priceHeaderRow.next('tr');
      if (priceRow && priceRow.length > 0) {
        const cells = priceRow.find('td');
        cells.each((index, cell) => {
          if (index > 0) {
            const cellText = $(cell).text().trim();
            const value = extractNumber(cellText);
            if (value !== null && cellText !== '-') {
              const periodName = index === 1 ? 'Q1' : index === 2 ? 'Q2' : index === 3 ? 'Half Yearly' : index === 4 ? 'Q3' : index === 5 ? '9 Months' : 'Annual';
              periodEndMarketPrice.push({ period: periodName, price: value });
            }
          }
        });
      }
    }

    if (auditedTable && auditedTable.length > 0) {
      try {
        auditedTable.find('tr').each((i, row) => {
          const $row = $(row);
          if ($row.hasClass('header')) return; // skip headers
          const cells = $row.find('td');
          if (cells.length < 2) return;
          const yearText = $(cells[0]).text().trim();
          const yearMatch = yearText.match(/\b(20\d{2})\b/);
          if (!yearMatch) return;
          const year = parseInt(yearMatch[1], 10);
          // Prefer Continuing Operations Basic Original if available
          let epsText;
          if (cells.length >= 8) {
            epsText = $(cells[4]).text().trim();
          } else {
            epsText = $(cells[1]).text().trim();
          }
          const eps = extractNumber(epsText);
          if (eps !== null) {
            auditedEPS.push({ year, eps });
          }
        });
      } catch (e) {
        // swallow parse errors to avoid breaking scrape
      }
    }

    return { interimEPS, periodEndMarketPrice, auditedEPS };
  }

  extractCorporateActions($) {
    // Find the corporate actions table robustly
    let table = $('h2.BodyHead:contains("Corporate Actions")')
      .nextAll('.table-responsive').first().find('table.table-bordered');
    if (!table || table.length === 0) {
      table = $('th:contains("Cash Dividend")').closest('table');
    }
    if (!table || table.length === 0) return null;

    const textFor = (selector) => {
      const el = table.find(selector).first();
      return el.length ? el.next('td').text().trim() : '';
    };

    const lastAGMText = textFor('th:contains("Last AGM")') || textFor('th:contains("Last AGM held on")');
    const forYearEndedText = textFor('th:contains("For the year ended")');

    // Fallback: extract dates from the header row text if cells not split
    const headerText = table.find('tr').first().text().trim();
    const agmMatch = headerText.match(/Last\s+AGM\s+held\s+on:\s*([0-9]{2}-[0-9]{2}-[0-9]{4})/i);
    const yearEndedMatch = headerText.match(/For\s+the\s+year\s+ended:\s*([A-Za-z]{3}\s+\d{1,2},\s*\d{4})/i);

    // Page-level fallback if header row doesn’t contain the dates
    const pageText = $.root().text();
    const agmGlobalMatch = pageText.match(/Last\s+AGM\s+held\s+on:\s*([0-9]{2}-[0-9]{2}-[0-9]{4})/i);
    const yearEndedGlobalMatch = pageText.match(/For\s+the\s+year\s+ended:\s*([A-Za-z]{3}\s+\d{1,2},\s*\d{4})/i);

    const agmDateStr = lastAGMText || (agmMatch ? agmMatch[1] : (agmGlobalMatch ? agmGlobalMatch[1] : ''));
    const yearEndedStr = forYearEndedText || (yearEndedMatch ? yearEndedMatch[1] : (yearEndedGlobalMatch ? yearEndedGlobalMatch[1] : ''));

    const normalizeDateString = (input) => {
      if (!input) return '';
      const dmY = input.match(/^(\d{2})-(\d{2})-(\d{4})$/);
      if (dmY) {
        return `${dmY[3]}-${dmY[2]}-${dmY[1]}`; // YYYY-MM-DD
      }
      const d = new Date(input);
      if (!isNaN(d)) return d.toISOString().slice(0, 10);
      return '';
    };
    // Parse patterns like "5% 2023" and bonus/right ratio forms from the same row cell text
    const parseYearPercentsFromText = (text) => {
      const out = [];
      if (!text) return out;
      const percentRe = /(\d+(?:\.\d+)?)\s*%\s*([12]\d{3})/g;
      for (const m of text.matchAll(percentRe)) {
        out.push({ year: parseInt(m[2], 10), percentage: parseFloat(m[1]) });
      }
      const ratioRe = /(\d+)\s*B\s*:\s*(\d+)\s*([12]\d{3})/gi;
      for (const m of text.matchAll(ratioRe)) {
        const num = parseFloat(m[1]);
        const den = parseFloat(m[2]);
        if (den) {
          const pct = (num / den) * 100;
          out.push({ year: parseInt(m[3], 10), percentage: parseFloat(pct.toFixed(2)) });
        }
      }
      const ratioPlainRe = /(\d+)\s*:\s*(\d+)\s*([12]\d{3})/g;
      for (const m of text.matchAll(ratioPlainRe)) {
        const num = parseFloat(m[1]);
        const den = parseFloat(m[2]);
        if (den) {
          const pct = (num / den) * 100;
          out.push({ year: parseInt(m[3], 10), percentage: parseFloat(pct.toFixed(2)) });
        }
      }
      return out;
    };

    const parseRightIssuesFromText = (text) => {
      const out = [];
      if (!text) return out;
      const rightRe = /(\d+)\s*R\s*:\s*(\d+)\s*([12]\d{3})/gi;
      for (const m of text.matchAll(rightRe)) {
        const ratio = `${m[1]}R:${m[2]}`;
        out.push({ year: parseInt(m[3], 10), ratio });
      }
      return out;
    };

    const cashText = textFor('th:contains("Cash Dividend")');
    const bonusText = textFor('th:contains("Bonus Issue")') || textFor('th:contains("Bonus Issue (Stock Dividend)")');
    const rightText = textFor('th:contains("Right Issue")');

    const cashDividends = parseYearPercentsFromText(cashText);
    const bonusIssues = parseYearPercentsFromText(bonusText);
    const rightIssues = parseRightIssuesFromText(rightText);

    return {
      lastAGMDate: normalizeDateString(agmDateStr) || null,
      forYearEnded: normalizeDateString(yearEndedStr) || null,
      cashDividends,
      bonusIssues,
      rightIssues
    };
  }

  extractFinancialHighlights($) {
    // Anchor using the section heading (h2.BodyHead) then read its table
    let sectionHead = $('h2.BodyHead').filter((i, el) =>
      $(el).text().toLowerCase().includes('corporate performance')
    ).first();
    if (!sectionHead.length) {
      sectionHead = $('h2.BodyHead').filter((i, el) =>
        $(el).text().toLowerCase().includes('financial highlights')
      ).first();
    }
    let table = null;
    if (sectionHead.length) {
      table = sectionHead.nextAll('.table-responsive').first().find('table.table-bordered');
    } else {
      table = $('table.table-bordered').filter((i, el) => $(el).text().toLowerCase().includes('loan status')).first();
    }
    if (!table || table.length === 0) return null;

    const textOf = (el) => (el && el.length ? $(el).text().trim() : '');

    const parseDateFlexible = (t) => {
      if (!t) return null;
      // Support spelled months (full or 3-letter) and numeric forms
      const monthMap = {
        jan: 1, january: 1,
        feb: 2, february: 2,
        mar: 3, march: 3,
        apr: 4, april: 4,
        may: 5,
        jun: 6, june: 6,
        jul: 7, july: 7,
        aug: 8, august: 8,
        sep: 9, sept: 9, september: 9,
        oct: 10, october: 10,
        nov: 11, november: 11,
        dec: 12, december: 12
      };
      const spelled = t.match(/([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})/);
      if (spelled) {
        const monKey = spelled[1].toLowerCase();
        const month = monthMap[monKey] || monthMap[monKey.slice(0,3)];
        const day = parseInt(spelled[2], 10);
        const year = parseInt(spelled[3], 10);
        if (month && day && year) {
          const dd = String(day).padStart(2, '0');
          const mm = String(month).padStart(2, '0');
          return `${year}-${mm}-${dd}`;
        }
      }
      const numeric = t.match(/(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{4})/);
      if (numeric) {
        const day = parseInt(numeric[1], 10);
        const month = parseInt(numeric[2], 10);
        const year = parseInt(numeric[3], 10);
        if (day && month && year) {
          const dd = String(day).padStart(2, '0');
          const mm = String(month).padStart(2, '0');
          return `${year}-${mm}-${dd}`;
        }
      }
      return null;
    };

    // Year End may be present; attempt to read it if exists
    let yearEnd = '';
    table.find('tr').each((_, row) => {
      const txt = $(row).text().toLowerCase();
      if (txt.includes('year end')) {
        const tds = $(row).find('td');
        if (tds.length) {
          yearEnd = textOf(tds.last());
        }
      }
    });

    // Extract "as on" date from the header row like: "Present Loan Status as on December 31, 2024"
    let asOn = null;
    const headerRow = table.find('tr').filter((i, el) => {
      const s = $(el).text().toLowerCase();
      return s.includes('loan status') && s.includes('as on');
    }).first();
    if (headerRow.length) {
      const headerText = textOf(headerRow);
      asOn = parseDateFlexible(headerText) || asOn;
    }

    // Extract short-term and long-term loan amounts; the table uses td cells rather than th
    const extractNumber = (text) => {
      if (!text) return 0;
      const cleaned = text.replace(/[^\d.-]/g, '');
      return parseFloat(cleaned) || 0;
    };

    let shortTermLoan = 0;
    let longTermLoan = 0;
    const rows = table.find('tr').toArray();
    const loanHeaderIndex = rows.findIndex(r => {
      const s = $(r).text().toLowerCase();
      return s.includes('loan status') && s.includes('as on');
    });
    if (loanHeaderIndex >= 0) {
      for (let i = loanHeaderIndex + 1; i < rows.length; i++) {
        const $row = $(rows[i]);
        if ($row.hasClass('header')) break; // stop at next section header
        const tds = $row.find('td');
        if (tds.length >= 3) {
          const label = ($(tds[1]).text() || '').trim().toLowerCase();
          const valueText = ($(tds[2]).text() || '').trim();
          if (label.includes('short-term')) shortTermLoan = extractNumber(valueText);
          else if (label.includes('long-term')) longTermLoan = extractNumber(valueText);
        } else if (tds.length >= 2) {
          const label = ($(tds[0]).text() || '').trim().toLowerCase();
          const valueText = ($(tds[1]).text() || '').trim();
          if (label.includes('short-term')) shortTermLoan = extractNumber(valueText);
          else if (label.includes('long-term')) longTermLoan = extractNumber(valueText);
        }
      }
    }

    return {
      yearEnd,
      loanStatus: {
        asOn,
        shortTermLoan,
        longTermLoan
      }
    };
  }

  extractShareholding($) {
    const extractNumber = (text) => {
      if (!text) return 0;
      const cleaned = text.replace(/[^\d.-]/g, '');
      return parseFloat(cleaned) || 0;
    };
    const parseDateFlexible = (t) => {
      if (!t) return null;
      const monthMap = {
        jan: 1, january: 1,
        feb: 2, february: 2,
        mar: 3, march: 3,
        apr: 4, april: 4,
        may: 5,
        jun: 6, june: 6,
        jul: 7, july: 7,
        aug: 8, august: 8,
        sep: 9, sept: 9, september: 9,
        oct: 10, october: 10,
        nov: 11, november: 11,
        dec: 12, december: 12
      };
      const spelled = t.match(/([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})/);
      if (spelled) {
        const monKey = spelled[1].toLowerCase();
        const month = monthMap[monKey] || monthMap[monKey.slice(0,3)];
        const day = parseInt(spelled[2], 10);
        const year = parseInt(spelled[3], 10);
        if (month && day && year) {
          const dd = String(day).padStart(2, '0');
          const mm = String(month).padStart(2, '0');
          return `${year}-${mm}-${dd}`;
        }
      }
      const numeric = t.match(/(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{4})/);
      if (numeric) {
        const day = parseInt(numeric[1], 10);
        const month = parseInt(numeric[2], 10);
        const year = parseInt(numeric[3], 10);
        if (day && month && year) {
          const dd = String(day).padStart(2, '0');
          const mm = String(month).padStart(2, '0');
          return `${year}-${mm}-${dd}`;
        }
      }
      return null;
    };

    const shareholdingData = [];
    let otherInfoHead = $('h2.BodyHead').filter((i, el) =>
      $(el).text().toLowerCase().includes('other information of the company')
    ).first();
    if (!otherInfoHead.length) return shareholdingData;
    const otherInfoTable = otherInfoHead.nextAll('.table-responsive').first().find('table.table-bordered');
    if (!otherInfoTable || otherInfoTable.length === 0) return shareholdingData;

    otherInfoTable.find('tr').each((i, row) => {
      const $row = $(row);
      const firstCell = $row.find('td').first();
      const firstText = (firstCell.text() || '').trim();
      if (!firstText.toLowerCase().includes('share holding percentage')) return;

      const dateMatch = firstText.match(/\[as on\s+([^\]]+)\]/i);
      const asOnStr = dateMatch ? dateMatch[1].trim() : '';
      const asOn = parseDateFlexible(asOnStr);

      // Values are in a nested table inside the second td
      const nestedCells = $row.find('td').eq(1).find('table').find('td');
      const entry = {
        asOn: asOn || null,
        sponsorDirector: 0,
        government: 0,
        institute: 0,
        foreign: 0,
        public: 0
      };

      nestedCells.each((j, cell) => {
        const txt = ($(cell).text() || '').trim();
        const parts = txt.split(':');
        const label = (parts[0] || '').toLowerCase();
        const val = extractNumber((parts.slice(1).join(':') || '').trim());
        if (label.includes('sponsor')) entry.sponsorDirector = val;
        else if (label.includes('govt')) entry.government = val;
        else if (label.includes('institute')) entry.institute = val;
        else if (label.includes('foreign')) entry.foreign = val;
        else if (label.includes('public')) entry.public = val;
      });

      // Only push rows that have a date and at least one value
      const hasAnyValue = [entry.sponsorDirector, entry.government, entry.institute, entry.foreign, entry.public]
        .some(v => typeof v === 'number');
      if (asOn && hasAnyValue) {
        shareholdingData.push(entry);
      }
    });

    return shareholdingData;
  }

  extractCorporateInformation($) {
    const corporateTable = $('th:contains("Corporate Office")').closest('table');
    let address = 'N/A';
    let phone = [];
    let email = 'N/A';
    let website = 'N/A';
    const companySecretary = { name: 'N/A', cell: 'N/A', telephone: 'N/A', email: 'N/A' };

    if (corporateTable.length > 0) {
      const addressRow = corporateTable.find('td:contains("Address")');
      if (addressRow.length > 0) {
        address = addressRow.parent().find('td').last().text().trim() || 'N/A';
      }
      const phoneRow = corporateTable.find('td:contains("Phone")');
      if (phoneRow.length > 0) {
        const phoneText = phoneRow.parent().find('td').last().text().trim();
        phone = phoneText.split(',').map(p => p.trim()).filter(Boolean);
      }
      const emailRow = corporateTable.find('td:contains("E-mail")').first();
      if (emailRow.length > 0) {
        email = emailRow.parent().find('td').last().text().trim() || 'N/A';
      }
      const websiteRow = corporateTable.find('td:contains("Web")');
      if (websiteRow.length > 0) {
        const websiteLink = websiteRow.parent().find('td').last().find('a');
        if (websiteLink.length > 0) {
          website = websiteLink.attr('href') || websiteLink.text().trim() || 'N/A';
        } else {
          website = websiteRow.parent().find('td').last().text().trim() || 'N/A';
        }
      }
      const secretaryNameRow = corporateTable.find('td:contains("Company Secretary Name")');
      if (secretaryNameRow.length > 0) {
        companySecretary.name = secretaryNameRow.parent().find('td').last().text().trim() || 'N/A';
      }
      const secretaryCellRow = corporateTable.find('td:contains("Cell No.")');
      if (secretaryCellRow.length > 0) {
        companySecretary.cell = secretaryCellRow.parent().find('td').last().text().trim() || 'N/A';
      }
      const secretaryTelephoneRow = corporateTable.find('td:contains("Telephone No.")');
      if (secretaryTelephoneRow.length > 0) {
        companySecretary.telephone = secretaryTelephoneRow.parent().find('td').last().text().trim() || 'N/A';
      }
      const emailRows = corporateTable.find('td:contains("E-mail")');
      if (emailRows.length > 1) {
        companySecretary.email = $(emailRows[1]).parent().find('td').last().text().trim() || 'N/A';
      }
    }

    return { address, phone, email, website, companySecretary };
  }

  extractLinks($, tradingCode) {
    const linksTable = $('th:contains("Details of Financial Statement")').closest('table');
    let financialStatements = 'N/A';
    let priceSensitiveInformation = 'N/A';
    if (linksTable.length > 0) {
      const financialStatementsRow = linksTable.find('th:contains("Details of Financial Statement")');
      if (financialStatementsRow.length > 0) {
        const linkElement = financialStatementsRow.next('td').find('a');
        if (linkElement.length > 0) {
          financialStatements = linkElement.attr('href') || linkElement.text().trim();
        } else {
          financialStatements = financialStatementsRow.next('td').text().trim();
        }
      }
      const psiRow = linksTable.find('th:contains("Price Sensitive Information")');
      if (psiRow.length > 0) {
        const linkElement = psiRow.next('td').find('a');
        if (linkElement.length > 0) {
          priceSensitiveInformation = linkElement.attr('href') || linkElement.text().trim();
        } else {
          priceSensitiveInformation = psiRow.next('td').text().trim();
        }
      }
    }
    return { financialStatements, priceSensitiveInformation };
  }
}

const scraper = new StockScraper();
export default scraper;