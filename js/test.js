// اختبار كلاس ElliottWaveAnalyzer
describe('ElliottWaveAnalyzer', function() {
    var analyzer;

    beforeEach(function() {
        analyzer = new ElliottWaveAnalyzer();
    });

    it('يجب أن يجد نقاط الـ Pivot بشكل صحيح', function() {
        var data = [
            { time: 1, high: 100, low: 90 },
            { time: 2, high: 110, low: 95 },
            { time: 3, high: 120, low: 105 },
            { time: 4, high: 115, low: 100 },
            { time: 5, high: 130, low: 110 }
        ];

        var pivots = analyzer.findPivots(data);
        expect(pivots.length).toBeGreaterThan(0);
    });

    it('يجب أن ينشئ ZigZag بشكل صحيح', function() {
        var pivots = [
            { type: 'low', price: 90, time: 1 },
            { type: 'high', price: 120, time: 3 },
            { type: 'low', price: 100, time: 4 },
            { type: 'high', price: 130, time: 5 }
        ];

        var zigzag = analyzer.createZigZag(pivots);
        expect(zigzag.length).toBeGreaterThan(0);
    });

    it('يجب أن يحلل الموجات بشكل صحيح', function() {
        var zigzag = [
            { type: 'low', price: 90, time: 1 },
            { type: 'high', price: 120, time: 3 },
            { type: 'low', price: 100, time: 4 },
            { type: 'high', price: 130, time: 5 }
        ];

        var patterns = analyzer.analyzeWavePatterns(zigzag);
        expect(patterns).toBeDefined();
    });
});
