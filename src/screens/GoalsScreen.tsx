import React, { useState } from 'react';
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { goBack } from '../lib/navigation';
import {
  Button,
  Card,
  Screen,
  ScreenHeader,
  SectionHeader,
} from '../components/ui';
import { useApp } from '../context/AppContext';
import { colors, radius, spacing, typography } from '../theme';
import { successFeedback } from '../lib/haptics';
import type { Goals } from '../types';

const PRESETS: {
  id: string;
  title: string;
  description: string;
  goals: Goals;
  icon: React.ComponentProps<typeof Ionicons>['name'];
}[] = [
  {
    id: 'lose',
    title: 'Abnehmen',
    description: 'Moderates Defizit',
    goals: { kcal: 1800, protein: 135, carbs: 180, fat: 60 },
    icon: 'trending-down-outline',
  },
  {
    id: 'hold',
    title: 'Halten',
    description: 'Ausgewogen',
    goals: { kcal: 2200, protein: 140, carbs: 250, fat: 75 },
    icon: 'remove-outline',
  },
  {
    id: 'build',
    title: 'Aufbau',
    description: 'Muskelaufbau',
    goals: { kcal: 2700, protein: 170, carbs: 300, fat: 90 },
    icon: 'trending-up-outline',
  },
];

export function GoalsScreen() {
  const { goals, setGoals, resetAll } = useApp();
  const [kcal, setKcal] = useState(String(goals.kcal));
  const [protein, setProtein] = useState(String(goals.protein));
  const [carbs, setCarbs] = useState(String(goals.carbs));
  const [fat, setFat] = useState(String(goals.fat));

  const applyPreset = (preset: (typeof PRESETS)[number]) => {
    setKcal(String(preset.goals.kcal));
    setProtein(String(preset.goals.protein));
    setCarbs(String(preset.goals.carbs));
    setFat(String(preset.goals.fat));
    successFeedback();
  };

  const save = () => {
    const next: Goals = {
      kcal: Number.parseInt(kcal, 10),
      protein: Number.parseInt(protein, 10),
      carbs: Number.parseInt(carbs, 10),
      fat: Number.parseInt(fat, 10),
    };

    if (
      !Number.isFinite(next.kcal) ||
      !Number.isFinite(next.protein) ||
      !Number.isFinite(next.carbs) ||
      !Number.isFinite(next.fat) ||
      next.kcal < 800 ||
      next.protein < 0 ||
      next.carbs < 0 ||
      next.fat < 0
    ) {
      Alert.alert(
        'Ungültige Werte',
        'Bitte gib realistische Ziele ein. Kalorien mindestens 800 kcal, Makros dürfen nicht negativ sein.',
      );
      return;
    }

    setGoals(next);
    successFeedback();
    goBack();
  };

  const confirmReset = () => {
    Alert.alert(
      'Alle Daten zurücksetzen?',
      'Tagebuch, Einkaufsliste, eigene Rezepte und Ziele werden dauerhaft gelöscht. Die Beispielrezepte bleiben erhalten.',
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Alles löschen',
          style: 'destructive',
          onPress: () => {
            resetAll()
              .then(() => {
                goBack();
              })
              .catch(() => {
                Alert.alert('Fehler', 'Die Daten konnten nicht gelöscht werden.');
              });
          },
        },
      ],
    );
  };

  return (
    <Screen>
      <ScreenHeader
        title="Ziele & Einstellungen"
        subtitle="Passe deine Tagesziele an"
        onBack={() => goBack()}
      />

      <SectionHeader title="Vorlagen" style={styles.firstSection} />
      <View style={styles.presetRow}>
        {PRESETS.map((preset) => {
          const active =
            String(preset.goals.kcal) === kcal &&
            String(preset.goals.protein) === protein;
          return (
            <Pressable
              key={preset.id}
              onPress={() => applyPreset(preset)}
              style={({ pressed }) => [
                styles.presetCard,
                active && styles.presetCardActive,
                pressed && styles.pressed,
              ]}
            >
              <View
                style={[
                  styles.presetIcon,
                  active && styles.presetIconActive,
                ]}
              >
                <Ionicons
                  name={preset.icon}
                  size={18}
                  color={active ? colors.white : colors.primary}
                />
              </View>
              <Text style={styles.presetTitle}>{preset.title}</Text>
              <Text style={styles.presetDescription}>{preset.description}</Text>
              <Text style={styles.presetKcal}>{preset.goals.kcal} kcal</Text>
            </Pressable>
          );
        })}
      </View>

      <SectionHeader title="Tagesziele" />
      <Card style={styles.formCard}>
        <GoalField
          label="Kalorien"
          unit="kcal"
          value={kcal}
          onChange={setKcal}
          icon="flame-outline"
          color={colors.accent}
        />
        <GoalField
          label="Protein"
          unit="g"
          value={protein}
          onChange={setProtein}
          icon="barbell-outline"
          color={colors.protein}
        />
        <GoalField
          label="Kohlenhydrate"
          unit="g"
          value={carbs}
          onChange={setCarbs}
          icon="leaf-outline"
          color={colors.carbs}
        />
        <GoalField
          label="Fett"
          unit="g"
          value={fat}
          onChange={setFat}
          icon="water-outline"
          color={colors.fat}
        />
        <Button
          label="Ziele speichern"
          icon="checkmark"
          onPress={save}
          fullWidth
          style={styles.saveButton}
        />
      </Card>

      <SectionHeader title="Über die App" />
      <Card style={styles.aboutCard}>
        <View style={styles.aboutRow}>
          <View style={styles.aboutIcon}>
            <Ionicons name="server-outline" size={18} color={colors.primary} />
          </View>
          <View style={styles.aboutText}>
            <Text style={styles.aboutTitle}>Deine Daten</Text>
            <Text style={styles.aboutDescription}>
              Tagebuch, Liste und Rezepte werden ausschließlich lokal auf
              deinem Gerät gespeichert. Es gibt kein Benutzerkonto.
            </Text>
          </View>
        </View>
        <View style={styles.aboutDivider} />
        <View style={styles.aboutRow}>
          <View style={styles.aboutIcon}>
            <Ionicons
              name="barcode-outline"
              size={18}
              color={colors.primary}
            />
          </View>
          <View style={styles.aboutText}>
            <Text style={styles.aboutTitle}>Produktdaten</Text>
            <Text style={styles.aboutDescription}>
              Barcodes und Nährwerte stammen aus der offenen Datenbank Open Food
              Facts (ODbL). Angaben können unvollständig sein.
            </Text>
          </View>
        </View>
        <View style={styles.aboutDivider} />
        <View style={styles.aboutRow}>
          <View style={styles.aboutIcon}>
            <Ionicons
              name="newspaper-outline"
              size={18}
              color={colors.primary}
            />
          </View>
          <View style={styles.aboutText}>
            <Text style={styles.aboutTitle}>Prospekte</Text>
            <Text style={styles.aboutDescription}>
              Die App listet die offiziellen Prospekte der Märkte und öffnet sie
              im Browser. Angebote und Preise stammen direkt aus dem aktuellen
              Prospekt des Marktes.
            </Text>
          </View>
        </View>
      </Card>

      <SectionHeader title="Gefahrenzone" />
      <Card style={styles.dangerCard}>
        <Text style={styles.dangerTitle}>Alle Daten zurücksetzen</Text>
        <Text style={styles.dangerText}>
          Löscht Tagebuch, Einkaufsliste, eigene Rezepte, Ziele, Kundenkarten
          und Coupons von diesem Gerät.
        </Text>
        <Button
          label="Daten zurücksetzen"
          icon="trash-outline"
          variant="danger"
          onPress={confirmReset}
          fullWidth
        />
      </Card>

      <Text style={styles.version}>KalorienKompass · Version 1.0.0</Text>
    </Screen>
  );
}

