// static/js/watchlist.js
// Watchlist is stored in the browser (localStorage) — per-device, no backend
// changes needed. Prices/stats come from your existing /api/stock/<symbol>.

(function () {
    const STORAGE_KEY = 'stockWatchlist';

    const container = document.getElementById('watchlistContainer');
    const emptyState = document.getElementById('watchlistEmptyState');
    const alertBox = document.getElementById('watchlistAlert');
    const addInput = document.getElementById('addStockInput');
    const addBtn = document.getElementById('addStockBtn');
    const refreshBtn = document.getElementById('refreshWatchlistBtn');
    const suggestionsBox = document.getElementById('searchSuggestions');

    function getWatchlist() {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        } catch {
            return [];
        }
    }

    function saveWatchlist(list) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    }

    function showAlert(message, type = 'info') {
        alertBox.textContent = message;
        alertBox.className = `alert alert-${type}`;
        setTimeout(() => alertBox.classList.add('d-none'), 3000);
    }

    function addSymbol(symbol) {
        symbol = symbol.trim().toUpperCase();
        if (!symbol) return;

        const list = getWatchlist();
        if (list.includes(symbol)) {
            showAlert(`${symbol} is already in your watchlist.`, 'warning');
            return;
        }
        list.push(symbol);
        saveWatchlist(list);
        addInput.value = '';
        suggestionsBox.style.display = 'none';
        renderWatchlist();
    }

    function removeSymbol(symbol) {
        const list = getWatchlist().filter(s => s !== symbol);
        saveWatchlist(list);
        renderWatchlist();
    }

    async function fetchStockCard(symbol) {
        try {
            const res = await fetch(`/api/stock/${symbol}`);
            const data = await res.json();

            if (data.status !== 'success') {
                return { symbol, error: data.error || 'Unavailable' };
            }
            return { symbol, stats: data.stats };
        } catch (err) {
            return { symbol, error: 'Network error' };
        }
    }

    function renderCard(result) {
        const col = document.createElement('div');
        col.className = 'col-md-6 col-lg-4';

        if (result.error) {
            col.innerHTML = `
                <div class="card watch-card h-100 shadow-sm">
                    <div class="card-body">
                        <div class="d-flex justify-content-between">
                            <h5 class="card-title mb-1">${result.symbol}</h5>
                            <button class="btn btn-sm btn-outline-danger remove-btn" data-symbol="${result.symbol}">✕</button>
                        </div>
                        <p class="text-muted small mb-0">Could not load: ${result.error}</p>
                    </div>
                </div>`;
            col.querySelector('.remove-btn').addEventListener('click', () => removeSymbol(result.symbol));
            return col;
        }

        const s = result.stats;
        const isUp = (s.change_percent || 0) >= 0;

        col.innerHTML = `
            <div class="card watch-card h-100 shadow-sm ${isUp ? 'up' : 'down'}">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-start">
                        <h5 class="card-title mb-1">${result.symbol}</h5>
                        <button class="btn btn-sm btn-outline-danger remove-btn" data-symbol="${result.symbol}">✕</button>
                    </div>
                    <h3 class="mb-1">₹${s.current_price.toFixed(2)}</h3>
                    <p class="${isUp ? 'change-up' : 'change-down'} mb-2">
                        ${isUp ? '▲' : '▼'} ${s.change.toFixed(2)} (${s.change_percent.toFixed(2)}%)
                    </p>
                    <div class="d-flex justify-content-between text-muted small">
                        <span>High: ₹${s.high.toFixed(2)}</span>
                        <span>Low: ₹${s.low.toFixed(2)}</span>
                    </div>
                    ${s.rsi !== null ? `<div class="text-muted small mt-1">RSI: ${s.rsi.toFixed(1)}</div>` : ''}
                </div>
            </div>`;
        col.querySelector('.remove-btn').addEventListener('click', () => removeSymbol(result.symbol));
        return col;
    }

    async function renderWatchlist() {
        const list = getWatchlist();
        container.innerHTML = '';

        if (list.length === 0) {
            emptyState.classList.remove('d-none');
            return;
        }
        emptyState.classList.add('d-none');

        // Simple loading placeholders
        list.forEach(symbol => {
            const col = document.createElement('div');
            col.className = 'col-md-6 col-lg-4';
            col.id = `card-${symbol}`;
            col.innerHTML = `
                <div class="card h-100 shadow-sm">
                    <div class="card-body text-center py-4">
                        <div class="spinner-border spinner-border-sm text-primary"></div>
                        <p class="text-muted small mt-2 mb-0">${symbol}</p>
                    </div>
                </div>`;
            container.appendChild(col);
        });

        const results = await Promise.all(list.map(fetchStockCard));
        container.innerHTML = '';
        results.forEach(result => container.appendChild(renderCard(result)));
    }

    async function fetchSuggestions(query) {
        if (!query) {
            suggestionsBox.style.display = 'none';
            return;
        }
        try {
            const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
            const data = await res.json();
            const results = data.results || [];

            if (results.length === 0) {
                suggestionsBox.style.display = 'none';
                return;
            }
            suggestionsBox.innerHTML = results.map(sym =>
                `<button type="button" class="list-group-item list-group-item-action suggestion-item" data-symbol="${sym}">${sym}</button>`
            ).join('');
            suggestionsBox.style.display = 'block';

            suggestionsBox.querySelectorAll('.suggestion-item').forEach(btn => {
                btn.addEventListener('click', () => addSymbol(btn.dataset.symbol));
            });
        } catch {
            suggestionsBox.style.display = 'none';
        }
    }

    let debounceTimer;
    addInput.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => fetchSuggestions(e.target.value.trim()), 250);
    });

    addInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') addSymbol(addInput.value);
    });

    addBtn.addEventListener('click', () => addSymbol(addInput.value));
    refreshBtn.addEventListener('click', renderWatchlist);

    document.addEventListener('click', (e) => {
        if (!e.target.closest('#addStockWrapper')) {
            suggestionsBox.style.display = 'none';
        }
    });

    document.addEventListener('DOMContentLoaded', renderWatchlist);
})();
