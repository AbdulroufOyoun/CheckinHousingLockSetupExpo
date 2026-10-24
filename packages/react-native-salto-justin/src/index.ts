import { NativeModules, Platform } from 'react-native';

type SaltoJustinNative = {
  unlock(hexDigitalKey: string): Promise<void>;
  isSdkLinked(): Promise<boolean>;
};

const Native: SaltoJustinNative | undefined = NativeModules.SaltoJustin;

export async function saltoUnlock(hexDigitalKey: string): Promise<void> {
  const hex = hexDigitalKey?.trim();
  if (!hex) {
    throw new Error('SALTO_MISSING_DIGITAL_KEY');
  }
  if (!Native?.unlock) {
    throw new Error(
      Platform.OS === 'android'
        ? 'SALTO_NATIVE_MODULE_MISSING'
        : 'SALTO_IOS_NOT_CONFIGURED',
    );
  }
  await Native.unlock(hex);
}

export async function isSaltoSdkLinked(): Promise<boolean> {
  if (!Native?.isSdkLinked) {
    return false;
  }
  try {
    return await Native.isSdkLinked();
  } catch {
    return false;
  }
}
