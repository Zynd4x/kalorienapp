import React, { useMemo, useState } from 'react';
import {
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import {
  Badge,
  Button,
  Card,
  Chip,
  Screen,
  ScreenHeader,
  SectionHeader,
} from '../components/ui';
import { offers } from '../data/offers';
import { getStore, stores } from '../data/stores';
import { useApp } from '../context/AppContext';
import { colors, radius, shadow, spacing, typography } from '../theme';
import { formatPrice } from '../lib/nutrition';
import { successFeedback, tapFeedback } from '../lib/haptics';
import type { Offer, Store, StoreId } from '../types';

export function OffersScreen() {
  const { addShoppingItem } = useApp();
  const [selectedStore, setSelectedStore] = useState<StoreId | 'all'>('all');
  const [added, setAdded] = useState<Record<string, boolean>>({});

  const filtered = useMemo(
    () =>
      selectedStore === 'all'
        ? offers
        : offers.filter((offer) => offer.store === selectedStore),
    [selectedStore],
  );

  const selectedStoreData =
    selectedStore === 'all' ? undefined : getStore(selectedStore);

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

  const addOffer = (offer: Offer) => {
    addShoppingItem({
      name: offer.name,
      amount: offer.detail,
      category: offer.category,
    });
    successFeedback();
    setAdded((current) => ({ ...current, [offer.id]: true }));
    setTimeout(() => {
      setAdded((current) => ({ ...current, [offer.id]: false }));
    }, 1800);
  };

  return (
    <Screen>
      <ScreenHeader
        title="Prospekte"
        subtitle="Wochenangebote und aktuelle Prospekte"
      />

      <Card style={styles.infoBanner}>
        <View style={styles.infoIcon}>
          <Ionicons name="megaphone-outline" size={20} color={colors.accent} />
        </View>
        <View style={styles.infoTextWrap}>
          <Text style={styles.infoTitle}>Angebote für deine Woche</Text>
          <Text style={styles.infoText}>
            Die gezeigten Preise sind Beispielangebote. Über „Prospekt öffnen“
            gelangst du direkt zum offiziellen Prospekt des Marktes.
          </Text>
        </View>
      </Card>

      <SectionHeader title="Wochenprospekte" />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.storeRow}
      >
        {stores.map((store) => (
          <Pressable
            key={store.id}
            onPress={() => void openStore(store)}
            style={({ pressed }) => [
              styles.storeCard,
              { backgroundColor: store.light, borderColor: `${store.color}22` },
              pressed && styles.pressed,
            ]}
          >
            <View style={[styles.storeLogo, { backgroundColor: store.color }]}>
              <Text style={styles.storeLogoText}>
                {store.name.slice(0, 2).toUpperCase()}
              </Text>
            </View>
            <Text style={styles.storeName}>{store.name}</Text>
            <View style={styles.storeLink}>
              <Text style={[styles.storeLinkText, { color: store.color }]}>
                Prospekt öffnen
              </Text>
              <Ionicons
                name="arrow-forward"
                size={13}
                color={store.color}
              />
            </View>
          </Pressable>
        ))}
      </ScrollView>

      {selectedStoreData ? (
        <Card
          style={[
            styles.selectedStoreBanner,
            { backgroundColor: selectedStoreData.light },
          ]}
        >
          <View
            style={[
              styles.storeLogo,
              { backgroundColor: selectedStoreData.color },
            ]}
          >
            <Text style={styles.storeLogoText}>
              {selectedStoreData.name.slice(0, 2).toUpperCase()}
            </Text>
          </View>
          <View style={styles.selectedStoreText}>
            <Text style={styles.selectedStoreTitle}>
              {selectedStoreData.name}-Prospekt
            </Text>
            <Text style={styles.selectedStoreHint}>
              Alle Aktionen der aktuellen Woche
            </Text>
          </View>
          <Button
            label="Öffnen"
            onPress={() => void openStore(selectedStoreData)}
            variant="outline"
            style={styles.openButton}
          />
        </Card>
      ) : null}

      <SectionHeader
        title={
          selectedStoreData
            ? `${selectedStoreData.name}-Angebote`
            : 'Beispielangebote'
        }
        actionLabel={`${filtered.length} Artikel`}
      />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
      >
        <Chip
          label="Alle"
          selected={selectedStore === 'all'}
          onPress={() => setSelectedStore('all')}
        />
        {stores.map((store) => (
          <Chip
            key={store.id}
            label={store.name}
            selected={selectedStore === store.id}
            onPress={() => setSelectedStore(store.id)}
            color={store.color}
            lightColor={store.light}
          />
        ))}
      </ScrollView>

      <View style={styles.offerGrid}>
        {filtered.map((offer) => {
          const store = getStore(offer.store);
          const isAdded = added[offer.id];
          return (
            <View key={offer.id} style={styles.offerCard}>
              <View style={styles.offerTop}>
                <View style={styles.offerEmojiWrap}>
                  <Text style={styles.offerEmoji}>{offer.emoji}</Text>
                </View>
                {offer.badge ? (
                  <Badge
                    label={offer.badge.toUpperCase()}
                    color={colors.primaryDark}
                    background={colors.primaryLight}
                  />
                ) : null}
              </View>

              <Text style={styles.offerName} numberOfLines={2}>
                {offer.name}
              </Text>
              <Text style={styles.offerDetail}>{offer.detail}</Text>

              <View style={styles.storeLine}>
                <View
                  style={[
                    styles.storeDot,
                    { backgroundColor: store?.color ?? colors.primary },
                  ]}
                />
                <Text style={styles.storeLineText}>{store?.name}</Text>
              </View>

              <View style={styles.priceRow}>
                <Text style={styles.price}>{formatPrice(offer.price)}</Text>
                {offer.originalPrice ? (
                  <Text style={styles.originalPrice}>
                    {formatPrice(offer.originalPrice)}
                  </Text>
                ) : null}
              </View>

              <Pressable
                onPress={() => addOffer(offer)}
                style={({ pressed }) => [
                  styles.addButton,
                  isAdded && styles.addButtonAdded,
                  pressed && styles.pressed,
                ]}
              >
                <Ionicons
                  name={isAdded ? 'checkmark' : 'add'}
                  size={16}
                  color={isAdded ? colors.primaryDark : colors.primary}
                />
                <Text
                  style={[
                    styles.addButtonText,
                    isAdded && styles.addButtonTextAdded,
                  ]}
                >
                  {isAdded ? 'Hinzugefügt' : 'Zur Liste'}
                </Text>
              </Pressable>
            </View>
          );
        })}
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
  storeRow: {
    gap: spacing.sm,
    paddingRight: spacing.lg,
  },
  storeCard: {
    width: 136,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
    gap: 7,
  },
  storeLogo: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storeLogoText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.white,
    letterSpacing: 0.4,
  },
  storeName: {
    ...typography.body,
    fontWeight: '800',
    color: colors.text,
  },
  storeLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  storeLinkText: {
    fontSize: 10,
    fontWeight: '700',
  },
  selectedStoreBanner: {
    marginTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    shadowOpacity: 0,
    elevation: 0,
  },
  selectedStoreText: {
    flex: 1,
  },
  selectedStoreTitle: {
    ...typography.body,
    fontWeight: '800',
    color: colors.text,
  },
  selectedStoreHint: {
    fontSize: 11,
    color: colors.muted,
    marginTop: 1,
  },
  openButton: {
    minHeight: 40,
    paddingHorizontal: spacing.md,
  },
  filterRow: {
    gap: spacing.sm,
    paddingRight: spacing.lg,
    paddingBottom: spacing.md,
  },
  offerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: spacing.md,
  },
  offerCard: {
    width: '48.3%',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: 5,
    ...shadow,
    shadowOpacity: 0.04,
    elevation: 1,
  },
  offerTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  offerEmojiWrap: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  offerEmoji: {
    fontSize: 27,
  },
  offerName: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
    lineHeight: 18,
    minHeight: 36,
  },
  offerDetail: {
    fontSize: 11,
    color: colors.muted,
  },
  storeLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  storeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  storeLineText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.muted,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 5,
    marginTop: 1,
  },
  price: {
    fontSize: 19,
    fontWeight: '800',
    color: colors.primaryDark,
    letterSpacing: -0.4,
  },
  originalPrice: {
    fontSize: 11,
    color: colors.muted,
    textDecorationLine: 'line-through',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: colors.primaryLight,
    borderRadius: radius.sm,
    paddingVertical: 7,
    marginTop: 3,
  },
  addButtonAdded: {
    backgroundColor: '#D6EEDF',
  },
  addButtonText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.primary,
  },
  addButtonTextAdded: {
    color: colors.primaryDark,
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
