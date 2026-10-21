# Checkin Lock Setup (Expo)

تطبيق ميداني لتهيئة وربط أقفال **TTLock** (Bluetooth) مع مستأجري **CheckinAccess** عبر واجهة `api/lock-setup/*` على السيرفر المركزي.

Field app for programming and linking **TTLock** BLE locks to CheckinAccess tenants (parity with the native `CheckinHousingConfige` Android app).

---

## المتطلبات / Requirements

| | |
|---|---|
| **Node.js** | 20 LTS أو أحدث |
| **npm** | يأتي مع Node |
| **Android** | جهاز حقيقي يفضّل (BLE) أو محاكي |
| **Expo** | **Dev Client** — التطبيق يستخدم `react-native-ttlock` → **Expo Go غير مدعوم** |
| **Backend** | CheckinAccess مع مسارات `lock-setup` (مركزي، مثلاً `https://checkin-api.example.com`) |
| **حساب** | مستخدم Lock Setup (بريد أو جوال 10 أرقام + كلمة مرور) |

**Windows (اختياري):** [Android Studio](https://developer.android.com/studio) (SDK + emulator)، USB debugging للجهاز.

---

## التثبيت / Installation

```bash
git clone https://github.com/AbdulroufOyoun/CheckinHousingLockSetupExpo.git
cd CheckinHousingLockSetupExpo
npm install
```

- `npm install` يشغّل `patch-package` تلقائياً (تعديلات على `react-native-ttlock`).
- انسخ `.env.example` إلى `.env` وعدّل القيم إن احتجت (اختياري).

```bash
cp .env.example .env   # Git Bash / macOS / Linux
# Windows PowerShell: Copy-Item .env.example .env
```

---

## إعداد عنوان الـ API / API base URL

السيرفر المركزي **بدون** `/api` في النهاية (العميل يضيف `/api/lock-setup/...`).

| السيناريو | `EXPO_PUBLIC_API_BASE` |
|-----------|-------------------------|
| محاكي Android | `http://10.0.2.2:8000` |
| جوال على نفس شبكة الـ PC (Herd/Laravel) | `http://192.168.x.x:8000` |
| إنتاج | `https://checkin-api.learnnowsyria.com` |

**بدون `.env`:** في builds التطوير الافتراضي `http://10.0.2.2:8000`. في **APK إنتاج** لا يُدمج عنوان — أدخل **Server URL** من شاشة تسجيل الدخول (يُحفظ على الجهاز).

---

## تشغيل بيئة التطوير (Dev)

### 1) تشغيل Metro (واجهة Expo)

```bash
npm start
```

أو مباشرة build + تثبيت على Android:

```bash
npm run prebuild    # مرة أولى أو بعد تغيير plugins/native
npm run android     # expo run:android — يبني Dev Client ويفتح التطبيق
```

- أول مرة: `npx expo prebuild --platform android` ثم `npx expo run:android`.
- بعد تغيير `app.config.ts` أو plugins native: أعد `prebuild`.

### 2) EAS Development APK (بدون كابل USB)

```bash
npm i -g eas-cli
eas login
eas build --profile development --platform android
```

ثبّت الـ APK، افتح التطبيق، اتصل بنفس شبكة الـ API، واستخدم **Server URL** على شاشة الدخول إن لم يكن مضمّناً في الب build.

### 3) ربط بالـ backend محلياً

1. شغّل CheckinAccess على المضيف المركزي (Herd: `http://checkinaccess.test` أو `php artisan serve --host=0.0.0.0 --port=8000`).
2. تأكد أن الجوال يصل إلى IP/النطاق (ليس `localhost` على الجهاز الحقيقي).
3. سجّل دخول Lock Setup → اختر tenant (مثلاً `ratco`) → جرّب bootstrap.

---

## سكربتات npm

| الأمر | الوظيفة |
|--------|---------|
| `npm start` | Metro + QR (Dev Client) |
| `npm run android` | Build native + تشغيل على Android |
| `npm run prebuild` | `expo prebuild --platform android` |
| `npm run build:android:production` | EAS production APK |

---

## تدفق القفل (الإصدار الحالي)

1. **تسجيل محلي:** `POST /api/lock-setup/tenants/{id}/locks` مع `lock_data` من BLE.
2. **ربط:** `POST .../properties/{type}/{id}/locks/{lockDbId}`.

Legacy (إن كان السيرفر يفعّل `TTLOCK_LEGACY_MOBILE_PROVISION`): token → initialize على TTLock cloud → sync → link.

---

## هيكل المشروع

- `app/` — Expo Router (login, tenants, property, unlinked, settings)
- `src/api/lockSetupClient.ts` — Laravel lock-setup API
- `src/services/provisionService.ts` — register + link
- `src/ble/ttlockBridge.ts` — scan / init / unlock
- `patches/` — `patch-package` لـ `react-native-ttlock`

---

## Checklist سريع

- [ ] Login (lock-setup user)
- [ ] اختيار tenant → تحميل bootstrap
- [ ] تهيئة قفل BLE → ربط بغرفة/منشأة
- [ ] فتح قفل BLE (`lockData` من السيرفر)
- [ ] AR/EN من الإعدادات

---

## Related

- Backend: [CheckinAccess](https://github.com/AbdulroufOyoun/CheckinAccess)
- Native reference app: `CheckinHousingConfige` (Java)
