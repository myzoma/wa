/**
 * Enhanced Elliott Wave Analyzer Main Application
 * Secure integration with Binance API for real-time market data
 */

// Application settings and configuration
class AnalyzerSettings {
    constructor() {
        this.symbol = 'BTCUSDT';
        this.interval = '1h';
        this.candles = 200;
        this.updateInterval = 30000; // 30 seconds
        this.autoUpdate = false;
        this.apiKey = '';
        this.secretKey = '';
        this.loadSettings();
    }

    // Load settings from localStorage
    loadSettings() {
        try {
            const saved = localStorage.getItem('analyzer_settings');
            if (saved) {
                const settings = JSON.parse(saved);
                Object.assign(this, settings);
            }
        } catch (error) {
            console.warn('Failed to load settings:', error);
        }
    }

    // Save settings to localStorage
    saveSettings() {
        try {
            localStorage.setItem('analyzer_settings', JSON.stringify({
                symbol: this.symbol,
                interval: this.interval,
                candles: this.candles,
                updateInterval: this.updateInterval,
                autoUpdate: this.autoUpdate,
                apiKey: this.apiKey,
                secretKey: this.secretKey
            }));
        } catch (error) {
            console.warn('Failed to save settings:', error);
        }
    }
}

// Enhanced chart visualization
class WaveChart {
    constructor(elementId) {
        this.element = document.getElementById(elementId);
        this.chart = null;
        this.data = null;
        this.patterns = [];
        this.isInitialized = false;
        this.init();
    }

    init() {
        if (!this.element) {
            console.error('Chart element not found');
            return;
        }
        
        // Create chart container with loading indicator
        this.element.innerHTML = `
            <div class="chart-wrapper position-relative w-100 h-100">
                <div id="chart-loading" class="position-absolute top-50 start-50 translate-middle text-center text-white">
                    <div class="spinner-border text-light" role="status">
                        <span class="visually-hidden">جاري التحميل...</span>
                    </div>
                    <div class="mt-2">جاري تحميل البيانات...</div>
                </div>
                <canvas id="price-chart" style="width: 100%; height: 100%;"></canvas>
            </div>
        `;
        
        // Initialize chart scale
        this.zoomLevel = 1;
        this.maxZoom = 3;
        this.minZoom = 0.5;
    }

    showLoading(show = true) {
        const loading = document.getElementById('chart-loading');
        if (loading) {
            loading.style.display = show ? 'block' : 'none';
        }
    }

