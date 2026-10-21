import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { I18nManager, Pressable, StyleSheet, Text, View } from 'react-native';

import { PROPERTY_GRID_GUTTER, PropertyUnitTile } from '@/src/components/property/PropertyUnitTile';
import { colors } from '@/src/theme/colors';
import type { FloorSection, RoomModel, SuiteModel } from '@/src/types/models';

const ROOM_COLUMNS = 4;
const SUITE_COLUMNS = 2;

type Props = {
  floor: FloorSection;
  open: boolean;
  onToggle: () => void;
  onRoomPress: (room: RoomModel) => void;
  onSuitePress: (suite: SuiteModel) => void;
};

export function PropertyFloorSection({ floor, open, onToggle, onRoomPress, onSuitePress }: Props) {
  const { t } = useTranslation();
  const unitCount = (floor.suites?.length ?? 0) + (floor.rooms?.length ?? 0);
  const chevron = open ? 'chevron-up' : I18nManager.isRTL ? 'chevron-back' : 'chevron-down';

  return (
    <View style={styles.floor}>
      <Pressable
        accessibilityRole="button"
        onPress={onToggle}
        style={({ pressed }) => [styles.floorHead, pressed && { opacity: 0.9 }]}
      >
        <View style={styles.floorTitleWrap}>
          <Text style={styles.floorLabel}>{floor.label}</Text>
          <Text style={styles.floorMeta}>{t('propertyFloorUnits', { count: unitCount })}</Text>
        </View>
        <Ionicons name={chevron} size={20} color={colors.muted} />
      </Pressable>

      {open ? (
        <View style={styles.body}>
          <Pressable
            style={styles.floorLockRow}
            onPress={() => router.push(`/(setup)/property/floor/${floor.id}`)}
          >
            <Ionicons
              name={floor.has_lock ? 'lock-closed' : 'lock-open-outline'}
              size={18}
              color={floor.has_lock ? colors.success : colors.muted}
            />
            <Text style={styles.floorLockText}>{t('floorLockManage')}</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.muted} />
          </Pressable>

          {(floor.suites?.length ?? 0) > 0 ? (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>{t('suitesOnFloor')}</Text>
              <View style={styles.grid}>
                {floor.suites.map((suite) => (
                  <PropertyUnitTile
                    key={`suite-${suite.id}`}
                    kind="suite"
                    title={t('suiteLabel', { number: suite.number })}
                    linked={suite.has_lock}
                    columns={SUITE_COLUMNS}
                    onPress={() => onSuitePress(suite)}
                  />
                ))}
              </View>
            </View>
          ) : null}

          {(floor.rooms?.length ?? 0) > 0 ? (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>{t('roomsOnFloor')}</Text>
              <View style={styles.grid}>
                {floor.rooms.map((room) => (
                  <PropertyUnitTile
                    key={`room-${room.id}`}
                    kind="room"
                    title={String(room.number)}
                    linked={room.has_lock}
                    columns={ROOM_COLUMNS}
                    onPress={() => onRoomPress(room)}
                  />
                ))}
              </View>
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  floor: {
    marginBottom: 12,
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  floorHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 8,
  },
  floorTitleWrap: { flex: 1, minWidth: 0 },
  floorLabel: { color: colors.text, fontWeight: '700', fontSize: 16 },
  floorMeta: { color: colors.muted, fontSize: 12, marginTop: 2 },
  body: { paddingHorizontal: 10, paddingBottom: 12, gap: 12 },
  section: { gap: 8 },
  sectionLabel: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '700',
    paddingHorizontal: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -(PROPERTY_GRID_GUTTER / 2),
    width: '100%',
  },
  floorLockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.cardElevated,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  floorLockText: { flex: 1, color: colors.text, fontWeight: '600', fontSize: 14 },
});
