import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  RefreshControl,
  SectionList,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { SiteUnitRow } from '@/src/components/site/SiteUnitRow';
import { EmptyState } from '@/src/components/ui/EmptyState';
import { SearchBar } from '@/src/components/ui/SearchBar';
import { PropertySkeleton } from '@/src/components/ui/Skeleton';
import { formatUserErrorMessage } from '@/src/api/formatApiError';
import { useBootstrap } from '@/src/hooks/useBootstrap';
import { useResponsiveLayout } from '@/src/hooks/useResponsiveLayout';
import { useSession } from '@/src/store/session';
import { colors } from '@/src/theme/colors';
import type { PropertyType, SiteUnitModel } from '@/src/types/models';

type Section = {
  key: string;
  title: string;
  type: PropertyType;
  icon: 'business-outline' | 'enter-outline' | 'arrow-up-outline' | 'car-outline';
  data: SiteUnitModel[];
};

export default function SiteTab() {
  const { t } = useTranslation();
  const { listContentStyle } = useResponsiveLayout();
  const { tenantId } = useSession();
  const { data, isLoading, error, refetch, isRefetching } = useBootstrap(tenantId);
  const [search, setSearch] = useState('');

  const sections = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filter = (items: SiteUnitModel[]) =>
      !q
        ? items
        : items.filter(
            (u) =>
              u.name.toLowerCase().includes(q) ||
              (u.subtitle?.toLowerCase().includes(q) ?? false),
          );

    const raw: Section[] = [
      {
        key: 'buildings',
        title: t('sectionBuildings'),
        type: 'building',
        icon: 'business-outline',
        data: filter(data?.buildings ?? []),
      },
      {
        key: 'gates',
        title: t('sectionGates'),
        type: 'gate',
        icon: 'enter-outline',
        data: filter(data?.gates ?? []),
      },
      {
        key: 'elevators',
        title: t('sectionElevators'),
        type: 'elevator',
        icon: 'arrow-up-outline',
        data: filter(data?.elevators ?? []),
      },
      {
        key: 'parkings',
        title: t('sectionParkings'),
        type: 'parking',
        icon: 'car-outline',
        data: filter(data?.parkings ?? []),
      },
    ];

    return raw.filter((s) => s.data.length > 0);
  }, [data, search, t]);

  const totalCount = useMemo(
    () =>
      (data?.buildings?.length ?? 0) +
      (data?.gates?.length ?? 0) +
      (data?.elevators?.length ?? 0) +
      (data?.parkings?.length ?? 0),
    [data],
  );

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

  return (
    <SectionList
      sections={sections}
      keyExtractor={(item, index) => `${item.id}-${index}`}
      contentContainerStyle={listContentStyle}
      keyboardShouldPersistTaps="handled"
      stickySectionHeadersEnabled={false}
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} tintColor={colors.accent} />
      }
      ListHeaderComponent={
        <View style={styles.header}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>{t('tabSite')}</Text>
            <Text style={styles.summarySub}>{t('siteSummaryCount', { count: totalCount })}</Text>
          </View>
          <SearchBar value={search} onChangeText={setSearch} placeholder={t('siteSearchPlaceholder')} />
        </View>
      }
      ListEmptyComponent={
        totalCount === 0 ? (
          <EmptyState icon="grid-outline" title={t('emptySite')} description={t('emptySiteHint')} />
        ) : (
          <EmptyState
            icon="search-outline"
            title={t('emptySiteSearch')}
            actionLabel={t('clearSearch')}
            onAction={() => setSearch('')}
          />
        )
      }
      renderSectionHeader={({ section }) => (
        <Text style={styles.sectionTitle}>{section.title}</Text>
      )}
      renderItem={({ item, section }) => (
        <SiteUnitRow
          unit={item}
          icon={section.icon}
          onPress={() => router.push(`/(setup)/property/${section.type}/${item.id}`)}
        />
      )}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', backgroundColor: colors.surface },
  header: { gap: 12, marginBottom: 8 },
  summaryCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
  },
  summaryTitle: { color: colors.text, fontWeight: '700', fontSize: 16 },
  summarySub: { color: colors.muted, fontSize: 13, marginTop: 4 },
  sectionTitle: {
    color: colors.muted,
    fontWeight: '700',
    fontSize: 13,
    marginTop: 12,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
});