    async draw(data) {
        try {
            this.showLoading(true);
            this.data = data;
            
            console.log('Drawing chart with data:', data);
            
            // Use Chart.js for better performance
            const canvas = document.getElementById('price-chart');
            if (!canvas) {
                console.error('Canvas element not found');
                return;
            }
            
            const ctx = canvas.getContext('2d');
            
            if (this.chart) {
                this.chart.destroy();
            }

            // Format data for enhanced candlestick visualization
            const candlestickData = data.map(d => {
                const open = parseFloat(d.open);
                const high = parseFloat(d.high);
                const low = parseFloat(d.low);
                const close = parseFloat(d.close);
                const isBullish = close >= open;
                
                return {
                    x: new Date(d.time),
                    o: open,
                    h: high,
                    l: low,
                    c: close,
                    isBullish: isBullish,
                    color: isBullish ? '#22c55e' : '#ef4444',
                    bodyColor: isBullish ? 'rgba(34, 197, 94, 0.8)' : 'rgba(239, 68, 68, 0.8)',
                    wickColor: isBullish ? '#16a34a' : '#dc2626'
                };
            });

            console.log('Formatted candlestick data:', candlestickData.slice(0, 5));

            // Create custom candlestick datasets
            const datasets = [];
            
            // Candlestick bodies (rectangles)
            const bullishBodies = [];
            const bearishBodies = [];
            
            // Candlestick wicks (lines)
            const bullishWicks = [];
            const bearishWicks = [];
            
            candlestickData.forEach((candle, index) => {
                const bodyHeight = Math.abs(candle.c - candle.o);
                const bodyTop = Math.max(candle.c, candle.o);
                const bodyBottom = Math.min(candle.c, candle.o);
                
                // Add body data
                if (candle.isBullish) {
                    bullishBodies.push({
                        x: candle.x,
                        y: [bodyBottom, bodyTop]
                    });
                    bullishWicks.push({
                        x: candle.x,
                        y: [candle.l, candle.h]
                    });
                } else {
                    bearishBodies.push({
                        x: candle.x,
                        y: [bodyBottom, bodyTop]
                    });
                    bearishWicks.push({
                        x: candle.x,
                        y: [candle.l, candle.h]
                    });
                }
            });

            // Add bullish candlestick wicks
            if (bullishWicks.length > 0) {
                datasets.push({
                    label: 'Bullish Wicks',
                    data: bullishWicks,
                    type: 'bar',
                    backgroundColor: 'rgba(34, 197, 94, 0.3)',
                    borderColor: '#22c55e',
                    borderWidth: 1,
                    barPercentage: 0.1,
                    categoryPercentage: 1.0,
                    yAxisID: 'y',
                    order: 2
                });
            }
            
            // Add bearish candlestick wicks
            if (bearishWicks.length > 0) {
                datasets.push({
                    label: 'Bearish Wicks',
                    data: bearishWicks,
                    type: 'bar',
                    backgroundColor: 'rgba(239, 68, 68, 0.3)',
                    borderColor: '#ef4444',
                    borderWidth: 1,
                    barPercentage: 0.1,
                    categoryPercentage: 1.0,
                    yAxisID: 'y',
                    order: 2
                });
            }
            
            // Add bullish candlestick bodies
            if (bullishBodies.length > 0) {
                datasets.push({
                    label: 'Bullish Candles',
                    data: bullishBodies,
                    type: 'bar',
                    backgroundColor: 'rgba(34, 197, 94, 0.9)',
                    borderColor: '#16a34a',
                    borderWidth: 1,
                    barPercentage: 0.6,
                    categoryPercentage: 1.0,
                    yAxisID: 'y',
                    order: 1
                });
            }
            
            // Add bearish candlestick bodies
            if (bearishBodies.length > 0) {
                datasets.push({
                    label: 'Bearish Candles',
                    data: bearishBodies,
                    type: 'bar',
                    backgroundColor: 'rgba(239, 68, 68, 0.9)',
                    borderColor: '#dc2626',
                    borderWidth: 1,
                    barPercentage: 0.6,
                    categoryPercentage: 1.0,
                    yAxisID: 'y',
                    order: 1
                });
            }
            
            // Add price line for better visibility
            datasets.push({
                label: 'Close Price',
                data: candlestickData.map(candle => ({
                    x: candle.x,
                    y: candle.c
                })),
                type: 'line',
                borderColor: 'rgba(59, 130, 246, 0.8)',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                borderWidth: 1,
                fill: false,
                tension: 0.1,
                pointRadius: 0,
                pointHoverRadius: 4,
                order: 0
            });

            const chartData = { datasets };

            const config = {
                type: 'bar',
                data: chartData,
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    animation: false,
                    plugins: {
                        title: {
                            display: true,
                            text: `Price Chart - ${data[0] ? data[0].symbol || 'BTCUSDT' : 'BTCUSDT'}`,
                            color: '#ffffff',
                            font: {
                                family: 'Arial, sans-serif',
                                size: 16,
                                weight: 'bold'
                            }
                        },
                        legend: {
                            display: false
                        },
                        zoom: {
                            limits: {
                                x: {min: 'original', max: 'original'},
                                y: {min: 'original', max: 'original'}
                            },
                            pan: {
                                enabled: true,
                                mode: 'x',
                                modifierKey: 'ctrl'
                            },
                            zoom: {
                                wheel: {
                                    enabled: true,
                                },
                                pinch: {
                                    enabled: true
                                },
                                mode: 'x'
                            }
                        },
                        tooltip: {
                            mode: 'index',
                            intersect: false,
                            backgroundColor: 'rgba(0, 0, 0, 0.8)',
                            titleColor: '#ffffff',
                            bodyColor: '#ffffff',
                            borderColor: '#374151',
                            borderWidth: 1,
                            callbacks: {
                                title: function(context) {
                                    return new Date(context[0].parsed.x).toLocaleString('en-US');
                                },
                                label: function(context) {
                                    const dataIndex = context.dataIndex;
                                    const candle = candlestickData[dataIndex];
                                    if (candle) {
                                        return [
                                            `Open: $${candle.o.toFixed(4)}`,
                                            `High: $${candle.h.toFixed(4)}`,
                                            `Low: $${candle.l.toFixed(4)}`,
                                            `Close: $${candle.c.toFixed(4)}`
                                        ];
                                    }
                                    return [];
                                }
                            }
                        }
                    },
                    scales: {
                        x: {
                            type: 'time',
                            time: {
                                unit: 'hour',
                                displayFormats: {
                                    hour: 'HH:mm',
                                    day: 'MM/DD',
                                    week: 'MM/DD',
                                    month: 'MM/YY'
                                }
                            },
                            title: {
                                display: true,
                                text: 'Time',
                                color: '#9ca3af',
                                font: {
                                    size: 12
                                }
                            },
                            ticks: {
                                color: '#9ca3af',
                                maxTicksLimit: 20
                            },
                            grid: {
                                color: 'rgba(156, 163, 175, 0.2)'
                            }
                        },
                        y: {
                            title: {
                                display: true,
                                text: 'Price (USDT)',
                                color: '#9ca3af',
                                font: {
                                    size: 12
                                }
                            },
                            ticks: {
                                color: '#9ca3af',
                                callback: function(value) {
                                    return '$' + parseFloat(value).toLocaleString('en-US', {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 6
                                    });
                                }
                            },
                            grid: {
                                color: 'rgba(156, 163, 175, 0.2)'
                            }
                        }
                    },
                    interaction: {
                        intersect: false,
                        mode: 'index'
                    }
                }
            };

            this.chart = new Chart(ctx, config);
            this.isInitialized = true;
            this.showLoading(false);
            console.log('Enhanced candlestick chart created successfully');
        } catch (error) {
            console.error('Error drawing chart:', error);
            this.showError(`Failed to draw chart: ${error.message}`);
            this.showLoading(false);
        }
    }

    showError(message) {
        this.element.innerHTML = `
            <div class="alert alert-danger text-center">
                <i class="fas fa-exclamation-triangle"></i>
                ${message}
            </div>
        `;
    }

    markPattern(pattern) {
        if (!this.chart || !this.isInitialized) return;
        
        try {
            console.log('Marking pattern:', pattern);
            
            // Add wave points as a new dataset
            const waveColor = pattern.direction === 'bullish' ? '#16a34a' : '#dc2626';
            
            if (pattern.points && pattern.points.length > 1) {
                // Create wave points dataset
                const wavePoints = pattern.points.map((point, index) => ({
                    x: new Date(point.time),
                    y: parseFloat(point.price),
                    label: this.getWaveLabel(pattern.type, index, pattern.points.length)
                }));
                
                // Add wave line dataset
                const waveLineDataset = {
                    label: `موجة ${pattern.type === 'motive' ? 'دافعة' : 'تصحيحية'} ${pattern.direction === 'bullish' ? 'صاعدة' : 'هابطة'}`,
                    data: wavePoints,
                    borderColor: waveColor,
                    backgroundColor: waveColor,
                    borderWidth: 3,
                    fill: false,
                    tension: 0.2,
                    pointRadius: 8,
                    pointHoverRadius: 10,
                    pointBackgroundColor: waveColor,
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2,
                    showLine: true,
                    borderDash: [10, 5]
                };
                
                // Add the dataset to the chart
                this.chart.data.datasets.push(waveLineDataset);
                this.chart.update();
                
                // Add custom labels using canvas overlay
                this.addWaveLabels(wavePoints, waveColor);
                
                console.log(`Added wave pattern with ${wavePoints.length} points`);
            }
        } catch (error) {
            console.error('Error marking pattern:', error);
        }
    }
    
    addWaveLabels(points, color) {
        // This will add text labels on the chart
        const canvas = document.getElementById('price-chart');
        if (!canvas) return;
        
        // Store labels for redraw
        if (!this.waveLabels) this.waveLabels = [];
        
        points.forEach((point, index) => {
            this.waveLabels.push({
                x: point.x,
                y: point.y,
                text: point.label,
                color: color
            });
        });
        
        // Force a redraw to show labels
        setTimeout(() => {
            this.drawWaveLabels();
        }, 100);
    }
    
    drawWaveLabels() {
        if (!this.waveLabels || !this.chart) return;
        
        const canvas = document.getElementById('price-chart');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        
        // Clear previous labels by redrawing chart
        this.chart.update('none');
        
        // Draw labels on top
        this.waveLabels.forEach((label, index) => {
            const pixelX = this.chart.scales.x.getPixelForValue(label.x);
            const pixelY = this.chart.scales.y.getPixelForValue(label.y);
            
            if (pixelX >= 0 && pixelY >= 0) {
                ctx.save();
                
                // حساب موضع التسمية (أعلى أو أسفل النقطة)
                const isEven = index % 2 === 0;
                const offsetY = isEven ? -25 : 25; // تبديل الموضع لتجنب التداخل
                
                const labelX = pixelX;
                const labelY = pixelY + offsetY;
                
                // رسم دائرة الخلفية
                ctx.beginPath();
                ctx.arc(labelX, labelY, 16, 0, 2 * Math.PI);
                ctx.fillStyle = label.color;
                ctx.fill();
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 3;
                ctx.stroke();
                
                // رسم النص
                ctx.font = 'bold 16px Arial';
                ctx.fillStyle = '#ffffff';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(label.text, labelX, labelY);
                
                // رسم خط يربط التسمية بالنقطة
                ctx.beginPath();
                ctx.moveTo(pixelX, pixelY);
                ctx.lineTo(labelX, labelY - 16);
                ctx.strokeStyle = label.color;
                ctx.lineWidth = 2;
                ctx.stroke();
                
                ctx.restore();
            }
        });
    }
    
    getWaveLabel(patternType, index, totalPoints) {
        if (patternType === 'motive') {
            // Motive waves: 1, 2, 3, 4, 5
            const motiveLabels = ['1', '2', '3', '4', '5'];
            return motiveLabels[index] || `${index + 1}`;
        } else {
            // Corrective waves: A, B, C (or W, X, Y, Z for complex corrections)
            const correctiveLabels = ['A', 'B', 'C', 'D', 'E'];
            return correctiveLabels[index] || String.fromCharCode(65 + index);
        }
    }
}

