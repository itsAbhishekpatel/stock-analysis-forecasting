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

        try {
            const url = `/api/top-movers${forceRefresh ? '?refresh=1' : ''}`;
            const res = await fetch(url);
            const data = await res.json();

            if (data.status !== 'success') {
                throw new Error(data.error || 'Failed to load movers');
            }

            renderList(gainersList, data.gainers, true);
            renderList(losersList, data.losers, false);
            metaText.textContent = `Scanned ${data.scanned} stocks · Updated ${new Date().toLocaleTimeString()}`;

        } catch (err) {
            console.error('Error loading top movers:', err);
            alertBox.textContent = 'Could not load top movers right now. Please try refreshing.';
            alertBox.classList.remove('d-none');
        } finally {
            spinner.style.display = 'none';
        }
    }

    refreshBtn.addEventListener('click', () => loadMovers(true));
    document.addEventListener('DOMContentLoaded', () => loadMovers(false));
})();
