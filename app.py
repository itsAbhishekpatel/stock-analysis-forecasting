from flask import Flask, jsonify, render_template, request
from flask_cors import CORS
from datetime import datetime, timedelta
import yfinance as yf
import pandas as pd
import numpy as np
import logging

app = Flask(__name__, 
            static_folder='static',
            template_folder='templates')

# Enable CORS for all routes
CORS(app)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ==================== HELPER FUNCTIONS ====================

def get_real_stock(symbol):
    """
    Fetch real stock data from Yahoo Finance
    
    Args:
        symbol (str): Stock ticker symbol (e.g., 'AAPL', 'GOOGL')
    
    Returns:
        dict: Stock data including price, change, volume, etc.
    """
    try:
        ticker = yf.Ticker(symbol)
        info = ticker.info
        
        # Get current price and related data
        current_price = info.get('currentPrice') or info.get('regularMarketPrice', 0)
        previous_close = info.get('previousClose', current_price)
        change = current_price - previous_close
        change_percent = (change / previous_close * 100) if previous_close != 0 else 0
        
        data = {
            "symbol": symbol.upper(),
            "currentPrice": round(float(current_price), 2),
            "changePercent": round(float(change_percent), 2),
            "change": round(float(change), 2),
            "volume": int(info.get('volume', 0)),
            "high": round(float(info.get('regularMarketDayHigh', current_price)), 2),
            "low": round(float(info.get('regularMarketDayLow', current_price)), 2),
            "marketCap": info.get('marketCap', 'N/A'),
            "peRatio": round(float(info.get('trailingPE', 0)), 2) if info.get('trailingPE') else 'N/A',
            "week52High": round(float(info.get('fiftyTwoWeekHigh', 0)), 2) if info.get('fiftyTwoWeekHigh') else 'N/A',
            "week52Low": round(float(info.get('fiftyTwoWeekLow', 0)), 2) if info.get('fiftyTwoWeekLow') else 'N/A',
            "avgVolume": int(info.get('averageVolume', 0)),
            "lastUpdate": datetime.now().isoformat() + "Z"
        }
        
        return data
    
    except Exception as e:
        logger.error(f"Error fetching stock data for {symbol}: {str(e)}")
        raise Exception(f"Failed to fetch data for {symbol}. Symbol may be invalid.")

def get_real_history(symbol, days=30):
    """
    Fetch real historical stock price data
    
    Args:
        symbol (str): Stock ticker symbol
        days (int): Number of days of history to fetch
    
    Returns:
        dict: Historical dates and prices
    """
    try:
        ticker = yf.Ticker(symbol)
        
        # Fetch historical data
        hist = ticker.history(period=f"{days}d")
        
        if hist.empty:
            raise Exception(f"No historical data found for {symbol}")
        
        # Extract closing prices and dates
        dates = [d.strftime("%Y-%m-%d") for d in hist.index]
        prices = [round(float(price), 2) for price in hist['Close'].values]
        
        return {
            "symbol": symbol.upper(),
            "dates": dates,
            "prices": prices
        }
    
    except Exception as e:
        logger.error(f"Error fetching history for {symbol}: {str(e)}")
        raise Exception(f"Failed to fetch historical data for {symbol}")

def get_forecast(symbol, current_price=None):
    """
    Generate price forecast using simple analysis
    
    This uses historical data to predict future prices.
    For production, replace with ML models (LSTM, ARIMA, etc.)
    
    Args:
        symbol (str): Stock ticker symbol
        current_price (float): Current stock price
    
    Returns:
        dict: Forecasted prices for 1w, 2w, 3w, 1m
    """
    try:
        ticker = yf.Ticker(symbol)
        
        # Fetch 90 days of historical data for trend analysis
        hist = ticker.history(period="90d")
        
        if hist.empty:
            raise Exception(f"Cannot forecast for {symbol}")
        
        # Get closing prices
        prices = hist['Close'].values
        
        if current_price is None:
            current_price = prices[-1]
        
        # Calculate trend using simple linear regression
        x = np.arange(len(prices))
        z = np.polyfit(x, prices, 1)
        trend_slope = z[0]
        
        # Calculate volatility (standard deviation of daily returns)
        returns = np.diff(prices) / prices[:-1]
        volatility = np.std(returns)
        
        # Simple trend-based forecast
        # Confidence decreases with time horizon
        forecast = {
            "symbol": symbol.upper(),
            "current_price": round(float(current_price), 2),
            "week1": round(float(current_price + trend_slope * 7), 2),
            "week2": round(float(current_price + trend_slope * 14), 2),
            "week3": round(float(current_price + trend_slope * 21), 2),
            "month1": round(float(current_price + trend_slope * 30), 2),
            "confidence_1w": max(50, min(95, 85 - (volatility * 100 * 0))),  # High confidence short term
            "confidence_2w": max(45, min(90, 80 - (volatility * 100 * 5))),   # Medium confidence
            "confidence_3w": max(40, min(85, 75 - (volatility * 100 * 10))),  # Lower confidence
            "confidence_1m": max(35, min(80, 70 - (volatility * 100 * 15))),  # Lowest confidence
            "trend": "upward" if trend_slope > 0 else "downward",
            "volatility": round(float(volatility), 4)
        }
        
        return forecast
    
    except Exception as e:
        logger.error(f"Error generating forecast for {symbol}: {str(e)}")
        raise Exception(f"Failed to generate forecast for {symbol}")

