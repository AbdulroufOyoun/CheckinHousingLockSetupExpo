import { Redirect, Stack, useLocalSearchParams } from 'expo-router';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { PropertyDetailScreenContent } from '@/src/components/property/PropertyDetailScreenContent';
import { SiteUnitDetailScreenContent } from '@/src/components/site/SiteUnitDetailScreenContent';
import { isSiteDetailType } from '@/src/constants/siteDetailTypes';
import { Screen } from '@/src/components/ui/Screen';
import { colors } from '@/src/theme/colors';
import type { PropertyType } from '@/src/types/models';
import { getPropertyEntity, siteUnitTitle } from '@/src/utils/bootstrapLookup';
import { useBootstrap } from '@/src/hooks/useBootstrap';
import { useSession } from '@/src/store/session';
import { facilityDisplayName } from '@/src/utils/lockMerge';

export default function PropertyDetailScreen() {
  const { type, id } = useLocalSearchParams<{ type: string; id: string }>();
  const propertyType = type as PropertyType;
  const propertyId = Number(id);
  const { t, i18n } = useTranslation();
  const { tenantId } = useSession();
  const { data } = useBootstrap(tenantId);

  const title = useMemo(() => {
    const entity = getPropertyEntity(data, propertyType, propertyId);
    if (!entity) return t('tabProperty');
    if (propertyType === 'facility') {
      return facilityDisplayName(entity as import('@/src/types/models').FacilityModel, i18n.language);
    }
    if (propertyType === 'room' || propertyType === 'suite') {
      return 'number' in entity ? String(entity.number) : String(propertyId);
    }
    return siteUnitTitle(entity as import('@/src/types/models').SiteUnitModel, propertyType);
  }, [data, propertyType, propertyId, i18n.language, t]);

  if (propertyType === 'room' && propertyId > 0) {
    return <Redirect href={`/(setup)/property/room/${propertyId}`} />;
  }

  return (
    <Screen edges={['bottom', 'left', 'right']} style={{ flex: 1 }}>
      <Stack.Screen
        options={{
          headerShown: true,
          title,
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
        }}
      />
      {isSiteDetailType(propertyType) ? (
        <SiteUnitDetailScreenContent propertyType={propertyType} unitId={propertyId} />
      ) : (
        <PropertyDetailScreenContent propertyType={propertyType} propertyId={propertyId} />
      )}
    </Screen>
  );
}