// Main analyzer class with enhanced features
class ElliottWaveApp {
    constructor() {
        this.settings = new AnalyzerSettings();
        // Initialize Binance API with credentials if available
        this.binanceAPI = new SecureBinanceAPI(this.settings.apiKey, this.settings.secretKey);
        this.chart = new WaveChart('chart');
        this.analyzer = new ElliottWaveAnalyzer({
            len1: 4,
            len2: 8,
            len3: 16,
            minWaveLength: 0.5,
            maxWaveLength: 5.0
        });
        
        this.isAnalyzing = false;
        this.updateTimer = null;
        this.currentData = null;
        this.lastAnalysis = null;
        
        this.init();
    }

    async init() {
        try {
            await this.initializeUI();
            await this.testBinanceConnection();
            this.setupEventListeners();
            console.log('Elliott Wave Analyzer initialized successfully');
        } catch (error) {
            console.error('Failed to initialize application:', error);
            this.showError('فشل في تهيئة التطبيق');
        }
    }

    async initializeUI() {
        // Populate symbol dropdown with popular pairs
        const symbolSelect = document.getElementById('symbol');
        const popularPairs = this.binanceAPI.getPopularPairs();
        
        symbolSelect.innerHTML = '';
        popularPairs.forEach(pair => {
            const option = document.createElement('option');
            option.value = pair;
            option.textContent = pair;
            if (pair === this.settings.symbol) {
                option.selected = true;
            }
            symbolSelect.appendChild(option);
        });

        // Populate interval dropdown
        const intervalSelect = document.getElementById('interval');
        const intervals = this.binanceAPI.getIntervals();
        
        intervalSelect.innerHTML = '';
        intervals.forEach(interval => {
            const option = document.createElement('option');
            option.value = interval.value;
            option.textContent = interval.label;
            if (interval.value === this.settings.interval) {
                option.selected = true;
            }
            intervalSelect.appendChild(option);
        });

        // Set candles input
        document.getElementById('candles').value = this.settings.candles;
        
        // Set API keys if they exist (show dots for security)
        if (this.settings.apiKey) {
            document.getElementById('apiKey').value = '••••••••';
        }
        if (this.settings.secretKey) {
            document.getElementById('secretKey').value = '••••••••';
        }
        
        // Add status indicator
        this.createStatusIndicator();
    }

