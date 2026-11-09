import React, { useMemo, useState } from 'react';
import {
  Alert,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { Barcode } from '../components/Barcode';
import {
  Button,
  Card,
  Chip,
  EmptyState,
  IconButton,
  Screen,
  ScreenHeader,
  SectionHeader,
} from '../components/ui';
import { stores } from '../data/stores';
import { useApp } from '../context/AppContext';
import { colors, radius, shadow, spacing, typography } from '../theme';
import { successFeedback, tapFeedback } from '../lib/haptics';
import type {
  BarcodeType,
  CouponStatus,
  LoyaltyCard,
  Store,
  StoreCoupon,
  StoreId,
} from '../types';

const BARCODE_TYPES: { value: BarcodeType; label: string }[] = [
  { value: 'auto', label: 'Automatisch' },
  { value: 'code128', label: 'Code 128' },
  { value: 'ean13', label: 'EAN-13' },
];

const COUPON_STATUS: Record<
  CouponStatus,
  { label: string; color: string; background: string; next: CouponStatus }
> = {
  available: {
    label: 'Verfügbar',
    color: '#8A6D1F',
    background: '#FBF3DC',
    next: 'activated',
  },
  activated: {
    label: 'Aktiviert',
    color: colors.primaryDark,
    background: colors.primaryLight,
    next: 'redeemed',
  },
  redeemed: {
    label: 'Eingelöst',
    color: colors.muted,
    background: colors.surfaceAlt,
    next: 'available',
  },
};

interface CardFormState {
  storeId: StoreId;
  label: string;
  number: string;
  barcodeType: BarcodeType;
  note: string;
}

interface CouponFormState {
  cardId: string;
  title: string;
  description: string;
  validUntil: string;
}

function maskNumber(value: string): string {
  const clean = value.trim();
  if (clean.length <= 6) return clean;
  return `${clean.slice(0, 4)} •••• ${clean.slice(-4)}`;
}

export function OffersScreen() {
  const {
    loyaltyCards,
    coupons,
    addLoyaltyCard,
    removeLoyaltyCard,
    addCoupon,
    setCouponStatus,
    removeCoupon,
  } = useApp();

  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [cardForm, setCardForm] = useState<CardFormState | null>(null);
  const [couponForm, setCouponForm] = useState<CouponFormState | null>(null);

  const groups = useMemo(
    () =>
      stores
        .map((store) => ({
          store,
          cards: loyaltyCards.filter((card) => card.storeId === store.id),
        }))
        .filter((group) => group.cards.length > 0),
    [loyaltyCards],
  );

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

  const startCardForm = (storeId: StoreId) => {
    tapFeedback();
    setCardForm({
      storeId,
      label: '',
      number: '',
      barcodeType: 'auto',
      note: '',
    });
  };

  const submitCard = () => {
    if (!cardForm) return;
    if (!cardForm.label.trim() || !cardForm.number.trim()) return;
    const id = addLoyaltyCard({
      storeId: cardForm.storeId,
      label: cardForm.label,
      number: cardForm.number,
      barcodeType: cardForm.barcodeType,
      note: cardForm.note,
    });
    setCardForm(null);
    setExpandedCard(id);
    successFeedback();
  };

  const submitCoupon = () => {
    if (!couponForm) return;
    if (!couponForm.title.trim()) return;
    addCoupon(couponForm.cardId, {
      title: couponForm.title,
      description: couponForm.description,
      validUntil: couponForm.validUntil,
    });
    setCouponForm(null);
    successFeedback();
  };

  const cycleCoupon = (coupon: StoreCoupon) => {
    const next = COUPON_STATUS[coupon.status].next;
    setCouponStatus(coupon.id, next);
    if (next === 'activated') {
      successFeedback();
    } else {
      tapFeedback();
    }
  };

  const confirmDeleteCard = (card: LoyaltyCard) => {
    const store = stores.find((entry) => entry.id === card.storeId);
    Alert.alert(
      'Kundenkarte löschen?',
      `„${card.label}“${store ? ` (${store.name})` : ''} und alle zugehörigen Coupons werden entfernt.`,
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Löschen',
          style: 'destructive',
          onPress: () => {
            removeLoyaltyCard(card.id);
            if (expandedCard === card.id) setExpandedCard(null);
          },
        },
      ],
    );
  };

  const confirmDeleteCoupon = (coupon: StoreCoupon) => {
    Alert.alert('Coupon löschen?', `„${coupon.title}“ wird entfernt.`, [
      { text: 'Abbrechen', style: 'cancel' },
      {
        text: 'Löschen',
        style: 'destructive',
        onPress: () => removeCoupon(coupon.id),
      },
    ]);
  };

  return (
    <Screen>
      <ScreenHeader
        title="Prospekte"
        subtitle="Prospekte, Kundenkarten & Coupons"
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

      <View style={styles.sectionRow}>
        <Text style={styles.sectionTitle}>Wochenprospekte</Text>
        <Text style={styles.sectionMeta}>{stores.length} Märkte</Text>
      </View>

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

      <SectionHeader title="Kundenkarten & Coupons" />

      <Card style={styles.loyaltyIntro}>
        <View style={styles.loyaltyIntroIcon}>
          <Ionicons name="card-outline" size={20} color={colors.primary} />
        </View>
        <Text style={styles.loyaltyIntroText}>
          Lege pro Markt eine oder mehrere Kundenkarten an. Coupons trägst du
          manuell ein und hältst fest, ob sie verfügbar, aktiviert oder
          eingelöst sind. Aktiviert werden sie weiterhin in der offiziellen App
          des Marktes – hier bleiben nur deine Karten und Notizen.
        </Text>
      </Card>

      {loyaltyCards.length === 0 && !cardForm ? (
        <Card>
          <EmptyState
            icon="card-outline"
            title="Noch keine Kundenkarte"
            message="Füge deine erste Karte hinzu – pro Markt getrennt, damit nichts durcheinander gerät."
            actionLabel="Kundenkarte hinzufügen"
            onAction={() => startCardForm(stores[0].id)}
          />
        </Card>
      ) : null}

      {groups.map(({ store, cards }) => {
        const storeCouponCount = coupons.filter((coupon) =>
          cards.some((card) => card.id === coupon.cardId),
        ).length;

        return (
          <View key={store.id} style={styles.storeSection}>
            <View style={styles.storeSectionHead}>
              <View
                style={[styles.storeSectionDot, { backgroundColor: store.color }]}
              />
              <Text style={styles.storeSectionName}>{store.name}</Text>
              <Text style={styles.storeSectionMeta}>
                {cards.length} {cards.length === 1 ? 'Karte' : 'Karten'} ·{' '}
                {storeCouponCount}{' '}
                {storeCouponCount === 1 ? 'Coupon' : 'Coupons'}
              </Text>
            </View>

            {cards.map((card) => {
              const cardCoupons = coupons.filter(
                (coupon) => coupon.cardId === card.id,
              );
              const isOpen = expandedCard === card.id;

              return (
                <Card key={card.id} style={styles.loyaltyCard}>
                  <Pressable
                    onPress={() => {
                      tapFeedback();
                      setExpandedCard(isOpen ? null : card.id);
                    }}
                    style={styles.loyaltyCardHead}
                  >
                    <View
                      style={[styles.cardLogo, { backgroundColor: store.color }]}
                    >
                      <Ionicons name="card" size={20} color={colors.white} />
                    </View>
                    <View style={styles.loyaltyCardText}>
                      <Text style={styles.loyaltyCardLabel} numberOfLines={1}>
                        {card.label}
                      </Text>
                      <Text style={styles.loyaltyCardNumber}>
                        {maskNumber(card.number)}
                      </Text>
                    </View>
                    <View style={styles.loyaltyCardBadges}>
                      {cardCoupons.length > 0 ? (
                        <View style={styles.couponCountBadge}>
                          <Text style={styles.couponCountText}>
                            {cardCoupons.length}
                          </Text>
                        </View>
                      ) : null}
                      <Ionicons
                        name={isOpen ? 'chevron-up' : 'chevron-down'}
                        size={18}
                        color={colors.muted}
                      />
                    </View>
                  </Pressable>

                  {isOpen ? (
                    <View style={styles.cardBody}>
                      <Barcode value={card.number} type={card.barcodeType} />

                      {card.note ? (
                        <Text style={styles.cardNote}>{card.note}</Text>
                      ) : null}

                      <View style={styles.cardActions}>
                        <Button
                          label="Coupons & Angebote öffnen"
                          icon="open-outline"
                          variant="secondary"
                          onPress={() => void openStore(store)}
                          style={styles.cardActionButton}
                        />
                        <IconButton
                          icon="trash-outline"
                          color={colors.danger}
                          background={colors.dangerLight}
                          onPress={() => confirmDeleteCard(card)}
                          accessibilityLabel="Kundenkarte löschen"
                        />
                      </View>

                      <View style={styles.couponHeader}>
                        <Text style={styles.couponHeaderTitle}>Coupons</Text>
                        <Text style={styles.couponHeaderHint}>
                          Antippen wechselt den Status
                        </Text>
                      </View>

                      {cardCoupons.length === 0 ? (
                        <Text style={styles.couponEmpty}>
                          Noch keine Coupons für diese Karte.
                        </Text>
                      ) : (
                        cardCoupons.map((coupon) => {
                          const status = COUPON_STATUS[coupon.status];
                          return (
                            <View key={coupon.id} style={styles.couponRow}>
                              <View style={styles.couponTextWrap}>
                                <Text style={styles.couponTitle}>
                                  {coupon.title}
                                </Text>
                                {coupon.description ? (
                                  <Text style={styles.couponDescription}>
                                    {coupon.description}
                                  </Text>
                                ) : null}
                                {coupon.validUntil ? (
                                  <Text style={styles.couponValid}>
                                    Gültig bis {coupon.validUntil}
                                  </Text>
                                ) : null}
                              </View>
                              <View style={styles.couponRight}>
                                <Pressable
                                  onPress={() => cycleCoupon(coupon)}
                                  hitSlop={6}
                                  style={[
                                    styles.couponStatus,
                                    { backgroundColor: status.background },
                                  ]}
                                >
                                  <Text
                                    style={[
                                      styles.couponStatusText,
                                      { color: status.color },
                                    ]}
                                  >
                                    {status.label}
                                  </Text>
                                </Pressable>
                                <Pressable
                                  onPress={() => confirmDeleteCoupon(coupon)}
                                  hitSlop={8}
                                  accessibilityLabel="Coupon löschen"
                                >
                                  <Ionicons
                                    name="close"
                                    size={16}
                                    color={colors.muted}
                                  />
                                </Pressable>
                              </View>
                            </View>
                          );
                        })
                      )}

                      {couponForm?.cardId === card.id ? (
                        <View style={styles.inlineForm}>
                          <TextInput
                            value={couponForm.title}
                            onChangeText={(title) =>
                              setCouponForm((current) =>
                                current ? { ...current, title } : current,
                              )
                            }
                            placeholder="Coupon, z. B. 20 % auf Obst"
                            placeholderTextColor={colors.muted}
                            style={styles.input}
                          />
                          <TextInput
                            value={couponForm.description}
                            onChangeText={(description) =>
                              setCouponForm((current) =>
                                current ? { ...current, description } : current,
                              )
                            }
                            placeholder="Beschreibung (optional)"
                            placeholderTextColor={colors.muted}
                            style={styles.input}
                          />
                          <TextInput
                            value={couponForm.validUntil}
                            onChangeText={(validUntil) =>
                              setCouponForm((current) =>
                                current ? { ...current, validUntil } : current,
                              )
                            }
                            placeholder="Gültig bis (optional), z. B. 30.11.2026"
                            placeholderTextColor={colors.muted}
                            style={styles.input}
                          />
                          <View style={styles.formButtons}>
                            <Button
                              label="Abbrechen"
                              variant="outline"
                              onPress={() => setCouponForm(null)}
                              style={styles.formButton}
                            />
                            <Button
                              label="Speichern"
                              onPress={submitCoupon}
                              disabled={!couponForm.title.trim()}
                              style={styles.formButton}
                            />
                          </View>
                        </View>
                      ) : (
                        <Pressable
                          onPress={() => {
                            tapFeedback();
                            setCouponForm({
                              cardId: card.id,
                              title: '',
                              description: '',
                              validUntil: '',
                            });
                          }}
                          style={styles.addCouponButton}
                        >
                          <Ionicons
                            name="add-circle-outline"
                            size={17}
                            color={colors.primary}
                          />
                          <Text style={styles.addCouponText}>
                            Coupon hinzufügen
                          </Text>
                        </Pressable>
                      )}
                    </View>
                  ) : null}
                </Card>
              );
            })}

            <Pressable
              onPress={() => startCardForm(store.id)}
              style={({ pressed }) => [
                styles.addCardLink,
                pressed && styles.pressed,
              ]}
            >
              <Ionicons name="add" size={16} color={colors.primary} />
              <Text style={styles.addCardLinkText}>
                Weitere Karte für {store.name}
              </Text>
            </Pressable>
          </View>
        );
      })}

      {cardForm ? (
        <Card style={styles.formCard}>
          <Text style={styles.formTitle}>Neue Kundenkarte</Text>

          <Text style={styles.fieldLabel}>Markt</Text>
          <View style={styles.chipWrap}>
            {stores.map((store) => (
              <Chip
                key={store.id}
                label={store.name}
                selected={cardForm.storeId === store.id}
                color={store.color}
                lightColor={store.light}
                onPress={() =>
                  setCardForm((current) =>
                    current ? { ...current, storeId: store.id } : current,
                  )
                }
              />
            ))}
          </View>

          <Text style={styles.fieldLabel}>Bezeichnung</Text>
          <TextInput
            value={cardForm.label}
            onChangeText={(label) =>
              setCardForm((current) =>
                current ? { ...current, label } : current,
              )
            }
            placeholder="z. B. Meine REWE-Karte"
            placeholderTextColor={colors.muted}
            style={styles.input}
          />

          <Text style={styles.fieldLabel}>Kartennummer</Text>
          <TextInput
            value={cardForm.number}
            onChangeText={(number) =>
              setCardForm((current) =>
                current ? { ...current, number } : current,
              )
            }
            placeholder="Nummer von der Karte oder aus der App"
            placeholderTextColor={colors.muted}
            autoCapitalize="characters"
            autoCorrect={false}
            style={styles.input}
          />

          <Text style={styles.fieldLabel}>Barcode</Text>
          <View style={styles.chipWrap}>
            {BARCODE_TYPES.map((entry) => (
              <Chip
                key={entry.value}
                label={entry.label}
                selected={cardForm.barcodeType === entry.value}
                onPress={() =>
                  setCardForm((current) =>
                    current ? { ...current, barcodeType: entry.value } : current,
                  )
                }
              />
            ))}
          </View>

          <Text style={styles.fieldLabel}>Notiz (optional)</Text>
          <TextInput
            value={cardForm.note}
            onChangeText={(note) =>
              setCardForm((current) =>
                current ? { ...current, note } : current,
              )
            }
            placeholder="z. B. gilt auch für Familie"
            placeholderTextColor={colors.muted}
            style={styles.input}
          />

          <View style={styles.formButtons}>
            <Button
              label="Abbrechen"
              variant="outline"
              onPress={() => setCardForm(null)}
              style={styles.formButton}
            />
            <Button
              label="Speichern"
              onPress={submitCard}
              disabled={!cardForm.label.trim() || !cardForm.number.trim()}
              style={styles.formButton}
            />
          </View>
        </Card>
      ) : (
        <Button
          label="Kundenkarte hinzufügen"
          icon="add"
          variant="secondary"
          fullWidth
          onPress={() => startCardForm(stores[0].id)}
          style={styles.addCardButton}
        />
      )}

      <View style={styles.footerHint}>
        <Ionicons
          name="information-circle-outline"
          size={15}
          color={colors.muted}
        />
        <Text style={styles.footerHintText}>
          Kundenkarten und Coupons bleiben lokal auf diesem Gerät. Es werden
          keine Zugangsdaten gespeichert und keine fremden Konten ausgelesen.
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
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text,
  },
  sectionMeta: {
    ...typography.tiny,
    color: colors.muted,
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
  loyaltyIntro: {
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: colors.primaryLight,
    shadowOpacity: 0,
    elevation: 0,
    marginBottom: spacing.md,
  },
  loyaltyIntroIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loyaltyIntroText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: colors.primaryDark,
  },
  storeSection: {
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  storeSectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  storeSectionDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },
  storeSectionName: {
    ...typography.h3,
    fontSize: 15,
    color: colors.text,
  },
  storeSectionMeta: {
    marginLeft: 'auto',
    ...typography.tiny,
    color: colors.muted,
  },
  loyaltyCard: {
    padding: 0,
    overflow: 'hidden',
  },
  loyaltyCardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
  },
  cardLogo: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loyaltyCardText: {
    flex: 1,
    gap: 2,
  },
  loyaltyCardLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
  },
  loyaltyCardNumber: {
    fontSize: 11,
    color: colors.muted,
    letterSpacing: 0.4,
  },
  loyaltyCardBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  couponCountBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 6,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  couponCountText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.primaryDark,
  },
  cardBody: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  cardNote: {
    fontSize: 11,
    color: colors.textSoft,
    fontStyle: 'italic',
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  cardActionButton: {
    flex: 1,
  },
  couponHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  couponHeaderTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.text,
  },
  couponHeaderHint: {
    fontSize: 9,
    color: colors.muted,
  },
  couponEmpty: {
    fontSize: 11,
    color: colors.muted,
    paddingVertical: 4,
  },
  couponRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  couponTextWrap: {
    flex: 1,
    gap: 1,
  },
  couponTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  couponDescription: {
    fontSize: 11,
    lineHeight: 15,
    color: colors.textSoft,
  },
  couponValid: {
    fontSize: 10,
    color: colors.muted,
  },
  couponRight: {
    alignItems: 'flex-end',
    gap: 6,
  },
  couponStatus: {
    borderRadius: radius.full,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  couponStatusText: {
    fontSize: 9,
    fontWeight: '800',
  },
  addCouponButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 8,
  },
  addCouponText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  inlineForm: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  input: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.text,
  },
  formButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  formButton: {
    flex: 1,
  },
  addCardLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
  },
  addCardLinkText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  formCard: {
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  formTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: 2,
  },
  fieldLabel: {
    ...typography.tiny,
    color: colors.muted,
    marginTop: 2,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  addCardButton: {
    marginTop: spacing.lg,
  },
});