def validate_ticker(ticker):
    """Validate if ticker symbol is valid"""
    if not ticker or len(ticker.strip()) > 5 or len(ticker.strip()) < 1:
        return False
    return True

# ==================== ROUTES ====================

# Serve the main page
@app.route('/')
def index():
    return render_template('index.html')

# Get stock summary/current data
@app.route('/api/stock/<string:ticker>', methods=['GET'])
def get_stock_summary(ticker):
    """
    Get current stock data from Yahoo Finance
    
    Example: GET /api/stock/AAPL
    Returns: Current price, change, volume, high, low, etc.
    """
    try:
        if not validate_ticker(ticker):
            return jsonify({"error": "Invalid ticker symbol"}), 400
        
        stock_data = get_real_stock(ticker.strip())
        return jsonify(stock_data), 200
    
    except Exception as e:
        return jsonify({"error": str(e)}), 400

# Get historical stock prices
@app.route('/api/stock/<string:ticker>/history', methods=['GET'])
def get_stock_history(ticker):
    """
    Get historical stock price data
    
    Query params:
        - days: Number of days to fetch (default: 30, max: 365)
    
    Example: GET /api/stock/AAPL/history?days=60
    Returns: Dates and closing prices
    """
    try:
        if not validate_ticker(ticker):
            return jsonify({"error": "Invalid ticker symbol"}), 400
        
        days = request.args.get('days', 30, type=int)
        days = min(max(days, 7), 365)  # Limit between 7 and 365 days
        
        history_data = get_real_history(ticker.strip(), days)
        return jsonify(history_data), 200
    
    except Exception as e:
        return jsonify({"error": str(e)}), 400

# Get price forecast
@app.route('/api/forecast/<string:ticker>', methods=['GET'])
def get_price_forecast(ticker):
    """
    Get price forecast using trend analysis
    
    Example: GET /api/forecast/AAPL
    Returns: Predicted prices for 1w, 2w, 3w, 1m with confidence scores
    
    Note: This uses simple trend analysis. For better accuracy,
    consider implementing LSTM or ARIMA models.
    """
    try:
        if not validate_ticker(ticker):
            return jsonify({"error": "Invalid ticker symbol"}), 400
        
        forecast_data = get_forecast(ticker.strip())
        return jsonify(forecast_data), 200
    
    except Exception as e:
        return jsonify({"error": str(e)}), 400

# Search for stocks
@app.route('/api/search/<string:query>', methods=['GET'])
def search_stocks(query):
    """
    Search for stocks by symbol or company name
    
    Example: GET /api/search/apple
    Returns: List of matching stock symbols
    """
    try:
        if not query or len(query) < 1:
            return jsonify({"error": "Search query too short"}), 400
        
        query = query.strip().upper()
        
        # Try to get ticker info - if valid, return it
        ticker = yf.Ticker(query)
        info = ticker.info
        
        if 'longName' in info:
            return jsonify([{
                "symbol": query,
                "name": info.get('longName', query)
            }]), 200
        
        return jsonify([]), 200
    
    except Exception as e:
        return jsonify({"error": str(e)}), 400

# Health check endpoint
@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint to verify API is running"""
    return jsonify({
        "status": "OK",
        "message": "Stock Analysis API is running",
        "timestamp": datetime.utcnow().isoformat(),
        "data_source": "Yahoo Finance (yfinance)"
    }), 200

# Error handlers
@app.errorhandler(404)
def not_found(error):
    return jsonify({"error": "Resource not found"}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({"error": "Internal server error"}), 500

# ==================== MAIN ====================

if __name__ == '__main__':
    print("=" * 60)
    print("Stock Analysis & Forecasting System")
    print("=" * 60)
    print("Data Source: Yahoo Finance (yfinance)")
    print("API Running on: http://0.0.0.0:5000")
    print("=" * 60)
    
    app.run(host='0.0.0.0', port=5000, debug=True)