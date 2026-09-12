# Watchlist / Top Movers / Compare — Setup

## 1. Copy new files into your project
```
templates/watchlist.html   -> your project's templates/ folder
templates/movers.html      -> your project's templates/ folder
templates/compare.html     -> your project's templates/ folder
static/js/watchlist.js     -> your project's static/js/ folder
static/js/movers.js        -> your project's static/js/ folder
static/js/compare.js       -> your project's static/js/ folder
```

## 2. Edit app.py
Follow `ADD_TO_app.py_new_pages.txt` — adds:
- 1 import (`ThreadPoolExecutor`, `as_completed`)
- 1 small in-memory cache dict (for top movers)
- 1 helper function (`_get_symbol_change`)
- 4 routes: `/watchlist`, `/movers`, `/compare`, `/api/top-movers`

Nothing existing is modified.

## 3. Edit base.html
Follow `ADD_TO_base.html_new_pages.txt` — adds 3 nav links.

## 4. What each page does

**Watchlist** (`/watchlist`)
Lets a visitor save stock symbols they care about, stored in their browser's
localStorage (so it's per-device, no login/database needed). It refreshes
live price/change/RSI for each saved symbol using your existing
`/api/stock/<symbol>` endpoint. Add via the search box (autocompletes off
your existing `/api/search`), remove with the ✕ on each card.

**Top Gainers/Losers** (`/movers`)
Scans a batch of stocks (25 by default) and shows the top gainers and
losers by day change %. Backed by a new `/api/top-movers` endpoint that
runs the scan in parallel and caches results for 5 minutes so it doesn't
re-scan on every page load. Tune `scan_limit`/cache TTL in app.py if your
data source is slow or rate-limited — see the note at the bottom of
`ADD_TO_app.py_new_pages.txt`.

**Compare** (`/compare`)
Pick two symbols, get a side-by-side stats table (price, change %, RSI,
volatility, etc. — better value in each row highlighted green) plus a
Plotly chart of both stocks' price history indexed to a base of 100, so
you can compare relative performance regardless of each stock's actual
price level. Uses only your existing `/api/stock/<symbol>` endpoint —
no backend changes needed for this page specifically.

## 5. Notes
- Watchlist persists per-browser (localStorage) — clearing browser data
  clears the watchlist. If you want it to persist across devices later,
  that would need a small database table + user accounts.
- Top Movers accuracy depends on how "available_stocks" is ordered/filtered
  by your `data_fetcher.get_available_stocks()` — it currently just scans
  the first N in that list, not literally the whole market.
