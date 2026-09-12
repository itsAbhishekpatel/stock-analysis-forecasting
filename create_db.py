"""
Builds stockapp.db from schema.sql and inserts a small amount of
realistic sample data, so the database file is NOT empty when you
open it in DB Browser for SQLite for your viva demo.

Run:
    python create_db.py

Produces:
    stockapp.db   (in the same folder)
"""

import sqlite3
import os
from datetime import datetime, timedelta
import random

DB_PATH = os.path.join(os.path.dirname(__file__), 'stockapp.db')
SCHEMA_PATH = os.path.join(os.path.dirname(__file__), 'schema.sql')


def build_schema(conn):
    with open(SCHEMA_PATH, 'r') as f:
        conn.executescript(f.read())


def seed_stocks(conn):
    stocks = [
        ('TCS', 'Tata Consultancy Services', 'IT Services', 'NSE'),
        ('RELIANCE', 'Reliance Industries', 'Energy/Conglomerate', 'NSE'),
        ('INFY', 'Infosys Limited', 'IT Services', 'NSE'),
        ('HDFCBANK', 'HDFC Bank', 'Banking', 'NSE'),
        ('TATAMOTORS', 'Tata Motors', 'Automobile', 'NSE'),
    ]
    conn.executemany(
        "INSERT INTO stocks (symbol, company_name, sector, exchange) VALUES (?, ?, ?, ?)",
        stocks
    )


def seed_price_history(conn):
    """Generate ~30 days of plausible OHLCV + indicator data for each stock."""
    symbols_base_price = {
        'TCS': 3800,
        'RELIANCE': 2900,
        'INFY': 1650,
        'HDFCBANK': 1600,
        'TATAMOTORS': 780,
    }

    today = datetime.now().date()
    rows = []

    for symbol, base_price in symbols_base_price.items():
        price = base_price
        closes = []
        for i in range(30, 0, -1):
            date = today - timedelta(days=i)
            change_pct = random.uniform(-1.5, 1.5)
            open_p = price
            close_p = round(price * (1 + change_pct / 100), 2)
            high_p = round(max(open_p, close_p) * (1 + random.uniform(0, 0.5) / 100), 2)
            low_p = round(min(open_p, close_p) * (1 - random.uniform(0, 0.5) / 100), 2)
            volume = random.randint(500000, 3000000)

            closes.append(close_p)
            ma_5 = round(sum(closes[-5:]) / len(closes[-5:]), 2)
            ma_20 = round(sum(closes[-20:]) / len(closes[-20:]), 2)
            rsi = round(random.uniform(30, 70), 2)
            macd = round(random.uniform(-5, 5), 2)
            volatility = round(random.uniform(0.5, 3.5), 2)
            daily_change = round(close_p - open_p, 2)
            daily_change_pct = round((daily_change / open_p) * 100, 2)

            rows.append((
                symbol, date.isoformat(), open_p, high_p, low_p, close_p, volume,
                ma_5, ma_20, rsi, macd, volatility, daily_change, daily_change_pct
            ))

            price = close_p

    conn.executemany(
        """INSERT INTO stock_price_history
           (symbol, date, open, high, low, close, volume, ma_5, ma_20, rsi, macd,
            volatility, daily_change, daily_change_percent)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        rows
    )


def seed_predictions(conn):
    today = datetime.now().date()
    rows = []
    base_prices = {'TCS': 3820, 'RELIANCE': 2910, 'INFY': 1655}

    for symbol, base in base_prices.items():
        price = base
        for i in range(1, 8):  # 1 week ahead, 7 daily predictions
            date = today + timedelta(days=i)
            drift = random.uniform(-0.8, 1.0)
            price = round(price * (1 + drift / 100), 2)
            upper = round(price * 1.02, 2)
            lower = round(price * 0.98, 2)
            change = round(price - base, 2)
            change_pct = round((change / base) * 100, 2)
            rows.append((
                symbol, 'ensemble', 7, date.isoformat(), price, upper, lower,
                change, change_pct
            ))

    conn.executemany(
        """INSERT INTO predictions
           (symbol, model_type, periods, predicted_date, predicted_price,
            upper_bound, lower_bound, change_value, change_percent)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        rows
    )


def seed_watchlist(conn):
    rows = [
        ('TCS', 4000, 3820, 'Waiting for a dip before adding more'),
        ('RELIANCE', 3100, 2910, 'Long term hold'),
        ('TATAMOTORS', 850, 782, None),
    ]
    conn.executemany(
        """INSERT INTO watchlist (symbol, target_price, price_at_add, notes)
           VALUES (?, ?, ?, ?)""",
        rows
    )


def seed_sentiment(conn):
    today = datetime.now().date()
    labels = ['Positive', 'Neutral', 'Negative']
    rows = []
    for symbol in ['TCS', 'RELIANCE', 'INFY', 'HDFCBANK', 'TATAMOTORS']:
        for i in range(5, 0, -1):
            date = today - timedelta(days=i)
            score = round(random.uniform(-1, 1), 2)
            label = 'Positive' if score > 0.2 else ('Negative' if score < -0.2 else 'Neutral')
            rows.append((symbol, date.isoformat(), score, label))

    conn.executemany(
        """INSERT INTO market_sentiment (symbol, date, sentiment_score, sentiment_label)
           VALUES (?, ?, ?, ?)""",
        rows
    )


def main():
    if os.path.exists(DB_PATH):
        os.remove(DB_PATH)
        print(f"Removed existing {DB_PATH}")

    conn = sqlite3.connect(DB_PATH)
    try:
        build_schema(conn)
        seed_stocks(conn)
        seed_price_history(conn)
        seed_predictions(conn)
        seed_watchlist(conn)
        seed_sentiment(conn)
        conn.commit()
        print(f"Created {DB_PATH} with schema + sample data.")

        # Quick sanity check / preview for terminal output
        cur = conn.cursor()
        for table in ['stocks', 'stock_price_history', 'predictions', 'watchlist', 'market_sentiment']:
            cur.execute(f"SELECT COUNT(*) FROM {table}")
            count = cur.fetchone()[0]
            print(f"  {table}: {count} rows")

    finally:
        conn.close()


if __name__ == '__main__':
    main()
