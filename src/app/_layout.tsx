import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppProvider, useApp } from '../context/AppContext';
import { colors, spacing, typography } from '../theme';

function RootNavigator() {
  const { hydrated } = useApp();

  if (!hydrated) {
    return (
      <View style={styles.loading}>
        <View style={styles.logo}>
          <Text style={styles.logoText}>KK</Text>
        </View>
        <Text style={styles.loadingTitle}>KalorienKompass</Text>
        <ActivityIndicator color={colors.primary} />
        <Text style={styles.loadingHint}>Deine Daten werden geladen …</Text>
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="(tabs)" />
      <Stack.Screen
        name="food-detail"
        options={{
          presentation: 'modal',
          animation: 'slide_from_bottom',
        }}
      />
      <Stack.Screen name="recipe/[id]" />
      <Stack.Screen
        name="create-recipe"
        options={{
          presentation: 'modal',
          animation: 'slide_from_bottom',
        }}
      />
      <Stack.Screen name="goals" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AppProvider>
        <StatusBar style="dark" />
        <RootNavigator />
      </AppProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    gap: spacing.sm,
    padding: spacing.xl,
  },
  logo: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  logoText: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.white,
    letterSpacing: -1,
  },
  loadingTitle: {
    ...typography.h2,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  loadingHint: {
    ...typography.small,
    color: colors.muted,
  },
});
