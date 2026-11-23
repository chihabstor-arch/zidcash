# ZidCash — المرحلة التأسيسية

منصة عربية RTL للتسويق بالعمولة. هذه نسخة تأسيسية قابلة للتطوير، وليست منصة مكتملة تجارياً بعد.

## محتويات المشروع
- `site/`: واجهة ويب عربية متجاوبة.
- `worker/`: Cloudflare Worker يقدم API للموقع وتطبيق Android مستقبلاً.
- `worker/migrations/0001_initial.sql`: مخطط قاعدة بيانات D1.

## المتطلبات
- حساب Cloudflare.
- Node.js حديث على جهاز تطوير أو بيئة Cloudflare.
- GitHub repository.

## 1) إعداد قاعدة D1
من مجلد `worker` شغّل:
```bash
npm install
npx wrangler d1 create zidcash-db
```
انسخ `database_id` الذي يظهر لك، ثم ضعه في `worker/wrangler.toml` بدل `REPLACE_WITH_D1_DATABASE_ID`.

طبّق مخطط قاعدة البيانات:
```bash
npx wrangler d1 migrations apply zidcash-db --remote
```

للتطوير المحلي استخدم:
```bash
npx wrangler d1 migrations apply zidcash-db --local
```

## 2) تشغيل Worker محلياً
```bash
cd worker
npm install
npm run dev
```
العنوان المحلي الافتراضي: `http://localhost:8787`.

## 3) ربط الواجهة بالـ API
افتح `site/app.js` وعدّل `API_BASE` إلى رابط Worker المنشور، أو اتركه فارغاً إذا كانت الواجهة والـ API على نفس النطاق مع إعداد proxy مناسب.

## 4) النشر
انشر Worker من مجلد `worker`:
```bash
npx wrangler deploy
```
يمكن نشر مجلد `site` على Cloudflare Pages كموقع Static. اربط الواجهة بعنوان Worker في `site/app.js`.

## API المتوفر في هذه المرحلة
- `GET /api/health`
- `GET /api/products`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me` (يتطلب `Authorization: Bearer <token>`)

## حدود هذه النسخة
- التسجيل والدخول الأساسيان يعملان عبر D1 عند إعداد قاعدة البيانات.
- لا توجد بعد لوحة إدارة محمية، أو نظام طلبات وعمولات وسحب، أو مزامنة موردين/Telegram، أو متجر مستقل لكل مسوق.
- لا تضع مفاتيح أو أسراراً داخل ملفات الواجهة أو GitHub. استخدم متغيرات Worker السرية عند إضافة خدمات خارجية.
- قبل الاستخدام التجاري: أضف التحقق من البريد/الهاتف، حدود المحاولات، سياسات الخصوصية والشروط، ومراجعة أمنية واختبارات شاملة.


## ملاحظة لمستخدمي Android
لتسهيل ظهور الملفات في بعض تطبيقات إدارة الملفات، أُدرجت ملفات الإعداد الاختيارية بأسماء ظاهرة:
- `gitignore.txt`: عند تجهيز GitHub، أنشئ ملفاً باسم `.gitignore` وانسخ محتواه إليه.
- `worker/dev.vars.example.txt`: مثال توضيحي فقط؛ لا يحتاجه تشغيل الوظائف الأساسية. إذا احتجته محلياً، انسخ محتواه إلى ملف `.dev.vars` داخل `worker`.
