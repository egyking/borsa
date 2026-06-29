# بورصة — مستشار أسهم وذهب السوق المصري 🇪🇬

تطبيق ويب يقدّم توصيات آلية (شراء / بيع / انتظار) لأسهم البورصة المصرية والذهب،
على مستويين: **المضاربة (قصير الأجل)** و**الاستثمار (طويل الأجل)** — مع أسباب كل
توصية ومستوى المخاطرة ووقف الخسارة والهدف.

> ⚠️ توصيات لأغراض تعليمية فقط وليست نصيحة استثمارية.

## المعمارية (Cache-First — مجانية وموثوقة)

```
GitHub Action (يومياً، مجاناً)
   └─ يدرّب النموذجين + يحسب التوصيات والأسعار والذهب
      └─ يكتب frontend/public/snapshot.json  ← الواجهة تقرأه مباشرة
```

لماذا؟ مصدر البيانات (Yahoo Finance) يفرض **حظر معدّل (rate limit)** صارم على
الخوادم السحابية. بدل استدعائه عند كل طلب (يفشل غالباً)، نحسب كل شيء **مرة واحدة
يومياً** في GitHub Action ونحفظ النتيجة في ملف ثابت تقرأه الواجهة فوراً — بلا حظر،
بلا تكلفة، وبلا حدود حجم على الخوادم.

## المكوّنات

| الجزء | التقنية | الاستضافة المجانية |
|------|---------|--------------------|
| الواجهة | React 19 + Vite + Tailwind (RTL/عربي) | Vercel / Firebase Hosting / GitHub Pages |
| النماذج | scikit-learn (RandomForest ×2) | تُولّد في GitHub Actions |
| البيانات | yfinance (أسهم `.CA` + ذهب `GC=F` + صرف `EGP=X`) | GitHub Actions |
| الـ API (اختياري) | FastAPI | للتشغيل المحلي/عند الطلب |

## النماذج

- **نموذج المضاربة**: أفق 5 أيام، عتبة ±2.5%.
- **نموذج الاستثمار**: أفق 60 يوماً، عتبة ±10%.
- **19 مؤشراً فنياً**: RSI، MACD، المتوسطات (20/50/200)، بولينجر، ستوكاستيك، OBV، ATR، ROC…
- إن لم يوجد نموذج مدرّب، يرجع التطبيق تلقائياً لتوصيات قائمة على التحليل الفني (TA) فقط.

## التشغيل محلياً

### 1) توليد البيانات والنماذج
```bash
cd backend
pip install -r requirements.txt
python train_model.py     # يدرّب النموذجين (يحتاج إنترنت)
python snapshot.py        # ينشئ snapshot.json
```

### 2) الواجهة
```bash
cd frontend
npm install
npm run dev               # http://localhost:5173
```
الواجهة تقرأ `public/snapshot.json` تلقائياً. لتشغيل باك-إند حيّ اختياري:
```bash
cd backend && python main.py        # http://localhost:8000
# ثم في frontend/.env ضع VITE_API_URL=http://localhost:8000
```

## النشر (مجاناً)

1. **GitHub Actions**: فعّل الـ workflow (يعمل يومياً + يدوياً عبر *Run workflow*).
   - (اختياري) أضف سرّاً باسم `FIREBASE_SERVICE_ACCOUNT` بمحتوى ملف الخدمة لمزامنة
     التوصيات إلى Firestore.
2. **Vercel**: اربط المستودع — الإعداد جاهز في `vercel.json` (يبني الواجهة فقط).
   - أو `firebase deploy --only hosting` (الإعداد جاهز في `firebase.json`).

## نقاط الـ API (للباك-إند الاختياري)

| المسار | الوصف |
|--------|-------|
| `GET /api/snapshot` | كامل البيانات |
| `GET /api/symbols` | قائمة الأسهم المتابَعة |
| `GET /api/prices` | آخر الأسعار |
| `GET /api/recommend/{symbol}` | توصية سهم (قصير + طويل) |
| `GET /api/gold` | أسعار وتوصيات الذهب |
| `GET /api/history/{symbol}` · `GET /api/indicators/{symbol}` | التاريخ والمؤشرات |
| `POST /api/update-all` | إعادة توليد الـ snapshot |

## الأمان

- لا تُرفع الأسرار: `firebase-service-account.json` و`.env` ضمن `.gitignore`.
- CORS مضبوط بدون credentials.
- قواعد Firestore تمنع الكتابة من العميل.
