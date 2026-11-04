import React, { useMemo } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
  Badge,
  CalorieRing,
  Card,
  EmptyState,
  FoodAvatar,
  IconButton,
  MacroBar,
  Screen,
  SectionHeader,
  type IconName,
} from '../components/ui';
import { useApp } from '../context/AppContext';
import { colors, radius, spacing, typography } from '../theme';
import {
  formatDateLong,
  greeting,
  isToday,
  shiftDate,
  todayKey,
} from '../lib/date';
import { formatNumber, scaleMacros } from '../lib/nutrition';
import type { Meal } from '../types';
import { successFeedback } from '../lib/haptics';

const MEALS: {
  key: Meal;
  label: string;
  icon: IconName;
  color: string;
  light: string;
}[] = [
  {
    key: 'breakfast',
    label: 'Frühstück',
    icon: 'sunny-outline',
    color: '#C98A1B',
    light: '#FDF3DF',
  },
  {
    key: 'lunch',
    label: 'Mittagessen',
    icon: 'restaurant-outline',
    color: colors.primary,
    light: colors.primaryLight,
  },
  {
    key: 'dinner',
    label: 'Abendessen',
    icon: 'moon-outline',
    color: '#5B6FB0',
    light: '#ECEEF9',
  },
  {
    key: 'snack',
    label: 'Snacks',
    icon: 'cafe-outline',
    color: colors.fat,
    light: '#F7EDF8',
  },
];

