"""
services/news_fetcher.py

Fetches real-time Indian stock market news from free, no-API-key RSS feeds.

Sources used (all free, public RSS — no signup/API key needed):
  - Economic Times: Markets
  - Moneycontrol: Business/Markets
  - Business Standard: Markets

If you'd rather use a key-based provider like NewsAPI.org later, just add a
new method here (e.g. _fetch_from_newsapi) and plug it into fetch_all_news()
— nothing else in the app needs to change.
"""

import logging
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed

import feedparser

logger = logging.getLogger(__name__)


class NewsFetcher:
    """Fetches and normalizes market news from multiple free RSS sources."""

    # source_name -> RSS feed URL
    FEEDS = {
        'Economic Times': 'https://economictimes.indiatimes.com/markets/rssfeeds/1977021501.cms',
        'Moneycontrol': 'https://www.moneycontrol.com/rss/marketreports.xml',
        'Business Standard': 'https://www.business-standard.com/rss/markets-106.rss',
    }

    def __init__(self, cache_ttl_seconds: int = 120, request_timeout: int = 8):
        self.cache_ttl_seconds = cache_ttl_seconds
        self.request_timeout = request_timeout
        self._cache = None          # cached list of news dicts
        self._cache_time = None     # datetime of last successful fetch

    # ------------------------------------------------------------------ #
    # Public API
    # ------------------------------------------------------------------ #
    def fetch_all_news(self, limit: int = 30, force_refresh: bool = False):
        """
        Return a list of news items, most recent first.

        Each item looks like:
        {
            'title': str,
            'summary': str,
            'link': str,
            'source': str,
            'published': str (human readable),
            'published_parsed': datetime or None
        }
        """
        if not force_refresh and self._is_cache_fresh():
            logger.info("Serving market news from cache")
            return self._cache[:limit]

        logger.info("Fetching fresh market news from RSS feeds")
        all_items = []

        # Fetch feeds concurrently so one slow source doesn't block the rest
        with ThreadPoolExecutor(max_workers=len(self.FEEDS)) as executor:
            future_to_source = {
                executor.submit(self._fetch_feed, name, url): name
                for name, url in self.FEEDS.items()
            }
            for future in as_completed(future_to_source):
                source_name = future_to_source[future]
                try:
                    items = future.result()
                    all_items.extend(items)
                except Exception as exc:
                    logger.error(f"Failed to fetch news from {source_name}: {exc}")

        # Sort newest first (items without a parsed date sink to the bottom)
        all_items.sort(
            key=lambda x: x['published_parsed'] or datetime.min,
            reverse=True
        )

        if all_items:
            self._cache = all_items
            self._cache_time = datetime.now()
        elif self._cache:
            # Feeds failed this round but we have something stale — use it
            logger.warning("All feeds failed; returning stale cache")
            return self._cache[:limit]

        return all_items[:limit]

    # ------------------------------------------------------------------ #
    # Internal helpers
    # ------------------------------------------------------------------ #
    def _is_cache_fresh(self) -> bool:
        if not self._cache or not self._cache_time:
            return False
        age = (datetime.now() - self._cache_time).total_seconds()
        return age < self.cache_ttl_seconds

    def _fetch_feed(self, source_name: str, url: str):
        """Fetch and parse a single RSS feed into normalized dicts."""
        parsed = feedparser.parse(url, request_headers={
            'User-Agent': 'Mozilla/5.0 (compatible; MarketNewsBot/1.0)'
        })

        items = []
        for entry in parsed.entries[:15]:
            published_dt = None
            if getattr(entry, 'published_parsed', None):
                published_dt = datetime(*entry.published_parsed[:6])

            summary = getattr(entry, 'summary', '') or ''
            # Strip any stray HTML tags from summaries
            summary = self._strip_html(summary)

            items.append({
                'title': getattr(entry, 'title', 'Untitled'),
                'summary': summary[:280],
                'link': getattr(entry, 'link', '#'),
                'source': source_name,
                'published': published_dt.strftime('%d %b %Y, %I:%M %p') if published_dt else 'Recently',
                'published_parsed': published_dt
            })
        return items

    @staticmethod
    def _strip_html(raw_html: str) -> str:
        import re
        clean = re.sub(r'<[^>]+>', '', raw_html)
        return clean.strip()
