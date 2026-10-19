import { Tabs } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { SetupHeader } from '@/src/components/SetupHeader';
import { colors } from '@/src/theme/colors';

export default function TabsLayout() {
  const { t } = useTranslation();
  return (
    <Tabs
      screenOptions={{
        header: () => (
          <View style={{ backgroundColor: colors.surface }}>
            <SetupHeader />
          </View>
        ),
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
        },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.muted,
      }}
    >
      <Tabs.Screen
        name="property"
        options={{
          title: t('tabProperty'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="business-outline" size={size} color={String(color)} />
          ),
        }}
      />
      <Tabs.Screen
        name="unlinked"
        options={{
          title: t('tabUnlinked'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="link-outline" size={size} color={String(color)} />
          ),
        }}
      />
      <Tabs.Screen
        name="facilities"
        options={{
          title: t('tabFacilities'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="fitness-outline" size={size} color={String(color)} />
          ),
        }}
      />
    </Tabs>
  );
}