function GoalField({
  label,
  unit,
  value,
  onChange,
  icon,
  color,
}: {
  label: string;
  unit: string;
  value: string;
  onChange: (value: string) => void;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
}) {
  return (
    <View style={styles.goalField}>
      <View style={[styles.goalIcon, { backgroundColor: `${color}18` }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={styles.goalLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={(next) =>
          onChange(next.replace(/[^0-9]/g, '').slice(0, 5))
        }
        keyboardType="number-pad"
        style={styles.goalInput}
      />
      <Text style={styles.goalUnit}>{unit}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  firstSection: {
    marginTop: 0,
  },
  presetRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  presetCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: spacing.sm,
    alignItems: 'center',
    gap: 3,
  },
  presetCardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  presetIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  presetIconActive: {
    backgroundColor: colors.primary,
  },
  presetTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.text,
  },
  presetDescription: {
    fontSize: 9,
    color: colors.muted,
    textAlign: 'center',
  },
  presetKcal: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
    marginTop: 2,
  },
  formCard: {
    gap: spacing.md,
  },
  goalField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  goalIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalLabel: {
    flex: 1,
    ...typography.body,
    fontWeight: '700',
    color: colors.text,
  },
  goalInput: {
    width: 84,
    height: 42,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    textAlign: 'right',
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },
  goalUnit: {
    width: 30,
    fontSize: 11,
    fontWeight: '600',
    color: colors.muted,
  },
  saveButton: {
    marginTop: spacing.xs,
  },
  aboutCard: {
    gap: spacing.md,
  },
  aboutRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  aboutIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aboutText: {
    flex: 1,
  },
  aboutTitle: {
    ...typography.small,
    fontWeight: '800',
    color: colors.text,
  },
  aboutDescription: {
    fontSize: 11,
    lineHeight: 17,
    color: colors.muted,
    marginTop: 2,
  },
  aboutDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginLeft: 48,
  },
  dangerCard: {
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: '#F3D5D1',
  },
  dangerTitle: {
    ...typography.body,
    fontWeight: '800',
    color: colors.danger,
  },
  dangerText: {
    fontSize: 11,
    lineHeight: 17,
    color: colors.muted,
  },
  version: {
    fontSize: 10,
    color: colors.muted,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
  pressed: {
    opacity: 0.75,
  },
});
