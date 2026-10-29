# نطاق | محول الصور لرابط

تطبيق Next.js احترافي للبحث عن صور المنتجات على الإنترنت، فحص الصورة الأصلية، حفظ نسخة مستقلة في Object Storage، ثم توليد رابط HTTPS مباشر وثابت جاهز للاستخدام في منصات مثل سلة، زد، Shopify، وWooCommerce.

## المسار الأساسي

1. اكتب اسم المنتج والبيانات الاختيارية مثل Brand وModel وSKU.
2. التطبيق يبحث عن صور حقيقية عبر Search Provider.
3. يتم فحص الصورة الأصلية وليس Thumbnail فقط.
4. تظهر الأبعاد، المصدر، نوع الملف، Product Match Score، Quality Score، وحالة العلامة المائية.
5. عند الضغط على اعتماد الصورة ينفذ الخادم: `Original URL -> Server Fetch -> Validation -> Processing -> Vercel Blob -> Public URL -> Server-to-Server Test -> READY`.
6. الرابط النهائي يكون من التخزين الخاص بالتطبيق، وليس Hotlink من الموقع الأصلي.

## التقنية

- Next.js App Router
- TypeScript
- React
- Tailwind CSS
- Prisma + PostgreSQL
- Vercel Blob
- Sharp لمعالجة الصور
- ExcelJS لاستيراد وتصدير ملفات Excel
- JWT Cookie Authentication
- Upstash Redis اختياري للـ Rate Limiting في الإنتاج

## Search Provider

يوجد abstraction باسم `ImageSearchProvider`.

المزودات الحالية:

- `serpapi`: الافتراضي، يستخدم Google Images عبر SerpAPI.
- `bing`: يستخدم Bing Image Search API.

اضبط:

```env
IMAGE_SEARCH_PROVIDER="serpapi"
IMAGE_SEARCH_API_KEY="..."
```

أو:

```env
IMAGE_SEARCH_PROVIDER="bing"
IMAGE_SEARCH_API_KEY="..."
```

## Storage Provider

يوجد interface باسم `StorageProvider` ويحتوي على `uploadImage` و`deleteImage` و`getPublicUrl` و`checkImageExists`.

المزود الحالي:

- `vercel-blob`

اضبط:

```env
STORAGE_PROVIDER="vercel-blob"
BLOB_READ_WRITE_TOKEN="..."
```

يمكن لاحقًا إضافة R2 أو S3 أو Supabase Storage دون تغيير مسار التطبيق الأساسي.

## Database

يستخدم PostgreSQL عبر Prisma. مناسب لـ Neon أو Supabase.

النماذج الأساسية:

- `Product`
- `SearchSession`
- `HostedImage`
- `Setting`

## Environment Variables

انسخ `.env.example` إلى `.env.local` وأضف القيم:

```env
DATABASE_URL=
IMAGE_SEARCH_PROVIDER=
IMAGE_SEARCH_API_KEY=
STORAGE_PROVIDER=
BLOB_READ_WRITE_TOKEN=
AUTH_SECRET=
ADMIN_EMAIL=
ADMIN_PASSWORD_HASH=
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
MIN_IMAGE_WIDTH=500
MIN_IMAGE_HEIGHT=500
MAX_IMAGE_FILE_SIZE_MB=15
```

لإنشاء كلمة مرور المدير:

```bash
npm run auth:hash -- "your-password"
```

ضع الناتج في `ADMIN_PASSWORD_HASH`.

## التشغيل المحلي

```bash
npm install
npm run db:generate
npm run db:push
npm run dev
```

افتح:

```text
http://localhost:3000
```

## النشر على Vercel

1. ارفع المشروع إلى GitHub أو اربطه مباشرة بـ Vercel.
2. أضف Environment Variables في Vercel.
3. أنشئ Vercel Blob Store واحصل على `BLOB_READ_WRITE_TOKEN`.
4. أنشئ PostgreSQL على Neon أو Supabase وضع `DATABASE_URL`.
5. شغل إعداد قاعدة البيانات: `npm run db:push`.
6. Deploy.

ملاحظة: السكربت يستخدم `next build --webpack` لتجنب قيود native bindings على بعض أجهزة Windows. على Vercel يعمل بشكل طبيعي.

## فحص رابط الصورة

