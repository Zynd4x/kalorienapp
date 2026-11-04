import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  CameraView,
  useCameraPermissions,
  type BarcodeScanningResult,
} from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import {
  Button,
  Card,
  FoodAvatar,
  IconButton,
  Screen,
  ScreenHeader,
  SectionHeader,
} from '../components/ui';
import { fetchProductByBarcode, searchOpenFoodFacts } from '../api/openFoodFacts';
import { localFoods, searchLocalFoods } from '../data/foods';
import { useApp } from '../context/AppContext';
import { colors, radius, spacing, typography } from '../theme';
import type { Food } from '../types';
import { successFeedback, tapFeedback } from '../lib/haptics';
import { formatNumber } from '../lib/nutrition';

type Mode = 'scan' | 'search';

const POPULAR_IDS = [
  'local-banane',
  'local-haferflocken',
  'local-ei',
  'local-haehnchen',
  'local-joghurt',
  'local-reis',
];

export function ScanScreen() {
  const router = useRouter();
  const { selectFood } = useApp();
  const [permission, requestPermission] = useCameraPermissions();
  const [mode, setMode] = useState<Mode>('scan');
  const [torch, setTorch] = useState(false);
  const [locked, setLocked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manual, setManual] = useState('');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Food[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchInfo, setSearchInfo] = useState<string | null>(null);
  const requestId = useRef(0);

  useFocusEffect(
    useCallback(() => {
      setLocked(false);
      setError(null);
      setLoading(false);
      setTorch(false);
    }, []),
  );

  const lookupBarcode = useCallback(
    async (code: string) => {
      const clean = code.replace(/\D/g, '');
      if (clean.length < 8) {
        setError('Bitte einen gültigen Barcode mit mindestens 8 Ziffern eingeben.');
        setLocked(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const food = await fetchProductByBarcode(clean);
        if (!food) {
          setError(
            `Kein Produkt mit dem Barcode ${clean} gefunden. Du kannst es in der Suche versuchen oder den Barcode erneut scannen.`,
          );
          setLocked(false);
          return;
        }
        successFeedback();
        setManual('');
        selectFood(food, true);
        router.push('/food-detail');
      } catch (lookupError) {
        setError(
          lookupError instanceof Error
            ? lookupError.message
            : 'Das Produkt konnte nicht geladen werden. Bitte prüfe deine Internetverbindung.',
        );
        setLocked(false);
      } finally {
        setLoading(false);
      }
    },
    [router, selectFood],
  );

  const handleBarcode = useCallback(
    (result: BarcodeScanningResult) => {
      if (locked || loading) return;
      setLocked(true);
      tapFeedback();
      void lookupBarcode(result.data);
    },
    [locked, loading, lookupBarcode],
  );

  useEffect(() => {
    const term = query.trim();
    const id = requestId.current + 1;
    requestId.current = id;

    if (term.length < 2) {
      setResults([]);
      setSearchInfo(null);
      setSearching(false);
      return;
    }

    const local = searchLocalFoods(term);
    setResults(local);
    setSearching(true);
    setSearchInfo(null);

    const timer = setTimeout(() => {
      searchOpenFoodFacts(term)
        .then((remote) => {
          if (requestId.current !== id) return;
          const merged = [...local];
          for (const food of remote) {
            const duplicate = merged.some(
              (entry) =>
                (food.barcode && entry.barcode === food.barcode) ||
                entry.name.toLowerCase() === food.name.toLowerCase(),
            );
            if (!duplicate) merged.push(food);
          }
          setResults(merged.slice(0, 40));
          setSearchInfo(
            merged.length === 0
              ? 'Keine Treffer gefunden. Versuche einen anderen Begriff.'
              : null,
          );
        })
        .catch(() => {
          if (requestId.current !== id) return;
          setResults(local);
          setSearchInfo(
            local.length > 0
              ? 'Open Food Facts ist gerade nicht erreichbar – lokale Vorschläge werden angezeigt.'
              : 'Open Food Facts ist gerade nicht erreichbar. Bitte prüfe deine Internetverbindung.',
          );
        })
        .finally(() => {
          if (requestId.current === id) setSearching(false);
        });
    }, 450);

    return () => clearTimeout(timer);
  }, [query]);

  const openFood = (food: Food) => {
    tapFeedback();
    selectFood(food, false);
    router.push('/food-detail');
  };

  const submitManual = () => {
    if (!manual.trim() || loading) return;
    Keyboard.dismiss();
    setLocked(true);
    void lookupBarcode(manual);
  };

  const permissionBlock = () => {
    if (!permission) {
      return (
        <Card style={styles.permissionCard}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.permissionText}>Kamera wird vorbereitet …</Text>
        </Card>
      );
    }

    if (permission.granted) return null;

    return (
      <Card style={styles.permissionCard}>
        <View style={styles.permissionIcon}>
          <Ionicons name="camera-outline" size={28} color={colors.primary} />
        </View>
        <Text style={styles.permissionTitle}>Kamera-Zugriff benötigt</Text>
        <Text style={styles.permissionText}>
          Zum Scannen von Barcodes braucht die App Zugriff auf deine Kamera.
          Die Bilder werden nicht gespeichert oder hochgeladen.
        </Text>
        <Button
          label={
            permission.canAskAgain
              ? 'Kamera erlauben'
              : 'Einstellungen öffnen'
          }
          icon="camera-outline"
          onPress={() => {
            if (permission.canAskAgain) {
              void requestPermission();
            } else {
              Linking.openSettings().catch(() => undefined);
            }
          }}
          fullWidth
          style={styles.permissionButton}
        />
      </Card>
    );
  };

  return (
    <Screen>
      <ScreenHeader
        title="Hinzufügen"
        subtitle="Barcode scannen oder Lebensmittel suchen"
      />

      <View style={styles.segment}>
        <Pressable
          onPress={() => setMode('scan')}
          style={[styles.segmentItem, mode === 'scan' && styles.segmentActive]}
        >
          <Ionicons
            name="scan-outline"
            size={17}
            color={mode === 'scan' ? colors.primary : colors.muted}
          />
          <Text
            style={[
              styles.segmentLabel,
              mode === 'scan' && styles.segmentLabelActive,
            ]}
          >
            Barcode
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setMode('search')}
          style={[styles.segmentItem, mode === 'search' && styles.segmentActive]}
        >
          <Ionicons
            name="search-outline"
            size={17}
            color={mode === 'search' ? colors.primary : colors.muted}
          />
          <Text
            style={[
              styles.segmentLabel,
              mode === 'search' && styles.segmentLabelActive,
            ]}
          >
            Suche
          </Text>
        </Pressable>
      </View>

      {mode === 'scan' ? (
        <>
          {permission?.granted ? (
            <View style={styles.cameraWrap}>
              <CameraView
                style={StyleSheet.absoluteFill}
                facing="back"
                enableTorch={torch}
                onBarcodeScanned={
                  locked || loading ? undefined : handleBarcode
                }
                barcodeScannerSettings={{
                  barcodeTypes: [
                    'ean13',
                    'ean8',
                    'upc_a',
                    'upc_e',
                    'code128',
                    'code39',
                    'itf14',
                  ],
                }}
              />
              <View style={styles.cameraOverlay} pointerEvents="box-none">
                <View style={styles.scanFrame}>
                  <View style={[styles.corner, styles.cornerTopLeft]} />
                  <View style={[styles.corner, styles.cornerTopRight]} />
                  <View style={[styles.corner, styles.cornerBottomLeft]} />
                  <View style={[styles.corner, styles.cornerBottomRight]} />
                </View>
                <View style={styles.scanHint}>
                  <Ionicons name="barcode-outline" size={16} color={colors.white} />
                  <Text style={styles.scanHintText}>
                    Barcode in den Rahmen halten
                  </Text>
                </View>
                <Pressable
                  onPress={() => setTorch((current) => !current)}
                  style={styles.torchButton}
                >
                  <Ionicons
                    name={torch ? 'flash' : 'flash-outline'}
                    size={20}
                    color={colors.white}
                  />
                </Pressable>
                {loading ? (
                  <View style={styles.loadingOverlay}>
                    <ActivityIndicator size="large" color={colors.white} />
                    <Text style={styles.loadingText}>Produkt wird geladen …</Text>
                  </View>
                ) : null}
              </View>
            </View>
          ) : (
            permissionBlock()
          )}

          {error ? (
            <Card style={styles.errorCard}>
              <View style={styles.errorTop}>
                <Ionicons
                  name="alert-circle-outline"
                  size={20}
                  color={colors.danger}
                />
                <Text style={styles.errorTitle}>Nicht gefunden</Text>
              </View>
              <Text style={styles.errorText}>{error}</Text>
              <Pressable
                onPress={() => {
                  setError(null);
                  setLocked(false);
                }}
                style={styles.retryButton}
              >
                <Ionicons name="refresh" size={15} color={colors.primary} />
                <Text style={styles.retryText}>Erneut versuchen</Text>
              </Pressable>
            </Card>
          ) : null}

          <Card style={styles.manualCard}>
            <View style={styles.manualTitleRow}>
              <View style={styles.manualIcon}>
                <Ionicons name="keypad-outline" size={18} color={colors.primary} />
              </View>
              <View style={styles.manualTitleText}>
                <Text style={styles.manualTitle}>Barcode eingeben</Text>
                <Text style={styles.manualHint}>
                  Falls die Kamera nicht verfügbar ist
                </Text>
              </View>
            </View>
            <View style={styles.manualRow}>
              <TextInput
                value={manual}
                onChangeText={(value) =>
                  setManual(value.replace(/[^0-9]/g, '').slice(0, 14))
                }
                placeholder="z. B. 4008400404127"
                placeholderTextColor={colors.muted}
                keyboardType="number-pad"
                returnKeyType="search"
                onSubmitEditing={submitManual}
                style={styles.manualInput}
                maxLength={14}
              />
              <Pressable
                onPress={submitManual}
                disabled={loading || manual.length < 8}
                style={({ pressed }) => [
                  styles.manualButton,
                  (loading || manual.length < 8) && styles.manualButtonDisabled,
                  pressed && styles.pressed,
                ]}
              >
                {loading ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <Ionicons name="arrow-forward" size={20} color={colors.white} />
                )}
              </Pressable>
            </View>
          </Card>

          <Card style={styles.tipCard}>
            <Ionicons name="bulb-outline" size={20} color={colors.accent} />
            <Text style={styles.tipText}>
              Tipp: Scanne den Strichcode auf der Verpackung. Für ein optimales
              Ergebnis solltest du die App auf einem echten Android-Gerät in
              Expo Go testen.
            </Text>
          </Card>
        </>
      ) : (
        <>
          <View style={styles.searchBox}>
            <Ionicons name="search-outline" size={20} color={colors.muted} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Lebensmittel suchen, z. B. Haferflocken"
              placeholderTextColor={colors.muted}
              style={styles.searchInput}
              returnKeyType="search"
              autoCorrect={false}
            />
            {query.length > 0 ? (
              <Pressable onPress={() => setQuery('')} hitSlop={8}>
                <Ionicons name="close-circle" size={19} color={colors.muted} />
              </Pressable>
            ) : null}
          </View>

          {searchInfo ? (
            <Card style={styles.infoCard}>
              <Ionicons
                name="information-circle-outline"
                size={19}
                color={colors.primary}
              />
              <Text style={styles.infoText}>{searchInfo}</Text>
            </Card>
          ) : null}

          {query.trim().length < 2 ? (
            <>
              <SectionHeader title="Beliebte Lebensmittel" />
              <Card style={styles.resultsCard}>
                {localFoods
                  .filter((food) => POPULAR_IDS.includes(food.id))
                  .map((food, index) => (
                    <FoodResultRow
                      key={food.id}
                      food={food}
                      onPress={() => openFood(food)}
                      divider={index > 0}
                    />
                  ))}
              </Card>
              <Text style={styles.attribution}>
                Produktdaten: Open Food Facts · ODbL-Lizenz
              </Text>
            </>
          ) : (
            <>
              <View style={styles.resultsHeader}>
                <Text style={styles.resultsTitle}>
                  {results.length} Treffer
                </Text>
                {searching ? (
                  <View style={styles.searchingBadge}>
                    <ActivityIndicator size="small" color={colors.primary} />
                    <Text style={styles.searchingText}>Suche …</Text>
                  </View>
                ) : null}
              </View>
              {results.length > 0 ? (
                <Card style={styles.resultsCard}>
                  {results.map((food, index) => (
                    <FoodResultRow
                      key={food.id}
                      food={food}
                      onPress={() => openFood(food)}
                      divider={index > 0}
                    />
                  ))}
                </Card>
              ) : !searching ? (
                <Card style={styles.noResultsCard}>
                  <Ionicons
                    name="search-outline"
                    size={28}
                    color={colors.muted}
                  />
                  <Text style={styles.noResultsTitle}>Nichts gefunden</Text>
                  <Text style={styles.noResultsText}>
                    Prüfe die Schreibweise oder versuche einen allgemeineren
                    Begriff. Alternativ kannst du den Barcode scannen.
                  </Text>
                </Card>
              ) : null}
              <Text style={styles.attribution}>
                Produktdaten: Open Food Facts · ODbL-Lizenz
              </Text>
            </>
          )}
        </>
      )}
    </Screen>
  );
}

