# محلل موجات إليوت - Elliott Wave Analyzer

## 📊 نظرة عامة
محلل موجات إليوت هو تطبيق ويب متطور لتحليل الأسواق المالية باستخدام نظرية موجات إليوت. يتصل التطبيق بـ Binance API لجلب البيانات المالية الحقيقية ويقوم بتحليلها لتحديد الأنماط والموجات.

## 🚀 الميزات
- 📈 تحليل موجات إليوت التلقائي
- 🔄 اتصال مباشر مع Binance API
- 🛡️ نظام CORS proxy للتغلب على قيود المتصفح
- 📊 رسوم بيانية تفاعلية
- 🌐 واجهة باللغة العربية
- ⚡ استجابة سريعة وسهولة في الاستخدام

## 📁 هيكل المشروع
```
elliott-wave-analyzer/
├── index.html              # الصفحة الرئيسية
├── test-api.html           # صفحة اختبار الـ API
├── css/
│   └── style.css          # ملف الأنماط
├── js/
│   ├── main.js            # الملف الرئيسي للتطبيق
│   ├── binance-secure.js  # وحدة الاتصال بـ Binance API
│   ├── cors-proxy.js      # نظام CORS proxy
│   └── elliott-wave.js    # محلل موجات إليوت
└── README-AR.md           # هذا الملف
```

## 🛠️ التثبيت والإعداد

### 1. تحميل المشروع
```bash
git clone [repository-url]
cd elliott-wave-analyzer
```

### 2. فتح التطبيق
- افتح `index.html` في متصفح الويب مباشرة
- أو استخدم خادم محلي مثل Live Server في VS Code

### 3. اختبار الاتصال
- افتح `test-api.html` لاختبار اتصال Binance API
- اضغط على "اختبار الاتصال" للتأكد من عمل النظام

## 🔧 حل مشاكل CORS

### المشكلة
متصفحات الويب تمنع الطلبات المباشرة لـ Binance API بسبب CORS policy.

### الحلول المطبقة

#### 1. إزالة Headers غير الضرورية
```javascript
// تم إزالة Content-Type header لتجنب preflight requests
const response = await fetch(url, {
    method: 'GET'
    // تم حذف: 'Content-Type': 'application/json'
});
```

#### 2. نظام CORS Proxy التلقائي
```javascript
// النظام يحاول الاتصال المباشر أولاً
// في حالة الفشل، يتحول تلقائياً للبروكسي
if (directRequestFails) {
    this.config.useCORSProxy = true;
    return await this.makeProxiedRequest(url);
}
```

#### 3. البروكسي المتاحة
- **AllOrigins**: `https://api.allorigins.win/raw?url=`
- **ThingProxy**: `https://thingproxy.freeboard.io/fetch/`
- **CorsAnywhere**: `https://cors-anywhere.herokuapp.com/` (يتطلب إذن)

## 📖 كيفية الاستخدام

### 1. الواجهة الرئيسية
1. افتح `index.html`
2. اختر زوج العملات (مثل BTC/USDT)
3. اختر الفترة الزمنية (1 ساعة، 4 ساعات، يوم)
4. حدد عدد الشموع للتحليل
5. اضغط "تحليل البيانات"

### 2. صفحة الاختبار
1. افتح `test-api.html`
2. انتظر التهيئة التلقائية
3. استخدم الأزرار للاختبار:
   - "اختبار الاتصال": للتأكد من عمل API
   - "سعر البيتكوين": لجلب السعر الحالي
   - "بيانات الشموع": لجلب بيانات الشموع

## 🔍 استكشاف الأخطاء

### خطأ CORS
```
Access to fetch at 'https://api.binance.com' has been blocked by CORS policy
```
**الحل**: النظام سيتحول تلقائياً لاستخدام CORS proxy.

### فشل جميع Proxies
```javascript
// تفعيل proxy إضافي
api.corsProxy.setProxyStatus('CorsAnywhere Heroku', true);
```

### بيانات غير صحيحة
- تأكد من صحة رمز العملة (مثل BTCUSDT)
- تحقق من الفترة الزمنية المطلوبة
- تأكد من اتصال الإنترنت

## ⚙️ الإعدادات المتقدمة

### تخصيص Rate Limiting
```javascript
this.config = {
    rateLimit: 1200,        // طلبات في الدقيقة
    requestInterval: 50     // أدنى فترة بين الطلبات (مللي ثانية)
};
```

### إضافة أزواج عملات جديدة
```javascript
getPopularPairs() {
    return [
        'BTCUSDT', 'ETHUSDT', 'BNBUSDT',
        'NEWCOINUSDT'  // أضف العملة الجديدة هنا
    ];
}
```

## 🔐 الأمان
- لا يتم تخزين أي API keys
- جميع الطلبات للـ endpoints العامة فقط
- لا يتم حفظ بيانات المستخدم
- الاتصال آمن عبر HTTPS

## 📱 التوافق
- ✅ Chrome 80+
- ✅ Firefox 75+
- ✅ Safari 13+
- ✅ Edge 80+
- 📱 متوافق مع الأجهزة المحمولة

## 🤝 المساهمة
نرحب بمساهماتكم! يرجى:
1. عمل Fork للمشروع
2. إنشاء branch جديد للميزة
3. تطبيق التغييرات والاختبار
4. إرسال Pull Request

## 📄 الترخيص
هذا المشروع مرخص تحت رخصة MIT - انظر ملف LICENSE للتفاصيل.

## 🔗 روابط مفيدة
- [Binance API Documentation](https://binance-docs.github.io/apidocs/)
- [Elliott Wave Theory](https://www.investopedia.com/elliott-wave-theory/)
- [CORS Information](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)

## 📞 الدعم
إذا واجهت أي مشاكل، يرجى:
1. التحقق من console المتصفح للأخطاء
2. تجربة صفحة الاختبار أولاً
3. فتح issue في GitHub مع تفاصيل المشكلة

---
**تم التطوير بـ ❤️ لمجتمع المتداولين العرب**
