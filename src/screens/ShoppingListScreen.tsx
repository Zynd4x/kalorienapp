import React, { useMemo, useState } from 'react';
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
import {
  Button,
  Card,
  Chip,
  EmptyState,
  IconButton,
  ProgressBar,
  Screen,
  ScreenHeader,
  SectionHeader,
} from '../components/ui';
import { useApp } from '../context/AppContext';
import { SharedListCard } from '../components/SharedListCard';
import { colors, radius, spacing, typography } from '../theme';
import { successFeedback, tapFeedback } from '../lib/haptics';
import type { ShoppingCategory, ShoppingItem } from '../types';

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

const QUICK_ITEMS: {
  name: string;
  amount: string;
  category: ShoppingCategory;
}[] = [
  { name: 'Milch', amount: '1 l', category: 'Molkerei & Eier' },
  { name: 'Eier', amount: '10 Stück', category: 'Molkerei & Eier' },
  { name: 'Brot', amount: '1 Laib', category: 'Backwaren' },
  { name: 'Äpfel', amount: '1 kg', category: 'Obst & Gemüse' },
  { name: 'Kaffee', amount: '500 g', category: 'Vorrat' },
];

export function ShoppingListScreen() {
  const router = useRouter();
  const {
    shopping,
    addShoppingItem,
    toggleShoppingItem,
    updateShoppingItem,
    moveShoppingItem,
    removeShoppingItem,
    clearCompleted,
  } = useApp();
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<ShoppingCategory>('Sonstiges');

  const done = shopping.filter((item) => item.checked);
  const open = shopping.filter((item) => !item.checked);
  const progress = shopping.length === 0 ? 0 : done.length / shopping.length;

  const groups = useMemo(
    () =>
      CATEGORIES.map((entry) => ({
        category: entry,
        items: open.filter((item) => item.category === entry),
      })).filter((group) => group.items.length > 0),
    [open],
  );

  const handleAdd = () => {
    const cleanName = name.trim();
    if (!cleanName) return;
    addShoppingItem({
      name: cleanName,
      amount: amount.trim() || undefined,
      category,
    });
    successFeedback();
    setName('');
    setAmount('');
  };

  const handleQuickAdd = (item: (typeof QUICK_ITEMS)[number]) => {
    addShoppingItem(item);
    successFeedback();
  };

  const confirmClear = () => {
    Alert.alert(
      'Erledigte löschen?',
      `${done.length} erledigte ${
        done.length === 1 ? 'Artikel wird' : 'Artikel werden'
      } von der Liste entfernt.`,
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Löschen',
          style: 'destructive',
          onPress: () => {
            clearCompleted();
            successFeedback();
          },
        },
      ],
    );
  };

  return (
    <Screen>
      <ScreenHeader
        title="Einkaufsliste"
        subtitle="Alles im Blick – abhaken und fertig"
        right={
          done.length > 0 ? (
            <IconButton
              icon="trash-outline"
              color={colors.danger}
              background={colors.dangerLight}
              onPress={confirmClear}
              accessibilityLabel="Erledigte löschen"
            />
          ) : undefined
        }
      />

      <SharedListCard />

      <Card style={styles.progressCard}>
        <View style={styles.progressTop}>
          <View>
            <Text style={styles.progressValue}>
              {done.length}
              <Text style={styles.progressTotal}> / {shopping.length}</Text>
            </Text>
            <Text style={styles.progressLabel}>Artikel erledigt</Text>
          </View>
          <View style={styles.progressBadge}>
            <Text style={styles.progressBadgeText}>
              {Math.round(progress * 100)} %
            </Text>
          </View>
        </View>
        <ProgressBar value={progress} height={9} />
        <Button
          label="Zutaten aus Rezept hinzufügen"
          icon="book-outline"
          variant="secondary"
          onPress={() => router.push('/recipes')}
          fullWidth
          style={styles.recipeButton}
        />
      </Card>

      {shopping.length > 0 ? (
        <Text style={styles.listHint}>
          Tippe auf einen Artikel, um ihn zu bearbeiten oder zu verschieben.
        </Text>
      ) : null}

      <SectionHeader title="Was fehlt noch?" />
      <Card style={styles.addCard}>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="z. B. Milch, Tomaten, Haferflocken"
          placeholderTextColor={colors.muted}
          style={styles.input}
          returnKeyType="done"
          onSubmitEditing={handleAdd}
        />
        <TextInput
          value={amount}
          onChangeText={setAmount}
          placeholder="Menge (optional), z. B. 1 l oder 500 g"
          placeholderTextColor={colors.muted}
          style={styles.input}
          returnKeyType="done"
          onSubmitEditing={handleAdd}
        />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryRow}
        >
          {CATEGORIES.map((entry) => (
            <Chip
              key={entry}
              label={entry}
              selected={category === entry}
              onPress={() => setCategory(entry)}
            />
          ))}
        </ScrollView>
        <Button
          label="Hinzufügen"
          icon="add"
          onPress={handleAdd}
          disabled={!name.trim()}
          fullWidth
        />
      </Card>

      {shopping.length === 0 ? (
        <>
          <Card style={styles.emptyCard}>
            <EmptyState
              icon="cart-outline"
              title="Deine Liste ist leer"
              message="Füge Artikel manuell hinzu oder übernimm die Zutaten aus einem Rezept."
              actionLabel="Rezepte entdecken"
              onAction={() => router.push('/recipes')}
            />
          </Card>
          <SectionHeader title="Schnell hinzufügen" />
          <View style={styles.quickWrap}>
            {QUICK_ITEMS.map((item) => (
              <Chip
                key={item.name}
                label={`${item.name} · ${item.amount}`}
                icon="add"
                onPress={() => handleQuickAdd(item)}
                lightColor={colors.surface}
              />
            ))}
          </View>
        </>
      ) : (
        <>
          {open.length > 0 ? (
            groups.map((group) => (
              <View key={group.category}>
                <SectionHeader title={group.category} />
                <Card style={styles.groupCard}>
                  {group.items.map((item, index) => (
                    <ShoppingRow
                      key={item.id}
                      item={item}
                      divider={index > 0}
                      canMoveUp={index > 0}
                      canMoveDown={index < group.items.length - 1}
                      onToggle={() => {
                        toggleShoppingItem(item.id);
                        tapFeedback();
                      }}
                      onMove={(direction) => moveShoppingItem(item.id, direction)}
                      onSave={(changes) =>
                        updateShoppingItem(item.id, changes)
                      }
                      onRemove={() => removeShoppingItem(item.id)}
                    />
                  ))}
                </Card>
              </View>
            ))
          ) : (
            <Card style={styles.allDoneCard}>
              <View style={styles.allDoneIcon}>
                <Ionicons
                  name="checkmark-done"
                  size={26}
                  color={colors.primary}
                />
              </View>
              <View style={styles.allDoneText}>
                <Text style={styles.allDoneTitle}>Alles erledigt!</Text>
                <Text style={styles.allDoneHint}>
                  Du kannst die erledigten Artikel jetzt entfernen.
                </Text>
              </View>
            </Card>
          )}

          {done.length > 0 ? (
            <>
              <SectionHeader
                title={`Erledigt (${done.length})`}
                actionLabel="Löschen"
                onAction={confirmClear}
              />
              <Card style={styles.groupCard}>
                {done.map((item, index) => (
                  <ShoppingRow
                    key={item.id}
                    item={item}
                    divider={index > 0}
                    canMoveUp={index > 0}
                    canMoveDown={index < done.length - 1}
                    onToggle={() => {
                      toggleShoppingItem(item.id);
                      tapFeedback();
                    }}
                    onMove={(direction) => moveShoppingItem(item.id, direction)}
                    onSave={(changes) => updateShoppingItem(item.id, changes)}
                    onRemove={() => removeShoppingItem(item.id)}
                  />
                ))}
              </Card>
            </>
          ) : null}
        </>
      )}
    </Screen>
  );
}

