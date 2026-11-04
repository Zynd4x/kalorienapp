import React, { useMemo, useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { goBack } from '../lib/navigation';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Badge,
  Button,
  Card,
  Chip,
  Divider,
  EmptyState,
  FoodAvatar,
  Screen,
  ScreenHeader,
  SectionHeader,
} from '../components/ui';
import { useApp } from '../context/AppContext';
import { colors, radius, spacing, typography } from '../theme';
import { formatDateShort, mealForNow, todayKey } from '../lib/date';
import { formatNumber, scaleMacros } from '../lib/nutrition';
import { successFeedback } from '../lib/haptics';
import type { Food, Meal } from '../types';

const MEALS: { key: Meal; label: string; icon: React.ComponentProps<typeof Ionicons>['name'] }[] = [
  { key: 'breakfast', label: 'Frühstück', icon: 'sunny-outline' },
  { key: 'lunch', label: 'Mittag', icon: 'restaurant-outline' },
  { key: 'dinner', label: 'Abend', icon: 'moon-outline' },
  { key: 'snack', label: 'Snack', icon: 'cafe-outline' },
];

export function FoodDetailScreen() {
  const router = useRouter();
  const { selection } = useApp();

  if (!selection) {
    return (
      <Screen>
        <ScreenHeader
          title="Lebensmittel"
          onBack={() => goBack()}
        />
        <EmptyState
          icon="nutrition-outline"
          title="Kein Lebensmittel ausgewählt"
          message="Scanne einen Barcode oder suche ein Lebensmittel, um die Nährwerte zu sehen."
          actionLabel="Zur Suche"
          onAction={() => router.replace('/scan')}
        />
      </Screen>
    );
  }

  return (
    <FoodDetailContent
      food={selection.food}
      scanned={selection.scanned}
      onBack={() => goBack()}
      onAdded={() => router.dismissTo('/')}
    />
  );
}

function FoodDetailContent({
  food,
  scanned,
  onBack,
  onAdded,
}: {
  food: Food;
  scanned: boolean;
  onBack: () => void;
  onAdded: () => void;
}) {
  const { addEntry, diaryDate } = useApp();
  const [gramsText, setGramsText] = useState(
    String(food.servingSize ?? 100),
  );
  const [meal, setMeal] = useState<Meal>(mealForNow());

  const parsed = Number(gramsText.replace(',', '.'));
  const grams = Number.isFinite(parsed)
    ? Math.min(5000, Math.max(0, parsed))
    : 0;
  const scaled = useMemo(() => scaleMacros(food.per100, grams), [food, grams]);

  const quickAmounts = useMemo(() => {
    const values = [50, 100, 200];
    if (food.servingSize && !values.includes(Math.round(food.servingSize))) {
      values.splice(1, 0, Math.round(food.servingSize));
    }
    return Array.from(new Set(values)).slice(0, 4);
  }, [food.servingSize]);

  const handleAdd = () => {
    if (grams <= 0) return;
    addEntry({ date: diaryDate, meal, food, grams });
    successFeedback();
    onAdded();
  };

  return (
    <Screen
      footer={
        <SafeAreaView edges={['bottom']} style={styles.footer}>
          <Button
            label={`Zu ${mealLabel(meal)} · ${scaled.kcal} kcal`}
            icon="add-circle-outline"
            onPress={handleAdd}
            disabled={grams <= 0}
            fullWidth
          />
        </SafeAreaView>
      }
    >
      <ScreenHeader
        title="Lebensmittel"
        subtitle={`${
          scanned ? 'Per Barcode erkannt' : 'Nährwerte prüfen und hinzufügen'
        }${diaryDate !== todayKey() ? ` · für ${formatDateShort(diaryDate)}` : ''}`}
        onBack={onBack}
      />

      <Card style={styles.foodCard}>
        <FoodAvatar name={food.name} imageUrl={food.imageUrl} size={72} />
        <View style={styles.foodInfo}>
          <Text style={styles.foodName}>{food.name}</Text>
          {food.brand ? (
            <Text style={styles.foodBrand} numberOfLines={1}>
              {food.brand}
            </Text>
          ) : null}
          <View style={styles.badgeRow}>
            <Badge
              label={food.source === 'off' ? 'OPEN FOOD FACTS' : 'LOKAL'}
              color={colors.primaryDark}
              background={colors.primaryLight}
            />
            {food.barcode ? (
              <Badge
                label={food.barcode}
                color={colors.muted}
                background={colors.surfaceAlt}
              />
            ) : null}
          </View>
        </View>
      </Card>

      <SectionHeader title="Deine Portion" />
      <Card style={styles.portionCard}>
        <View style={styles.amountRow}>
          <TextInput
            value={gramsText}
            onChangeText={(value) =>
              setGramsText(value.replace(/[^0-9.,]/g, '').slice(0, 6))
            }
            keyboardType="decimal-pad"
            selectTextOnFocus
            style={styles.amountInput}
            placeholder="100"
            placeholderTextColor={colors.border}
          />
          <Text style={styles.amountUnit}>g</Text>
          <View style={styles.kcalBadge}>
            <Text style={styles.kcalBadgeValue}>{scaled.kcal}</Text>
            <Text style={styles.kcalBadgeLabel}>kcal</Text>
          </View>
        </View>

        <View style={styles.quickAmounts}>
          {quickAmounts.map((amount) => (
            <Chip
              key={amount}
              label={
                food.servingSize && Math.round(food.servingSize) === amount
                  ? `${amount} g · Portion`
                  : `${amount} g`
              }
              selected={grams === amount}
              onPress={() => setGramsText(String(amount))}
            />
          ))}
        </View>

        {food.servingLabel ? (
          <Text style={styles.servingHint}>
            Portionsangabe: {food.servingLabel}
          </Text>
        ) : null}

        <Divider />

        <View style={styles.macroGrid}>
          <MacroCell
            label="Protein"
            value={scaled.protein}
            color={colors.protein}
          />
          <MacroCell
            label="Kohlenhydrate"
            value={scaled.carbs}
            color={colors.carbs}
          />
          <MacroCell label="Fett" value={scaled.fat} color={colors.fat} />
        </View>
      </Card>

      <SectionHeader title="Mahlzeit" />
      <View style={styles.mealRow}>
        {MEALS.map((option) => (
          <Chip
            key={option.key}
            label={option.label}
            icon={option.icon}
            selected={meal === option.key}
            onPress={() => setMeal(option.key)}
          />
        ))}
      </View>

      <SectionHeader title="Nährwerte pro 100 g" />
      <Card style={styles.nutritionCard}>
        <View style={styles.nutritionTop}>
          <View style={styles.nutritionMain}>
            <Text style={styles.nutritionMainValue}>{food.per100.kcal}</Text>
            <Text style={styles.nutritionMainLabel}>Kalorien</Text>
          </View>
          <View style={styles.nutritionStats}>
            <NutritionStat
              label="Protein"
              value={food.per100.protein}
              color={colors.protein}
            />
            <NutritionStat
              label="Kohlenhydrate"
              value={food.per100.carbs}
              color={colors.carbs}
            />
            <NutritionStat
              label="Fett"
              value={food.per100.fat}
              color={colors.fat}
            />
          </View>
        </View>
        <Divider />
        <NutritionLine
          label="Ballaststoffe"
          value={food.per100.fiber}
          unit="g"
        />
        <NutritionLine
          label="davon Zucker"
          value={food.per100.sugar}
          unit="g"
        />
        <NutritionLine label="Salz" value={food.per100.salt} unit="g" digits={2} />
        <Text style={styles.dataHint}>
          {food.source === 'off'
            ? 'Quelle: Open Food Facts. Angaben können unvollständig oder abweichend sein – prüfe im Zweifel die Verpackung.'
            : 'Richtwerte für ein typisches Produkt. Die tatsächlichen Werte können je nach Marke variieren.'}
        </Text>
      </Card>
    </Screen>
  );
}

