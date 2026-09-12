"""
diagnose_news.py

Run this directly with:
    python diagnose_news.py

It bypasses Flask entirely and tests each piece in isolation so we can see
exactly where the failure is: missing library, blocked network, bad URL,
or something in the app wiring.
"""

import sys

print("=" * 60)
print("STEP 1: Checking if feedparser is installed")
print("=" * 60)
try:
    import feedparser
    print(f"OK - feedparser version: {feedparser.__version__}")
except ImportError as e:
    print(f"FAILED - feedparser is NOT installed: {e}")
    print("\nFix: run this then try again:")
    print("    pip install feedparser --break-system-packages")
    sys.exit(1)

print()
print("=" * 60)
print("STEP 2: Checking basic internet access (no RSS involved)")
print("=" * 60)
try:
    import urllib.request
    req = urllib.request.Request(
        "https://www.google.com",
        headers={'User-Agent': 'Mozilla/5.0'}
    )
    with urllib.request.urlopen(req, timeout=8) as resp:
        print(f"OK - reached google.com, HTTP status {resp.status}")
except Exception as e:
    print(f"FAILED - could not reach the internet at all: {e}")
    print("\nThis means your server/host is blocking outbound network access.")
    print("Common on free tiers of PythonAnywhere, some Replit plans, some")
    print("corporate/VPS firewalls. You may need to whitelist domains or")
    print("upgrade your hosting plan to allow outbound HTTP requests.")
    sys.exit(1)

print()
print("=" * 60)
print("STEP 3: Testing each news feed URL individually")
print("=" * 60)

FEEDS = {
    'Economic Times': 'https://economictimes.indiatimes.com/markets/rssfeeds/1977021501.cms',
    'Livemint': 'https://www.livemint.com/rss/markets',
    'Business Standard': 'https://www.business-standard.com/rss/markets-106.rss',
}

any_worked = False

for name, url in FEEDS.items():
    print(f"\n--- {name} ---")
    print(f"URL: {url}")
    try:
        parsed = feedparser.parse(url, request_headers={
            'User-Agent': 'Mozilla/5.0 (compatible; MarketNewsBot/1.0)'
        })

        status = getattr(parsed, 'status', None)
        bozo = getattr(parsed, 'bozo', 0)
        bozo_exc = getattr(parsed, 'bozo_exception', None)
        entry_count = len(parsed.entries)

        print(f"HTTP status: {status}")
        print(f"bozo flag: {bozo}" + (f" (reason: {bozo_exc})" if bozo else ""))
        print(f"Entries found: {entry_count}")

        if entry_count > 0:
            print(f"Sample headline: {parsed.entries[0].get('title', 'N/A')}")
            any_worked = True
        else:
            print("RESULT: No entries returned - feed may be dead, blocked, or "
                  "the request never reached the server.")

    except Exception as e:
        print(f"EXCEPTION while fetching: {type(e).__name__}: {e}")

print()
print("=" * 60)
print("SUMMARY")
print("=" * 60)
if any_worked:
    print("At least one feed returned entries. If your Flask app still shows")
    print("'No news available', the problem is in the Flask wiring (route not")
    print("registered, wrong import, or the JS isn't calling /api/market-news).")
    print("Check your Flask server console for errors when you load the page.")
else:
    print("ALL feeds returned 0 entries. Since internet access itself works")
    print("(Step 2 passed), this points to one of:")
    print("  1. Your host blocks these specific domains (common on restricted")
    print("     hosting - PythonAnywhere free tier only allows whitelisted")
    print("     domains for outbound requests, for example)")
    print("  2. These specific sites are blocking requests from your server's")
    print("     IP/region/User-Agent")
    print("  3. A corporate/ISP firewall or DNS filter is blocking news sites")
    print()
    print("Try running this same script from your LOCAL machine (not the")
    print("server) to see if the feeds work there - that tells us if it's a")
    print("hosting restriction vs. something else.")