export function HomeScreen() {
  const router = useRouter();
  const {
    goals,
    diaryDate: date,
    setDiaryDate: setDate,
    entriesForDate,
    totalsForDate,
    water,
    addWater,
    removeEntry,
  } = useApp();

  const entries = entriesForDate(date);
  const totals = totalsForDate(date);
  const glasses = water[date] ?? 0;
  const atToday = date >= todayKey();

  const mealTotals = useMemo(() => {
    return MEALS.reduce<Record<Meal, number>>(
      (result, meal) => {
        result[meal.key] = entries
          .filter((entry) => entry.meal === meal.key)
          .reduce(
            (sum, entry) =>
              sum + scaleMacros(entry.food.per100, entry.grams).kcal,
            0,
          );
        return result;
      },
      { breakfast: 0, lunch: 0, dinner: 0, snack: 0 },
    );
  }, [entries]);

  const goScan = () => router.push('/scan');

  const confirmDelete = (id: string, name: string, grams: number) => {
    Alert.alert(
      'Eintrag löschen?',
      `${name} · ${formatNumber(grams)} g`,
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Löschen',
          style: 'destructive',
          onPress: () => {
            removeEntry(id);
            successFeedback();
          },
        },
      ],
    );
  };

  return (
    <Screen>
      <View style={styles.topBar}>
        <View style={styles.topBarText}>
          <Text style={styles.brand}>KALORIENKOMPASS</Text>
          <Text style={styles.greeting}>{greeting()}</Text>
          <Text style={styles.greetingSub}>Dein Tag auf einen Blick.</Text>
        </View>
        <IconButton
          icon="settings-outline"
          accessibilityLabel="Einstellungen"
          onPress={() => router.push('/goals')}
        />
      </View>

      <View style={styles.dateBar}>
        <IconButton
          icon="chevron-back"
          size={36}
          onPress={() => setDate(shiftDate(date, -1))}
          accessibilityLabel="Vorheriger Tag"
        />
        <Pressable style={styles.datePill} onPress={() => setDate(todayKey())}>
          <Ionicons
            name="calendar-clear-outline"
            size={16}
            color={colors.primary}
          />
          <Text style={styles.dateText}>
            {isToday(date) ? 'Heute' : formatDateLong(date)}
          </Text>
          {isToday(date) ? (
            <Badge label="HEUTE" color={colors.primaryDark} />
          ) : null}
        </Pressable>
        <IconButton
          icon="chevron-forward"
          size={36}
          onPress={() => {
            if (!atToday) setDate(shiftDate(date, 1));
          }}
          style={atToday ? styles.disabled : undefined}
          accessibilityLabel="Nächster Tag"
        />
      </View>

      <LinearGradient
        colors={[colors.primaryDark, colors.primary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <View style={styles.heroOrb} />
        <View style={styles.heroContent}>
          <Text style={styles.heroEyebrow}>TAGESBILANZ</Text>
          <Text style={styles.heroKcal}>
            {formatNumber(totals.kcal)}
            <Text style={styles.heroKcalUnit}> kcal</Text>
          </Text>
          <Text style={styles.heroSub}>
            von {formatNumber(goals.kcal)} kcal gegessen
          </Text>
          <View style={styles.heroPill}>
            <Ionicons name="restaurant-outline" size={13} color={colors.white} />
            <Text style={styles.heroPillText}>
              {entries.length === 1
                ? '1 Eintrag'
                : `${entries.length} Einträge`}
            </Text>
          </View>
        </View>
        <CalorieRing
          consumed={totals.kcal}
          goal={goals.kcal}
          size={124}
          color={totals.kcal > goals.kcal ? colors.accent : colors.white}
        />
      </LinearGradient>

      <View style={styles.quickRow}>
        <QuickAction
          icon="scan-outline"
          label="Scannen"
          color={colors.primary}
          light={colors.primaryLight}
          onPress={goScan}
        />
        <QuickAction
          icon="search-outline"
          label="Suche"
          color={colors.protein}
          light="#E9F1FA"
          onPress={goScan}
        />
        <QuickAction
          icon="book-outline"
          label="Rezepte"
          color={colors.accent}
          light={colors.accentLight}
          onPress={() => router.push('/recipes')}
        />
      </View>

      {entries.length === 0 ? (
        <Card style={styles.startCard}>
          <EmptyState
            icon="leaf-outline"
            title="Noch nichts gegessen"
            message="Scanne einen Barcode oder suche ein Lebensmittel, um deine Tagesbilanz zu starten."
            actionLabel="Lebensmittel hinzufügen"
            onAction={goScan}
          />
        </Card>
      ) : null}

      <Card style={styles.macroCard}>
        <View style={styles.cardTitleRow}>
          <Text style={styles.cardTitle}>Makros</Text>
          <Text style={styles.cardHint}>
            {Math.round(
              (totals.kcal / Math.max(goals.kcal, 1)) * 100,
            )}
            % des Ziels
          </Text>
        </View>
        <MacroBar
          label="Protein"
          current={totals.protein}
          goal={goals.protein}
          color={colors.protein}
        />
        <MacroBar
          label="Kohlenhydrate"
          current={totals.carbs}
          goal={goals.carbs}
          color={colors.carbs}
        />
        <MacroBar
          label="Fett"
          current={totals.fat}
          goal={goals.fat}
          color={colors.fat}
        />
      </Card>

      <Card style={styles.waterCard}>
        <View style={styles.waterTop}>
          <View style={styles.waterTitleRow}>
            <View style={styles.waterIcon}>
              <Ionicons name="water" size={20} color={colors.water} />
            </View>
            <View>
              <Text style={styles.cardTitle}>Wasser</Text>
              <Text style={styles.cardHint}>
                {(glasses * 0.25).toFixed(2).replace('.', ',')} l von 2 l
              </Text>
            </View>
          </View>
          <View style={styles.waterControls}>
            <IconButton
              icon="remove"
              size={34}
              onPress={() => addWater(date, -1)}
              accessibilityLabel="Weniger Wasser"
            />
            <Text style={styles.waterCount}>{glasses}</Text>
            <IconButton
              icon="add"
              size={34}
              onPress={() => {
                addWater(date, 1);
                successFeedback();
              }}
              accessibilityLabel="Mehr Wasser"
            />
          </View>
        </View>
        <View style={styles.glassesRow}>
          {Array.from({ length: 8 }).map((_, index) => (
            <Pressable
              key={index}
              onPress={() => {
                addWater(date, index + 1 - glasses);
                successFeedback();
              }}
              hitSlop={4}
            >
              <Ionicons
                name={index < glasses ? 'water' : 'water-outline'}
                size={25}
                color={index < glasses ? colors.water : colors.border}
              />
            </Pressable>
          ))}
        </View>
      </Card>

      <SectionHeader title="Mahlzeiten" actionLabel="Hinzufügen" onAction={goScan} />
      <Card style={styles.mealsCard}>
        {MEALS.map((meal, index) => {
          const items = entries.filter((entry) => entry.meal === meal.key);
          return (
            <View
              key={meal.key}
              style={[styles.mealSection, index > 0 && styles.mealDivider]}
            >
              <View style={styles.mealHeader}>
                <View
                  style={[styles.mealIcon, { backgroundColor: meal.light }]}
                >
                  <Ionicons name={meal.icon} size={18} color={meal.color} />
                </View>
                <View style={styles.mealTitleWrap}>
                  <Text style={styles.mealTitle}>{meal.label}</Text>
                  <Text style={styles.mealHint}>
                    {items.length === 0
                      ? 'Noch nichts eingetragen'
                      : `${items.length} ${
                          items.length === 1 ? 'Eintrag' : 'Einträge'
                        }`}
                  </Text>
                </View>
                <Text style={styles.mealKcal}>
                  {formatNumber(mealTotals[meal.key])} kcal
                </Text>
                <IconButton
                  icon="add"
                  size={30}
                  background={colors.surfaceAlt}
                  color={colors.primary}
                  onPress={goScan}
                  accessibilityLabel={`${meal.label} hinzufügen`}
                />
              </View>

              {items.map((entry) => {
                const scaled = scaleMacros(entry.food.per100, entry.grams);
                return (
                  <View key={entry.id} style={styles.entryRow}>
                    <FoodAvatar
                      name={entry.food.name}
                      imageUrl={entry.food.imageUrl}
                      size={38}
                    />
                    <View style={styles.entryText}>
                      <Text style={styles.entryName} numberOfLines={1}>
                        {entry.food.name}
                      </Text>
                      <Text style={styles.entryMeta}>
                        {formatNumber(entry.grams)} g · {scaled.kcal} kcal ·{' '}
                        {Math.round(scaled.protein)} g P
                      </Text>
                    </View>
                    <Pressable
                      hitSlop={8}
                      onPress={() =>
                        confirmDelete(
                          entry.id,
                          entry.food.name,
                          entry.grams,
                        )
                      }
                      style={({ pressed }) => pressed && styles.pressed}
                    >
                      <Ionicons
                        name="trash-outline"
                        size={18}
                        color={colors.muted}
                      />
                    </Pressable>
                  </View>
                );
              })}
            </View>
          );
        })}
      </Card>

      <View style={styles.footerHint}>
        <Ionicons
          name="information-circle-outline"
          size={15}
          color={colors.muted}
        />
        <Text style={styles.footerHintText}>
          Nährwerte sind Richtwerte. Alle Daten bleiben lokal auf deinem Gerät.
        </Text>
      </View>
    </Screen>
  );
}

function QuickAction({
  icon,
  label,
  color,
  light,
  onPress,
}: {
  icon: IconName;
  label: string;
  color: string;
  light: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.quickAction, pressed && styles.pressed]}
    >
      <View style={[styles.quickIcon, { backgroundColor: light }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={styles.quickLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingTop: spacing.md,
    gap: spacing.md,
  },
  topBarText: {
    flex: 1,
  },
  brand: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.6,
    color: colors.primary,
    marginBottom: 4,
  },
  greeting: {
    ...typography.h1,
    color: colors.text,
  },
  greetingSub: {
    ...typography.small,
    color: colors.muted,
    marginTop: 2,
  },
  dateBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  datePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.full,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  dateText: {
    ...typography.small,
    color: colors.text,
    fontWeight: '700',
  },
  disabled: {
    opacity: 0.35,
  },
  hero: {
    borderRadius: radius.xl,
    padding: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    minHeight: 176,
    gap: spacing.sm,
    ...{
      shadowColor: colors.primaryDark,
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.22,
      shadowRadius: 18,
      elevation: 6,
    },
  },
  heroOrb: {
    position: 'absolute',
    width: 210,
    height: 210,
    borderRadius: 105,
    backgroundColor: 'rgba(255,255,255,0.07)',
    top: -90,
    right: -40,
  },
  heroContent: {
    flex: 1,
  },
  heroEyebrow: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.4,
    color: 'rgba(255,255,255,0.72)',
  },
  heroKcal: {
    fontSize: 36,
    fontWeight: '800',
    color: colors.white,
    letterSpacing: -1.2,
    marginTop: 4,
  },
  heroKcalUnit: {
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: 0,
  },
  heroSub: {
    ...typography.small,
    color: 'rgba(255,255,255,0.82)',
    marginTop: 1,
  },
  heroPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginTop: spacing.md,
  },
  heroPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.white,
  },
  quickRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  quickAction: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    alignItems: 'center',
    gap: 6,
  },
  quickIcon: {
    width: 38,
    height: 38,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSoft,
  },
  startCard: {
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
  },
  macroCard: {
    marginTop: spacing.md,
    gap: spacing.lg,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTitle: {
    ...typography.h3,
    color: colors.text,
  },
  cardHint: {
    ...typography.small,
    color: colors.muted,
  },
  waterCard: {
    marginTop: spacing.md,
    gap: spacing.md,
  },
  waterTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  waterTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  waterIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: '#E8F4F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  waterControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  waterCount: {
    ...typography.h3,
    color: colors.text,
    minWidth: 20,
    textAlign: 'center',
  },
  glassesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mealsCard: {
    padding: 0,
    overflow: 'hidden',
  },
  mealSection: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  mealDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  mealHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  mealIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mealTitleWrap: {
    flex: 1,
  },
  mealTitle: {
    ...typography.body,
    color: colors.text,
    fontWeight: '700',
  },
  mealHint: {
    fontSize: 11,
    color: colors.muted,
    marginTop: 1,
  },
  mealKcal: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSoft,
  },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingLeft: 44,
  },
  entryText: {
    flex: 1,
  },
  entryName: {
    ...typography.small,
    color: colors.text,
    fontWeight: '700',
  },
  entryMeta: {
    fontSize: 11,
    color: colors.muted,
    marginTop: 2,
  },
  footerHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    justifyContent: 'center',
    marginTop: spacing.xl,
    paddingHorizontal: spacing.md,
  },
  footerHintText: {
    fontSize: 11,
    color: colors.muted,
    flex: 1,
  },
  pressed: {
    opacity: 0.7,
  },
});
