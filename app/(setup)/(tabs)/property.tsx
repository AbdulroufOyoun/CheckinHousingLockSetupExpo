import { router } from 'expo-router';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { PropertySkeleton } from '@/src/components/ui/Skeleton';
import { useBootstrap } from '@/src/hooks/useBootstrap';
import { useSession } from '@/src/store/session';
import { colors } from '@/src/theme/colors';
import type { FloorSection, RoomModel, SuiteModel } from '@/src/types/models';

function LockChip({ linked }: { linked: boolean }) {
  return (
    <View style={[styles.chip, linked ? styles.chipOn : styles.chipOff]}>
      <Text style={styles.chipText}>{linked ? '🔒' : '—'}</Text>
    </View>
  );
}

function UnitTile({
  title,
  linked,
  onPress,
}: {
  title: string;
  linked: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.tile} onPress={onPress}>
      <Text style={styles.tileTitle}>{title}</Text>
      <LockChip linked={linked} />
    </Pressable>
  );
}

function FloorBlock({ floor }: { floor: FloorSection }) {
  const [open, setOpen] = useState(true);
  return (
    <View style={styles.floor}>
      <Pressable onPress={() => setOpen((v) => !v)} style={styles.floorHead}>
        <Text style={styles.floorLabel}>{floor.label}</Text>
        <Text style={styles.chevron}>{open ? '▾' : '▸'}</Text>
      </Pressable>
      {open ? (
        <View style={styles.grid}>
          {floor.suites.map((suite: SuiteModel) => (
            <UnitTile
              key={`suite-${suite.id}`}
              title={`Suite ${suite.number}`}
              linked={suite.has_lock}
              onPress={() =>
                router.push(`/(setup)/property/suite/${suite.id}`)
              }
            />
          ))}
          {floor.rooms.map((room: RoomModel) => (
            <UnitTile
              key={`room-${room.id}`}
              title={String(room.number)}
              linked={room.has_lock}
              onPress={() => router.push(`/(setup)/property/room/${room.id}`)}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

export default function PropertyTab() {
  const { t } = useTranslation();
  const { tenantId } = useSession();
  const { data, isLoading, refetch, isRefetching } = useBootstrap(tenantId);

  if (isLoading) {
    return <PropertySkeleton />;
  }

  const floors = data?.floors ?? [];

  return (
    <ScrollView
      contentContainerStyle={styles.scroll}
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} tintColor={colors.accent} />
      }
    >
      {floors.length === 0 ? (
        <Text style={styles.empty}>{t('emptyProperty')}</Text>
      ) : (
        floors.map((floor) => <FloorBlock key={floor.id} floor={floor} />)
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  scroll: { padding: 16, paddingBottom: 40 },
  empty: { color: colors.muted, textAlign: 'center', marginTop: 40, fontSize: 16 },
  floor: {
    marginBottom: 14,
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  floorHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 14,
    alignItems: 'center',
  },
  floorLabel: { color: colors.text, fontWeight: '700', fontSize: 16, flex: 1 },
  chevron: { color: colors.muted, fontSize: 18 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 10,
    gap: 8,
  },
  tile: {
    width: '30%',
    minWidth: 96,
    backgroundColor: colors.cardElevated,
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    gap: 6,
  },
  tileTitle: { color: colors.text, fontWeight: '600', fontSize: 15 },
  chip: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  chipOn: { backgroundColor: '#1A3D36' },
  chipOff: { backgroundColor: '#2A3548' },
  chipText: { fontSize: 12 },
});
