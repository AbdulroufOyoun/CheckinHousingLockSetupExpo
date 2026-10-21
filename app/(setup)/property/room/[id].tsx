import { Stack, useLocalSearchParams } from 'expo-router';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { RoomDetailScreenContent } from '@/src/components/property/RoomDetailScreenContent';
import { Screen } from '@/src/components/ui/Screen';
import { useBootstrap } from '@/src/hooks/useBootstrap';
import { useSession } from '@/src/store/session';
import { colors } from '@/src/theme/colors';
import { findRoom } from '@/src/utils/bootstrapLookup';

export default function RoomDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const roomId = Number(id);
  const { t } = useTranslation();
  const { tenantId } = useSession();
  const { data } = useBootstrap(tenantId);

  const title = useMemo(() => {
    const room = findRoom(data, roomId);
    return room?.number ? String(room.number) : t('roomDetailTitle');
  }, [data, roomId, t]);

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
      <RoomDetailScreenContent roomId={roomId} />
    </Screen>
  );
}
