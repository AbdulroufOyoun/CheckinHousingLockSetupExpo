# react-native-salto-justin

Bridge for Salto JustIN Mobile SDK (Android).

1. Copy `salto-justinmobile-sdk.aar` from Salto into `android/libs/`.
2. Run `npx expo prebuild` and a dev/production EAS build (Expo Go is not supported).

Without the AAR, the stub module loads and `unlock` returns `SALTO_SDK_NOT_INSTALLED`.
