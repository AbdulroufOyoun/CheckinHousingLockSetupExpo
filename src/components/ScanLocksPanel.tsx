import * as Haptics from 'expo-haptics';
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/src/components/ui/Button';
import {
  ScannedLock,
  initLockFromScan,
  isSettingMode,
  startScan,
  stopScan,
} from '@/src/ble/ttlockBridge';
import { ensureBlePermissions } from '@/src/ble/permissions';
import { colors } from '@/src/theme/colors';

type Props = {
  onInitialized: (lockData: string, device: ScannedLock) => void | Promise<void>;
  autoStart?: boolean;
};

export function ScanLocksPanel({ onInitialized, autoStart }: Props) {
  const { t } = useTranslation();
  const [scanning, setScanning] = useState(false);
  const [devices, setDevices] = useState<ScannedLock[]>([]);
  const [busyMac, setBusyMac] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runScan = useCallback(async () => {
    setError(null);
    const ok = await ensureBlePermissions();
    if (!ok) {
      setError('Bluetooth / location permission required');
      return;
    }
    setDevices([]);
    setScanning(true);
    startScan((device) => {
      setDevices((prev) => {
        if (prev.some((d) => d.lockMac === device.lockMac)) return prev;
        const next = [...prev, device];
        if (isSettingMode(device)) {
          stopScan();
          setScanning(false);
        }
        return next;
      });
    });
  }, []);

  useEffect(() => {
    if (autoStart) {
      void runScan();
    }
    return () => stopScan();
  }, [autoStart, runScan]);

  const handleInit = async (device: ScannedLock) => {
    setBusyMac(device.lockMac);
    setError(null);
    try {
      const lockData = await initLockFromScan(device);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await onInitialized(lockData, device);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setBusyMac(null);
    }
  };

  return (
    <View style={styles.box}>
      <View style={styles.actions}>
        <Button label={t('scanLocks')} onPress={runScan} loading={scanning && devices.length === 0} />
        <Button
          label={t('stopScan')}
          variant="ghost"
          onPress={() => {
            stopScan();
            setScanning(false);
          }}
        />
      </View>
      {scanning ? (
        <View style={styles.scanRow}>
          <ActivityIndicator color={colors.accent} />
          <Text style={styles.scanText}>{t('scanLocks')}</Text>
        </View>
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <FlatList
        data={devices}
        keyExtractor={(item) => item.lockMac}
        ListEmptyComponent={<Text style={styles.empty}>—</Text>}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{item.lockName || item.lockMac}</Text>
              <Text style={styles.meta}>{item.lockMac}</Text>
              {isSettingMode(item) ? (
                <Text style={styles.badge}>{t('settingMode')}</Text>
              ) : null}
            </View>
            <Button
              label={t('initLock')}
              loading={busyMac === item.lockMac}
              onPress={() => void handleInit(item)}
            />
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  box: { gap: 12 },
  actions: { flexDirection: 'row', gap: 10 },
  scanRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  scanText: { color: colors.muted },
  error: { color: colors.danger },
  empty: { color: colors.muted, textAlign: 'center', padding: 16 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  name: { color: colors.text, fontWeight: '600', fontSize: 16 },
  meta: { color: colors.muted, fontSize: 12, marginTop: 2 },
  badge: { color: colors.accent, fontSize: 12, marginTop: 4, fontWeight: '600' },
});
