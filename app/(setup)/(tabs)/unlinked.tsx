import { router } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';
import { useInfiniteQuery } from '@tanstack/react-query';

import { formatUserErrorMessage } from '@/src/api/formatApiError';
import { fetchTenantLocks } from '@/src/api/lockSetupClient';
import { UnlinkedLockRow } from '@/src/components/unlinked/UnlinkedLockRow';
import { UnlinkedSummaryCard } from '@/src/components/unlinked/UnlinkedSummaryCard';
import { EmptyState } from '@/src/components/ui/EmptyState';
import { SearchBar } from '@/src/components/ui/SearchBar';
import { UnlinkedSkeleton } from '@/src/components/ui/Skeleton';
import { useResponsiveLayout } from '@/src/hooks/useResponsiveLayout';
import { useSession } from '@/src/store/session';
import { colors } from '@/src/theme/colors';
import type { TenantLockRecord } from '@/src/types/models';

const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 400;

export default function UnlinkedTab() {
  const { t } = useTranslation();
  const { listContentStyle } = useResponsiveLayout();
  const { tenantId } = useSession();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [search]);

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isFetching,
  } = useInfiniteQuery({
    queryKey: ['unlinked-locks', tenantId, debouncedSearch],
    enabled: Boolean(tenantId),
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      fetchTenantLocks('unlinked', {
        page: pageParam,
        perPage: PAGE_SIZE,
        search: debouncedSearch || undefined,
      }),
    getNextPageParam: (lastPage) =>
      lastPage.current_page < lastPage.last_page ? lastPage.current_page + 1 : undefined,
  });

  const locks = useMemo(
    () => data?.pages.flatMap((page) => page.locks) ?? [],
    [data],
  );

  const total = data?.pages[data.pages.length - 1]?.total ?? data?.pages[0]?.total ?? 0;
  const isFirstLoad = isLoading && !data;
  const isSearching = isFetching && !isFetchingNextPage && !isRefetching && Boolean(debouncedSearch);

  const loadMore = () => {
    if (hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
    }
  };

  const openLock = (item: TenantLockRecord) => {
    router.push({
      pathname: '/(setup)/locks/[lockDbId]',
      params: {
        lockDbId: String(item.id),
        title: item.lockAlias || item.lockName,
        lockCloudId: item.lockId,
        lockMac: item.lockMac,
      },
    });
  };

  if (isFirstLoad) {
    return <UnlinkedSkeleton />;
  }

  if (isError && locks.length === 0) {
    return (
      <View style={styles.center}>
        <EmptyState
          icon="cloud-offline-outline"
          title={t('errorGeneric')}
          description={error ? formatUserErrorMessage(error, t, 'sync') : undefined}
          actionLabel={t('common.refresh')}
          onAction={() => void refetch()}
        />
      </View>
    );
  }

  const listHeader = (
    <View style={styles.header}>
      <UnlinkedSummaryCard
        total={total}
        loaded={locks.length}
        hasSearch={debouncedSearch.length > 0}
        isSyncing={isRefetching && !debouncedSearch}
      />
      <SearchBar
        value={search}
        onChangeText={setSearch}
        placeholder={t('unlinkedSearchPlaceholder')}
      />
      {isSearching ? (
        <ActivityIndicator color={colors.accent} style={{ alignSelf: 'center' }} />
      ) : null}
    </View>
  );

  return (
    <FlatList
      data={locks}
      keyExtractor={(item) => String(item.id)}
      contentContainerStyle={listContentStyle}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} tintColor={colors.accent} />
      }
      onEndReached={loadMore}
      onEndReachedThreshold={0.35}
      ListHeaderComponent={listHeader}
      ListEmptyComponent={
        debouncedSearch ? (
          <EmptyState
            icon="search-outline"
            title={t('emptyUnlinkedSearch')}
            actionLabel={t('clearSearch')}
            onAction={() => setSearch('')}
          />
        ) : (
          <EmptyState icon="checkmark-circle-outline" title={t('emptyUnlinked')} description={t('emptyUnlinkedHint')} />
        )
      }
      ListFooterComponent={
        isFetchingNextPage
          ? () => <ActivityIndicator color={colors.accent} style={{ marginVertical: 16 }} />
          : undefined
      }
      renderItem={({ item }) => <UnlinkedLockRow lock={item} onPress={() => openLock(item)} />}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, backgroundColor: colors.surface, justifyContent: 'center' },
  header: { gap: 12, marginBottom: 4 },
});
