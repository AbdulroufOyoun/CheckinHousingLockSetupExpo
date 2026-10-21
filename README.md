# Checkin Lock Setup (Expo)

تطبيق تهيئة وربط أقفال TTLock مع CheckinAccess.

**المستودع:** https://github.com/AbdulroufOyoun/CheckinHousingLockSetupExpo

---

## تشغيل سريع (بدون إعداد يدوي)

الروابط والإعدادات **جاهزة في الم repo** (`.env` + `app.config.ts` + EAS):

| البيئة | API |
|--------|-----|
| تطوير (LAN) | `http://192.168.1.104:8000` |
| إنتاج | `https://checkin-api.learnnowsyria.com` |
| TTLock Client ID | نفس Laravel / CheckinAccess |

```bash
git clone https://github.com/AbdulroufOyoun/CheckinHousingLockSetupExpo.git
cd CheckinHousingLockSetupExpo
npm install
npm run android
```

- **Expo Go لا يعمل** — المشروع يستخدم `react-native-ttlock` (Dev Client).
- أول مرة: `npm run prebuild` ثم `npm run android`، أو `npm run android` يبني تلقائياً.
- Metro فقط: `npm start` (بعد تثبيت Dev Client على الجهاز).

شاشة الدخول: **بريد/جوال + كلمة مرور** — حقل **Server URL** يظهر معبّأاً بالافتراضي ويمكن تعديله.

---

## EAS (APK)

```bash
npm i -g eas-cli
eas login
eas build --profile development --platform android   # LAN dev
eas build --profile production --platform android    # checkin-api.learnnowsyria.com
```

---

## تغيير IP أو السيرفر (نادر)

عدّل `.env` و/أو `src/config/projectDefaults.ts` و `app.config.ts` إذا تغيّر IP جهازك على الشبكة.

---

## Backend

[CheckinAccess](https://github.com/AbdulroufOyoun/CheckinAccess) — مسارات `api/lock-setup/*` على السيرفر **المركزي**.
