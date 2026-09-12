// static/js/market_news.js
// Fetches market news from /api/market-news and renders it.
// Auto-refreshes every 60 seconds while the toggle is on.

(function () {
    const REFRESH_INTERVAL_MS = 60000; // 60 seconds

    const container = document.getElementById('newsContainer');
    const emptyState = document.getElementById('newsEmptyState');
    const errorAlert = document.getElementById('newsErrorAlert');
    const spinner = document.getElementById('newsLoadingSpinner');
    const lastUpdatedText = document.getElementById('lastUpdatedText');
    const refreshBtn = document.getElementById('refreshNewsBtn');
    const autoRefreshToggle = document.getElementById('autoRefreshToggle');

    let autoRefreshTimer = null;

    function sourceBadgeColor(source) {
        const colors = {
            'Economic Times': 'primary',
            'Moneycontrol': 'success',
            'Business Standard': 'warning'
        };
        return colors[source] || 'secondary';
    }

    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str || '';
        return div.innerHTML;
    }

    function renderNews(items) {
        container.innerHTML = '';

        if (!items || items.length === 0) {
            emptyState.classList.remove('d-none');
            return;
        }
        emptyState.classList.add('d-none');

        items.forEach(item => {
            const col = document.createElement('div');
            col.className = 'col-md-6 col-lg-4';

            col.innerHTML = `
                <div class="card news-card h-100 shadow-sm">
                    <div class="card-body d-flex flex-column">
                        <div class="d-flex justify-content-between align-items-start mb-2">
                            <span class="badge bg-${sourceBadgeColor(item.source)} news-source-badge">
                                ${escapeHtml(item.source)}
                            </span>
                            <small class="text-muted">${escapeHtml(item.published)}</small>
                        </div>
                        <h6 class="card-title">${escapeHtml(item.title)}</h6>
                        <p class="card-text text-muted small flex-grow-1">${escapeHtml(item.summary)}</p>
                        <a href="${item.link}" target="_blank" rel="noopener noreferrer"
                           class="btn btn-sm btn-outline-primary mt-2">
                            Read full story ↗
                        </a>
                    </div>
                </div>
            `;
            container.appendChild(col);
        });
    }

    async function loadNews(forceRefresh = false) {
        spinner.style.display = 'inline-block';
        errorAlert.classList.add('d-none');

        try {
            const url = forceRefresh ? '/api/market-news?refresh=1' : '/api/market-news';
            const response = await fetch(url);
            const data = await response.json();

            if (data.status === 'success') {
                renderNews(data.news);
                const now = new Date();
                lastUpdatedText.textContent = `Last updated: ${now.toLocaleTimeString()}`;
            } else {
                throw new Error(data.error || 'Failed to load news');
            }
        } catch (err) {
            console.error('Error loading market news:', err);
            errorAlert.textContent = 'Could not load market news right now. Please try again shortly.';
            errorAlert.classList.remove('d-none');
        } finally {
            spinner.style.display = 'none';
        }
    }

    function startAutoRefresh() {
        stopAutoRefresh();
        autoRefreshTimer = setInterval(() => loadNews(false), REFRESH_INTERVAL_MS);
    }

    function stopAutoRefresh() {
        if (autoRefreshTimer) {
            clearInterval(autoRefreshTimer);
            autoRefreshTimer = null;
        }
    }

    refreshBtn.addEventListener('click', () => loadNews(true));

    autoRefreshToggle.addEventListener('change', (e) => {
        if (e.target.checked) {
            startAutoRefresh();
        } else {
            stopAutoRefresh();
        }
    });

    // Initial load
    document.addEventListener('DOMContentLoaded', () => {
        loadNews(false);
        if (autoRefreshToggle.checked) {
            startAutoRefresh();
        }
    });
})();
