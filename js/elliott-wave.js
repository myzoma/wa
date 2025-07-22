class ElliottWaveAnalyzer {
    constructor(config = {}) {
        this.config = {
            len1: config.len1 || 4,
            len2: config.len2 || 8,
            len3: config.len3 || 16,
            minWaveLength: config.minWaveLength || 0.5, // الحد الأدنى لطول الموجة
            maxWaveLength: config.maxWaveLength || 5.0,  // الحد الأقصى لطول الموجة
            // نسب فيبوناتشي الدقيقة
            fib236: 0.236,
            fib382: 0.382,
            fib500: 0.500,
            fib618: 0.618,
            fib764: 0.764,
            fib854: 0.854,
            fib1000: 1.000,
            fib1272: 1.272,
            fib1618: 1.618,
            fib2618: 2.618
        };
        
        // قواعد Elliott Wave الصارمة
        this.elliottRules = {
            // قواعد الموجات الدافعة (1-2-3-4-5)
            motive: {
                // القاعدة 1: الموجة 2 لا تتجاوز بداية الموجة 1
                wave2CannotExceedWave1Start: true,
                // القاعدة 2: الموجة 3 ليست أقصر الموجات الدافعة
                wave3NotShortest: true,
                // القاعدة 3: الموجة 4 لا تدخل منطقة سعر الموجة 1
                wave4CannotOverlapWave1: true,
                // القاعدة 4: الموجات الدافعة تتحرك في نفس الاتجاه العام
                impulsiveWavesSameDirection: true
            },
            // قواعد الموجات التصحيحية (A-B-C)
            corrective: {
                // الموجة C عادة ما تكون مساوية أو أطول من الموجة A
                waveCRelationToA: true,
                // الموجة B لا تتجاوز بداية الموجة A بأكثر من 100%
                waveBMaxRetracement: true
            }
        };
    }

    // حساب Pivot High و Pivot Low بدقة أكبر
    findPivots(data, leftBars = 4, rightBars = 4) {
        const pivots = [];
        
        for (let i = leftBars; i < data.length - rightBars; i++) {
            const current = data[i];
            let isHigh = true;
            let isLow = true;
            
            // فحص Pivot High - يجب أن يكون أعلى من جميع النقاط المحيطة
            for (let j = i - leftBars; j <= i + rightBars; j++) {
                if (j !== i && data[j].high >= current.high) {
                    isHigh = false;
                    break;
                }
            }
            
            // فحص Pivot Low - يجب أن يكون أقل من جميع النقاط المحيطة
            for (let j = i - leftBars; j <= i + rightBars; j++) {
                if (j !== i && data[j].low <= current.low) {
                    isLow = false;
                    break;
                }
            }
            
            if (isHigh) {
                pivots.push({
                    index: i,
                    type: 'high',
                    price: current.high,
                    time: current.time,
                    candle: current
                });
            }
            
            if (isLow) {
                pivots.push({
                    index: i,
                    type: 'low',
                    price: current.low,
                    time: current.time,
                    candle: current
                });
            }
        }
        
        return pivots.sort((a, b) => a.index - b.index);
    }

    // إنشاء ZigZag محسن مع فلترة الضوضاء
    createZigZag(pivots, minChangePercent = 1.0) {
        if (pivots.length < 2) return [];
        
        const zigzag = [pivots[0]];
        
        for (let i = 1; i < pivots.length; i++) {
            const current = pivots[i];
            const last = zigzag[zigzag.length - 1];
            
            // حساب نسبة التغيير
            const changePercent = Math.abs((current.price - last.price) / last.price) * 100;
            
            // تجاهل التغييرات الصغيرة
            if (changePercent < minChangePercent) continue;
            
            if (current.type !== last.type) {
                zigzag.push(current);
            } else if (current.type === 'high' && current.price > last.price) {
                zigzag[zigzag.length - 1] = current;
            } else if (current.type === 'low' && current.price < last.price) {
                zigzag[zigzag.length - 1] = current;
            }
        }
        
        return zigzag;
    }

    // حساب نسبة التغيير بدقة
    calculatePercentageChange(startPrice, endPrice) {
        return ((endPrice - startPrice) / startPrice) * 100;
    }

    // حساب طول الموجة
    calculateWaveLength(startPoint, endPoint) {
        return Math.abs(endPoint.price - startPoint.price);
    }

    // التحقق من قواعد Elliott Wave للموجات الدافعة
    validateMotiveWaveRules(points) {
        const [p0, p1, p2, p3, p4, p5] = points;
        const isBullish = p5.price > p0.price;
        
        // القاعدة 1: الموجة 2 لا تتجاوز بداية الموجة 1
        const rule1 = isBullish ? p2.price > p0.price : p2.price < p0.price;
        
        // القاعدة 2: الموجة 3 ليست أقصر الموجات الدافعة
        const w1 = this.calculateWaveLength(p0, p1);
        const w3 = this.calculateWaveLength(p2, p3);
        const w5 = this.calculateWaveLength(p4, p5);
        const rule2 = w3 >= Math.max(w1, w5) || (w3 >= w1 && w3 >= w5);
        
        // القاعدة 3: الموجة 4 لا تدخل منطقة سعر الموجة 1
        const rule3 = isBullish ? p4.price > p1.price : p4.price < p1.price;
        
        // التحقق من التناوب الصحيح للاتجاهات
        const alternation = this.checkAlternation(points);
        
        return {
            rule1: rule1,
            rule2: rule2,
            rule3: rule3,
            alternation: alternation,
            isValid: rule1 && rule2 && rule3 && alternation
        };
    }

    // التحقق من تناوب الاتجاهات
    checkAlternation(points) {
        for (let i = 1; i < points.length; i++) {
            if (points[i].type === points[i-1].type) {
                return false;
            }
        }
        return true;
    }

    // تحديد النمط الدافع (12345) مع قواعد صارمة
    identifyMotivePattern(points) {
        if (points.length !== 6) return null;
        
        const [p0, p1, p2, p3, p4, p5] = points;
        
        // التحقق من القواعد الأساسية
        const validation = this.validateMotiveWaveRules(points);
        if (!validation.isValid) return null;
        
        const isBullish = p5.price > p0.price;
        
        // حساب أطوال الموجات ونسب فيبوناتشي
        const waves = {
            w1: { 
                start: p0, 
                end: p1, 
                length: this.calculateWaveLength(p0, p1),
                percentage: this.calculatePercentageChange(p0.price, p1.price)
            },
            w2: { 
                start: p1, 
                end: p2, 
                length: this.calculateWaveLength(p1, p2),
                percentage: this.calculatePercentageChange(p1.price, p2.price),
                retracement: this.calculateRetracement(p0, p1, p2)
            },
            w3: { 
                start: p2, 
                end: p3, 
                length: this.calculateWaveLength(p2, p3),
                percentage: this.calculatePercentageChange(p2.price, p3.price)
            },
            w4: { 
                start: p3, 
                end: p4, 
                length: this.calculateWaveLength(p3, p4),
                percentage: this.calculatePercentageChange(p3.price, p4.price),
                retracement: this.calculateRetracement(p2, p3, p4)
            },
            w5: { 
                start: p4, 
                end: p5, 
                length: this.calculateWaveLength(p4, p5),
                percentage: this.calculatePercentageChange(p4.price, p5.price)
            }
        };
        
        // التحقق من نسب فيبوناتشي
        const fibonacciAnalysis = this.analyzeFibonacciRelationships(waves);
        
        return {
            type: 'motive',
            direction: isBullish ? 'bullish' : 'bearish',
            points: points,
            waves: waves,
            validation: validation,
            fibonacciAnalysis: fibonacciAnalysis,
            confidence: this.calculatePatternConfidence(waves, validation, fibonacciAnalysis),
            targets: this.calculateMotiveTargets(waves, isBullish)
        };
    }

    // حساب نسبة التصحيح
    calculateRetracement(start, peak, end) {
        const totalMove = peak.price - start.price;
        const retracement = peak.price - end.price;
        return Math.abs(retracement / totalMove);
    }

    // تحليل علاقات فيبوناتشي
    analyzeFibonacciRelationships(waves) {
        const analysis = {};
        
        // تحليل الموجة 2
        const w2Retracement = waves.w2.retracement;
        analysis.wave2 = {
            retracement: w2Retracement,
            fibLevel: this.findClosestFibLevel(w2Retracement),
            isValid: w2Retracement >= 0.236 && w2Retracement <= 0.786
        };
        
        // تحليل الموجة 3
        const w3ToW1Ratio = waves.w3.length / waves.w1.length;
        analysis.wave3 = {
            ratio: w3ToW1Ratio,
            fibLevel: this.findClosestFibLevel(w3ToW1Ratio),
            isValid: w3ToW1Ratio >= 1.0 && w3ToW1Ratio <= 2.618
        };
        
        // تحليل الموجة 4
        const w4Retracement = waves.w4.retracement;
        analysis.wave4 = {
            retracement: w4Retracement,
            fibLevel: this.findClosestFibLevel(w4Retracement),
            isValid: w4Retracement >= 0.236 && w4Retracement <= 0.618
        };
        
        // تحليل الموجة 5
        const w5ToW1Ratio = waves.w5.length / waves.w1.length;
        analysis.wave5 = {
            ratio: w5ToW1Ratio,
            fibLevel: this.findClosestFibLevel(w5ToW1Ratio),
            isValid: w5ToW1Ratio >= 0.618 && w5ToW1Ratio <= 1.618
        };
        
        return analysis;
    }

    // العثور على أقرب مستوى فيبوناتشي
    findClosestFibLevel(value) {
        const fibLevels = [0.236, 0.382, 0.500, 0.618, 0.764, 1.000, 1.272, 1.618, 2.618];
        let closest = fibLevels[0];
        let minDiff = Math.abs(value - closest);
        
        for (const level of fibLevels) {
            const diff = Math.abs(value - level);
            if (diff < minDiff) {
                minDiff = diff;
                closest = level;
            }
        }
        
        return closest;
    }

    // تحديد النمط التصحيحي (ABC) مع قواعد صارمة
    identifyCorrectivePattern(points) {
        if (points.length !== 4) return null;
        
        const [pA, pB, pC, pD] = points;
        
        // التحقق من التناوب الصحيح
        if (!this.checkAlternation(points)) return null;
        
        const isBullishCorrection = pA.type === 'high' && pD.type === 'low';
        const isBearishCorrection = pA.type === 'low' && pD.type === 'high';
        
        if (!isBullishCorrection && !isBearishCorrection) return null;
        
        // حساب أطوال الموجات
        const waves = {
            wA: { 
                start: pA,end: pB, 
                length: this.calculateWaveLength(pA, pB),
                percentage: this.calculatePercentageChange(pA.price, pB.price)
            },
            wB: { 
                start: pB, 
                end: pC, 
                length: this.calculateWaveLength(pB, pC),
                percentage: this.calculatePercentageChange(pB.price, pC.price),
                retracement: this.calculateRetracement(pA, pB, pC)
            },
            wC: { 
                start: pC, 
                end: pD, 
                length: this.calculateWaveLength(pC, pD),
                percentage: this.calculatePercentageChange(pC.price, pD.price)
            }
        };
        
        // التحقق من قواعد النمط التصحيحي
        const validation = this.validateCorrectivePattern(waves, isBullishCorrection);
        if (!validation.isValid) return null;
        
        // تحليل نسب فيبوناتشي للتصحيح
        const fibonacciAnalysis = this.analyzeCorrectiveFibonacci(waves);
        
        return {
            type: 'corrective',
            direction: isBullishCorrection ? 'bearish' : 'bullish',
            points: points,
            waves: waves,
            validation: validation,
            fibonacciAnalysis: fibonacciAnalysis,
            confidence: this.calculateCorrectiveConfidence(waves, validation, fibonacciAnalysis),
            targets: this.calculateCorrectiveTargets(waves, !isBullishCorrection)
        };
    }

    // التحقق من قواعد النمط التصحيحي
    validateCorrectivePattern(waves, isBullishCorrection) {
        // القاعدة 1: الموجة B لا تتجاوز 100% من الموجة A (في معظم الحالات)
        const rule1 = waves.wB.retracement <= 1.0;
        
        // القاعدة 2: الموجة C يجب أن تكون على الأقل 61.8% من الموجة A
        const wCToWARatio = waves.wC.length / waves.wA.length;
        const rule2 = wCToWARatio >= 0.618;
        
        // القاعدة 3: الموجة C لا تتجاوز 2.618 من الموجة A
        const rule3 = wCToWARatio <= 2.618;
        
        // القاعدة 4: التحقق من الاتجاه العام للتصحيح
        const rule4 = isBullishCorrection ? 
            (waves.wA.start.price > waves.wC.end.price) : 
            (waves.wA.start.price < waves.wC.end.price);
        
        return {
            rule1: rule1,
            rule2: rule2,
            rule3: rule3,
            rule4: rule4,
            isValid: rule1 && rule2 && rule3 && rule4
        };
    }

    // تحليل نسب فيبوناتشي للتصحيح
    analyzeCorrectiveFibonacci(waves) {
        const analysis = {};
        
        // تحليل الموجة B
        const wBRetracement = waves.wB.retracement;
        analysis.waveB = {
            retracement: wBRetracement,
            fibLevel: this.findClosestFibLevel(wBRetracement),
            isValid: wBRetracement >= 0.236 && wBRetracement <= 0.786
        };
        
        // تحليل الموجة C
        const wCToWARatio = waves.wC.length / waves.wA.length;
        analysis.waveC = {
            ratio: wCToWARatio,
            fibLevel: this.findClosestFibLevel(wCToWARatio),
            isValid: wCToWARatio >= 0.618 && wCToWARatio <= 1.618
        };
        
        return analysis;
    }

    // حساب مستوى الثقة للنمط الدافع
    calculatePatternConfidence(waves, validation, fibonacciAnalysis) {
        let confidence = 0;
        
        // نقاط الثقة من القواعد الأساسية
        if (validation.rule1) confidence += 25;
        if (validation.rule2) confidence += 30;
        if (validation.rule3) confidence += 25;
        if (validation.alternation) confidence += 10;
        
        // نقاط إضافية من نسب فيبوناتشي
        if (fibonacciAnalysis.wave2.isValid) confidence += 2.5;
        if (fibonacciAnalysis.wave3.isValid) confidence += 2.5;
        if (fibonacciAnalysis.wave4.isValid) confidence += 2.5;
        if (fibonacciAnalysis.wave5.isValid) confidence += 2.5;
        
        return Math.min(confidence, 100);
    }

    // حساب مستوى الثقة للنمط التصحيحي
    calculateCorrectiveConfidence(waves, validation, fibonacciAnalysis) {
        let confidence = 0;
        
        // نقاط الثقة من القواعد الأساسية
        if (validation.rule1) confidence += 25;
        if (validation.rule2) confidence += 25;
        if (validation.rule3) confidence += 25;
        if (validation.rule4) confidence += 15;
        
        // نقاط إضافية من نسب فيبوناتشي
        if (fibonacciAnalysis.waveB.isValid) confidence += 5;
        if (fibonacciAnalysis.waveC.isValid) confidence += 5;
        
        return Math.min(confidence, 100);
    }
    
    // حساب الأولوية للأهداف
    calculateTargetPriority(wave5_w1_targets, wave5_w3_targets, isBullish) {
        let priorityTargets = {};

        // مثال لكيفية تقييم الأولوية ربما باستخدام نسب الاختراق والأهمية
        if (isBullish) {
            priorityTargets.mainTarget = wave5_w1_targets.fib618;
            priorityTargets.secondaryTarget = wave5_w3_targets.fib382;
        } else {
            priorityTargets.mainTarget = wave5_w1_targets.fib382;
            priorityTargets.secondaryTarget = wave5_w3_targets.fib618;
        }

        return priorityTargets;
    }

    // حساب الأولوية لأهداف الأنماط التصحيحية
    calculateCorrectiveTargetPriority(waveC_A_targets, isBullish) {
        let priorityTargets = {};
        
        // تحديد الأهداف الرئيسية للأنماط التصحيحية
        if (isBullish) {
            // في التصحيح الصاعد، الأهداف الشائعة
            priorityTargets.mainTarget = waveC_A_targets.fib1000;
            priorityTargets.secondaryTarget = waveC_A_targets.fib1618;
            priorityTargets.conservativeTarget = waveC_A_targets.fib618;
        } else {
            // في التصحيح الهابط، الأهداف الشائعة
            priorityTargets.mainTarget = waveC_A_targets.fib1000;
            priorityTargets.secondaryTarget = waveC_A_targets.fib1272;
            priorityTargets.conservativeTarget = waveC_A_targets.fib618;
        }
        
        return priorityTargets;
    }

    // حساب الأهداف السعرية الشاملة للموجات الدافعة
    calculateMotiveTargets(waves, isBullish) {
        const w1Length = waves.w1.length;
        const w3Length = waves.w3.length;
        const w5Length = waves.w5.length;
        const startPrice = waves.w5.start.price;
        const direction = isBullish ? 1 : -1;
        
        // أهداف الموجة 5 بناءً على الموجة 1
        const wave5_w1_targets = {
            fib236: startPrice + (direction * w1Length * this.config.fib236),
            fib382: startPrice + (direction * w1Length * this.config.fib382),
            fib500: startPrice + (direction * w1Length * this.config.fib500),
            fib618: startPrice + (direction * w1Length * this.config.fib618),
            fib764: startPrice + (direction * w1Length * this.config.fib764),
            fib1000: startPrice + (direction * w1Length * this.config.fib1000),
            fib1272: startPrice + (direction * w1Length * this.config.fib1272),
            fib1618: startPrice + (direction * w1Length * this.config.fib1618),
            fib2618: startPrice + (direction * w1Length * this.config.fib2618)
        };
        
        // أهداف الموجة 5 بناءً على الموجة 3
        const wave5_w3_targets = {
            fib236: startPrice + (direction * w3Length * this.config.fib236),
            fib382: startPrice + (direction * w3Length * this.config.fib382),
            fib500: startPrice + (direction * w3Length * this.config.fib500),
            fib618: startPrice + (direction * w3Length * this.config.fib618),
            fib764: startPrice + (direction * w3Length * this.config.fib764)
        };
        
        // أهداف الموجة 5 بناءً على المسافة الكلية (0 إلى 3)
        const totalRange_0_to_3 = Math.abs(waves.w3.end.price - waves.w1.start.price);
        const wave5_total_targets = {
            fib382: waves.w1.start.price + (direction * totalRange_0_to_3 * this.config.fib382),
            fib618: waves.w1.start.price + (direction * totalRange_0_to_3 * this.config.fib618),
            fib1000: waves.w1.start.price + (direction * totalRange_0_to_3 * this.config.fib1000),
            fib1618: waves.w1.start.price + (direction * totalRange_0_to_3 * this.config.fib1618)
        };
        
        // أهداف النمط الكامل (إسقاط كامل)
        const fullPatternLength = Math.abs(waves.w5.end.price - waves.w1.start.price);
        const nextCycleTargets = {
            extension100: waves.w5.end.price + (direction * fullPatternLength * 1.0),
            extension127: waves.w5.end.price + (direction * fullPatternLength * this.config.fib1272),
            extension162: waves.w5.end.price + (direction * fullPatternLength * this.config.fib1618),
            extension262: waves.w5.end.price + (direction * fullPatternLength * this.config.fib2618)
        };
        
        // أهداف التصحيح المتوقعة بعد النمط
        const correctionTargets = {
            correction236: waves.w5.end.price - (direction * fullPatternLength * this.config.fib236),
            correction382: waves.w5.end.price - (direction * fullPatternLength * this.config.fib382),
            correction500: waves.w5.end.price - (direction * fullPatternLength * this.config.fib500),
            correction618: waves.w5.end.price - (direction * fullPatternLength * this.config.fib618),
            correction786: waves.w5.end.price - (direction * fullPatternLength * 0.786)
        };
        
        return {
            // أهداف مفصلة للموجة 5
            wave5_based_on_w1: wave5_w1_targets,
            wave5_based_on_w3: wave5_w3_targets,
            wave5_based_on_total: wave5_total_targets,
            
            // أهداف الدورة القادمة
            next_cycle_targets: nextCycleTargets,
            
            // أهداف التصحيح المتوقعة
            correction_targets: correctionTargets,
            
            // الأهداف الأساسية (متوافق مع الكود القديم)
            wave5_fib618: wave5_w1_targets.fib618,
            wave5_fib1000: wave5_w1_targets.fib1000,
            wave5_fib1618: wave5_w1_targets.fib1618,
            wave5_w3_fib382: wave5_w3_targets.fib382,
            wave5_w3_fib618: wave5_w3_targets.fib618,
            
            // الهدف النهائي للنمط
            finalTarget: waves.w5.end.price,
            
            // مستويات الدعم والمقاومة المحسنة
            support: Math.min(waves.w2.end.price, waves.w4.end.price),
            resistance: Math.max(waves.w1.end.price, waves.w3.end.price, waves.w5.end.price),
            
            // مستويات إضافية
            keyLevels: {
                wave1_end: waves.w1.end.price,
                wave2_end: waves.w2.end.price,
                wave3_end: waves.w3.end.price,
                wave4_end: waves.w4.end.price,
                wave5_end: waves.w5.end.price
            },
            
            // تحليل الأولوية
            priority: this.calculateTargetPriority(wave5_w1_targets, wave5_w3_targets, isBullish)
        };
    }

    // حساب الأهداف السعرية الشاملة للأنماط التصحيحية
    calculateCorrectiveTargets(waves, isBullish) {
        const wALength = waves.wA.length;
        const wBLength = waves.wB.length;
        const startPrice = waves.wC.start.price;
        const direction = isBullish ? 1 : -1;
        
        // أهداف الموجة C بناءً على الموجة A (الأكثر شيوعاً)
        const waveC_A_targets = {
            fib236: startPrice + (direction * wALength * this.config.fib236),
            fib382: startPrice + (direction * wALength * this.config.fib382),
            fib500: startPrice + (direction * wALength * this.config.fib500),
            fib618: startPrice + (direction * wALength * this.config.fib618),
            fib764: startPrice + (direction * wALength * this.config.fib764),
            fib1000: startPrice + (direction * wALength * this.config.fib1000),
            fib1272: startPrice + (direction * wALength * this.config.fib1272),
            fib1618: startPrice + (direction * wALength * this.config.fib1618),
            fib2618: startPrice + (direction * wALength * this.config.fib2618)
        };
        
        // أهداف الموجة C بناءً على الموجة B (أقل شيوعاً)
        const waveC_B_targets = {
            fib618: startPrice + (direction * wBLength * this.config.fib618),
            fib1000: startPrice + (direction * wBLength * this.config.fib1000),
            fib1618: startPrice + (direction * wBLength * this.config.fib1618)
        };
        
        // أهداف التصحيح الكامل
        const fullCorrectionLength = Math.abs(waves.wC.end.price - waves.wA.start.price);
        const completionTargets = {
            completion100: waves.wA.start.price,
            completion127: waves.wA.start.price + (direction * fullCorrectionLength * this.config.fib1272),
            completion162: waves.wA.start.price + (direction * fullCorrectionLength * this.config.fib1618)
        };
        
        // أهداف النمط القادم بعد اكتمال التصحيح
        const nextImpulseTargets = {
            impulse_fib618: waves.wC.end.price + (direction * fullCorrectionLength * this.config.fib618),
            impulse_fib1000: waves.wC.end.price + (direction * fullCorrectionLength * this.config.fib1000),
            impulse_fib1618: waves.wC.end.price + (direction * fullCorrectionLength * this.config.fib1618),
            impulse_fib2618: waves.wC.end.price + (direction * fullCorrectionLength * this.config.fib2618)
        };
        
        return {
            // أهداف مفصلة للموجة C
            waveC_based_on_A: waveC_A_targets,
            waveC_based_on_B: waveC_B_targets,
            
            // أهداف اكتمال التصحيح
            completion_targets: completionTargets,
            
            // أهداف النمط الدافع القادم
            next_impulse_targets: nextImpulseTargets,
            
            // الأهداف الأساسية (متوافق مع الكود القديم)
            waveC_fib618: waveC_A_targets.fib618,
            waveC_fib1000: waveC_A_targets.fib1000,
            waveC_fib1272: waveC_A_targets.fib1272,
            waveC_fib1618: waveC_A_targets.fib1618,
            
            // الهدف النهائي للتصحيح
            finalTarget: waves.wC.end.price,
            
            // مستويات الدعم والمقاومة المحسنة
            support: isBullish ? waves.wA.start.price : waves.wC.end.price,
            resistance: isBullish ? waves.wC.end.price : waves.wA.start.price,
            
            // مستويات إضافية
            keyLevels: {
                waveA_start: waves.wA.start.price,
                waveA_end: waves.wB.start.price,
                waveB_end: waves.wC.start.price,
                waveC_end: waves.wC.end.price
            },
            
            // تحليل الأولوية للأهداف التصحيحية
            priority: this.calculateCorrectiveTargetPriority(waveC_A_targets, isBullish)
        };
    }

    // البحث عن الأنماط المتداخلة (Nested Patterns)
    findNestedPatterns(zigzag) {
        const nestedPatterns = [];
        
        // البحث عن أنماط فرعية داخل الموجات الرئيسية
        for (let i = 0; i <= zigzag.length - 6; i++) {
            const mainPattern = zigzag.slice(i, i + 6);
            
            // البحث عن تفاصيل أكثر في كل موجة
            for (let j = 0; j < mainPattern.length - 1; j++) {
                const subWave = this.analyzeSubWave(mainPattern[j], mainPattern[j + 1]);
                if (subWave) {
                    nestedPatterns.push(subWave);
                }
            }
        }
        
        return nestedPatterns;
    }

    // تحليل الموجة الفرعية
    analyzeSubWave(startPoint, endPoint) {
        // هذه الدالة يمكن توسيعها لتحليل الموجات الفرعية بتفصيل أكبر
        const length = this.calculateWaveLength(startPoint, endPoint);
        const percentage = this.calculatePercentageChange(startPoint.price, endPoint.price);
        
        return {
            start: startPoint,
            end: endPoint,
            length: length,
            percentage: percentage,
            direction: endPoint.price > startPoint.price ? 'up' : 'down',
            timeframe: endPoint.time - startPoint.time
        };
    }

    // تحليل Elliott Wave الرئيسي
    analyzeElliottWave(zigzag) {
        if (zigzag.length < 4) return null;
        
        const patterns = [];
        
        // البحث عن الأنماط الدافعة (12345)
        for (let i = 0; i <= zigzag.length - 6; i++) {
            const points = zigzag.slice(i, i + 6);
            const pattern = this.identifyMotivePattern(points);
            
            if (pattern && pattern.confidence >= 70) { // فقط الأنماط عالية الثقة
                patterns.push(pattern);
            }
        }
        
        // البحث عن الأنماط التصحيحية (ABC)
        for (let i = 0; i <= zigzag.length - 4; i++) {
            const points = zigzag.slice(i, i + 4);
            const pattern = this.identifyCorrectivePattern(points);
            
            if (pattern && pattern.confidence >= 70) { // فقط الأنماط عالية الثقة
                patterns.push(pattern);
            }
        }
        
        // ترتيب الأنماط حسب مستوى الثقة
        patterns.sort((a, b) => b.confidence - a.confidence);
        
        return patterns;
    }

    // تحليل الاتجاه العام
    analyzeTrend(patterns) {
        if (patterns.length === 0) return 'neutral';
        
        const recentPattern = patterns[0]; // النمط الأحدث والأعلى ثقة
        
        if (recentPattern.type === 'motive') {
            return recentPattern.direction;
        } else if (recentPattern.type === 'corrective') {
            // التصحيح يشير إلى انتهاء الاتجاه السابق
            return recentPattern.direction === 'bullish' ? 'bullish_correction_end' : 'bearish_correction_end';
        }
        
        return 'neutral';
    }

    // حساب مستويات الدعم والمقاومة الديناميكية
    calculateDynamicLevels(patterns, currentPrice) {
        const levels = {
            support: [],
            resistance: [],
            targets: []
        };
        
        patterns.forEach(pattern => {
            if (pattern.type === 'motive') {
                // إضافة مستويات من النمط الدافع
                levels.support.push(pattern.targets.support);
                levels.resistance.push(pattern.targets.resistance);
                
                // إضافة أهداف فيبوناتشي
                Object.values(pattern.targets).forEach(target => {
                    if (typeof target === 'number') {
                        if (pattern.direction === 'bullish' && target > currentPrice) {
                            levels.targets.push(target);
                        } else if (pattern.direction === 'bearish' && target < currentPrice) {
                            levels.targets.push(target);
                        }
                    }
                });
            }
        });
        
        // إزالة المستويات المكررة وترتيبها
        levels.support = [...new Set(levels.support)].sort((a, b) => b - a);
        levels.resistance = [...new Set(levels.resistance)].sort((a, b) => a - b);
        levels.targets = [...new Set(levels.targets)].sort((a, b) => a - b);
        
        return levels;
    }

    // التحليل الرئيسي المحسن
    analyze(klineData) {
        try {
            // تحويل البيانات إلى التنسيق المطلوب
            const formattedData = klineData.map((kline, index) => ({
                time: kline[0],
                open: parseFloat(kline[1]),
                high: parseFloat(kline[2]),
                low: parseFloat(kline[3]),
                close: parseFloat(kline[4]),
                volume: parseFloat(kline[5]),
                index: index
            }));

            // التحقق من كفاية البيانات
            if (formattedData.length < 20) {
                return { 
                    patterns: [], 
                    status: 'insufficient_data',
                    message: 'يحتاج التحليل إلى 20 شمعة على الأقل'
                };
            }

            // العثور على النقاط المحورية
            const pivots = this.findPivots(formattedData,
                this.config.len1, 
                this.config.len1
            );

            if (pivots.length < 6) {
                return { 
                    patterns: [], 
                    status: 'insufficient_pivots',
                    message: 'عدد النقاط المحورية غير كافي للتحليل'
                };
            }

            // إنشاء ZigZag محسن
            const zigzag = this.createZigZag(pivots, 0.5);

            if (zigzag.length < 4) {
                return { 
                    patterns: [], 
                    status: 'insufficient_zigzag',
                    message: 'ZigZag غير كافي للتحليل'
                };
            }

            // تحليل Elliott Wave
            const patterns = this.analyzeElliottWave(zigzag);

            if (!patterns || patterns.length === 0) {
                return {
                    patterns: [],
                    zigzag: zigzag,
                    pivots: pivots,
                    status: 'no_patterns_found',
                    message: 'لم يتم العثور على أنماط Elliott Wave صالحة'
                };
            }

            // تحليل الاتجاه العام
            const trend = this.analyzeTrend(patterns);

            // حساب السعر الحالي
            const currentPrice = formattedData[formattedData.length - 1].close;

            // حساب مستويات الدعم والمقاومة الديناميكية
            const dynamicLevels = this.calculateDynamicLevels(patterns, currentPrice);

            // البحث عن الأنماط المتداخلة
            const nestedPatterns = this.findNestedPatterns(zigzag);

            // تحليل إضافي للموجة الحالية
            const currentWaveAnalysis = this.analyzeCurrentWave(patterns, currentPrice);

            // إنشاء التوصيات
            const recommendations = this.generateRecommendations(patterns, trend, currentPrice, dynamicLevels);

            return {
                patterns: patterns,
                zigzag: zigzag,
                pivots: pivots,
                trend: trend,
                currentPrice: currentPrice,
                dynamicLevels: dynamicLevels,
                nestedPatterns: nestedPatterns,
                currentWaveAnalysis: currentWaveAnalysis,
                recommendations: recommendations,
                status: 'success',
                timestamp: Date.now(),
                summary: this.generateAnalysisSummary(patterns, trend, currentWaveAnalysis)
            };

        } catch (error) {
            console.error('خطأ في تحليل Elliott Wave:', error);
            return { 
                patterns: [], 
                status: 'error', 
                error: error.message,
                stack: error.stack
            };
        }
    }

    // تحليل الموجة الحالية
    analyzeCurrentWave(patterns, currentPrice) {
        if (patterns.length === 0) return null;

        const mostRecentPattern = patterns[0];
        const lastPoint = mostRecentPattern.points[mostRecentPattern.points.length - 1];

        let currentWave = null;
        let expectedTarget = null;
        let stopLoss = null;

        if (mostRecentPattern.type === 'motive') {
            // تحديد الموجة الحالية في النمط الدافع
            const waves = mostRecentPattern.waves;
            
            if (currentPrice > lastPoint.price && mostRecentPattern.direction === 'bullish') {
                currentWave = 'extension_or_new_cycle';
                expectedTarget = mostRecentPattern.targets.wave5_fib1618;
            } else if (currentPrice < lastPoint.price && mostRecentPattern.direction === 'bearish') {
                currentWave = 'extension_or_new_cycle';
                expectedTarget = mostRecentPattern.targets.wave5_fib1618;
            } else {
                currentWave = 'corrective_phase';
                expectedTarget = mostRecentPattern.targets.support;
            }
        } else if (mostRecentPattern.type === 'corrective') {
            // تحديد الموجة الحالية في النمط التصحيحي
            if (Math.abs(currentPrice - lastPoint.price) / lastPoint.price < 0.02) {
                currentWave = 'correction_completion';
                expectedTarget = mostRecentPattern.direction === 'bullish' ? 
                    mostRecentPattern.targets.waveC_fib1618 : 
                    mostRecentPattern.targets.waveC_fib1618;
            } else {
                currentWave = 'new_impulse_starting';
            }
        }

        return {
            currentWave: currentWave,
            expectedTarget: expectedTarget,
            stopLoss: stopLoss,
            confidence: mostRecentPattern.confidence,
            timeframe: this.estimateTimeframe(mostRecentPattern),
            riskReward: this.calculateRiskReward(currentPrice, expectedTarget, stopLoss)
        };
    }

    // تقدير الإطار الزمني
    estimateTimeframe(pattern) {
        const startTime = pattern.points[0].time;
        const endTime = pattern.points[pattern.points.length - 1].time;
        const duration = endTime - startTime;

        // تحويل إلى ساعات
        const hours = duration / (1000 * 60 * 60);

        if (hours < 24) {
            return `${Math.round(hours)} ساعة`;
        } else if (hours < 24 * 7) {
            return `${Math.round(hours / 24)} يوم`;
        } else {
            return `${Math.round(hours / (24 * 7))} أسبوع`;
        }
    }

    // حساب نسبة المخاطرة إلى العائد
    calculateRiskReward(currentPrice, target, stopLoss) {
        if (!target || !stopLoss) return null;

        const potentialProfit = Math.abs(target - currentPrice);
        const potentialLoss = Math.abs(currentPrice - stopLoss);

        return potentialLoss > 0 ? (potentialProfit / potentialLoss).toFixed(2) : null;
    }

    // إنشاء التوصيات
    generateRecommendations(patterns, trend, currentPrice, dynamicLevels) {
        const recommendations = [];

        if (patterns.length === 0) {
            return [{
                type: 'neutral',
                message: 'لا توجد إشارات واضحة حالياً',
                confidence: 0
            }];
        }

        const topPattern = patterns[0];

        if (topPattern.confidence >= 80) {
            if (topPattern.type === 'motive') {
                if (topPattern.direction === 'bullish') {
                    recommendations.push({
                        type: 'buy',
                        message: 'نمط دافع صاعد قوي - فرصة شراء',
                        entry: currentPrice,
                        targets: [
                            topPattern.targets.wave5_fib618,
                            topPattern.targets.wave5_fib1000,
                            topPattern.targets.wave5_fib1618
                        ],
                        stopLoss: topPattern.targets.support,
                        confidence: topPattern.confidence
                    });
                } else {
                    recommendations.push({
                        type: 'sell',
                        message: 'نمط دافع هابط قوي - فرصة بيع',
                        entry: currentPrice,
                        targets: [
                            topPattern.targets.wave5_fib618,
                            topPattern.targets.wave5_fib1000,
                            topPattern.targets.wave5_fib1618
                        ],
                        stopLoss: topPattern.targets.resistance,
                        confidence: topPattern.confidence
                    });
                }
            } else if (topPattern.type === 'corrective') {
                recommendations.push({
                    type: 'wait',
                    message: 'نمط تصحيحي - انتظار اكتمال التصحيح',
                    expectedCompletion: topPattern.targets.finalTarget,
                    confidence: topPattern.confidence
                });
            }
        } else if (topPattern.confidence >= 60) {
            recommendations.push({
                type: 'caution',
                message: 'إشارة متوسطة القوة - يُنصح بالحذر',
                confidence: topPattern.confidence
            });
        }

        return recommendations;
    }

    // إنشاء ملخص التحليل
    generateAnalysisSummary(patterns, trend, currentWaveAnalysis) {
        if (patterns.length === 0) {
            return 'لا توجد أنماط Elliott Wave واضحة في البيانات الحالية';
        }

        const topPattern = patterns[0];
        let summary = `تم العثور على ${patterns.length} نمط Elliott Wave. `;
        
        summary += `النمط الأقوى هو ${topPattern.type === 'motive' ? 'دافع' : 'تصحيحي'} `;
        summary += `${topPattern.direction === 'bullish' ? 'صاعد' : 'هابط'} `;
        summary += `بمستوى ثقة ${topPattern.confidence.toFixed(1)}%. `;

        if (currentWaveAnalysis) {
            summary += `الموجة الحالية: ${this.translateWaveType(currentWaveAnalysis.currentWave)}. `;
        }

        summary += `الاتجاه العام: ${this.translateTrend(trend)}.`;

        return summary;
    }

    // ترجمة نوع الموجة
    translateWaveType(waveType) {
        const translations = {
            'extension_or_new_cycle': 'امتداد أو دورة جديدة',
            'corrective_phase': 'مرحلة تصحيحية',
            'correction_completion': 'اكتمال التصحيح',
            'new_impulse_starting': 'بداية دفعة جديدة'
        };
        return translations[waveType] || waveType;
    }

    // ترجمة الاتجاه
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

    // دالة مساعدة لطباعة النتائج بشكل منظم
    printAnalysis(analysis) {
        console.log('\n=== تحليل Elliott Wave ===');
        console.log(`الحالة: ${analysis.status}`);
        
        if (analysis.status === 'success') {
            console.log(`عدد الأنماط المكتشفة: ${analysis.patterns.length}`);
            console.log(`الاتجاه العام: ${this.translateTrend(analysis.trend)}`);
            console.log(`السعر الحالي: ${analysis.currentPrice}`);
            console.log(`\nملخص التحليل: ${analysis.summary}`);
            
            if (analysis.patterns.length > 0) {
                console.log('\n--- أفضل الأنماط ---');
                analysis.patterns.slice(0, 3).forEach((pattern, index) => {
                    console.log(`${index + 1}. نمط ${pattern.type === 'motive' ? 'دافع' : 'تصحيحي'} ${pattern.direction === 'bullish' ? 'صاعد' : 'هابط'}`);
                    console.log(`   مستوى الثقة: ${pattern.confidence.toFixed(1)}%`);
                    console.log(`   النقاط: ${pattern.points.length}`);
                });
            }
            
            if (analysis.recommendations.length > 0) {
                console.log('\n--- التوصيات ---');
                analysis.recommendations.forEach((rec, index) => {
                    console.log(`${index + 1}. ${rec.message} (ثقة: ${rec.confidence || 0}%)`);
                });
            }
        } else {
            console.log(`رسالة: ${analysis.message || 'خطأ غير محدد'}`);
        }
        
        console.log('========================\n');
    }
}

// تصدير الكلاس
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ElliottWaveAnalyzer;
} else if (typeof window !== 'undefined') {
    window.ElliottWaveAnalyzer = ElliottWaveAnalyzer;
}