function FoodResultRow({
  food,
  onPress,
  divider,
}: {
  food: Food;
  onPress: () => void;
  divider: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.resultRow,
        divider && styles.resultDivider,
        pressed && styles.pressed,
      ]}
    >
      <FoodAvatar name={food.name} imageUrl={food.imageUrl} size={44} />
      <View style={styles.resultText}>
        <Text style={styles.resultName} numberOfLines={1}>
          {food.name}
        </Text>
        <Text style={styles.resultMeta} numberOfLines={1}>
          {food.brand ? `${food.brand} · ` : ''}
          {formatNumber(food.per100.kcal)} kcal / 100 g
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.border} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  segment: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    padding: 4,
    marginBottom: spacing.md,
  },
  segmentItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: radius.sm,
  },
  segmentActive: {
    backgroundColor: colors.surface,
    ...{
      shadowColor: colors.black,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 5,
      elevation: 2,
    },
  },
  segmentLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.muted,
  },
  segmentLabelActive: {
    color: colors.primary,
  },
  cameraWrap: {
    height: 330,
    borderRadius: radius.xl,
    overflow: 'hidden',
    backgroundColor: colors.black,
  },
  cameraOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanFrame: {
    width: '74%',
    height: 150,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.08)',
  },
  corner: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderColor: colors.white,
  },
  cornerTopLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderTopLeftRadius: 18,
  },
  cornerTopRight: {
    top: 0,
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderTopRightRadius: 18,
  },
  cornerBottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderBottomLeftRadius: 18,
  },
  cornerBottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderBottomRightRadius: 18,
  },
  scanHint: {
    position: 'absolute',
    bottom: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.full,
  },
  scanHintText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.white,
  },
  torchButton: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(0,0,0,0.62)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  loadingText: {
    ...typography.small,
    color: colors.white,
    fontWeight: '700',
  },
  permissionCard: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    gap: spacing.sm,
  },
  permissionIcon: {
    width: 62,
    height: 62,
    borderRadius: 22,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  permissionTitle: {
    ...typography.h3,
    color: colors.text,
  },
  permissionText: {
    ...typography.small,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 20,
  },
  permissionButton: {
    marginTop: spacing.md,
  },
  errorCard: {
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: '#F3D5D1',
  },
  errorTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginBottom: 4,
  },
  errorTitle: {
    ...typography.body,
    fontWeight: '700',
    color: colors.danger,
  },
  errorText: {
    ...typography.small,
    color: colors.textSoft,
    lineHeight: 20,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    marginTop: spacing.md,
  },
  retryText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  manualCard: {
    marginTop: spacing.md,
    gap: spacing.md,
  },
  manualTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  manualIcon: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  manualTitleText: {
    flex: 1,
  },
  manualTitle: {
    ...typography.body,
    fontWeight: '700',
    color: colors.text,
  },
  manualHint: {
    fontSize: 11,
    color: colors.muted,
    marginTop: 1,
  },
  manualRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  manualInput: {
    flex: 1,
    height: 48,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  manualButton: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  manualButtonDisabled: {
    opacity: 0.4,
  },
  tipCard: {
    marginTop: spacing.md,
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: colors.accentLight,
    shadowOpacity: 0,
    elevation: 0,
  },
  tipText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: '#7A5A1F',
    fontWeight: '500',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    height: 50,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: colors.text,
    height: '100%',
  },
  infoCard: {
    marginTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.primaryLight,
    shadowOpacity: 0,
    elevation: 0,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: colors.primaryDark,
    fontWeight: '500',
  },
  resultsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  resultsTitle: {
    ...typography.h3,
    color: colors.text,
  },
  searchingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  searchingText: {
    fontSize: 12,
    color: colors.muted,
    fontWeight: '600',
  },
  resultsCard: {
    padding: 0,
    overflow: 'hidden',
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 11,
  },
  resultDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  resultText: {
    flex: 1,
  },
  resultName: {
    ...typography.body,
    fontWeight: '700',
    color: colors.text,
  },
  resultMeta: {
    fontSize: 11,
    color: colors.muted,
    marginTop: 2,
  },
  noResultsCard: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    gap: spacing.sm,
  },
  noResultsTitle: {
    ...typography.h3,
    color: colors.text,
  },
  noResultsText: {
    ...typography.small,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 20,
  },
  attribution: {
    fontSize: 10,
    color: colors.muted,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
  pressed: {
    opacity: 0.7,
  },
});