    createStatusIndicator() {
        const statusDiv = document.createElement('div');
        statusDiv.id = 'connection-status';
        statusDiv.className = 'mb-3 p-2 rounded';
        statusDiv.innerHTML = `
            <div class="d-flex align-items-center">
                <div id="status-indicator" class="status-dot me-2"></div>
                <span id="status-text">جاري الاتصال...</span>
            </div>
        `;
        
        const settingsCard = document.querySelector('.col-md-3 .card-body');
        settingsCard.insertBefore(statusDiv, settingsCard.firstChild);
    }

    updateStatus(status, message) {
        const indicator = document.getElementById('status-indicator');
        const text = document.getElementById('status-text');
        const statusDiv = document.getElementById('connection-status');
        
        if (indicator && text && statusDiv) {
            statusDiv.className = `mb-3 p-2 rounded ${status === 'connected' ? 'bg-success bg-opacity-10' : 
                                                      status === 'error' ? 'bg-danger bg-opacity-10' : 
                                                      'bg-warning bg-opacity-10'}`;
            indicator.className = `status-dot me-2 ${status === 'connected' ? 'bg-success' : 
                                                     status === 'error' ? 'bg-danger' : 
                                                     'bg-warning'}`;
            text.textContent = message;
        }
    }

    async saveApiKeys() {
        try {
            const apiKey = document.getElementById('apiKey').value.trim();
            const secretKey = document.getElementById('secretKey').value.trim();
            
            // Save to settings
            this.settings.apiKey = apiKey;
            this.settings.secretKey = secretKey;
            this.settings.saveSettings();
            
            // Update API instance
            this.binanceAPI = new SecureBinanceAPI(apiKey, secretKey);
            
            // Show success message
            const button = document.getElementById('saveApiKeys');
            const originalText = button.innerHTML;
            button.innerHTML = '<i class="fas fa-check"></i> تم الحفظ!';
            button.disabled = true;
            
            setTimeout(() => {
                button.innerHTML = originalText;
                button.disabled = false;
            }, 2000);
            
            // Test connection with new keys
            await this.testBinanceConnection();
            
            console.log('API keys saved successfully');
        } catch (error) {
            console.error('Failed to save API keys:', error);
            this.updateStatus('error', 'فشل في حفظ مفاتيح API');
        }
    }
    
