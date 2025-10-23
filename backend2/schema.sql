-- MySQL schema for dse_stocks (tables only; database selected by connection)

-- Core stock table (one row per trading code)
CREATE TABLE IF NOT EXISTS stocks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  company_name VARCHAR(255) NOT NULL,
  trading_code VARCHAR(64) NOT NULL UNIQUE,
  scrip_code VARCHAR(64) NOT NULL,
  sector VARCHAR(128) NOT NULL,
  last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Market information (1:1)
CREATE TABLE IF NOT EXISTS market_information (
  stock_id INT NOT NULL,
  as_of_date DATE NOT NULL,
  last_trading_price DECIMAL(12,4) NOT NULL,
  closing_price DECIMAL(12,4) NOT NULL,
  change_amount DECIMAL(12,4) NOT NULL,
  change_percentage DECIMAL(9,4) NOT NULL,
  opening_price DECIMAL(12,4) NOT NULL,
  adjusted_opening_price DECIMAL(12,4) NOT NULL,
  yesterdays_closing_price DECIMAL(12,4) NOT NULL,
  days_range_low DECIMAL(12,4) NOT NULL,
  days_range_high DECIMAL(12,4) NOT NULL,
  fifty_two_weeks_low DECIMAL(12,4) NOT NULL,
  fifty_two_weeks_high DECIMAL(12,4) NOT NULL,
  days_value DECIMAL(18,4) NOT NULL,
  days_volume BIGINT NOT NULL,
  days_trade_count INT NOT NULL,
  market_capitalization DECIMAL(18,4) NOT NULL,
  PRIMARY KEY (stock_id),
  FOREIGN KEY (stock_id) REFERENCES stocks(id) ON DELETE CASCADE
);

-- Basic information (1:1)
CREATE TABLE IF NOT EXISTS basic_information (
  stock_id INT NOT NULL,
  authorized_capital DECIMAL(18,4) NOT NULL,
  paid_up_capital DECIMAL(18,4) NOT NULL,
  face_value DECIMAL(12,4) NOT NULL,
  total_outstanding_securities BIGINT NOT NULL,
  type_of_instrument VARCHAR(128) NOT NULL,
  market_lot INT NOT NULL,
  listing_year INT NOT NULL,
  market_category VARCHAR(32) NOT NULL,
  is_electronic_share BOOLEAN NOT NULL,
  PRIMARY KEY (stock_id),
  FOREIGN KEY (stock_id) REFERENCES stocks(id) ON DELETE CASCADE
);

-- Financial performance: interim EPS (1:N)
CREATE TABLE IF NOT EXISTS interim_eps (
  id INT AUTO_INCREMENT PRIMARY KEY,
  stock_id INT NOT NULL,
  year INT NOT NULL,
  period VARCHAR(64) NOT NULL,
  ending_on DATE NOT NULL,
  basic DECIMAL(12,4) NOT NULL,
  diluted DECIMAL(12,4) NULL,
  FOREIGN KEY (stock_id) REFERENCES stocks(id) ON DELETE CASCADE
);

-- Financial performance: period end market price (1:N)
CREATE TABLE IF NOT EXISTS period_end_market_price (
  id INT AUTO_INCREMENT PRIMARY KEY,
  stock_id INT NOT NULL,
  period VARCHAR(64) NOT NULL,
  price DECIMAL(12,4) NOT NULL,
  FOREIGN KEY (stock_id) REFERENCES stocks(id) ON DELETE CASCADE
);

-- Financial performance: audited EPS (1:N)
CREATE TABLE IF NOT EXISTS audited_eps (
  id INT AUTO_INCREMENT PRIMARY KEY,
  stock_id INT NOT NULL,
  year INT NOT NULL,
  eps DECIMAL(12,4) NULL,
  UNIQUE KEY uniq_audited_year (stock_id, year),
  FOREIGN KEY (stock_id) REFERENCES stocks(id) ON DELETE CASCADE
);

