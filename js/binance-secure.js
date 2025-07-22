/**
 * Secure Binance API Integration
 * This handles both public (no auth needed) and private (auth required) endpoints
 */

class SecureBinanceAPI {
    constructor(apiKey = null, secretKey = null) {
        this.baseURL = 'https://api.binance.com';
        this.testnetURL = 'https://testnet.binance.vision';
        
        // Configuration
        this.config = {
            useTestnet: false,
            rateLimit: 1200, // requests per minute
            requestInterval: 100, // minimum ms between requests
            useCORSProxy: false, // Disabled when using API keys
            useDirectAPI: true // Use direct API with authentication
        };
        
        // Initialize CORS proxy (fallback only)
        this.corsProxy = new CORSProxy();
        
        // API credentials
        this.credentials = {
            apiKey: apiKey,
            secretKey: secretKey,
            isAuthenticated: !!(apiKey && secretKey)
        };
        
        // Rate limiting
        this.lastRequestTime = 0;
        this.requestCount = 0;
        this.resetTime = Date.now() + 60000; // Reset every minute
        
        this.initialize();
    }
    
    /**
     * Initialize the API
     */
    async initialize() {
        // For GitHub Pages deployment, we only use public endpoints
        // Private endpoints would require a backend server
        console.log('Binance API initialized for public market data');
        
        // Test connection
        try {
            await this.testConnection();
            console.log('✅ Successfully connected to Binance API');
        } catch (error) {
            console.error('❌ Failed to connect to Binance API:', error);
            console.log('💡 Note: If you see CORS errors, this is expected for direct browser access.');
            console.log('💡 Consider using a CORS proxy or backend server for production use.');
        }
    }
    
    /**
     * Test API connection
     */
    async testConnection() {
        const endpoint = '/api/v3/ping';
        return await this.makePublicRequest(endpoint);
    }
    