interface ShoppingRowProps {
  item: ShoppingItem;
  divider: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onToggle: () => void;
  onMove: (direction: 'up' | 'down') => void;
  onSave: (changes: {
    name: string;
    amount?: string;
    category: ShoppingCategory;
  }) => void;
  onRemove: () => void;
}

function ShoppingRow({
  item,
  divider,
  canMoveUp,
  canMoveDown,
  onToggle,
  onMove,
  onSave,
  onRemove,
}: ShoppingRowProps) {
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState(item.name);
  const [draftAmount, setDraftAmount] = useState(item.amount ?? '');
  const [draftCategory, setDraftCategory] =
    useState<ShoppingCategory>(item.category);

  const openEditor = () => {
    setDraftName(item.name);
    setDraftAmount(item.amount ?? '');
    setDraftCategory(item.category);
    setEditing(true);
  };

  const closeEditor = () => setEditing(false);

  const handleSave = () => {
    const cleanName = draftName.trim();
    if (!cleanName) return;
    onSave({
      name: cleanName,
      amount: draftAmount.trim() || undefined,
      category: draftCategory,
    });
    successFeedback();
    setEditing(false);
  };

  return (
    <View style={[styles.itemRow, divider && styles.itemDivider]}>
      <View style={styles.itemMainRow}>
        <Pressable
          onPress={onToggle}
          hitSlop={6}
          style={styles.checkboxHit}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: item.checked }}
          accessibilityLabel={
            item.checked
              ? `${item.name} wieder als offen markieren`
              : `${item.name} als erledigt markieren`
          }
        >
          <View
            style={[styles.checkbox, item.checked && styles.checkboxChecked]}
          >
            {item.checked ? (
              <Ionicons name="checkmark" size={16} color={colors.white} />
            ) : null}
          </View>
        </Pressable>

        <Pressable
          onPress={editing ? undefined : openEditor}
          disabled={editing}
          style={styles.itemTextWrap}
          accessibilityRole="button"
          accessibilityLabel={`${item.name} bearbeiten`}
        >
          <Text
            style={[styles.itemName, item.checked && styles.itemNameChecked]}
            numberOfLines={2}
          >
            {item.name}
          </Text>
          <View style={styles.itemMetaRow}>
            {item.amount ? (
              <Text style={styles.itemAmount}>{item.amount}</Text>
            ) : null}
            {item.recipeId ? (
              <View style={styles.recipeBadge}>
                <Ionicons
                  name="book-outline"
                  size={10}
                  color={colors.primary}
                />
                <Text style={styles.recipeBadgeText}>Rezept</Text>
              </View>
            ) : null}
          </View>
        </Pressable>

        <Pressable
          onPress={editing ? closeEditor : openEditor}
          hitSlop={8}
          style={({ pressed }) => [styles.rowAction, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel={`${item.name} bearbeiten`}
        >
          <Ionicons
            name={editing ? 'chevron-up-circle-outline' : 'create-outline'}
            size={19}
            color={colors.primary}
          />
        </Pressable>

        <Pressable
          onPress={onRemove}
          hitSlop={8}
          style={({ pressed }) => [styles.rowAction, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel={`${item.name} löschen`}
        >
          <Ionicons name="trash-outline" size={18} color={colors.muted} />
        </Pressable>
      </View>

      {editing ? (
        <View style={styles.editor}>
          <TextInput
            value={draftName}
            onChangeText={setDraftName}
            placeholder="Artikelname"
            placeholderTextColor={colors.muted}
            style={styles.editorInput}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={handleSave}
          />
          <TextInput
            value={draftAmount}
            onChangeText={setDraftAmount}
            placeholder="Menge (optional), z. B. 1 l"
            placeholderTextColor={colors.muted}
            style={styles.editorInput}
            returnKeyType="done"
            onSubmitEditing={handleSave}
          />

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryRow}
          >
            {CATEGORIES.map((entry) => (
              <Chip
                key={entry}
                label={entry}
                selected={draftCategory === entry}
                onPress={() => setDraftCategory(entry)}
              />
            ))}
          </ScrollView>

          <View style={styles.moveRow}>
            <Text style={styles.moveHint}>Reihenfolge</Text>
            <View style={styles.moveButtons}>
              <Pressable
                onPress={() => onMove('up')}
                disabled={!canMoveUp}
                style={({ pressed }) => [
                  styles.moveButton,
                  !canMoveUp && styles.moveButtonDisabled,
                  pressed && canMoveUp && styles.pressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel={`${item.name} nach oben verschieben`}
              >
                <Ionicons
                  name="chevron-up"
                  size={16}
                  color={canMoveUp ? colors.text : colors.muted}
                />
                <Text
                  style={[
                    styles.moveLabel,
                    !canMoveUp && styles.moveLabelDisabled,
                  ]}
                >
                  Hoch
                </Text>
              </Pressable>
              <Pressable
                onPress={() => onMove('down')}
                disabled={!canMoveDown}
                style={({ pressed }) => [
                  styles.moveButton,
                  !canMoveDown && styles.moveButtonDisabled,
                  pressed && canMoveDown && styles.pressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel={`${item.name} nach unten verschieben`}
              >
                <Ionicons
                  name="chevron-down"
                  size={16}
                  color={canMoveDown ? colors.text : colors.muted}
                />
                <Text
                  style={[
                    styles.moveLabel,
                    !canMoveDown && styles.moveLabelDisabled,
                  ]}
                >
                  Runter
                </Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.editorButtons}>
            <Button
              label="Speichern"
              icon="checkmark"
              onPress={handleSave}
              disabled={!draftName.trim()}
              style={styles.editorButton}
            />
            <Button
              label="Abbrechen"
              variant="outline"
              onPress={closeEditor}
              style={styles.editorButton}
            />
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  progressCard: {
    gap: spacing.md,
    marginTop: spacing.md,
  },
  progressTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  progressValue: {
    fontSize: 30,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.8,
  },
  progressTotal: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.muted,
    letterSpacing: 0,
  },
  progressLabel: {
    ...typography.small,
    color: colors.muted,
  },
  progressBadge: {
    backgroundColor: colors.primaryLight,
    borderRadius: radius.full,
    paddingHorizontal: 13,
    paddingVertical: 7,
  },
  progressBadgeText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.primaryDark,
  },
  recipeButton: {
    marginTop: spacing.xs,
  },
  listHint: {
    fontSize: 11,
    color: colors.muted,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  addCard: {
    gap: spacing.sm,
  },
  input: {
    height: 48,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    fontSize: 15,
    fontWeight: '500',
    color: colors.text,
  },
  categoryRow: {
    gap: spacing.sm,
    paddingVertical: spacing.xs,
    paddingRight: spacing.lg,
  },
  emptyCard: {
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
  },
  quickWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  groupCard: {
    padding: 0,
    overflow: 'hidden',
  },
  itemRow: {
    paddingHorizontal: spacing.md,
    paddingVertical: 11,
  },
  itemMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  itemDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  checkboxHit: {
    padding: 2,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  itemTextWrap: {
    flex: 1,
  },
  itemName: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  itemNameChecked: {
    color: colors.muted,
    textDecorationLine: 'line-through',
  },
  itemMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  itemAmount: {
    fontSize: 11,
    color: colors.muted,
  },
  recipeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.primaryLight,
    borderRadius: radius.full,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  recipeBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.primary,
  },
  rowAction: {
    padding: 2,
  },
  editor: {
    marginTop: spacing.md,
    gap: spacing.sm,
    paddingBottom: spacing.xs,
  },
  editorInput: {
    height: 42,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  moveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  moveHint: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  moveButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  moveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  moveButtonDisabled: {
    opacity: 0.45,
  },
  moveLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
  },
  moveLabelDisabled: {
    color: colors.muted,
  },
  editorButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  editorButton: {
    flex: 1,
    minHeight: 44,
    paddingHorizontal: spacing.sm,
  },
  allDoneCard: {
    marginTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.primaryLight,
    shadowOpacity: 0,
    elevation: 0,
  },
  allDoneIcon: {
    width: 46,
    height: 46,
    borderRadius: 15,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  allDoneText: {
    flex: 1,
  },
  allDoneTitle: {
    ...typography.body,
    fontWeight: '800',
    color: colors.primaryDark,
  },
  allDoneHint: {
    fontSize: 11,
    color: colors.primary,
    marginTop: 1,
  },
  pressed: {
    opacity: 0.6,
  },
});
