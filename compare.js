// static/js/compare.js
// Uses your existing /api/stock/<symbol> and /api/search endpoints.
// No backend changes needed for this page.

(function () {
    const input1 = document.getElementById('symbolInput1');
    const input2 = document.getElementById('symbolInput2');
    const suggestions1 = document.getElementById('suggestions1');
    const suggestions2 = document.getElementById('suggestions2');
    const compareBtn = document.getElementById('compareBtn');
    const alertBox = document.getElementById('compareAlert');
    const resultsBox = document.getElementById('compareResults');
    const loadingBox = document.getElementById('compareLoading');
    const chartDiv = document.getElementById('priceChart');
    const tableHead = document.getElementById('compareTableHead');
    const tableBody = document.getElementById('compareTableBody');

    function setupAutocomplete(input, suggestionsBox) {
        let debounceTimer;
        input.addEventListener('input', (e) => {
            clearTimeout(debounceTimer);
            const query = e.target.value.trim();
            debounceTimer = setTimeout(async () => {
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
                        `<button type="button" class="list-group-item list-group-item-action">${sym}</button>`
                    ).join('');
                    suggestionsBox.style.display = 'block';
                    suggestionsBox.querySelectorAll('button').forEach(btn => {
                        btn.addEventListener('click', () => {
                            input.value = btn.textContent;
                            suggestionsBox.style.display = 'none';
                        });
                    });
                } catch {
                    suggestionsBox.style.display = 'none';
                }
            }, 250);
        });

        document.addEventListener('click', (e) => {
            if (!e.target.closest(input.parentElement)) {
                suggestionsBox.style.display = 'none';
            }
        });
    }

    setupAutocomplete(input1, suggestions1);
    setupAutocomplete(input2, suggestions2);

    async function fetchStock(symbol) {
        const res = await fetch(`/api/stock/${symbol}`);
        const data = await res.json();
        if (data.status !== 'success') {
            throw new Error(`${symbol}: ${data.error || 'failed to load'}`);
        }
        return data;
    }

    function normalize(dataList) {
        // Normalize close prices to a base of 100 so two stocks with very
        // different price ranges can be compared on the same chart.
        const closes = dataList.map(d => d.Close);
        const base = closes[0] || 1;
        return dataList.map(d => ({
            date: d.Date,
            normalized: (d.Close / base) * 100
        }));
    }

    function renderChart(symbol1, data1, symbol2, data2) {
        const norm1 = normalize(data1.data);
        const norm2 = normalize(data2.data);

        const trace1 = {
            x: norm1.map(d => d.date),
            y: norm1.map(d => d.normalized),
            type: 'scatter',
            mode: 'lines',
            name: symbol1,
            line: { color: '#0d6efd', width: 2 }
        };
        const trace2 = {
            x: norm2.map(d => d.date),
            y: norm2.map(d => d.normalized),
            type: 'scatter',
            mode: 'lines',
            name: symbol2,
            line: { color: '#dc3545', width: 2 }
        };

        const layout = {
            title: 'Relative Performance (Indexed to 100)',
            margin: { t: 40, r: 20, b: 40, l: 50 },
            xaxis: { title: 'Date' },
            yaxis: { title: 'Indexed Value' },
            legend: { orientation: 'h', y: -0.2 }
        };

        Plotly.newPlot(chartDiv, [trace1, trace2], layout, { responsive: true });
    }

    function metricRow(label, val1, val2, higherIsBetter = true, formatter = (v) => v) {
        let cls1 = '', cls2 = '';
        if (typeof val1 === 'number' && typeof val2 === 'number' && val1 !== val2) {
            const firstBetter = higherIsBetter ? val1 > val2 : val1 < val2;
            cls1 = firstBetter ? 'metric-better' : 'metric-worse';
            cls2 = firstBetter ? 'metric-worse' : 'metric-better';
        }
        return `
            <tr>
                <td class="text-muted">${label}</td>
                <td class="${cls1}">${formatter(val1)}</td>
                <td class="${cls2}">${formatter(val2)}</td>
            </tr>`;
    }

    function renderTable(symbol1, stats1, symbol2, stats2) {
        tableHead.innerHTML = `
            <th>Metric</th>
            <th>${symbol1}</th>
            <th>${symbol2}</th>`;

        const rows = [
            metricRow('Current Price', stats1.current_price, stats2.current_price, true, v => `₹${v.toFixed(2)}`),
            metricRow('Change %', stats1.change_percent, stats2.change_percent, true, v => `${v.toFixed(2)}%`),
            metricRow('Day High', stats1.high, stats2.high, true, v => `₹${v.toFixed(2)}`),
            metricRow('Day Low', stats1.low, stats2.low, true, v => `₹${v.toFixed(2)}`),
            metricRow('Volume', stats1.volume, stats2.volume, true, v => v.toLocaleString()),
            metricRow('RSI', stats1.rsi, stats2.rsi, false, v => v !== null ? v.toFixed(1) : 'N/A'),
            metricRow('Volatility', stats1.volatility, stats2.volatility, false, v => v !== null ? v.toFixed(3) : 'N/A'),
        ];
        tableBody.innerHTML = rows.join('');
    }

    async function runComparison() {
        const symbol1 = input1.value.trim().toUpperCase();
        const symbol2 = input2.value.trim().toUpperCase();

        alertBox.classList.add('d-none');
        resultsBox.classList.add('d-none');

        if (!symbol1 || !symbol2) {
            alertBox.textContent = 'Please enter both stock symbols.';
            alertBox.classList.remove('d-none');
            return;
        }
        if (symbol1 === symbol2) {
            alertBox.textContent = 'Please choose two different symbols to compare.';
            alertBox.classList.remove('d-none');
            return;
        }

        loadingBox.classList.remove('d-none');

        try {
            const [data1, data2] = await Promise.all([fetchStock(symbol1), fetchStock(symbol2)]);
            renderChart(symbol1, data1, symbol2, data2);
            renderTable(symbol1, data1.stats, symbol2, data2.stats);
            resultsBox.classList.remove('d-none');
        } catch (err) {
            console.error('Comparison error:', err);
            alertBox.textContent = err.message || 'Could not load comparison data.';
            alertBox.classList.remove('d-none');
        } finally {
            loadingBox.classList.add('d-none');
        }
    }

    compareBtn.addEventListener('click', runComparison);
    [input1, input2].forEach(inp => {
        inp.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') runComparison();
        });
    });
})();
