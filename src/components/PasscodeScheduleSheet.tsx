import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { searchTenantUsers } from '@/src/api/lockSetupClient';
import { Button } from '@/src/components/ui/Button';
import { SearchBar } from '@/src/components/ui/SearchBar';
import { colors } from '@/src/theme/colors';
import { radii, spacing } from '@/src/theme/tokens';
import type { PasscodeAssigneeUser } from '@/src/types/models';

export type PasscodeScheduleMode = 'permanent' | 'days' | 'datetime';

export type PasscodeScheduleConfirm = {
  startDate: number;
  endDate: number;
  keyboardPwdType: 2 | 3;
  assignedUserId: number | null;
};

type Props = {
  visible: boolean;
  busy?: boolean;
  onClose: () => void;
  onConfirm: (window: PasscodeScheduleConfirm) => void;
};

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 0, 0);
  return x;
}

function combineDateAndTime(day: Date, hour: number, minute: number): Date {
  const x = new Date(day);
  x.setHours(hour, minute, 0, 0);
  return x;
}

function addDays(d: Date, days: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

function addHours(d: Date, hours: number): Date {
  return new Date(d.getTime() + hours * 60 * 60 * 1000);
}

function clampHour(h: number): number {
  return Math.min(23, Math.max(0, h));
}

function formatDateLabel(d: Date, locale: string): string {
  return d.toLocaleDateString(locale.startsWith('ar') ? 'ar' : 'en', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    weekday: 'short',
  });
}