    async testBinanceConnection() {
        try {
            this.updateStatus('connecting', 'جاري الاتصال بـ Binance...');
            const result = await this.binanceAPI.testConnection();
            
            if (result) {
                this.updateStatus('connected', `متصل بـ Binance API ✓${this.binanceAPI.credentials.isAuthenticated ? ' (مع مصادقة)' : ''}`);
            } else {
                this.updateStatus('connected', 'متصل بـ Binance API (عام)');
            }
        } catch (error) {
            this.updateStatus('error', 'خطأ في الاتصال');
            console.error('Binance connection test failed:', error);
        }
    }

    setupEventListeners() {
        // Analyze button
        document.getElementById('analyze').addEventListener('click', () => {
            this.analyze();
        });
        
        // Save API keys button
        document.getElementById('saveApiKeys').addEventListener('click', () => {
            this.saveApiKeys();
        });

        // Settings change listeners
        document.getElementById('symbol').addEventListener('change', () => {
            this.settings.symbol = document.getElementById('symbol').value;
            this.settings.saveSettings();
        });

        document.getElementById('interval').addEventListener('change', () => {
            this.settings.interval = document.getElementById('interval').value;
            this.settings.saveSettings();
        });

        document.getElementById('candles').addEventListener('change', () => {
            this.settings.candles = parseInt(document.getElementById('candles').value);
            this.settings.saveSettings();
        });
        
        // Chart control listeners
        this.setupChartControls();
    }

    async analyze() {
        if (this.isAnalyzing) {
            console.log('Analysis already in progress');
            return;
        }

        try {
            this.isAnalyzing = true;
            this.updateAnalyzeButton(true);
            this.updateStatus('connecting', 'جاري جلب البيانات...');

            // Update settings from UI
            this.settings.symbol = document.getElementById('symbol').value;
            this.settings.interval = document.getElementById('interval').value;
            this.settings.candles = parseInt(document.getElementById('candles').value);
            this.settings.saveSettings();

            // Fetch data from Binance
            const klineData = await this.binanceAPI.getKlineData(
                this.settings.symbol,
                this.settings.interval,
                this.settings.candles
            );

            if (!klineData || klineData.length === 0) {
                throw new Error('لم يتم جلب أي بيانات');
            }

            this.currentData = klineData;
            this.updateStatus('connected', `تم جلب ${klineData.length} شمعة`);

            // Draw chart
            await this.chart.draw(klineData);

            // Convert to format expected by Elliott Wave analyzer
            const formattedData = klineData.map((k, index) => ([
                k.time,
                k.open.toString(),
                k.high.toString(), 
                k.low.toString(),
                k.close.toString(),
                k.volume.toString()
            ]));

            // Perform Elliott Wave analysis
            const analysis = this.analyzer.analyze(formattedData);
            this.lastAnalysis = analysis;

            // Display results
            this.displayAnalysisResults(analysis);

            // Mark patterns on chart
            if (analysis.patterns && analysis.patterns.length > 0) {
                analysis.patterns.forEach(pattern => {
                    this.chart.markPattern(pattern);
                });
            }

            this.updateStatus('connected', 'تم التحليل بنجاح ✓');
            
        } catch (error) {
            console.error('Analysis failed:', error);
            this.updateStatus('error', 'فشل في التحليل');
            this.showError(`خطأ في التحليل: ${error.message}`);
        } finally {
            this.isAnalyzing = false;
            this.updateAnalyzeButton(false);
        }
    }

