# Checkin Lock Setup (Expo)

تهيئة وربط أقفال TTLock مع CheckinAccess.

**المستودع:** https://github.com/AbdulroufOyoun/CheckinHousingLockSetupExpo

---

## تشغيل بعد `git pull` / clone

```bash
git clone https://github.com/AbdulroufOyoun/CheckinHousingLockSetupExpo.git
cd CheckinHousingLockSetupExpo
npm install
npm run dev
```

Clone to a normal folder (e.g. `C:\dev\...`), not under **OneDrive** — OneDrive file placeholders break Metro SHA-1 (`Failed to get the SHA-1 for … @noble/…`).

- الـ API الافتراضي في الريبو: **`https://checkin-api.learnnowsyria.com`** (لا حاجة لـ IP محلي).
- `npm start` يكتشف IP الـ Wi‑Fi تلقائياً ويطبع رابط الجوال (`http://YOUR-IP:8081`).
- إذا المنفذ 8081 مشغول يختار منفذ تالي تلقائياً.
- **Expo Go لا يعمل** — يلزم Dev Client (`react-native-ttlock`).

Dev Client على الجهاز:

```bash
eas build --profile development --platform android
```

ثم افتح التطبيق واربطه بالرابط الذي يطبعه `npm start` (ليس IP قديم محفوظ).

---

## أوامر

| أمر | وظيفة |
|-----|--------|
| `npm start` | Metro + اكتشاف IP |
| `npm run dev` | نفس الشيء مع `-c` (مسح كاش) |
| `npm run start:tunnel` | Tunnel عبر Expo (شبكات مختلفة) |
| `npm run android` | بناء/تشغيل أندرويد محلي |

---

## Backend

[CheckinAccess](https://github.com/AbdulroufOyoun/CheckinAccess) — `api/lock-setup/*` على السيرفر المركزي.
