import React from 'react';
import {
  Alert,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { Card, Screen, ScreenHeader, SectionHeader } from '../components/ui';
import { stores } from '../data/stores';
import { colors, radius, shadow, spacing, typography } from '../theme';
import { tapFeedback } from '../lib/haptics';
import type { Store } from '../types';

export function OffersScreen() {
  const openStore = async (store: Store) => {
    tapFeedback();
    try {
      await WebBrowser.openBrowserAsync(store.url, {
        toolbarColor: store.color,
        controlsColor: colors.white,
        dismissButtonStyle: 'close',
      });
    } catch {
      try {
        await Linking.openURL(store.url);
      } catch {
        Alert.alert(
          'Prospekt konnte nicht geöffnet werden',
          'Bitte prüfe deine Internetverbindung und versuche es erneut.',
        );
      }
    }
  };

  return (
    <Screen>
      <ScreenHeader
        title="Prospekte"
        subtitle="Aktuelle Prospekte deiner Märkte"
      />

      <Card style={styles.infoBanner}>
        <View style={styles.infoIcon}>
          <Ionicons name="megaphone-outline" size={20} color={colors.accent} />
        </View>
        <View style={styles.infoTextWrap}>
          <Text style={styles.infoTitle}>Alle Prospekte auf einen Blick</Text>
          <Text style={styles.infoText}>
            Über „Prospekt öffnen“ gelangst du direkt zum offiziellen Prospekt
            des Marktes. Dort findest du die tagesaktuellen Angebote und Preise.
          </Text>
        </View>
      </Card>

      <SectionHeader
        title="Wochenprospekte"
        actionLabel={`${stores.length} Märkte`}
      />

      <View style={styles.storeGrid}>
        {stores.map((store) => (
          <Pressable
            key={store.id}
            onPress={() => void openStore(store)}
            style={({ pressed }) => [
              styles.storeCard,
              { borderColor: `${store.color}22` },
              pressed && styles.pressed,
            ]}
          >
            <View style={styles.storeTop}>
              <View style={[styles.storeLogo, { backgroundColor: store.color }]}>
                <Text style={styles.storeLogoText}>
                  {store.name.slice(0, 2).toUpperCase()}
                </Text>
              </View>
              <Ionicons name="open-outline" size={16} color={store.color} />
            </View>

            <Text style={styles.storeName} numberOfLines={1}>
              {store.name}
            </Text>
            <Text style={styles.storeHint}>Aktueller Prospekt</Text>

            <View style={[styles.storeAction, { backgroundColor: store.light }]}>
              <Text style={[styles.storeActionText, { color: store.color }]}>
                Prospekt öffnen
              </Text>
              <Ionicons name="arrow-forward" size={13} color={store.color} />
            </View>
          </Pressable>
        ))}
      </View>

      <View style={styles.footerHint}>
        <Ionicons
          name="shield-checkmark-outline"
          size={15}
          color={colors.muted}
        />
        <Text style={styles.footerHintText}>
          Prospekte werden im offiziellen Web-Angebot der jeweiligen Kette
          geöffnet. Es werden keine Daten an Dritte übertragen.
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  infoBanner: {
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: colors.accentLight,
    shadowOpacity: 0,
    elevation: 0,
  },
  infoIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoTextWrap: {
    flex: 1,
  },
  infoTitle: {
    ...typography.body,
    fontWeight: '800',
    color: '#6B4C12',
  },
  infoText: {
    fontSize: 12,
    lineHeight: 18,
    color: '#7A5A1F',
    marginTop: 2,
  },
  storeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: spacing.md,
  },
  storeCard: {
    width: '48.3%',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
    gap: 5,
    ...shadow,
    shadowOpacity: 0.04,
    elevation: 1,
  },
  storeTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  storeLogo: {
    width: 48,
    height: 48,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storeLogoText: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.white,
    letterSpacing: 0.4,
  },
  storeName: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
    lineHeight: 19,
  },
  storeHint: {
    fontSize: 11,
    color: colors.muted,
  },
  storeAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderRadius: radius.sm,
    paddingVertical: 8,
    marginTop: 3,
  },
  storeActionText: {
    fontSize: 11,
    fontWeight: '800',
  },
  footerHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.xl,
    paddingHorizontal: spacing.sm,
  },
  footerHintText: {
    flex: 1,
    fontSize: 10,
    lineHeight: 15,
    color: colors.muted,
  },
  pressed: {
    opacity: 0.75,
  },
});
