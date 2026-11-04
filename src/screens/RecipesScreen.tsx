import React, { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
  Badge,
  Card,
  Chip,
  EmptyState,
  IconButton,
  Screen,
  ScreenHeader,
  SectionHeader,
} from '../components/ui';
import { useApp } from '../context/AppContext';
import { colors, radius, shadow, spacing, typography } from '../theme';
import { successFeedback, tapFeedback } from '../lib/haptics';
import type { Recipe } from '../types';

export function RecipesScreen() {
  const router = useRouter();
  const { recipes, addRecipeToShoppingList } = useApp();
  const [query, setQuery] = useState('');
  const [activeTag, setActiveTag] = useState('Alle');
  const [addedId, setAddedId] = useState<string | null>(null);

  const tags = useMemo(
    () => ['Alle', ...Array.from(new Set(recipes.flatMap((r) => r.tags)))],
    [recipes],
  );

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return recipes.filter((recipe) => {
      const matchesTag =
        activeTag === 'Alle' || recipe.tags.includes(activeTag);
      const matchesQuery =
        !term ||
        recipe.name.toLowerCase().includes(term) ||
        recipe.description.toLowerCase().includes(term) ||
        recipe.ingredients.some((ingredient) =>
          ingredient.name.toLowerCase().includes(term),
        );
      return matchesTag && matchesQuery;
    });
  }, [recipes, query, activeTag]);

  const quickAdd = (recipe: Recipe) => {
    const count = addRecipeToShoppingList(recipe, recipe.servings);
    successFeedback();
    setAddedId(recipe.id);
    setTimeout(() => {
      setAddedId((current) => (current === recipe.id ? null : current));
    }, 2000);
    if (count === 0) return;
  };

  const customCount = recipes.filter((recipe) => recipe.isCustom).length;

  return (
    <Screen>
      <ScreenHeader
        title="Rezepte"
        subtitle={`${recipes.length} Rezepte · ${customCount} eigene`}
        right={
          <IconButton
            icon="add"
            background={colors.primary}
            color={colors.white}
            onPress={() => router.push('/create-recipe')}
            accessibilityLabel="Rezept erstellen"
          />
        }
      />

      <View style={styles.searchBox}>
        <Ionicons name="search-outline" size={20} color={colors.muted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Rezepte oder Zutaten suchen"
          placeholderTextColor={colors.muted}
          style={styles.searchInput}
          autoCorrect={false}
        />
        {query.length > 0 ? (
          <Pressable onPress={() => setQuery('')} hitSlop={8}>
            <Ionicons name="close-circle" size={19} color={colors.muted} />
          </Pressable>
        ) : null}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tagRow}
      >
        {tags.map((tag) => (
          <Chip
            key={tag}
            label={tag}
            selected={activeTag === tag}
            onPress={() => setActiveTag(tag)}
          />
        ))}
      </ScrollView>

      {filtered.length === 0 ? (
        <Card style={styles.emptyCard}>
          <EmptyState
            icon="restaurant-outline"
            title="Keine Rezepte gefunden"
            message="Passe deine Suche an oder erstelle dein eigenes Rezept."
            actionLabel="Rezept erstellen"
            onAction={() => router.push('/create-recipe')}
          />
        </Card>
      ) : (
        filtered.map((recipe) => (
          <RecipeCard
            key={recipe.id}
            recipe={recipe}
            added={addedId === recipe.id}
            onOpen={() => {
              tapFeedback();
              router.push(`/recipe/${recipe.id}`);
            }}
            onAdd={() => quickAdd(recipe)}
          />
        ))
      )}

      <SectionHeader title="So funktioniert's" />
      <Card style={styles.infoCard}>
        <View style={styles.infoStep}>
          <View style={styles.infoNumber}>
            <Text style={styles.infoNumberText}>1</Text>
          </View>
          <Text style={styles.infoText}>Rezept auswählen und Portionen anpassen.</Text>
        </View>
        <View style={styles.infoStep}>
          <View style={styles.infoNumber}>
            <Text style={styles.infoNumberText}>2</Text>
          </View>
          <Text style={styles.infoText}>
            „Zutaten zur Liste“ – alle Zutaten landen in der Einkaufsliste.
          </Text>
        </View>
        <View style={styles.infoStep}>
          <View style={styles.infoNumber}>
            <Text style={styles.infoNumberText}>3</Text>
          </View>
          <Text style={styles.infoText}>
            Im Laden abhaken und entspannt einkaufen.
          </Text>
        </View>
      </Card>
    </Screen>
  );
}

