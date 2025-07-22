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
                autoUpdate: this.autoUpdate
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
            <div class="chart-container position-relative">
                <div id="chart-loading" class="position-absolute top-50 start-50 translate-middle text-center">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">جاري التحميل...</span>
                    </div>
                    <div class="mt-2">جاري تحميل البيانات...</div>
                </div>
                <canvas id="price-chart" width="100%" height="400"></canvas>
            </div>
        `;
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
            
            // Use Chart.js for better performance and Arabic support
            const canvas = document.getElementById('price-chart');
            if (!canvas) return;
            
            const ctx = canvas.getContext('2d');
            
            if (this.chart) {
                this.chart.destroy();
            }

            // Prepare data for Chart.js
            const chartData = {
                datasets: [{
                    label: 'سعر الإغلاق',
                    data: data.map(d => ({
                        x: d.time,
                        y: d.close
                    })),
                    borderColor: '#2563eb',
                    backgroundColor: 'rgba(37, 99, 235, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.1
                }]
            };

            const config = {
                type: 'line',
                data: chartData,
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        title: {
                            display: true,
                            text: 'الرسم البياني للسعر',
                            font: {
                                family: 'Cairo, Arial, sans-serif',
                                size: 16
                            }
                        },
                        legend: {
                            labels: {
                                font: {
                                    family: 'Cairo, Arial, sans-serif'
                                }
                            }
                        }
                    },
                    scales: {
                        x: {
                            type: 'time',
                            time: {
                                displayFormats: {
                                    hour: 'HH:mm',
                                    day: 'DD/MM'
                                }
                            },
                            ticks: {
                                font: {
                                    family: 'Cairo, Arial, sans-serif'
                                }
                            }
                        },
                        y: {
                            ticks: {
                                font: {
                                    family: 'Cairo, Arial, sans-serif'
                                },
                                callback: function(value) {
                                    return new Intl.NumberFormat('ar-SA').format(value);
                                }
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
        } catch (error) {
            console.error('Error drawing chart:', error);
            this.showError('فشل في رسم البيانات');
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

        // Add pattern overlay to chart
        const color = pattern.direction === 'bullish' ? '#16a34a' : '#dc2626';
        
        // This would be enhanced to show actual Elliott Wave patterns
        console.log(`Marking ${pattern.type} pattern:`, pattern);
    }
}

// Main analyzer class with enhanced features
class ElliottWaveApp {
    constructor() {
        this.settings = new AnalyzerSettings();
        this.binanceAPI = new SecureBinanceAPI();
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

    async testBinanceConnection() {
        try {
            this.updateStatus('connecting', 'جاري الاتصال بـ Binance...');
            const result = await this.binanceAPI.testConnection();
            
            if (result.status === 'connected') {
                this.updateStatus('connected', 'متصل بـ Binance API ✓');
            } else {
                this.updateStatus('error', 'فشل الاتصال بـ Binance');
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

        // Display top patterns
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
                        <div class="row">
                            <div class="col-6">
                                <small class="text-muted">عدد النقاط:</small>
                                <div>${pattern.points.length}</div>
                            </div>
                            <div class="col-6">
                                <small class="text-muted">النوع:</small>
                                <div>${this.translatePatternType(pattern.type)}</div>
                            </div>
                        </div>
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
        return new Intl.NumberFormat('ar-SA', {
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
}

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize the Elliott Wave Analyzer
    window.elliottWaveApp = new ElliottWaveApp();
    
    console.log('Elliott Wave Analyzer loaded successfully');
});
