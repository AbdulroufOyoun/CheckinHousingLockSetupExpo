import { router } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { PropertyFilterChips } from '@/src/components/property/PropertyFilterChips';
import { PropertyFloorSection } from '@/src/components/property/PropertyFloorSection';
import { PropertySearchBar } from '@/src/components/property/PropertySearchBar';
import { PropertySummaryCard } from '@/src/components/property/PropertySummaryCard';
import { PropertySkeleton } from '@/src/components/ui/Skeleton';
import { EmptyState } from '@/src/components/ui/EmptyState';
import { formatUserErrorMessage } from '@/src/api/formatApiError';
import { useBootstrap } from '@/src/hooks/useBootstrap';
import { useResponsiveLayout } from '@/src/hooks/useResponsiveLayout';
import { useSession } from '@/src/store/session';
import { colors } from '@/src/theme/colors';
import type { FloorSection, RoomModel, SuiteModel } from '@/src/types/models';
import {
  countPropertyUnits,
  filterPropertyFloors,
  type PropertyLockFilter,
} from '@/src/utils/propertyStats';

export default function PropertyTab() {
  const { t } = useTranslation();
  const { listContentStyle } = useResponsiveLayout();
  const { tenantId } = useSession();
  const { data, isLoading, error, refetch, isRefetching } = useBootstrap(tenantId);

  const [search, setSearch] = useState('');
  const [lockFilter, setLockFilter] = useState<PropertyLockFilter>('all');
  const [openByFloor, setOpenByFloor] = useState<Record<number, boolean>>({});

  const allFloors = data?.floors ?? [];

  const filteredFloors = useMemo(
    () => filterPropertyFloors(allFloors, { query: search, lockFilter }),
    [allFloors, search, lockFilter],
  );

  const stats = useMemo(() => countPropertyUnits(allFloors), [allFloors]);

  const isFloorOpen = useCallback(
    (floorId: number, index: number) => {
      if (floorId in openByFloor) {
        return openByFloor[floorId];
      }
      return index === 0;
    },
    [openByFloor],
  );

  const allExpanded = useMemo(() => {
    if (filteredFloors.length === 0) return false;
    return filteredFloors.every((f, i) => isFloorOpen(f.id, i));
  }, [filteredFloors, isFloorOpen]);

  const toggleFloor = useCallback((floorId: number, index: number) => {
    setOpenByFloor((prev) => ({
      ...prev,
      [floorId]: !(floorId in prev ? prev[floorId] : index === 0),
    }));
  }, []);

  const toggleExpandAll = useCallback(() => {
    const nextExpanded = !allExpanded;
    const next: Record<number, boolean> = {};
    filteredFloors.forEach((f) => {
      next[f.id] = nextExpanded;
    });
    setOpenByFloor(next);
  }, [allExpanded, filteredFloors]);

  if (isLoading) {
    return <PropertySkeleton />;
  }

  if (error) {
    return (
      <View style={styles.center}>
        <EmptyState
          icon="cloud-offline-outline"
          title={t('errorGeneric')}
          description={formatUserErrorMessage(error, t, 'sync')}
          actionLabel={t('common.refresh')}
          onAction={() => void refetch()}
        />
      </View>
    );
  }

  const listHeader = (
    <View style={styles.header}>
      <PropertySummaryCard stats={stats} />
      <PropertySearchBar value={search} onChangeText={setSearch} />
      <PropertyFilterChips value={lockFilter} onChange={setLockFilter} />
      {filteredFloors.length > 1 ? (
        <Pressable onPress={toggleExpandAll} style={styles.expandAll}>
          <Text style={styles.expandAllText}>
            {allExpanded ? t('collapseAll') : t('expandAll')}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );

  return (
    <FlatList
      data={filteredFloors}
      keyExtractor={(item) => String(item.id)}
      contentContainerStyle={listContentStyle}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} tintColor={colors.accent} />
      }
      ListHeaderComponent={listHeader}
      ListEmptyComponent={
        allFloors.length === 0 ? (
          <EmptyState icon="business-outline" title={t('emptyProperty')} />
        ) : (
          <EmptyState
            icon="search-outline"
            title={t('emptyPropertySearch')}
            actionLabel={t('clearSearch')}
            onAction={() => {
              setSearch('');
              setLockFilter('all');
            }}
          />
        )
      }
      renderItem={({ item, index }) => (
        <PropertyFloorSection
          floor={item}
          open={isFloorOpen(item.id, index)}
          onToggle={() => toggleFloor(item.id, index)}
          onRoomPress={(room: RoomModel) => router.push(`/(setup)/property/room/${room.id}`)}
          onSuitePress={(suite: SuiteModel) => router.push(`/(setup)/property/suite/${suite.id}`)}
        />
      )}
    />
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    backgroundColor: colors.surface,
    justifyContent: 'center',
  },
  header: { gap: 12, marginBottom: 8 },
  expandAll: { alignSelf: 'flex-start', paddingVertical: 4 },
  expandAllText: { color: colors.accent, fontWeight: '600', fontSize: 14 },
});
