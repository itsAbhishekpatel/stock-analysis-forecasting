// static/js/movers.js
// Fetches /api/top-movers (added to app.py) and renders gainers/losers.

(function () {
    const gainersList = document.getElementById('gainersList');
    const losersList = document.getElementById('losersList');
    const metaText = document.getElementById('moversMeta');
    const spinner = document.getElementById('moversSpinner');
    const alertBox = document.getElementById('moversAlert');
    const refreshBtn = document.getElementById('refreshMoversBtn');

    function renderRow(item, isGainer) {
        const sign = item.change_percent >= 0 ? '+' : '';
        return `
            <a href="/search?symbol=${item.symbol}" class="text-decoration-none text-dark">
                <div class="mover-row">
                    <span class="mover-symbol">${item.symbol}</span>
                    <span>₹${item.price.toFixed(2)}</span>
                    <span class="${isGainer ? 'gainer-value' : 'loser-value'}">
                        ${sign}${item.change_percent.toFixed(2)}%
                    </span>
                </div>
            </a>
            <hr class="my-1">`;
    }

    function renderList(container, items, isGainer) {
        if (!items || items.length === 0) {
            container.innerHTML = '<p class="text-muted small mb-0">No data available.</p>';
            return;
        }
        container.innerHTML = items.map(item => renderRow(item, isGainer)).join('');
    }

    async function loadMovers(forceRefresh = false) {
        spinner.style.display = 'inline-block';
        alertBox.classList.add('d-none');
        metaText.textContent = 'Loading...';

        // Give up after 25s client-side so the page never spins forever,
        // even if something upstream is still slow/misbehaving.
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 25000);

        try {
            const url = `/api/top-movers${forceRefresh ? '?refresh=1' : ''}`;
            const res = await fetch(url, { signal: controller.signal });
            const data = await res.json();

            if (data.status !== 'success') {
                throw new Error(data.error || 'Failed to load movers');
            }

            if (data.warning) {
                alertBox.textContent = data.warning;
                alertBox.classList.remove('d-none');
            }

            renderList(gainersList, data.gainers, true);
            renderList(losersList, data.losers, false);
            metaText.textContent = `Scanned ${data.scanned} stocks · Updated ${new Date().toLocaleTimeString()}`;

        } catch (err) {
            console.error('Error loading top movers:', err);
            const message = err.name === 'AbortError'
                ? 'This is taking too long (25s+). The server may be slow to fetch stock data right now - try again in a moment.'
                : 'Could not load top movers right now. Please try refreshing.';
            alertBox.textContent = message;
            alertBox.classList.remove('d-none');
            gainersList.innerHTML = '<p class="text-muted small mb-0">Unavailable.</p>';
            losersList.innerHTML = '<p class="text-muted small mb-0">Unavailable.</p>';
        } finally {
            clearTimeout(timeoutId);
            spinner.style.display = 'none';
        }
    }

    refreshBtn.addEventListener('click', () => loadMovers(true));
    document.addEventListener('DOMContentLoaded', () => loadMovers(false));
})();