function formatTimeLabel(hour: number, minute: number, locale: string): string {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  return d.toLocaleTimeString(locale.startsWith('ar') ? 'ar' : 'en', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function StepperRow({
  label,
  value,
  onMinus,
  onPlus,
  disabled,
}: {
  label: string;
  value: string;
  onMinus: () => void;
  onPlus: () => void;
  disabled?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.stepper}>
        <Pressable
          style={[styles.stepBtn, disabled && styles.stepBtnDisabled]}
          onPress={onMinus}
          disabled={disabled}
          accessibilityRole="button"
        >
          <Text style={styles.stepBtnText}>−</Text>
        </Pressable>
        <Text style={styles.fieldValue} numberOfLines={1}>
          {value}
        </Text>
        <Pressable
          style={[styles.stepBtn, disabled && styles.stepBtnDisabled]}
          onPress={onPlus}
          disabled={disabled}
          accessibilityRole="button"
        >
          <Text style={styles.stepBtnText}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

export function PasscodeScheduleSheet({ visible, busy, onClose, onConfirm }: Props) {
  const { t, i18n } = useTranslation();
  const [mode, setMode] = useState<PasscodeScheduleMode>('datetime');
  const [fromDate, setFromDate] = useState(() => startOfDay(new Date()));
  const [toDate, setToDate] = useState(() => startOfDay(addDays(new Date(), 1)));
  const [fromHour, setFromHour] = useState(() => addHours(new Date(), 1).getHours());
  const [fromMinute, setFromMinute] = useState(0);
  const [toHour, setToHour] = useState(23);
  const [toMinute, setToMinute] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [assigneeQuery, setAssigneeQuery] = useState('');
  const [assigneeResults, setAssigneeResults] = useState<PasscodeAssigneeUser[]>([]);
  const [assigneeLoading, setAssigneeLoading] = useState(false);
  const [selectedAssignee, setSelectedAssignee] = useState<PasscodeAssigneeUser | null>(null);
  const searchSeq = useRef(0);

  useEffect(() => {
    if (!visible) return;
    const now = new Date();
    const later = addHours(now, 1);
    setMode('datetime');
    setFromDate(startOfDay(now));
    setToDate(startOfDay(addDays(now, 1)));
    setFromHour(later.getHours());
    setFromMinute(0);
    setToHour(23);
    setToMinute(0);
    setError(null);
    setAssigneeQuery('');
    setAssigneeResults([]);
    setSelectedAssignee(null);
    setAssigneeLoading(false);
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    const q = assigneeQuery.trim();
    const seq = ++searchSeq.current;
    const timer = setTimeout(() => {
      setAssigneeLoading(true);
      void searchTenantUsers(q, 20)
        .then((res) => {
          if (seq !== searchSeq.current) return;
          setAssigneeResults(res.users ?? []);
        })
        .catch(() => {
          if (seq !== searchSeq.current) return;
          setAssigneeResults([]);
        })
        .finally(() => {
          if (seq !== searchSeq.current) return;
          setAssigneeLoading(false);
        });
    }, 280);
    return () => clearTimeout(timer);
  }, [assigneeQuery, visible]);

  const resolved = useMemo(() => {
    if (mode === 'permanent') {
      return {
        start: new Date(Date.now() + 60_000),
        endMs: 0,
        keyboardPwdType: 2 as const,
      };
    }
    if (mode === 'days') {
      const start = startOfDay(fromDate);
      const now = new Date();
      const startAdjusted =
        start.getTime() < now.getTime() ? new Date(now.getTime() + 60_000) : start;
      return {
        start: startAdjusted,
        endMs: endOfDay(toDate).getTime(),
        keyboardPwdType: 3 as const,
      };
    }
    return {
      start: combineDateAndTime(fromDate, fromHour, fromMinute),
      endMs: combineDateAndTime(toDate, toHour, toMinute).getTime(),
      keyboardPwdType: 3 as const,
    };
  }, [mode, fromDate, fromHour, fromMinute, toDate, toHour, toMinute]);

  const confirm = () => {
    const now = Date.now();
    const skew = 60_000;
    // Permanent: always stamp start at confirm time (memoized start goes stale while picking assignee).
    const startMs =
      mode === 'permanent' ? now + 60_000 : resolved.start.getTime();
    const endMs = mode === 'permanent' ? 0 : resolved.endMs;

    if (mode !== 'permanent' && startMs < now - skew) {
      setError(t('passcodeScheduleStartFuture'));
      return;
    }
    if (mode !== 'permanent' && endMs <= startMs) {
      setError(t('passcodeScheduleEndAfterStart'));
      return;
    }

    setError(null);
    onConfirm({
      startDate: startMs,
      endDate: endMs,
      keyboardPwdType: resolved.keyboardPwdType,
      assignedUserId: selectedAssignee?.id ?? null,
    });
  };

  const locale = i18n.language;
  const todayStart = startOfDay(new Date()).getTime();

  const bumpDay = (current: Date, delta: number, setter: (d: Date) => void) => {
    const next = startOfDay(addDays(current, delta));
    if (next.getTime() < todayStart) return;
    setter(next);
    setError(null);
  };

  const modeOptions: PasscodeScheduleMode[] = ['permanent', 'days', 'datetime'];
  const modeLabel = (id: PasscodeScheduleMode): string => {
    switch (id) {
      case 'permanent':
        return t('passcodeSchedulePermanent');
      case 'days':
        return t('passcodeScheduleDays');
      case 'datetime':
        return t('passcodeScheduleDateTime');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet} key={i18n.language}>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.sheetScroll}
          >
            <Text style={styles.title}>{t('generatePasscodeTitle')}</Text>
            <Text style={styles.hint}>{t('passcodeNearLockHint')}</Text>

            <View style={styles.segments}>
              {modeOptions.map((id) => (
                <Pressable
                  key={`${i18n.language}-${id}`}
                  style={[styles.segment, mode === id && styles.segmentOn]}
                  onPress={() => {
                    setMode(id);
                    setError(null);
                  }}
                  disabled={busy}
                >
                  <Text style={[styles.segmentText, mode === id && styles.segmentTextOn]}>
                    {modeLabel(id)}
                  </Text>
                </Pressable>
              ))}
            </View>

            {mode === 'permanent' ? (
              <Text style={styles.modeHint}>{t('passcodeSchedulePermanentHint')}</Text>
            ) : null}

            {mode === 'days' ? (
              <View style={styles.section}>
                <StepperRow
                  label={t('passcodeScheduleFromDate')}
                  value={formatDateLabel(fromDate, locale)}
                  disabled={busy}
                  onMinus={() => bumpDay(fromDate, -1, setFromDate)}
                  onPlus={() => bumpDay(fromDate, 1, setFromDate)}
                />
                <StepperRow
                  label={t('passcodeScheduleToDate')}
                  value={formatDateLabel(toDate, locale)}
                  disabled={busy}
                  onMinus={() => bumpDay(toDate, -1, setToDate)}
                  onPlus={() => bumpDay(toDate, 1, setToDate)}
                />
              </View>
            ) : null}

            {mode === 'datetime' ? (
              <>
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>{t('passcodeScheduleFrom')}</Text>
                  <StepperRow
                    label={t('passcodeScheduleFromDate')}
                    value={formatDateLabel(fromDate, locale)}
                    disabled={busy}
                    onMinus={() => bumpDay(fromDate, -1, setFromDate)}
                    onPlus={() => bumpDay(fromDate, 1, setFromDate)}
                  />
                  <StepperRow
                    label={t('passcodeScheduleFromTime')}
                    value={formatTimeLabel(fromHour, fromMinute, locale)}
                    disabled={busy}
                    onMinus={() => {
                      setFromMinute(0);
                      setFromHour((h) => clampHour(h - 1));
                      setError(null);
                    }}
                    onPlus={() => {
                      setFromMinute(0);
                      setFromHour((h) => clampHour(h + 1));
                      setError(null);
                    }}
                  />
                </View>
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>{t('passcodeScheduleTo')}</Text>
                  <StepperRow
                    label={t('passcodeScheduleToDate')}
                    value={formatDateLabel(toDate, locale)}
                    disabled={busy}
                    onMinus={() => bumpDay(toDate, -1, setToDate)}
                    onPlus={() => bumpDay(toDate, 1, setToDate)}
                  />
                  <StepperRow
                    label={t('passcodeScheduleToTime')}
                    value={formatTimeLabel(toHour, toMinute, locale)}
                    disabled={busy}
                    onMinus={() => {
                      setToMinute(0);
                      setToHour((h) => clampHour(h - 1));
                      setError(null);
                    }}
                    onPlus={() => {
                      setToMinute(0);
                      setToHour((h) => clampHour(h + 1));
                      setError(null);
                    }}
                  />
                </View>
              </>
            ) : null}

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('passcodeAssignee')}</Text>
              <Text style={styles.hint}>{t('passcodeAssigneeHint')}</Text>
              <Pressable
                style={[styles.assigneeChip, !selectedAssignee && styles.assigneeChipOn]}
                onPress={() => setSelectedAssignee(null)}
                disabled={busy}
              >
                <Text
                  style={[
                    styles.assigneeChipText,
                    !selectedAssignee && styles.assigneeChipTextOn,
                  ]}
                >
                  {t('passcodeAssigneeNone')}
                </Text>
              </Pressable>
              {selectedAssignee ? (
                <View style={styles.selectedAssignee}>
                  <Text style={styles.selectedAssigneeName}>
                    {selectedAssignee.name || t('passcodeAssignee')}
                  </Text>
                  <Text style={styles.selectedAssigneeMeta}>
                    {[selectedAssignee.mobile, selectedAssignee.email].filter(Boolean).join(' · ') ||
                      '—'}
                  </Text>
                </View>
              ) : null}
              <SearchBar
                value={assigneeQuery}
                onChangeText={setAssigneeQuery}
                placeholder={t('passcodeAssigneeSearch')}
              />
              {assigneeLoading ? (
                <ActivityIndicator color={colors.accent} style={{ marginVertical: spacing.sm }} />
              ) : null}
              {assigneeResults.map((user) => {
                const selected = selectedAssignee?.id === user.id;
                return (
                  <Pressable
                    key={user.id}
                    style={[styles.userRow, selected && styles.userRowOn]}
                    onPress={() => setSelectedAssignee(user)}
                    disabled={busy}
                  >
                    <Text style={styles.userNameName}>{user.name || `#${user.id}`}</Text>
                    <Text style={styles.userRowMeta}>
                      {[user.mobile, user.email].filter(Boolean).join(' · ') || '—'}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <View style={styles.actions}>
              <Button label={t('cancel')} variant="ghost" onPress={onClose} disabled={busy} />
              <Button label={t('generatePasscode')} loading={busy} onPress={confirm} />
            </View>
          </ScrollView>
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
    borderTopWidth: 1,
    borderColor: colors.border,
    maxHeight: '92%',
  },
  sheetScroll: {
    padding: spacing.lg,
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
  assigneeChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.card,
  },
  assigneeChipOn: {
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
  },
  assigneeChipText: {
    color: colors.muted,
    fontWeight: '700',
    fontSize: 13,
  },
  assigneeChipTextOn: {
    color: colors.accent,
  },
  selectedAssignee: {
    backgroundColor: colors.accentSoft,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: 2,
  },
  selectedAssigneeName: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 15,
  },
  selectedAssigneeMeta: {
    color: colors.muted,
    fontSize: 12,
  },
  userRow: {
    backgroundColor: colors.card,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: spacing.md,
    gap: 2,
  },
  userRowOn: {
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
  },
  userRowName: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 14,
  },
  userRowMeta: {
    color: colors.muted,
    fontSize: 12,
  },
  title: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '800',
  },
  hint: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  modeHint: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    backgroundColor: colors.accentSoft,
    borderRadius: radii.md,
    padding: spacing.md,
  },
  segments: {
    flexDirection: 'row',
    gap: spacing.xs,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radii.md,
    padding: 4,
  },
  segment: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: 2,
    borderRadius: radii.sm,
    alignItems: 'center',
  },
  segmentOn: {
    backgroundColor: colors.accentSoft,
  },
  segmentText: {
    color: colors.muted,
    fontWeight: '700',
    fontSize: 12,
    textAlign: 'center',
  },
  segmentTextOn: {
    color: colors.accent,
  },
  section: {
    gap: spacing.sm,
    paddingTop: spacing.xs,
  },
  sectionTitle: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  field: {
    gap: 6,
  },
  fieldLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '600',
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radii.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  stepBtn: {
    width: 40,
    height: 40,
    borderRadius: radii.sm,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnDisabled: {
    opacity: 0.45,
  },
  stepBtnText: {
    color: colors.accent,
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 24,
  },
  fieldValue: {
    flex: 1,
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  error: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: '600',
  },
  actions: {
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
});