-- Corporate actions (dates 1:1, lists 1:N)
CREATE TABLE IF NOT EXISTS corporate_actions (
  stock_id INT NOT NULL,
  last_agm_date DATE NULL,
  for_year_ended DATE NULL,
  PRIMARY KEY (stock_id),
  FOREIGN KEY (stock_id) REFERENCES stocks(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS cash_dividends (
  id INT AUTO_INCREMENT PRIMARY KEY,
  stock_id INT NOT NULL,
  year INT NOT NULL,
  percentage DECIMAL(9,4) NOT NULL,
  FOREIGN KEY (stock_id) REFERENCES stocks(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS bonus_issues (
  id INT AUTO_INCREMENT PRIMARY KEY,
  stock_id INT NOT NULL,
  year INT NOT NULL,
  percentage DECIMAL(9,4) NOT NULL,
  FOREIGN KEY (stock_id) REFERENCES stocks(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS right_issues (
  id INT AUTO_INCREMENT PRIMARY KEY,
  stock_id INT NOT NULL,
  year INT NOT NULL,
  ratio VARCHAR(32) NOT NULL,
  FOREIGN KEY (stock_id) REFERENCES stocks(id) ON DELETE CASCADE
);

-- Financial highlights (1:1)
CREATE TABLE IF NOT EXISTS financial_highlights (
  stock_id INT NOT NULL,
  year_end VARCHAR(32) NOT NULL,
  loan_as_on DATE NOT NULL,
  short_term_loan DECIMAL(18,4) NOT NULL,
  long_term_loan DECIMAL(18,4) NOT NULL,
  PRIMARY KEY (stock_id),
  FOREIGN KEY (stock_id) REFERENCES stocks(id) ON DELETE CASCADE
);

-- Shareholding (1:N time series)
CREATE TABLE IF NOT EXISTS shareholding (
  id INT AUTO_INCREMENT PRIMARY KEY,
  stock_id INT NOT NULL,
  as_on DATE NOT NULL,
  sponsor_director DECIMAL(9,4) NOT NULL,
  government DECIMAL(9,4) NOT NULL,
  institute DECIMAL(9,4) NOT NULL,
  foreign_share DECIMAL(9,4) NOT NULL,
  public DECIMAL(9,4) NOT NULL,
  FOREIGN KEY (stock_id) REFERENCES stocks(id) ON DELETE CASCADE
);

-- Corporate information (1:1 plus phone list)
CREATE TABLE IF NOT EXISTS corporate_information (
  stock_id INT NOT NULL,
  address TEXT NOT NULL,
  email VARCHAR(255) NOT NULL,
  website VARCHAR(255) NOT NULL,
  company_secretary_name VARCHAR(255) NOT NULL,
  company_secretary_cell VARCHAR(64) NOT NULL,
  company_secretary_telephone VARCHAR(64) NOT NULL,
  company_secretary_email VARCHAR(255) NOT NULL,
  PRIMARY KEY (stock_id),
  FOREIGN KEY (stock_id) REFERENCES stocks(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS corporate_phone (
  id INT AUTO_INCREMENT PRIMARY KEY,
  stock_id INT NOT NULL,
  phone VARCHAR(64) NOT NULL,
  FOREIGN KEY (stock_id) REFERENCES stocks(id) ON DELETE CASCADE
);

-- Links (1:1)
CREATE TABLE IF NOT EXISTS links (
  stock_id INT NOT NULL,
  financial_statements VARCHAR(1024),
  price_sensitive_information VARCHAR(1024),
  PRIMARY KEY (stock_id),
  FOREIGN KEY (stock_id) REFERENCES stocks(id) ON DELETE CASCADE
);

CREATE OR REPLACE VIEW latest_market_snapshot AS
SELECT 
    s.id AS stock_id,
    s.company_name,
    s.trading_code,
    s.sector,
    m.as_of_date,
    m.last_trading_price,
    m.closing_price,
    m.change_amount,
    m.change_percentage,
    m.days_value,
    m.days_volume,
    m.market_capitalization
FROM 
    stocks s
JOIN 
    market_information m 
    ON s.id = m.stock_id;