    updateAnalyzeButton(analyzing) {
        const button = document.getElementById('analyze');
        if (analyzing) {
            button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري التحليل...';
            button.disabled = true;
        } else {
            button.innerHTML = 'تحليل البيانات';
            button.disabled = false;
        }
    }

    displayAnalysisResults(analysis) {
        const resultsDiv = document.getElementById('analysis-results');
        
        if (analysis.status !== 'success') {
            resultsDiv.innerHTML = `
                <div class="alert alert-warning">
                    <i class="fas fa-exclamation-triangle"></i>
                    ${analysis.message || 'فشل في التحليل'}
                </div>
            `;
            return;
        }

        if (!analysis.patterns || analysis.patterns.length === 0) {
            resultsDiv.innerHTML = `
                <div class="alert alert-info text-center">
                    <i class="fas fa-info-circle"></i>
                    لم يتم العثور على أنماط Elliott Wave واضحة
                </div>
            `;
            return;
        }

        let html = `
            <div class="analysis-summary mb-4">
                <h6><i class="fas fa-chart-line"></i> ملخص التحليل</h6>
                <p class="mb-2">${analysis.summary}</p>
                <div class="row text-center">
                    <div class="col-4">
                        <div class="metric">
                            <div class="metric-value">${analysis.patterns.length}</div>
                            <div class="metric-label">نمط مكتشف</div>
                        </div>
                    </div>
                    <div class="col-4">
                        <div class="metric">
                            <div class="metric-value">${this.translateTrend(analysis.trend)}</div>
                            <div class="metric-label">الاتجاه العام</div>
                        </div>
                    </div>
                    <div class="col-4">
                        <div class="metric">
                            <div class="metric-value">${analysis.currentPrice ? this.formatPrice(analysis.currentPrice) : 'N/A'}</div>
                            <div class="metric-label">السعر الحالي</div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Display top patterns with detailed targets
        html += '<div class="patterns-list">';
        analysis.patterns.slice(0, 3).forEach((pattern, index) => {
            const confidenceColor = pattern.confidence >= 80 ? 'success' : 
                                   pattern.confidence >= 60 ? 'warning' : 'danger';
            
            html += `
                <div class="pattern-card mb-3">
                    <div class="pattern-header d-flex justify-content-between align-items-center">
                        <h6 class="mb-0">
                            <i class="fas fa-wave-square"></i>
                            نمط ${pattern.type === 'motive' ? 'دافع' : 'تصحيحي'} 
                            ${pattern.direction === 'bullish' ? 'صاعد' : 'هابط'}
                        </h6>
                        <span class="badge bg-${confidenceColor}">${pattern.confidence.toFixed(1)}% ثقة</span>
                    </div>
                    <div class="pattern-details mt-2">
                        <div class="row mb-2">
                            <div class="col-4">
                                <small class="text-muted">عدد النقاط:</small>
                                <div>${pattern.points.length}</div>
                            </div>
                            <div class="col-4">
                                <small class="text-muted">النوع:</small>
                                <div>${this.translatePatternType(pattern.type)}</div>
                            </div>
                            <div class="col-4">
                                <small class="text-muted">الترقيم:</small>
                                <div>${this.getPatternNumbering(pattern)}</div>
                            </div>
                        </div>
                        ${this.generateTargetsHtml(pattern)}
                    </div>
                </div>
            `;
        });
        html += '</div>';

        // Display recommendations
        if (analysis.recommendations && analysis.recommendations.length > 0) {
            html += '<div class="recommendations mt-4">';
            html += '<h6><i class="fas fa-lightbulb"></i> التوصيات</h6>';
            analysis.recommendations.forEach(rec => {
                const recColor = rec.type === 'buy' ? 'success' : 
                               rec.type === 'sell' ? 'danger' : 
                               rec.type === 'wait' ? 'warning' : 'info';
                
                html += `
                    <div class="alert alert-${recColor} mb-2">
                        <div class="d-flex justify-content-between align-items-center">
                            <span>${rec.message}</span>
                            ${rec.confidence ? `<small>ثقة: ${rec.confidence}%</small>` : ''}
                        </div>
                    </div>
                `;
            });
            html += '</div>';
        }

        resultsDiv.innerHTML = html;
    }

    translateTrend(trend) {
        const translations = {
            'bullish': 'صاعد',
            'bearish': 'هابط', 
            'neutral': 'محايد',
            'bullish_correction_end': 'نهاية تصحيح صاعد',
            'bearish_correction_end': 'نهاية تصحيح هابط'
        };
        return translations[trend] || trend;
    }

    translatePatternType(type) {
        return type === 'motive' ? 'دافع' : 'تصحيحي';
    }

    formatPrice(price) {
        return new Intl.NumberFormat('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 8
        }).format(price);
    }

    showError(message) {
        const resultsDiv = document.getElementById('analysis-results');
        resultsDiv.innerHTML = `
            <div class="alert alert-danger">
                <i class="fas fa-exclamation-circle"></i>
                ${message}
            </div>
        `;
    }

    // إنشاء ترقيم النمط
    getPatternNumbering(pattern) {
        if (pattern.type === 'motive') {
            return '1-2-3-4-5';
        } else {
            return 'A-B-C';
        }
    }

    // إنشاء HTML للأهداف السعرية
    generateTargetsHtml(pattern) {
        if (!pattern.targets) return '';
        
        let html = '<div class="targets-section mt-3">';
        html += '<h6 class="mb-2"><i class="fas fa-bullseye"></i> الأهداف السعرية</h6>';
        
        if (pattern.type === 'motive') {
            html += this.generateMotiveTargetsHtml(pattern.targets);
        } else {
            html += this.generateCorrectiveTargetsHtml(pattern.targets);
        }
        
        html += '</div>';
        return html;
    }

    // أهداف النمط الدافع
    generateMotiveTargetsHtml(targets) {
        let html = '<div class="row text-center">';
        
        // الأهداف الأساسية
        if (targets.wave5_fib618) {
            html += `
                <div class="col-4">
                    <div class="target-item">
                        <small class="text-muted">فيب 61.8%</small>
                        <div class="fw-bold text-success">${this.formatPrice(targets.wave5_fib618)}</div>
                    </div>
                </div>
            `;
        }
        
        if (targets.wave5_fib1000) {
            html += `
                <div class="col-4">
                    <div class="target-item">
                        <small class="text-muted">فيب 100%</small>
                        <div class="fw-bold text-primary">${this.formatPrice(targets.wave5_fib1000)}</div>
                    </div>
                </div>
            `;
        }
        
        if (targets.wave5_fib1618) {
            html += `
                <div class="col-4">
                    <div class="target-item">
                        <small class="text-muted">فيب 161.8%</small>
                        <div class="fw-bold text-warning">${this.formatPrice(targets.wave5_fib1618)}</div>
                    </div>
                </div>
            `;
        }
        
        html += '</div>';
        
        // مستويات الدعم والمقاومة
        if (targets.support || targets.resistance) {
            html += '<hr><div class="row text-center mt-2">';
            
            if (targets.support) {
                html += `
                    <div class="col-6">
                        <small class="text-muted">الدعم</small>
                        <div class="text-success">${this.formatPrice(targets.support)}</div>
                    </div>
                `;
            }
            
            if (targets.resistance) {
                html += `
                    <div class="col-6">
                        <small class="text-muted">المقاومة</small>
                        <div class="text-danger">${this.formatPrice(targets.resistance)}</div>
                    </div>
                `;
            }
            
            html += '</div>';
        }
        
        return html;
    }

    // أهداف النمط التصحيحي
    generateCorrectiveTargetsHtml(targets) {
        let html = '<div class="row text-center">';
        
        // الأهداف الأساسية
        if (targets.waveC_fib618) {
            html += `
                <div class="col-4">
                    <div class="target-item">
                        <small class="text-muted">C = 61.8% A</small>
                        <div class="fw-bold text-success">${this.formatPrice(targets.waveC_fib618)}</div>
                    </div>
                </div>
            `;
        }
        
        if (targets.waveC_fib1000) {
            html += `
                <div class="col-4">
                    <div class="target-item">
                        <small class="text-muted">C = 100% A</small>
                        <div class="fw-bold text-primary">${this.formatPrice(targets.waveC_fib1000)}</div>
                    </div>
                </div>
            `;
        }
        
        if (targets.waveC_fib1618) {
            html += `
                <div class="col-4">
                    <div class="target-item">
                        <small class="text-muted">C = 161.8% A</small>
                        <div class="fw-bold text-warning">${this.formatPrice(targets.waveC_fib1618)}</div>
                    </div>
                </div>
            `;
        }
        
        html += '</div>';
        
        return html;
    }
    
    // Setup chart control event listeners
    setupChartControls() {
        // Chart zoom in
        document.getElementById('chart-zoom-in')?.addEventListener('click', () => {
            this.zoomChart(1.2);
        });
        
        // Chart zoom out
        document.getElementById('chart-zoom-out')?.addEventListener('click', () => {
            this.zoomChart(0.8);
        });
        
        // Chart reset
        document.getElementById('chart-reset')?.addEventListener('click', () => {
            this.resetChart();
        });
        
        // Chart fullscreen
        document.getElementById('chart-fullscreen')?.addEventListener('click', () => {
            this.toggleFullscreen();
        });
        
        // Exit fullscreen on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isFullscreen) {
                this.toggleFullscreen();
            }
        });
    }
    
    // Zoom chart function
    zoomChart(factor) {
        if (!this.chart?.chart) return;
        
        try {
            const chart = this.chart.chart;
            if (chart.zoom) {
                if (factor > 1) {
                    chart.zoom(factor);
                } else {
                    chart.zoom(factor);
                }
            }
        } catch (error) {
            console.error('Error zooming chart:', error);
        }
    }
    
    // Reset chart zoom
    resetChart() {
        if (!this.chart?.chart) return;
        
        try {
            const chart = this.chart.chart;
            if (chart.resetZoom) {
                chart.resetZoom();
            }
        } catch (error) {
            console.error('Error resetting chart:', error);
        }
    }
    
    // Toggle fullscreen mode
    toggleFullscreen() {
        const chartContainer = document.querySelector('.chart-container');
        const fullscreenBtn = document.getElementById('chart-fullscreen');
        
        if (!chartContainer || !fullscreenBtn) return;
        
        try {
            this.isFullscreen = !this.isFullscreen;
            
            if (this.isFullscreen) {
                // Enter fullscreen
                chartContainer.classList.add('fullscreen');
                fullscreenBtn.innerHTML = '<i class="fas fa-compress"></i>';
                fullscreenBtn.title = 'الخروج من ملء الشاشة';
                
                // Update chart size
                setTimeout(() => {
                    if (this.chart?.chart) {
                        this.chart.chart.resize();
                    }
                }, 100);
            } else {
                // Exit fullscreen
                chartContainer.classList.remove('fullscreen');
                fullscreenBtn.innerHTML = '<i class="fas fa-expand"></i>';
                fullscreenBtn.title = 'ملء الشاشة';
                
                // Update chart size
                setTimeout(() => {
                    if (this.chart?.chart) {
                        this.chart.chart.resize();
                    }
                }, 100);
            }
        } catch (error) {
            console.error('Error toggling fullscreen:', error);
        }
    }
}

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Check if all required classes are available
    if (typeof SecureBinanceAPI === 'undefined') {
        console.error('SecureBinanceAPI is not defined. Make sure binance-secure.js is loaded before main.js');
        return;
    }
    
    if (typeof ElliottWaveAnalyzer === 'undefined') {
        console.error('ElliottWaveAnalyzer is not defined. Make sure elliott-wave.js is loaded before main.js');
        return;
    }
    
    try {
        // Initialize the Elliott Wave Analyzer
        window.elliottWaveApp = new ElliottWaveApp();
        console.log('Elliott Wave Analyzer loaded successfully');
    } catch (error) {
        console.error('Failed to initialize Elliott Wave Analyzer:', error);
        
        // Display error message to user
        const analysisResults = document.getElementById('analysis-results');
        if (analysisResults) {
            analysisResults.innerHTML = `
                <div class=\"alert alert-danger\">
                    <i class=\"fas fa-exclamation-triangle\"></i>
                    فشل في تهيئة التطبيق: ${error.message}
                </div>
            `;
        }
    }
});
