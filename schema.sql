-- ============================================================
-- Stock Analysis and Forecasting System — Database Schema
-- Database: SQLite (file: stockapp.db)
-- ============================================================

-- ----------------------------------------------------------------
-- 1. STOCKS  — master reference table
--    One row per stock symbol the system knows about.
-- ----------------------------------------------------------------
CREATE TABLE stocks (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    symbol        TEXT UNIQUE NOT NULL,        -- e.g. 'TCS', 'RELIANCE'
    company_name  TEXT,                        -- e.g. 'Tata Consultancy Services'
    sector        TEXT,                        -- e.g. 'IT Services'
    exchange      TEXT DEFAULT 'NSE',          -- NSE / BSE
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------
-- 2. STOCK_PRICE_HISTORY — historical OHLCV + computed indicators
--    One row per (symbol, date). This is what data_fetcher +
--    data_processor produce, now persisted instead of only
--    living in memory for a single request.
-- ----------------------------------------------------------------
CREATE TABLE stock_price_history (
    id                    INTEGER PRIMARY KEY AUTOINCREMENT,
    symbol                TEXT NOT NULL,
    date                  DATE NOT NULL,
    open                  REAL,
    high                  REAL,
    low                   REAL,
    close                 REAL,
    volume                REAL,
    ma_5                  REAL,               -- 5-day moving average
    ma_20                 REAL,               -- 20-day moving average
    rsi                   REAL,               -- Relative Strength Index
    macd                  REAL,               -- MACD indicator
    volatility            REAL,
    daily_change          REAL,
    daily_change_percent  REAL,
    FOREIGN KEY (symbol) REFERENCES stocks(symbol),
    UNIQUE (symbol, date)                     -- prevents duplicate rows per day
);

-- ----------------------------------------------------------------
-- 3. PREDICTIONS — output of the ML forecasting models
--    One row per predicted future date, per model run.
-- ----------------------------------------------------------------
CREATE TABLE predictions (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    symbol            TEXT NOT NULL,
    model_type        TEXT NOT NULL,           -- ensemble / random_forest / gradient_boosting / mlp / ridge_regression / svr
    periods           INTEGER NOT NULL,        -- how many days ahead was requested (7/14/30/...)
    predicted_date    DATE NOT NULL,           -- the future date this row forecasts
    predicted_price   REAL NOT NULL,
    upper_bound       REAL,
    lower_bound       REAL,
    change_value      REAL,
    change_percent    REAL,
    created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,  -- when the prediction was generated
    FOREIGN KEY (symbol) REFERENCES stocks(symbol)
);

-- ----------------------------------------------------------------
-- 4. WATCHLIST — stocks the user is tracking
-- ----------------------------------------------------------------
CREATE TABLE watchlist (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    symbol         TEXT UNIQUE NOT NULL,
    added_on       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes          TEXT,
    target_price   REAL,
    price_at_add   REAL,
    FOREIGN KEY (symbol) REFERENCES stocks(symbol)
);

-- ----------------------------------------------------------------
-- 5. MARKET_SENTIMENT — sentiment score per stock per date
-- ----------------------------------------------------------------
CREATE TABLE market_sentiment (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    symbol            TEXT NOT NULL,
    date              DATE NOT NULL,
    sentiment_score   REAL,                    -- e.g. -1.0 to +1.0
    sentiment_label   TEXT,                    -- 'Positive' / 'Negative' / 'Neutral'
    created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (symbol) REFERENCES stocks(symbol)
);

-- ----------------------------------------------------------------
-- Helpful indexes for lookup speed
-- ----------------------------------------------------------------
CREATE INDEX idx_price_history_symbol_date ON stock_price_history(symbol, date);
CREATE INDEX idx_predictions_symbol ON predictions(symbol);
CREATE INDEX idx_sentiment_symbol_date ON market_sentiment(symbol, date);
