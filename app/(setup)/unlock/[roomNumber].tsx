import * as Haptics from 'expo-haptics';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { showUserErrorAlert } from '@/src/api/formatApiError';
import { fetchBootstrap, fetchPropertyDetail } from '@/src/api/lockSetupClient';
import { Screen } from '@/src/components/ui/Screen';
import { UnlockCancelledError, unlockWithLock } from '@/src/services/unlockService';
import { setPendingDeepLink } from '@/src/services/pendingDeepLink';
import { useSession } from '@/src/store/session';
import { colors } from '@/src/theme/colors';
import { spacing, typography } from '@/src/theme/tokens';
import { pickRoomForSilentUnlock } from '@/src/utils/bootstrapLookup';
import { cloudLockFromApiLock } from '@/src/utils/apiLockFromRecord';

type Phase = 'loading' | 'success' | 'error';

export default function SilentRoomUnlockScreen() {
  const { roomNumber: rawRoom } = useLocalSearchParams<{ roomNumber: string }>();
  const roomNumber = decodeURIComponent(String(rawRoom ?? '').trim());
  const { t } = useTranslation();
  const { ready, token, tenantId } = useSession();
  const [phase, setPhase] = useState<Phase>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const ranRef = useRef(false);

  useEffect(() => {
    if (!ready || ranRef.current) return;
    if (!roomNumber) {
      setPhase('error');
      setErrorMessage(t('deepLinkMissingRoom'));
      return;
    }

    if (!token) {
      void setPendingDeepLink(`/(setup)/unlock/${encodeURIComponent(roomNumber)}`);
      router.replace('/(auth)/login');
      return;
    }
    if (!tenantId) {
      void setPendingDeepLink(`/(setup)/unlock/${encodeURIComponent(roomNumber)}`);
      router.replace('/(setup)/tenants');
      return;
    }

    ranRef.current = true;
    let cancelled = false;

    (async () => {
      try {
        const bootstrap = await fetchBootstrap();
        const room = pickRoomForSilentUnlock(bootstrap, roomNumber);
        if (!room) {
          throw new Error(t('deepLinkRoomNotFound', { room: roomNumber }));
        }

        let cloudLock = cloudLockFromApiLock(room.locks?.[0]);
        if (!cloudLock?.lockData?.trim()) {
          const detail = await fetchPropertyDetail('room', room.id);
          const primary =
            detail.locks?.find((l) => l.id === detail.primary_lock_id) ?? detail.locks?.[0];
          cloudLock = cloudLockFromApiLock(primary);
        }
        if (!cloudLock) {
          throw new Error(t('deepLinkNoLock', { room: roomNumber }));
        }

        await unlockWithLock(cloudLock, { silent: true });
        if (cancelled) return;

        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setPhase('success');
        setTimeout(() => {
          if (!cancelled) {
            router.replace('/(setup)/(tabs)/property');
          }
        }, 900);
      } catch (e) {
        if (cancelled) return;
        if (e instanceof UnlockCancelledError) {
          router.replace('/(setup)/(tabs)/property');
          return;
        }
        setPhase('error');
        setErrorMessage(e instanceof Error ? e.message : String(e));
        showUserErrorAlert(t, e, 'unlock');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [ready, token, tenantId, roomNumber, t]);

  return (
    <Screen edges={['bottom', 'left', 'right']} style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.center}>
        {phase === 'loading' ? (
          <>
            <ActivityIndicator color={colors.accent} size="large" />
            <Text style={styles.title}>{t('deepLinkUnlocking', { room: roomNumber || '—' })}</Text>
            <Text style={styles.hint}>{t('deepLinkUnlockHint')}</Text>
          </>
        ) : null}
        {phase === 'success' ? (
          <>
            <Text style={styles.title}>{t('unlockSuccess')}</Text>
            <Text style={styles.hint}>{t('deepLinkUnlockDone', { room: roomNumber })}</Text>
          </>
        ) : null}
        {phase === 'error' ? (
          <>
            <Text style={styles.title}>{t('deepLinkUnlockFailed')}</Text>
            {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
            <Pressable
              style={styles.backBtn}
              onPress={() => router.replace('/(setup)/(tabs)/property')}
            >
              <Text style={styles.backLabel}>{t('done')}</Text>
            </Pressable>
          </>
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  title: {
    color: colors.text,
    ...typography.title,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  hint: {
    color: colors.muted,
    ...typography.body,
    textAlign: 'center',
  },
  error: {
    color: colors.danger,
    ...typography.body,
    textAlign: 'center',
  },
  backBtn: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: 12,
    backgroundColor: colors.card,
  },
  backLabel: {
    color: colors.accent,
    ...typography.body,
    fontWeight: '600',
  },
});
