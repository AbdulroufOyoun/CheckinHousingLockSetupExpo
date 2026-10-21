import React from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/src/components/ui/Button';
import { colors } from '@/src/theme/colors';
import { radii, spacing } from '@/src/theme/tokens';

type Props = {
  visible: boolean;
  title: string;
  payload: Record<string, unknown>;
  loading?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function LockPayloadConfirmModal({
  visible,
  title,
  payload,
  loading,
  onCancel,
  onConfirm,
}: Props) {
  const { t } = useTranslation();
  const json = JSON.stringify(payload, null, 2);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{t('lockPayloadConfirmHint')}</Text>
          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollInner}>
            <Text selectable style={styles.json}>
              {json}
            </Text>
          </ScrollView>
          <View style={styles.actions}>
            <Button label={t('cancel')} variant="ghost" disabled={loading} onPress={onCancel} />
            <Button
              label={t('lockPayloadConfirmSend')}
              loading={loading}
              onPress={onConfirm}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.cardElevated,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    padding: spacing.lg,
    maxHeight: '88%',
    gap: spacing.sm,
    borderTopWidth: 1,
    borderColor: colors.border,
  },
  title: { color: colors.text, fontSize: 18, fontWeight: '700' },
  subtitle: { color: colors.muted, fontSize: 13, lineHeight: 18 },
  scroll: { maxHeight: 420 },
  scrollInner: { paddingVertical: spacing.xs },
  json: {
    color: colors.text,
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
    fontSize: 11,
    lineHeight: 16,
  },
  actions: { flexDirection: 'row', gap: spacing.sm, justifyContent: 'flex-end' },
});