من صفحة `/tools/url-checker` ضع أي رابط صورة وسيتم فحص HTTPS وHTTP Status وFinal URL وContent-Type وContent-Length والأبعاد وRedirect Count وPublic Access وDirect Image وServer Fetch وPermanent URL.

عند النجاح تظهر حالة `READY` مع عبارة: `اجتاز جميع اختبارات التوافق الفنية`.

## Excel

صفحة `/import-excel` تعبّئ روابط الصور في ملف منتجات المتجر بثلاث خطوات:

1. رفع ملف `.xlsx` (حتى 10MB) مع معاينة أول الصفوف واختيار الورقة.
2. اختيار الأعمدة: اسم المنتج، SKU (اختياري)، ورابط الصورة. يتم اقتراح الأعمدة تلقائيًا من أسمائها.
3. تصدير ملف جديد باسم `products-with-images.xlsx`.

الروابط تؤخذ تلقائيًا من مكتبة الصور (الصور بحالة READY، الأحدث أولًا)، مع أولوية الربط:

1. SKU
2. Exact Product Name

التصدير لا يعدل الملف الأصلي، ولا يغير أسماء المنتجات أو الأسعار أو المخزون أو الأعمدة الأخرى. يتم تعديل عمود رابط الصورة فقط، ويمكن اختيار عدم استبدال الروابط الموجودة.
الملف يُرسل مع طلب التصدير نفسه، فلا يعتمد على ذاكرة الخادم (ضروري على Vercel).

## الجوال والأجهزة اللوحية

- شريط جانبي على الشاشات الكبيرة، وشريط علوي مع قائمة منزلقة على التابلت والجوال، وشريط تنقل سفلي على الجوال.
- بطاقات بدل الجداول في مكتبة الصور، وأزرار بمساحة لمس 44px على الأقل.
- حقول بخط 16px على الجوال لمنع التكبير التلقائي في iPhone، ودعم الـ safe area للأجهزة ذات النتوء.
- الخط Tajawal مستضاف داخل المشروع (`@fontsource/tajawal`) فلا يحتاج البناء للاتصال بـ Google Fonts.
- يمكن إضافة التطبيق للشاشة الرئيسية (Web App Manifest).

## الأمان

- Authentication مطلوب لكل الصفحات والـ API عبر `src/proxy.ts` (اسم middleware في Next.js 16، ويجب أن يكون داخل `src/`).
- Rate limiting للبحث والاعتماد وفاحص الروابط وExcel.
- SSRF protection يمنع localhost والشبكات الخاصة وmetadata endpoints وIP ranges المحظورة، بما فيها صيغ IPv6 المدمجة مثل `::ffff:7f00:1`.
- بعد تسجيل الدخول لا يُسمح بالتحويل إلا لمسارات داخلية (منع Open Redirect).
- لا يتم الوثوق بامتداد الرابط؛ يتم فحص MIME وMagic Bytes وImage Decoder.
- لا يتم استخدام `/public/uploads` أو `/tmp` كتخزين دائم.
- لا توجد Secrets داخل الكود.

## القيود الفعلية

- البحث الفعلي يحتاج API Key من SerpAPI أو Bing.
- التخزين الفعلي يحتاج Vercel Blob Token.
- قاعدة البيانات تحتاج PostgreSQL فعليًا.
- اكتشاف العلامة المائية في هذه النسخة يعتمد على إشارات النصوص والمصدر واسم الملف، ولا يزيل العلامة المائية ولا يغيّر المنتج.
- Match Score يُحسب من عنوان النتيجة ومصدرها واسم الملف فقط، وليس من بيانات المنتج المدخلة.
- على هذا الجهاز المحلي تحديدًا، Windows Application Control يمنع بعض native binaries مثل SWC وSharp وPrisma engine. البناء نجح باستخدام Webpack/WASM، واختبار Sharp تم تخطيه محليًا. على Vercel لا ينطبق هذا القيد عادة.

## الفحوص

```bash
npm audit --omit=dev
npm run typecheck
npm test
npm run lint
npm run build
```

تمت إضافة اختبارات لـ Product matching وQuery normalization وMinimum dimensions وMIME/Magic Bytes عند توفر Sharp native وSSRF protection وSHA-256 duplicate detection وStorage key generation وSKU mapping وExcel row mapping.
