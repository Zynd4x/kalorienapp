import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../theme';

function resolveIconColor(color: unknown): string {
  return typeof color === 'string' ? color : colors.primary;
}

export default function TabLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarHideOnKeyboard: true,
        tabBarLabelStyle: {
          fontSize: 10.5,
          fontWeight: '700',
          marginTop: 1,
        },
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          height: 58 + insets.bottom,
          paddingTop: 7,
          paddingBottom: insets.bottom + 6,
          elevation: 10,
          shadowColor: '#1B2A20',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.05,
          shadowRadius: 10,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Heute',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'today' : 'today-outline'}
              size={22}
              color={resolveIconColor(color)}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="scan"
        options={{
          title: 'Scannen',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'scan' : 'scan-outline'}
              size={22}
              color={resolveIconColor(color)}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="offers"
        options={{
          title: 'Prospekte',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'newspaper' : 'newspaper-outline'}
              size={21}
              color={resolveIconColor(color)}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="list"
        options={{
          title: 'Liste',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'cart' : 'cart-outline'}
              size={22}
              color={resolveIconColor(color)}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="recipes"
        options={{
          title: 'Rezepte',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'restaurant' : 'restaurant-outline'}
              size={21}
              color={resolveIconColor(color)}
            />
          ),
        }}
      />
    </Tabs>
  );
}