    /**
     * Rate limiting enforcement
     */
    async enforceRateLimit() {
        const now = Date.now();
        
        // Reset counter every minute
        if (now > this.resetTime) {
            this.requestCount = 0;
            this.resetTime = now + 60000;
        }
        
        // Check rate limit
        if (this.requestCount >= this.config.rateLimit) {
            const waitTime = this.resetTime - now;
            console.warn(`Rate limit reached. Waiting ${waitTime}ms...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            this.requestCount = 0;
            this.resetTime = Date.now() + 60000;
        }
        
        // Enforce minimum interval between requests
        const timeSinceLastRequest = now - this.lastRequestTime;
        if (timeSinceLastRequest < this.config.requestInterval) {
            const waitTime = this.config.requestInterval - timeSinceLastRequest;
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }
        
        this.lastRequestTime = Date.now();
        this.requestCount++;
    }
    
    /**
     * Make public API request (no authentication required)
     */
    async makePublicRequest(endpoint, params = {}) {
        return await this.makeRequest(endpoint, params, false);
    }
    
    /**
     * Make authenticated API request
     */
    async makeAuthenticatedRequest(endpoint, params = {}, method = 'GET') {
        if (!this.credentials.isAuthenticated) {
            throw new Error('API key and secret are required for authenticated requests');
        }
        return await this.makeRequest(endpoint, params, true, method);
    }
    
    /**
     * Generate HMAC SHA256 signature for authenticated requests
     */
    generateSignature(queryString) {
        if (!window.CryptoJS) {
            throw new Error('CryptoJS library is required for API authentication');
        }
        return window.CryptoJS.HmacSHA256(queryString, this.credentials.secretKey).toString();
    }
    
    /**
     * Make HTTP request (public or authenticated)
     */
    async makeRequest(endpoint, params = {}, requiresAuth = false, method = 'GET') {
        await this.enforceRateLimit();
        
        const baseURL = this.config.useTestnet ? this.testnetURL : this.baseURL;
        
        // Add timestamp for authenticated requests
        if (requiresAuth) {
            params.timestamp = Date.now();
        }
        
        // Create query string
        const queryString = new URLSearchParams(params).toString();
        
        // Generate signature for authenticated requests
        if (requiresAuth) {
            const signature = this.generateSignature(queryString);
            params.signature = signature;
        }
        
        const finalQueryString = new URLSearchParams(params).toString();
        const url = `${baseURL}${endpoint}${finalQueryString ? '?' + finalQueryString : ''}`;
        
        // Set headers
        const headers = {};
        if (requiresAuth && this.credentials.apiKey) {
            headers['X-MBX-APIKEY'] = this.credentials.apiKey;
        }
        
        // Try direct request first (preferred method)
        if (this.config.useDirectAPI && !this.config.useCORSProxy) {
            try {
                const requestOptions = {
                    method: method,
                    headers: headers
                };
                
                const response = await fetch(url, requestOptions);
                
                if (!response.ok) {
                    const errorData = await response.text();
                    let errorMessage;
                    try {
                        const errorJson = JSON.parse(errorData);
                        errorMessage = errorJson.msg || errorData;
                    } catch {
                        errorMessage = errorData;
                    }
                    throw new Error(`Binance API Error ${response.status}: ${errorMessage}`);
                }
                
                return await response.json();
            } catch (error) {
                // If direct request fails due to CORS, fall back to proxy (public endpoints only)
                if (!requiresAuth && (error.name === 'TypeError' && error.message.includes('fetch'))) {
                    console.log('🔄 Direct request failed, trying with CORS proxy...');
                    this.config.useCORSProxy = true;
                    return await this.makeProxiedRequest(baseURL + endpoint + (finalQueryString ? '?' + finalQueryString : ''));
                }
                throw error;
            }
        } else if (!requiresAuth) {
            // Use CORS proxy for public endpoints only
            return await this.makeProxiedRequest(url);
        } else {
            throw new Error('Authenticated requests require direct API access (CORS proxy not supported)');
        }
    }
    
    /**
     * Make request through CORS proxy
     */
    async makeProxiedRequest(url) {
        try {
            const data = await this.corsProxy.makeProxiedRequest(url);
            console.log('✅ CORS proxy request successful');
            return data;
        } catch (error) {
            console.error('❌ CORS proxy request failed:', error);
            
            // Try switching to next proxy
            this.corsProxy.switchProxy();
            try {
                const data = await this.corsProxy.makeProxiedRequest(url);
                console.log('✅ Alternative proxy request successful');
                return data;
            } catch (secondError) {
                console.error('❌ All proxy attempts failed');
                throw new Error(`Both direct and proxy requests failed: ${error.message}`);
            }
        }
    }
    
    /**
     * Get kline/candlestick data (PUBLIC - No API key needed)
     */
    async getKlineData(symbol, interval, limit = 500, startTime = null, endTime = null) {
        const params = {
            symbol: symbol.toUpperCase(),
            interval,
            limit: Math.min(limit, 1000) // Binance max is 1000
        };
        
        if (startTime) params.startTime = startTime;
        if (endTime) params.endTime = endTime;
        
        try {
            const data = await this.makePublicRequest('/api/v3/klines', params);
            return this.formatKlineData(data);
        } catch (error) {
            throw new Error(`Failed to get kline data for ${symbol}: ${error.message}`);
        }
    }
    
    /**
     * Get current price for symbol(s) (PUBLIC)
     */
    async getCurrentPrice(symbol = null) {
        const params = symbol ? { symbol: symbol.toUpperCase() } : {};
        
        try {
            return await this.makePublicRequest('/api/v3/ticker/price', params);
        } catch (error) {
            throw new Error(`Failed to get current price: ${error.message}`);
        }
    }
    
    /**
     * Get 24hr ticker statistics (PUBLIC)
     */
    async get24hrStats(symbol = null) {
        const params = symbol ? { symbol: symbol.toUpperCase() } : {};
        
        try {
            return await this.makePublicRequest('/api/v3/ticker/24hr', params);
        } catch (error) {
            throw new Error(`Failed to get 24hr stats: ${error.message}`);
        }
    }
    
    /**
     * Get order book depth (PUBLIC)
     */
    async getOrderBook(symbol, limit = 100) {
        const params = {
            symbol: symbol.toUpperCase(),
            limit: Math.min(limit, 5000) // Binance max is 5000
        };
        
        try {
            return await this.makePublicRequest('/api/v3/depth', params);
        } catch (error) {
            throw new Error(`Failed to get order book for ${symbol}: ${error.message}`);
        }
    }
    
    /**
     * Get recent trades (PUBLIC)
     */
    async getRecentTrades(symbol, limit = 500) {
        const params = {
            symbol: symbol.toUpperCase(),
            limit: Math.min(limit, 1000) // Binance max is 1000
        };
        
        try {
            return await this.makePublicRequest('/api/v3/trades', params);
        } catch (error) {
            throw new Error(`Failed to get recent trades for ${symbol}: ${error.message}`);
        }
    }
    
    /**
     * Get exchange information (PUBLIC)
     */
    async getExchangeInfo() {
        try {
            return await this.makePublicRequest('/api/v3/exchangeInfo');
        } catch (error) {
            throw new Error(`Failed to get exchange info: ${error.message}`);
        }
    }
    
    /**
     * Get server time (PUBLIC)
     */
    async getServerTime() {
        try {
            const response = await this.makePublicRequest('/api/v3/time');
            return response.serverTime;
        } catch (error) {
            throw new Error(`Failed to get server time: ${error.message}`);
        }
    }
    
    /**
     * Format raw kline data for analysis
     */
    formatKlineData(rawData) {
        return rawData.map((kline, index) => ({
            time: parseInt(kline[0]), // Open time
            open: parseFloat(kline[1]),
            high: parseFloat(kline[2]),
            low: parseFloat(kline[3]),
            close: parseFloat(kline[4]),
            volume: parseFloat(kline[5]),
            closeTime: parseInt(kline[6]),
            quoteAssetVolume: parseFloat(kline[7]),
            numberOfTrades: parseInt(kline[8]),
            takerBuyBaseAssetVolume: parseFloat(kline[9]),
            takerBuyQuoteAssetVolume: parseFloat(kline[10]),
            index: index
        }));
    }
    
    /**
     * Get popular trading pairs
     */
    getPopularPairs() {
        return [
            'BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'ADAUSDT', 'XRPUSDT',
            'SOLUSDT', 'DOTUSDT', 'DOGEUSDT', 'AVAXUSDT', 'MATICUSDT',
            'LINKUSDT', 'LTCUSDT', 'UNIUSDT', 'ATOMUSDT', 'SHIBUSDT',
            'ETCUSDT', 'XLMUSDT', 'BCHUSDT', 'FILUSDT', 'TRXUSDT',
            'VETUSDT', 'FTMUSDT', 'MANAUSDT', 'SANDUSDT', 'AXSUSDT'
        ];
    }
    
    /**
     * Get available intervals with Arabic labels
     */
    getIntervals() {
        return [
            { value: '1m', label: '1 دقيقة' },
            { value: '3m', label: '3 دقائق' },
            { value: '5m', label: '5 دقائق' },
            { value: '15m', label: '15 دقيقة' },
            { value: '30m', label: '30 دقيقة' },
            { value: '1h', label: '1 ساعة' },
            { value: '2h', label: '2 ساعة' },
            { value: '4h', label: '4 ساعات' },
            { value: '6h', label: '6 ساعات' },
            { value: '8h', label: '8 ساعات' },
            { value: '12h', label: '12 ساعة' },
            { value: '1d', label: '1 يوم' },
            { value: '3d', label: '3 أيام' },
            { value: '1w', label: '1 أسبوع' },
            { value: '1M', label: '1 شهر' }
        ];
    }
    
    /**
     * Validate symbol format
     */
    isValidSymbol(symbol) {
        // Basic validation for Binance symbol format
        return /^[A-Z]{2,10}USDT?$/.test(symbol.toUpperCase());
    }
    
    /**
     * Get symbol info
     */
    async getSymbolInfo(symbol) {
        try {
            const exchangeInfo = await this.getExchangeInfo();
            const symbolData = exchangeInfo.symbols.find(s => s.symbol === symbol.toUpperCase());
            
            if (!symbolData) {
                throw new Error(`Symbol ${symbol} not found`);
            }
            
            return {
                symbol: symbolData.symbol,
                status: symbolData.status,
                baseAsset: symbolData.baseAsset,
                quoteAsset: symbolData.quoteAsset,
                priceFilter: symbolData.filters.find(f => f.filterType === 'PRICE_FILTER'),
                lotSizeFilter: symbolData.filters.find(f => f.filterType === 'LOT_SIZE'),
                tickSize: symbolData.filters.find(f => f.filterType === 'PRICE_FILTER')?.tickSize
            };
        } catch (error) {
            throw new Error(`Failed to get symbol info: ${error.message}`);
        }
    }
    
    /**
     * Calculate price change percentage
     */
    calculatePriceChange(oldPrice, newPrice) {
        return ((newPrice - oldPrice) / oldPrice) * 100;
    }
    
    /**
     * Format price with appropriate decimal places
     */
    formatPrice(price, symbol = null) {
        const numPrice = parseFloat(price);
        
        if (numPrice >= 1000) {
            return numPrice.toFixed(2);
        } else if (numPrice >= 1) {
            return numPrice.toFixed(4);
        } else {
            return numPrice.toFixed(8);
        }
    }
    
    /**
     * Get market summary for multiple symbols
     */
    async getMarketSummary(symbols = null) {
        try {
            const tickers = await this.get24hrStats();
            
            if (symbols) {
                return tickers.filter(ticker => 
                    symbols.includes(ticker.symbol)
                );
            }
            
            return tickers;
        } catch (error) {
            throw new Error(`Failed to get market summary: ${error.message}`);
        }
    }
    
    /**
     * Real-time price updates (using polling)
     */
    startPriceUpdates(symbol, callback, interval = 5000) {
        const updatePrice = async () => {
            try {
                const priceData = await this.getCurrentPrice(symbol);
                callback(null, priceData);
            } catch (error) {
                callback(error, null);
            }
        };
        
        updatePrice(); // Initial call
        return setInterval(updatePrice, interval);
    }
    
    /**
     * Stop price updates
     */
    stopPriceUpdates(intervalId) {
        if (intervalId) {
            clearInterval(intervalId);
        }
    }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.SecureBinanceAPI = SecureBinanceAPI;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = SecureBinanceAPI;
}
