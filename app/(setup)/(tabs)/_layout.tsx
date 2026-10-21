import { Tabs } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { SetupHeader } from '@/src/components/SetupHeader';
import { useResponsiveLayout } from '@/src/hooks/useResponsiveLayout';
import { useTabBarLayout } from '@/src/hooks/useTabBarLayout';
import { colors } from '@/src/theme/colors';
export default function TabsLayout() {
  const { t } = useTranslation();
  const { tabIconSize } = useResponsiveLayout();
  const { tabBarStyle, tabBarLabelStyle } = useTabBarLayout();

  return (
    <Tabs
      screenOptions={{
        header: () => (
          <View style={{ backgroundColor: colors.surfaceAlt }}>
            <SetupHeader />
          </View>
        ),
        tabBarStyle: {
          backgroundColor: colors.tabBar,
          borderTopColor: colors.tabBarBorder,
          borderTopWidth: 1,
          ...tabBarStyle,
        },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.muted,
        tabBarAllowFontScaling: false,
        tabBarItemStyle: {
          paddingBottom: Platform.OS === 'android' ? 2 : 0,
        },
        tabBarLabelStyle,
        sceneStyle: { backgroundColor: colors.surface },
      }}
    >
      <Tabs.Screen
        name="property"
        options={{
          title: t('tabProperty'),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'business' : 'business-outline'}
              size={tabIconSize}
              color={String(color)}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="unlinked"
        options={{
          title: t('tabUnlinked'),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'link' : 'link-outline'}
              size={tabIconSize}
              color={String(color)}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="facilities"
        options={{
          title: t('tabFacilities'),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'fitness' : 'fitness-outline'}
              size={tabIconSize}
              color={String(color)}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="site"
        options={{
          title: t('tabSite'),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'grid' : 'grid-outline'}
              size={tabIconSize}
              color={String(color)}
            />
          ),
        }}
      />
    </Tabs>
  );
}
