import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Clipboard,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Button } from '@/src/components/ui/Button';
import { colors } from '@/src/theme/colors';
import { radii, spacing } from '@/src/theme/tokens';

type Props = {
  visible: boolean;
  passcode: string | null;
  assigneeName?: string | null;
  onClose: () => void;
};

export function PasscodeCreatedSheet({
  visible,
  passcode,
  assigneeName,
  onClose,
}: Props) {
  const { t } = useTranslation();
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setRevealed(false);
    setCopied(false);
  }, [visible, passcode]);

  const digits = passcode?.trim() ?? '';
  const masked = digits ? '•'.repeat(Math.max(digits.length, 4)) : '••••••';

  const copy = () => {
    if (!digits) return;
    try {
      Clipboard.setString(digits);
      setCopied(true);
    } catch {
      /* Clipboard unavailable on some builds */
    }
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet} accessibilityViewIsModal>
          <View style={styles.iconWrap}>
            <Ionicons name="keypad" size={28} color={colors.accent} />
          </View>
          <Text style={styles.title}>{t('passcodeCreatedTitle')}</Text>
          <Text style={styles.hint}>{t('passcodeCreatedHint')}</Text>

          {assigneeName ? (
            <Text style={styles.assignee}>
              {t('passcodeAssignedTo', { name: assigneeName })}
            </Text>
          ) : null}

          <View style={styles.codeCard}>
            <Text
              style={[styles.code, !revealed && styles.codeMasked]}
              accessibilityLabel={
                revealed ? digits : t('passcodeHiddenLabel')
              }
            >
              {revealed ? digits : masked}
            </Text>
            <View style={styles.codeActions}>
              <Pressable
                style={styles.iconBtn}
                onPress={() => setRevealed((v) => !v)}
                accessibilityRole="button"
                accessibilityLabel={
                  revealed ? t('passcodeHide') : t('passcodeReveal')
                }
              >
                <Ionicons
                  name={revealed ? 'eye-off-outline' : 'eye-outline'}
                  size={22}
                  color={colors.accent}
                />
                <Text style={styles.iconBtnLabel}>
                  {revealed ? t('passcodeHide') : t('passcodeReveal')}
                </Text>
              </Pressable>
              <Pressable
                style={styles.iconBtn}
                onPress={copy}
                accessibilityRole="button"
                accessibilityLabel={t('passcodeCopy')}
              >
                <Ionicons
                  name={copied ? 'checkmark-circle' : 'copy-outline'}
                  size={22}
                  color={copied ? colors.success : colors.accent}
                />
                <Text style={styles.iconBtnLabel}>
                  {copied ? t('passcodeCopied') : t('passcodeCopy')}
                </Text>
              </Pressable>
            </View>
          </View>

          <Button label={t('done')} onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  sheet: {
    backgroundColor: colors.cardElevated,
    borderRadius: radii.xl,
    padding: spacing.lg,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  iconWrap: {
    alignSelf: 'center',
    width: 56,
    height: 56,
    borderRadius: radii.md,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
  },
  hint: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  assignee: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  codeCard: {
    backgroundColor: colors.card,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: spacing.lg,
    gap: spacing.md,
    alignItems: 'center',
  },
  code: {
    color: colors.text,
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: 6,
    fontVariant: ['tabular-nums'],
  },
  codeMasked: {
    letterSpacing: 4,
    color: colors.textSecondary,
  },
  codeActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  iconBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.sm,
    backgroundColor: colors.accentSoft,
  },
  iconBtnLabel: {
    color: colors.accent,
    fontWeight: '700',
    fontSize: 13,
  },
});
