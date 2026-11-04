import React, { useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { goBack } from '../lib/navigation';
import {
  Button,
  Card,
  Chip,
  Screen,
  ScreenHeader,
  SectionHeader,
} from '../components/ui';
import { createId, useApp } from '../context/AppContext';
import { colors, radius, spacing, typography } from '../theme';
import { successFeedback } from '../lib/haptics';
import type { ShoppingCategory } from '../types';

const CATEGORIES: ShoppingCategory[] = [
  'Obst & Gemüse',
  'Molkerei & Eier',
  'Backwaren',
  'Fleisch & Fisch',
  'Vorrat',
  'Getränke',
  'Tiefkühl',
  'Sonstiges',
];

const EMOJIS = ['🥗', '🍗', '🥣', '🐟', '🌶️', '🥞', '🍝', '🍲', '🥪', '🍳'];
const TAG_OPTIONS = [
  'Schnell',
  'High Protein',
  'Vegetarisch',
  'Vegan',
  'Meal Prep',
  'Low Carb',
  'Familie',
  'Frühstück',
];

interface DraftIngredient {
  id: string;
  name: string;
  amount: string;
  category: ShoppingCategory;
}

interface DraftStep {
  id: string;
  text: string;
}

export function CreateRecipeScreen() {
  const router = useRouter();
  const { addRecipe } = useApp();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [emoji, setEmoji] = useState('🥗');
  const [servings, setServings] = useState('2');
  const [minutes, setMinutes] = useState('25');
  const [kcal, setKcal] = useState('');
  const [tags, setTags] = useState<string[]>(['Schnell']);
  const [ingredients, setIngredients] = useState<DraftIngredient[]>([
    { id: createId('ing'), name: '', amount: '', category: 'Sonstiges' },
  ]);
  const [steps, setSteps] = useState<DraftStep[]>([
    { id: createId('step'), text: '' },
  ]);

  const toggleTag = (tag: string) => {
    setTags((current) =>
      current.includes(tag)
        ? current.filter((entry) => entry !== tag)
        : [...current, tag],
    );
  };

  const updateIngredient = (
    id: string,
    patch: Partial<DraftIngredient>,
  ) => {
    setIngredients((current) =>
      current.map((ingredient) =>
        ingredient.id === id ? { ...ingredient, ...patch } : ingredient,
      ),
    );
  };

  const addIngredient = () => {
    setIngredients((current) => [
      ...current,
      {
        id: createId('ing'),
        name: '',
        amount: '',
        category: 'Sonstiges',
      },
    ]);
  };

  const removeIngredient = (id: string) => {
    setIngredients((current) =>
      current.filter((ingredient) => ingredient.id !== id),
    );
  };

  const addStep = () => {
    setSteps((current) => [...current, { id: createId('step'), text: '' }]);
  };

  const updateStep = (id: string, text: string) => {
    setSteps((current) =>
      current.map((step) => (step.id === id ? { ...step, text } : step)),
    );
  };

  const removeStep = (id: string) => {
    setSteps((current) => current.filter((step) => step.id !== id));
  };

  const handleSave = () => {
    const cleanName = name.trim();
    if (!cleanName) {
      Alert.alert('Name fehlt', 'Bitte gib deinem Rezept einen Namen.');
      return;
    }

    const cleanIngredients = ingredients
      .filter((ingredient) => ingredient.name.trim())
      .map((ingredient) => ({
        id: ingredient.id,
        name: ingredient.name.trim(),
        amount: ingredient.amount.trim() || '1 Portion',
        category: ingredient.category,
      }));

    if (cleanIngredients.length === 0) {
      Alert.alert(
        'Zutaten fehlen',
        'Bitte füge mindestens eine Zutat mit Namen hinzu.',
      );
      return;
    }

    const parsedServings = Number.parseInt(servings, 10);
    const parsedMinutes = Number.parseInt(minutes, 10);
    const parsedKcal = Number(kcal.replace(',', '.'));

    const id = addRecipe({
      name: cleanName,
      description:
        description.trim() ||
        'Mein eigenes Rezept – Schritt für Schritt zubereitet.',
      emoji,
      servings: Number.isFinite(parsedServings)
        ? Math.min(12, Math.max(1, parsedServings))
        : 2,
      minutes: Number.isFinite(parsedMinutes)
        ? Math.min(240, Math.max(5, parsedMinutes))
        : 25,
      tags,
      ingredients: cleanIngredients,
      steps: steps.map((step) => step.text.trim()).filter(Boolean),
      kcalPerServing:
        Number.isFinite(parsedKcal) && parsedKcal > 0
          ? Math.round(parsedKcal)
          : undefined,
    });

    successFeedback();
    router.replace(`/recipe/${id}`);
  };

  return (
    <Screen>
      <ScreenHeader
        title="Neues Rezept"
        subtitle="Deine eigene Kreation"
        onBack={() => goBack('/recipes')}
      />

      <Card style={styles.card}>
        <Text style={styles.label}>Name des Rezepts *</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="z. B. Bunte Gemüsepfanne"
          placeholderTextColor={colors.muted}
          style={styles.input}
        />

        <Text style={styles.label}>Beschreibung</Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder="Was macht dein Rezept besonders?"
          placeholderTextColor={colors.muted}
          style={[styles.input, styles.textArea]}
          multiline
          textAlignVertical="top"
        />

        <Text style={styles.label}>Symbol</Text>
        <View style={styles.emojiRow}>
          {EMOJIS.map((entry) => (
            <Pressable
              key={entry}
              onPress={() => setEmoji(entry)}
              style={[
                styles.emojiOption,
                emoji === entry && styles.emojiOptionActive,
              ]}
            >
              <Text style={styles.emojiOptionText}>{entry}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.twoColumns}>
          <View style={styles.column}>
            <Text style={styles.label}>Portionen</Text>
            <TextInput
              value={servings}
              onChangeText={(value) =>
                setServings(value.replace(/[^0-9]/g, '').slice(0, 2))
              }
              keyboardType="number-pad"
              style={styles.input}
            />
          </View>
          <View style={styles.column}>
            <Text style={styles.label}>Minuten</Text>
            <TextInput
              value={minutes}
              onChangeText={(value) =>
                setMinutes(value.replace(/[^0-9]/g, '').slice(0, 3))
              }
              keyboardType="number-pad"
              style={styles.input}
            />
          </View>
          <View style={styles.column}>
            <Text style={styles.label}>kcal / Portion</Text>
            <TextInput
              value={kcal}
              onChangeText={(value) =>
                setKcal(value.replace(/[^0-9]/g, '').slice(0, 4))
              }
              keyboardType="number-pad"
              placeholder="optional"
              placeholderTextColor={colors.muted}
              style={styles.input}
            />
          </View>
        </View>
      </Card>

      <SectionHeader title="Tags" />
      <View style={styles.tagWrap}>
        {TAG_OPTIONS.map((tag) => (
          <Chip
            key={tag}
            label={tag}
            selected={tags.includes(tag)}
            onPress={() => toggleTag(tag)}
          />
        ))}
      </View>

      <SectionHeader
        title="Zutaten"
        actionLabel="Hinzufügen"
        onAction={addIngredient}
      />
      {ingredients.map((ingredient, index) => (
        <Card key={ingredient.id} style={styles.ingredientCard}>
          <View style={styles.ingredientHeader}>
            <Text style={styles.ingredientNumber}>Zutat {index + 1}</Text>
            <Pressable
              onPress={() => removeIngredient(ingredient.id)}
              hitSlop={8}
            >
              <Ionicons name="close" size={18} color={colors.muted} />
            </Pressable>
          </View>
          <View style={styles.ingredientRow}>
            <TextInput
              value={ingredient.name}
              onChangeText={(value) =>
                updateIngredient(ingredient.id, { name: value })
              }
              placeholder="Zutat, z. B. Tomaten"
              placeholderTextColor={colors.muted}
              style={[styles.input, styles.ingredientName]}
            />
            <TextInput
              value={ingredient.amount}
              onChangeText={(value) =>
                updateIngredient(ingredient.id, { amount: value })
              }
              placeholder="500 g"
              placeholderTextColor={colors.muted}
              style={[styles.input, styles.ingredientAmount]}
            />
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryRow}
          >
            {CATEGORIES.map((category) => (
              <Chip
                key={category}
                label={category}
                selected={ingredient.category === category}
                onPress={() =>
                  updateIngredient(ingredient.id, { category })
                }
              />
            ))}
          </ScrollView>
        </Card>
      ))}
      <Button
        label="Weitere Zutat"
        icon="add"
        variant="secondary"
        onPress={addIngredient}
        fullWidth
      />

      <SectionHeader
        title="Zubereitung"
        actionLabel="Schritt hinzufügen"
        onAction={addStep}
      />
      {steps.map((step, index) => (
        <View key={step.id} style={styles.stepCard}>
          <View style={styles.stepNumber}>
            <Text style={styles.stepNumberText}>{index + 1}</Text>
          </View>
          <TextInput
            value={step.text}
            onChangeText={(value) => updateStep(step.id, value)}
            placeholder="Was ist in diesem Schritt zu tun?"
            placeholderTextColor={colors.muted}
            style={[styles.input, styles.stepInput]}
            multiline
            textAlignVertical="top"
          />
          <Pressable
            onPress={() => removeStep(step.id)}
            hitSlop={8}
            style={styles.stepRemove}
          >
            <Ionicons name="close" size={17} color={colors.muted} />
          </Pressable>
        </View>
      ))}

      <Button
        label="Rezept speichern"
        icon="checkmark-circle-outline"
        onPress={handleSave}
        fullWidth
        style={styles.saveButton}
      />
      <Text style={styles.footerHint}>
        Dein Rezept wird lokal gespeichert und kann jederzeit zur Einkaufsliste
        hinzugefügt werden.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.sm,
  },
  label: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textSoft,
    letterSpacing: 0.2,
    marginTop: spacing.xs,
  },
  input: {
    minHeight: 46,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  textArea: {
    minHeight: 80,
  },
  emojiRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  emojiOption: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  emojiOptionActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  emojiOptionText: {
    fontSize: 22,
  },
  twoColumns: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  column: {
    flex: 1,
    gap: 4,
  },
  tagWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  ingredientCard: {
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  ingredientHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ingredientNumber: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: colors.primary,
  },
  ingredientRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  ingredientName: {
    flex: 1,
  },
  ingredientAmount: {
    width: 88,
  },
  categoryRow: {
    gap: 6,
    paddingRight: spacing.lg,
  },
  stepCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  stepNumberText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.primary,
  },
  stepInput: {
    flex: 1,
    minHeight: 58,
  },
  stepRemove: {
    marginTop: 15,
    padding: 2,
  },
  saveButton: {
    marginTop: spacing.xl,
  },
  footerHint: {
    fontSize: 10,
    lineHeight: 15,
    color: colors.muted,
    textAlign: 'center',
    marginTop: spacing.md,
  },
});