function RecipeCard({
  recipe,
  added,
  onOpen,
  onAdd,
}: {
  recipe: Recipe;
  added: boolean;
  onOpen: () => void;
  onAdd: () => void;
}) {
  return (
    <View style={styles.recipeCard}>
      <Pressable
        onPress={onOpen}
        style={({ pressed }) => [pressed && styles.pressed]}
      >
        <View style={styles.recipeTop}>
          <View style={styles.emojiBox}>
            <Text style={styles.emoji}>{recipe.emoji}</Text>
          </View>
          <View style={styles.recipeTitleWrap}>
            <View style={styles.recipeTitleRow}>
              <Text style={styles.recipeName} numberOfLines={2}>
                {recipe.name}
              </Text>
              {recipe.isCustom ? (
                <Badge
                  label="EIGEN"
                  color={colors.accent}
                  background={colors.accentLight}
                />
              ) : null}
            </View>
            <Text style={styles.recipeDescription} numberOfLines={2}>
              {recipe.description}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.border} />
        </View>

        <View style={styles.metaRow}>
          <MetaItem icon="time-outline" text={`${recipe.minutes} Min.`} />
          <MetaItem
            icon="people-outline"
            text={`${recipe.servings} ${
              recipe.servings === 1 ? 'Portion' : 'Portionen'
            }`}
          />
          {recipe.kcalPerServing ? (
            <MetaItem
              icon="flame-outline"
              text={`${recipe.kcalPerServing} kcal`}
            />
          ) : null}
        </View>

        <View style={styles.tagRowSmall}>
          {recipe.tags.slice(0, 3).map((tag) => (
            <Badge
              key={tag}
              label={tag}
              color={colors.primaryDark}
              background={colors.primaryLight}
            />
          ))}
        </View>
      </Pressable>

      <View style={styles.recipeFooter}>
        <Pressable
          onPress={onAdd}
          style={({ pressed }) => [
            styles.addToListButton,
            added && styles.addToListButtonActive,
            pressed && styles.pressed,
          ]}
        >
          <Ionicons
            name={added ? 'checkmark' : 'cart-outline'}
            size={16}
            color={added ? colors.white : colors.primary}
          />
          <Text
            style={[
              styles.addToListText,
              added && styles.addToListTextActive,
            ]}
          >
            {added ? 'Zur Liste hinzugefügt' : 'Zutaten zur Liste'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function MetaItem({
  icon,
  text,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  text: string;
}) {
  return (
    <View style={styles.metaItem}>
      <Ionicons name={icon} size={14} color={colors.muted} />
      <Text style={styles.metaText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
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
  tagRow: {
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingRight: spacing.lg,
  },
  recipeCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow,
    shadowOpacity: 0.04,
    elevation: 1,
  },
  recipeTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  emojiBox: {
    width: 54,
    height: 54,
    borderRadius: 17,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 30,
  },
  recipeTitleWrap: {
    flex: 1,
  },
  recipeTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  recipeName: {
    ...typography.h3,
    color: colors.text,
    flex: 1,
  },
  recipeDescription: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.muted,
    marginTop: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.muted,
  },
  tagRowSmall: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    marginTop: spacing.sm,
  },
  recipeFooter: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    marginTop: spacing.md,
    paddingTop: spacing.md,
  },
  addToListButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.primaryLight,
    borderRadius: radius.md,
    paddingVertical: 10,
  },
  addToListButtonActive: {
    backgroundColor: colors.primary,
  },
  addToListText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.primary,
  },
  addToListTextActive: {
    color: colors.white,
  },
  emptyCard: {
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
  },
  infoCard: {
    gap: spacing.md,
    backgroundColor: colors.surfaceAlt,
    shadowOpacity: 0,
    elevation: 0,
  },
  infoStep: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  infoNumber: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoNumberText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.white,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    color: colors.textSoft,
  },
  pressed: {
    opacity: 0.75,
  },
});
