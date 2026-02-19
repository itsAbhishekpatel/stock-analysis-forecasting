// Configuration
const API_BASE_URL = '/api';

// DOM Elements
const stockInput = document.getElementById('stockInput');
const searchBtn = document.getElementById('searchBtn');
const errorMessage = document.getElementById('error-message');
const stockSummary = document.getElementById('stock-summary');
const chartSection = document.getElementById('chart-section');
const forecastSection = document.getElementById('forecast-section');
const analysisSection = document.getElementById('analysis-section');

let currentChart = null;
let currentStock = null;

// Event Listeners
searchBtn.addEventListener('click', searchStock);
stockInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') searchStock();
});

// Search Stock Function
async function searchStock() {
    const ticker = stockInput.value.trim().toUpperCase();

    if (!ticker) {
        showError('Please enter a stock ticker (e.g., AAPL, GOOGL, MSFT)');
        return;
    }

    try {
        clearError();
        hideAllSections();
        showLoading('Fetching real-time data...');

        // Fetch stock data from backend
        const response = await fetch(`${API_BASE_URL}/stock/${ticker}`);

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Stock "${ticker}" not found`);
        }

        const data = await response.json();
        currentStock = data;

        // Populate stock summary
        populateStockSummary(data);

        // Fetch and display chart
        await fetchAndDisplayChart(ticker);

        // Fetch and display forecast
        await fetchAndDisplayForecast(ticker);

        // Generate analysis
        generateAnalysis(data);

        // Show sections
        stockSummary.classList.remove('hidden');
        chartSection.classList.remove('hidden');
        forecastSection.classList.remove('hidden');
        analysisSection.classList.remove('hidden');

    } catch (error) {
        showError(error.message);
        console.error('Error:', error);
    }
}

// Populate Stock Summary
function populateStockSummary(data) {
    document.getElementById('stock-symbol').textContent = data.symbol;
    document.getElementById('stock-price').textContent = `$${data.currentPrice.toFixed(2)}`;
    
    const changePercent = data.changePercent;
    const changeElement = document.getElementById('stock-change');
    changeElement.textContent = `${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(2)}%`;
    changeElement.style.color = changePercent >= 0 ? 'var(--success-color)' : 'var(--danger-color)';

    document.getElementById('stock-volume').textContent = formatVolume(data.volume);
    document.getElementById('stock-high').textContent = `$${data.high.toFixed(2)}`;
    document.getElementById('stock-low').textContent = `$${data.low.toFixed(2)}`;
    
    const updateTime = new Date(data.lastUpdate);
    document.getElementById('stock-update').textContent = updateTime.toLocaleString();
}

// Fetch and Display Chart
async function fetchAndDisplayChart(ticker) {
    try {
        const response = await fetch(`${API_BASE_URL}/stock/${ticker}/history?days=90`);
        
        if (!response.ok) throw new Error('Failed to fetch chart data');

        const data = await response.json();
        displayChart(data);

    } catch (error) {
        console.error('Chart error:', error);
        showError('Could not load chart data');
    }
}

// Display Chart
function displayChart(data) {
    const ctx = document.getElementById('priceChart').getContext('2d');

    if (currentChart) {
        currentChart.destroy();
    }

    const labels = data.dates || [];
    const prices = data.prices || [];

    currentChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: `${data.symbol} - Stock Price (Last 90 days)`,
                data: prices,
                borderColor: 'var(--primary-color)',
                backgroundColor: 'rgba(37, 99, 235, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4,
                pointRadius: 3,
                pointBackgroundColor: 'var(--primary-color)',
                pointBorderColor: 'white',
                pointBorderWidth: 1,
                pointHoverRadius: 5,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                intersect: false,
                mode: 'index'
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        usePointStyle: true,
                        padding: 15,
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    padding: 12,
                    titleFont: { size: 14 },
                    bodyFont: { size: 13 },
                    callbacks: {
                        label: function(context) {
                            return `Price: $${context.parsed.y.toFixed(2)}`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    ticks: {
                        callback: function(value) {
                            return '$' + value.toFixed(2);
                        }
                    }
                }
            }
        }
    });
}

// Fetch and Display Forecast
async function fetchAndDisplayForecast(ticker) {
    try {
        const response = await fetch(`${API_BASE_URL}/forecast/${ticker}`);
        
        if (!response.ok) throw new Error('Failed to fetch forecast');

        const data = await response.json();
        populateForecast(data);

    } catch (error) {
        console.error('Forecast error:', error);
        showError('Could not load forecast data');
    }
}

// Populate Forecast
function populateForecast(data) {
    document.getElementById('forecast-1w').textContent = `$${data.week1.toFixed(2)}`;
    document.getElementById('forecast-2w').textContent = `$${data.week2.toFixed(2)}`;
    document.getElementById('forecast-3w').textContent = `$${data.week3.toFixed(2)}`;
    document.getElementById('forecast-1m').textContent = `$${data.month1.toFixed(2)}`;
    
    // Update confidence
    document.getElementById('confidence-1w').textContent = `Confidence: ${Math.round(data.confidence_1w)}%`;
    document.getElementById('confidence-2w').textContent = `Confidence: ${Math.round(data.confidence_2w)}%`;
    document.getElementById('confidence-3w').textContent = `Confidence: ${Math.round(data.confidence_3w)}%`;
    document.getElementById('confidence-1m').textContent = `Confidence: ${Math.round(data.confidence_1m)}%`;
}

// Generate Analysis
function generateAnalysis(data) {
    const changePercent = data.changePercent;
    const trend = changePercent > 0 ? 'upward' : 'downward';
    const strength = Math.abs(changePercent);

    let analysis = `<strong>${data.symbol}</strong> is showing a <strong style="color: ${changePercent >= 0 ? 'var(--success-color)' : 'var(--danger-color)'}">${trend} trend</strong> with a change of <strong>${changePercent.toFixed(2)}%</strong>. `;
    
    if (strength > 5) {
        analysis += `The stock has experienced significant movement. `;
    } else if (strength > 2) {
        analysis += `The stock is moderately active. `;
    } else {
        analysis += `The stock is relatively stable. `;
    }

    analysis += `Current price: <strong>$${data.currentPrice.toFixed(2)}</strong>, Trading volume: <strong>${formatVolume(data.volume)}</strong>. `;
    analysis += `<br><br>📊 <strong>Market Range:</strong> Low: $${data.low.toFixed(2)} | High: $${data.high.toFixed(2)}<br>`;
    analysis += `52-Week Range: Low: $${typeof data.week52Low === 'number' ? data.week52Low.toFixed(2) : 'N/A'} | High: $${typeof data.week52High === 'number' ? data.week52High.toFixed(2) : 'N/A'}`;

    document.getElementById('analysis-text').innerHTML = analysis;
}

// Utility Functions
function formatVolume(volume) {
    if (volume >= 1e9) return (volume / 1e9).toFixed(2) + 'B';
    if (volume >= 1e6) return (volume / 1e6).toFixed(2) + 'M';
    if (volume >= 1e3) return (volume / 1e3).toFixed(2) + 'K';
    return volume.toString();
}

function showError(message) {
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
}

function clearError() {
    errorMessage.textContent = '';
    errorMessage.style.display = 'none';
}

function hideAllSections() {
    stockSummary.classList.add('hidden');
    chartSection.classList.add('hidden');
    forecastSection.classList.add('hidden');
    analysisSection.classList.add('hidden');
}

function showLoading(message) {
    console.log(message);
}