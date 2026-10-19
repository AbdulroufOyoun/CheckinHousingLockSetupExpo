# Checkin Lock Setup (Expo + TTLock)

Field app for programming and linking **TTLock** devices to CheckinAccess tenants. Parity with the native Java app `CheckinHousingConfige`.

## Requirements

- Node 20+
- Android device/emulator with **BLE**
- **Expo Dev Client** (this app uses `react-native-ttlock` — **Expo Go is not supported**)
- CheckinAccess central API with `lock-setup/*` routes
- Same shared TTLock account as Laravel (`TTLOCK_CLIENT_ID` in `.env` and app config)

## Environment

Create `.env` (optional):

```env
EXPO_PUBLIC_API_BASE=http://192.168.x.x:8000
EXPO_PUBLIC_TTLOCK_CLIENT_ID=your_ttlock_client_id
```

- Emulator → `http://10.0.2.2:8000`
- Physical device on LAN → your PC IP running Herd

## Run (Android)

```bash
cd "Mobile Manage Locks/CheckinHousingLockSetupExpo"
npm install
npx expo prebuild --platform android
npx expo run:android
```

Or EAS development APK:

```bash
npx eas build --profile development --platform android
```

## Smoke checklist

- [ ] Login with lock-setup user (email or 10-digit mobile + password)
- [ ] Pick tenant → property floors/rooms load
- [ ] Tab **Unlinked** refreshes with `sync_before=1`
- [ ] **Program new lock** → BLE scan → init → appears in unlinked after sync
- [ ] Room detail → program or link existing → lock shows linked
- [ ] Unlock via BLE (requires `lockData` from TTLock cloud list)
- [ ] Lock detail → unlock history pagination
- [ ] Facility long-press → unlock
- [ ] Settings → change tenant / logout
- [ ] 401 clears session → login screen
- [ ] Arabic / English in settings (RTL for Arabic)

## Architecture

- `src/api/lockSetupClient.ts` — Laravel `api/lock-setup/*`
- `src/api/ttlockCloud.ts` — `euapi.ttlock.com` list + initialize
- `src/ble/ttlockBridge.ts` — scan / init / unlock
- `src/services/provisionService.ts` — token → initialize → sync → link
