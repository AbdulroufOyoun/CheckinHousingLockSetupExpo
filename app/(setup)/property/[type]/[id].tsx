import * as Haptics from 'expo-haptics';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

import { unlinkLock } from '@/src/api/lockSetupClient';
import { LinkExistingSheet } from '@/src/components/LinkExistingSheet';
import { ScanLocksPanel } from '@/src/components/ScanLocksPanel';
import { Button } from '@/src/components/ui/Button';
import { Screen } from '@/src/components/ui/Screen';
import { useBootstrap, useInvalidateBootstrap } from '@/src/hooks/useBootstrap';
import { provisionAndLink } from '@/src/services/provisionService';
import { unlockWithLock } from '@/src/services/unlockService';
import { useSession } from '@/src/store/session';
import { colors } from '@/src/theme/colors';
import type { PropertyType } from '@/src/types/models';
import { facilityDisplayName } from '@/src/utils/lockMerge';
import { getPropertyEntity } from '@/src/utils/bootstrapLookup';

export default function PropertyDetailScreen() {
  const { type, id } = useLocalSearchParams<{ type: string; id: string }>();
  const propertyType = type as PropertyType;
  const propertyId = Number(id);
  const { t, i18n } = useTranslation();
  const { tenantId } = useSession();
  const { data, refetch } = useBootstrap(tenantId);
  const invalidate = useInvalidateBootstrap();
  const [showScan, setShowScan] = useState(false);
  const [linkSheet, setLinkSheet] = useState(false);
  const [busy, setBusy] = useState(false);

  const entity = useMemo(
    () => getPropertyEntity(data, propertyType, propertyId),
    [data, propertyType, propertyId],
  );

  const title = useMemo(() => {
    if (!entity) return '—';
    if (propertyType === 'facility') {
      return facilityDisplayName(entity as import('@/src/types/models').FacilityModel, i18n.language);
    }
    return 'number' in entity ? String(entity.number) : String(propertyId);
  }, [entity, propertyType, propertyId, i18n.language]);

  const lock = entity && 'lock' in entity ? entity.lock : undefined;
  const hasLock = entity && 'has_lock' in entity ? entity.has_lock : false;
  const lockDbId = lock?.dbId ?? entity?.locks?.[0]?.id;

  const aliasForProvision = () => {
    if (propertyType === 'room') return `${title}Lock`;
    if (propertyType === 'suite') return `Suite${title}Lock`;
    return `${title}Lock`;
  };

  const onProvision = async (lockData: string) => {
    setBusy(true);
    try {
      await provisionAndLink(propertyType, propertyId, aliasForProvision(), lockData);
      await invalidate();
      await refetch();
      setShowScan(false);
      Alert.alert(t('done'), t('linkSuccess'));
    } catch (e) {
      Alert.alert(t('errorGeneric'), e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const onUnlink = () => {
    if (!lockDbId) return;
    Alert.alert(t('unlinkLock'), lock?.lockAlias ?? '', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'OK',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            setBusy(true);
            try {
              await unlinkLock(propertyType, propertyId, lockDbId);
              await invalidate();
              await refetch();
              Alert.alert(t('done'), t('unlinkLock'));
            } catch (e) {
              Alert.alert(t('errorGeneric'), e instanceof Error ? e.message : String(e));
            } finally {
              setBusy(false);
            }
          })();
        },
      },
    ]);
  };

  const onUnlock = async () => {
    try {
      await unlockWithLock(lock);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(t('done'), t('unlockSuccess'));
    } catch (e) {
      Alert.alert(t('errorGeneric'), e instanceof Error ? e.message : t('unlockFailed'));
    }
  };

  return (
    <Screen style={styles.pad}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: title,
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
        }}
      />
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={styles.hero}>
          <Text style={styles.heroTitle}>{title}</Text>
          <Text style={styles.heroSub}>
            {hasLock ? lock?.lockAlias ?? t('linkSuccess') : t('noLock')}
          </Text>
        </View>

        {hasLock && lock ? (
          <>
            <Button label={t('unlock')} onPress={() => void onUnlock()} />
            <Button
              label={lock.lockAlias || 'Details'}
              variant="ghost"
              onPress={() =>
                lockDbId &&
                router.push({
                  pathname: '/(setup)/locks/[lockDbId]',
                  params: {
                    lockDbId: String(lockDbId),
                    title: lock.lockAlias,
                    lockCloudId: lock.lockId,
                    lockMac: lock.lockMac,
                  },
                })
              }
            />
            <Button label={t('unlinkLock')} variant="danger" loading={busy} onPress={onUnlink} />
          </>
        ) : (
          <>
            <Button label={t('programLock')} onPress={() => setShowScan(true)} />
            <Button label={t('linkExisting')} variant="ghost" onPress={() => setLinkSheet(true)} />
          </>
        )}

        {showScan ? (
          <View style={{ marginTop: 20 }}>
            <ScanLocksPanel autoStart onInitialized={onProvision} />
          </View>
        ) : null}
      </ScrollView>

      <LinkExistingSheet
        visible={linkSheet}
        propertyType={propertyType}
        propertyId={propertyId}
        onClose={() => setLinkSheet(false)}
        onLinked={() => {
          void invalidate();
          void refetch();
          Alert.alert(t('done'), t('linkSuccess'));
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  pad: { paddingHorizontal: 16 },
  hero: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 24,
    marginVertical: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  heroTitle: { color: colors.text, fontSize: 32, fontWeight: '800' },
  heroSub: { color: colors.muted, fontSize: 15 },
});
