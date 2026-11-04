import React, { useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { goBack } from '../lib/navigation';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Screen,
  ScreenHeader,
  SectionHeader,
} from '../components/ui';
import { useApp } from '../context/AppContext';
import { colors, radius, spacing, typography } from '../theme';
import { scaleAmount } from '../lib/nutrition';
import { successFeedback, tapFeedback } from '../lib/haptics';
import type { Recipe } from '../types';

export function RecipeDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const { recipes } = useApp();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const recipe = recipes.find((entry) => entry.id === id);

  if (!recipe) {
    return (
      <Screen>
        <ScreenHeader title="Rezept" onBack={() => goBack('/recipes')} />
        <EmptyState
          icon="restaurant-outline"
          title="Rezept nicht gefunden"
          message="Das Rezept wurde möglicherweise gelöscht."
          actionLabel="Zu den Rezepten"
          onAction={() => router.replace('/recipes')}
        />
      </Screen>
    );
  }

  return <RecipeDetailContent recipe={recipe} />;
}

function RecipeDetailContent({ recipe }: { recipe: Recipe }) {
  const router = useRouter();
  const { addRecipeToShoppingList, deleteRecipe } = useApp();
  const [servings, setServings] = useState(recipe.servings);
  const [added, setAdded] = useState(false);

  const factor = recipe.servings > 0 ? servings / recipe.servings : 1;

  const scaledIngredients = useMemo(
    () =>
      recipe.ingredients.map((ingredient) => ({
        ...ingredient,
        scaledAmount: scaleAmount(ingredient.amount, factor),
      })),
    [recipe.ingredients, factor],
  );

  const changeServings = (delta: number) => {
    tapFeedback();
    setServings((current) => Math.min(12, Math.max(1, current + delta)));
  };

  const handleAdd = () => {
    const count = addRecipeToShoppingList(recipe, servings);
    successFeedback();
    setAdded(true);
    setTimeout(() => setAdded(false), 2200);
    Alert.alert(
      'Zur Einkaufsliste hinzugefügt',
      `${count} Zutaten für ${servings} ${
        servings === 1 ? 'Portion' : 'Portionen'
      } wurden hinzugefügt.`,
      [
        { text: 'Weiter ansehen', style: 'cancel' },
        {
          text: 'Zur Liste',
          onPress: () => router.dismissTo('/list'),
        },
      ],
    );
  };

  const confirmDelete = () => {
    Alert.alert(
      'Rezept löschen?',
      `„${recipe.name}“ wird dauerhaft aus deinen Rezepten entfernt.`,
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Löschen',
          style: 'destructive',
          onPress: () => {
            deleteRecipe(recipe.id);
            goBack('/recipes');
          },
        },
      ],
    );
  };

  return (
    <Screen
      footer={
        <SafeAreaView edges={['bottom']} style={styles.footer}>
          <Button
            label={
              added
                ? 'Zur Einkaufsliste hinzugefügt'
                : `Zutaten für ${servings} ${
                    servings === 1 ? 'Portion' : 'Portionen'
                  } hinzufügen`
            }
            icon={added ? 'checkmark' : 'cart-outline'}
            onPress={handleAdd}
            fullWidth
          />
        </SafeAreaView>
      }
    >
      <ScreenHeader
        title="Rezept"
        subtitle={`${recipe.minutes} Minuten · ${recipe.servings} Portionen`}
        onBack={() => goBack('/recipes')}
      />

      <LinearGradient
        colors={[colors.primaryDark, colors.primary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <View style={styles.heroOrb} />
        <Text style={styles.heroEmoji}>{recipe.emoji}</Text>
        <Text style={styles.heroTitle}>{recipe.name}</Text>
        <Text style={styles.heroDescription}>{recipe.description}</Text>
        <View style={styles.heroMeta}>
          <View style={styles.heroMetaItem}>
            <Ionicons name="time-outline" size={14} color={colors.white} />
            <Text style={styles.heroMetaText}>{recipe.minutes} Min.</Text>
          </View>
          <View style={styles.heroMetaItem}>
            <Ionicons name="people-outline" size={14} color={colors.white} />
            <Text style={styles.heroMetaText}>{recipe.servings} Portionen</Text>
          </View>
          {recipe.kcalPerServing ? (
            <View style={styles.heroMetaItem}>
              <Ionicons name="flame-outline" size={14} color={colors.white} />
              <Text style={styles.heroMetaText}>
                {recipe.kcalPerServing} kcal
              </Text>
            </View>
          ) : null}
        </View>
      </LinearGradient>

      <View style={styles.tagRow}>
        {recipe.tags.map((tag) => (
          <Badge
            key={tag}
            label={tag}
            color={colors.primaryDark}
            background={colors.primaryLight}
          />
        ))}
        {recipe.isCustom ? (
          <Badge
            label="EIGENES REZEPT"
            color={colors.accent}
            background={colors.accentLight}
          />
        ) : null}
      </View>

      <Card style={styles.servingsCard}>
        <View style={styles.servingsText}>
          <Text style={styles.servingsTitle}>Portionen anpassen</Text>
          <Text style={styles.servingsHint}>
            Zutatenmengen werden automatisch umgerechnet
          </Text>
        </View>
        <View style={styles.stepper}>
          <Pressable
            onPress={() => changeServings(-1)}
            disabled={servings <= 1}
            style={({ pressed }) => [
              styles.stepperButton,
              servings <= 1 && styles.stepperDisabled,
              pressed && styles.pressed,
            ]}
          >
            <Ionicons name="remove" size={19} color={colors.text} />
          </Pressable>
          <Text style={styles.stepperValue}>{servings}</Text>
          <Pressable
            onPress={() => changeServings(1)}
            disabled={servings >= 12}
            style={({ pressed }) => [
              styles.stepperButton,
              servings >= 12 && styles.stepperDisabled,
              pressed && styles.pressed,
            ]}
          >
            <Ionicons name="add" size={19} color={colors.text} />
          </Pressable>
        </View>
      </Card>

      <SectionHeader title={`Zutaten für ${servings} ${
        servings === 1 ? 'Portion' : 'Portionen'
      }`} />
      <Card style={styles.ingredientsCard}>
        {scaledIngredients.map((ingredient, index) => (
          <View
            key={ingredient.id}
            style={[styles.ingredientRow, index > 0 && styles.rowDivider]}
          >
            <View style={styles.ingredientBullet}>
              <Ionicons
                name="ellipse"
                size={6}
                color={colors.primary}
              />
            </View>
            <Text style={styles.ingredientName}>{ingredient.name}</Text>
            <Text style={styles.ingredientAmount}>
              {ingredient.scaledAmount}
            </Text>
          </View>
        ))}
      </Card>

      <SectionHeader title="Zubereitung" />
      <Card style={styles.stepsCard}>
        {recipe.steps.map((step, index) => (
          <View
            key={`${recipe.id}-step-${index}`}
            style={[styles.stepRow, index > 0 && styles.rowDivider]}
          >
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>{index + 1}</Text>
            </View>
            <Text style={styles.stepText}>{step}</Text>
          </View>
        ))}
      </Card>

      <Card style={styles.tipCard}>
        <Ionicons name="nutrition-outline" size={20} color={colors.accent} />
        <Text style={styles.tipText}>
          Nährwertangaben sind Richtwerte. Je nach Produkt und Portionsgröße
          können sie abweichen.
        </Text>
      </Card>

      {recipe.isCustom ? (
        <Pressable onPress={confirmDelete} style={styles.deleteButton}>
          <Ionicons name="trash-outline" size={16} color={colors.danger} />
          <Text style={styles.deleteText}>Rezept löschen</Text>
        </Pressable>
      ) : null}
    </Screen>
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
  hero: {
    borderRadius: radius.xl,
    padding: spacing.xl,
    overflow: 'hidden',
    minHeight: 210,
    justifyContent: 'flex-end',
  },
  heroOrb: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(255,255,255,0.07)',
    top: -70,
    right: -50,
  },
  heroEmoji: {
    fontSize: 46,
    marginBottom: spacing.sm,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.white,
    letterSpacing: -0.6,
  },
  heroDescription: {
    fontSize: 12,
    lineHeight: 18,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  heroMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  heroMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  heroMetaText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.white,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: spacing.md,
  },
  servingsCard: {
    marginTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  servingsText: {
    flex: 1,
  },
  servingsTitle: {
    ...typography.body,
    fontWeight: '800',
    color: colors.text,
  },
  servingsHint: {
    fontSize: 11,
    color: colors.muted,
    marginTop: 1,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  stepperButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperDisabled: {
    opacity: 0.35,
  },
  stepperValue: {
    ...typography.h3,
    color: colors.text,
    minWidth: 24,
    textAlign: 'center',
  },
  ingredientsCard: {
    padding: 0,
    overflow: 'hidden',
  },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
  },
  rowDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  ingredientBullet: {
    width: 16,
    alignItems: 'center',
  },
  ingredientName: {
    flex: 1,
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  ingredientAmount: {
    ...typography.small,
    fontWeight: '800',
    color: colors.primaryDark,
  },
  stepsCard: {
    padding: 0,
    overflow: 'hidden',
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: 13,
  },
  stepNumber: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  stepNumberText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.primary,
  },
  stepText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
    color: colors.textSoft,
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
    fontSize: 11,
    lineHeight: 17,
    color: '#7A5A1F',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: spacing.xl,
    paddingVertical: spacing.md,
  },
  deleteText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.danger,
  },
  pressed: {
    opacity: 0.7,
  },
});