function mealLabel(meal: Meal): string {
  return MEALS.find((entry) => entry.key === meal)?.label ?? 'Mahlzeit';
}

function MacroCell({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <View style={styles.macroCell}>
      <View style={[styles.macroDot, { backgroundColor: color }]} />
      <Text style={styles.macroCellValue}>{formatNumber(value, 1)} g</Text>
      <Text style={styles.macroCellLabel}>{label}</Text>
    </View>
  );
}

function NutritionStat({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <View style={styles.nutritionStat}>
      <View style={[styles.nutritionDot, { backgroundColor: color }]} />
      <View style={styles.nutritionStatText}>
        <Text style={styles.nutritionStatValue}>{formatNumber(value, 1)} g</Text>
        <Text style={styles.nutritionStatLabel}>{label}</Text>
      </View>
    </View>
  );
}

function NutritionLine({
  label,
  value,
  unit,
  digits = 1,
}: {
  label: string;
  value?: number;
  unit: string;
  digits?: number;
}) {
  return (
    <View style={styles.nutritionLine}>
      <Text style={styles.nutritionLineLabel}>{label}</Text>
      <Text style={styles.nutritionLineValue}>
        {value === undefined ? '–' : `${formatNumber(value, digits)} ${unit}`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  foodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  foodInfo: {
    flex: 1,
    gap: 3,
  },
  foodName: {
    ...typography.h2,
    color: colors.text,
  },
  foodBrand: {
    ...typography.small,
    color: colors.muted,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  portionCard: {
    gap: spacing.md,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  amountInput: {
    flex: 1,
    height: 62,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    fontSize: 30,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.5,
  },
  amountUnit: {
    ...typography.h2,
    color: colors.muted,
    marginRight: 'auto',
  },
  kcalBadge: {
    minWidth: 80,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 9,
    alignItems: 'center',
  },
  kcalBadgeValue: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.white,
    letterSpacing: -0.5,
  },
  kcalBadgeLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.75)',
    letterSpacing: 0.5,
  },
  quickAmounts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  servingHint: {
    fontSize: 11,
    color: colors.muted,
  },
  macroGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  macroCell: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: radius.md,
    padding: spacing.sm,
    alignItems: 'center',
    gap: 2,
  },
  macroDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginBottom: 2,
  },
  macroCellValue: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
  },
  macroCellLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: colors.muted,
    textAlign: 'center',
  },
  mealRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  nutritionCard: {
    gap: spacing.sm,
  },
  nutritionTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  nutritionMain: {
    width: 92,
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
  },
  nutritionMainValue: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.primaryDark,
    letterSpacing: -0.8,
  },
  nutritionMainLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
    marginTop: 1,
  },
  nutritionStats: {
    flex: 1,
    gap: spacing.sm,
  },
  nutritionStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  nutritionDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  nutritionStatText: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    flex: 1,
  },
  nutritionStatValue: {
    ...typography.small,
    fontWeight: '800',
    color: colors.text,
  },
  nutritionStatLabel: {
    fontSize: 11,
    color: colors.muted,
  },
  nutritionLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  nutritionLineLabel: {
    ...typography.small,
    color: colors.textSoft,
  },
  nutritionLineValue: {
    ...typography.small,
    fontWeight: '700',
    color: colors.text,
  },
  dataHint: {
    fontSize: 10,
    lineHeight: 15,
    color: colors.muted,
    marginTop: spacing.sm,
  },
});
