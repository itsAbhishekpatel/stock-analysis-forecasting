# Market News Feature — Setup

## 1. Install the one new dependency
```bash
pip install feedparser
```
(Add `feedparser` to your `requirements.txt` too.)

## 2. Copy new files into your project
```
services/news_fetcher.py       -> your project's services/ folder
templates/market_news.html     -> your project's templates/ folder
static/js/market_news.js       -> your project's static/js/ folder
```

## 3. Edit two existing files (small, non-breaking additions)
- Follow `ADD_TO_app.py.txt` — adds 1 import, 1 service instance, 2 routes.
- Follow `ADD_TO_base.html.txt` — adds 1 nav link.

Nothing else in your app changes. All your existing routes, services, and
templates work exactly as before.

## 4. How it works
- `NewsFetcher` pulls live headlines from three free, no-API-key RSS feeds
  (Economic Times, Moneycontrol, Business Standard — all markets sections).
- Feeds are fetched concurrently and merged, sorted newest-first.
- Results are cached in memory for 120 seconds so repeated page loads/
  auto-refreshes don't hammer the RSS servers — pass `?refresh=1` to force
  a fresh pull (the "Refresh" button on the page does this).
- The `market_news.html` page polls `/api/market-news` every 60 seconds
  (toggleable) and renders headlines as cards with source badges, a summary,
  publish time, and a link to the full article.

## 5. Swapping in a different/paid news API later
If you ever want to use a keyed provider (e.g. NewsAPI.org, Finnhub, Alpha
Vantage News), just add a new `_fetch_from_x()` method inside
`NewsFetcher` and call it from `fetch_all_news()` alongside/instead of the
RSS fetchers. The route and frontend don't need to change since they only
consume the normalized dict format `NewsFetcher` returns.

## 6. Troubleshooting
- If a feed URL ever changes/breaks, update the `FEEDS` dict at the top of
  `news_fetcher.py` — swap in a fresh RSS URL from the same or another
  provider's markets section.
- If your server has outbound network restrictions, make sure it can reach
  `economictimes.indiatimes.com`, `moneycontrol.com`, and
  `business-standard.com` over HTTPS.
