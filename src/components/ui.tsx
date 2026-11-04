import React from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';
import { colors, radius, shadow, spacing, typography } from '../theme';
import { clamp, foodEmoji } from '../lib/nutrition';

export type IconName = React.ComponentProps<typeof Ionicons>['name'];

interface ScreenProps {
  children: React.ReactNode;
  scroll?: boolean;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  footer?: React.ReactNode;
  keyboardShouldPersistTaps?: 'always' | 'never' | 'handled';
  refreshControl?: React.ReactElement;
}

export function Screen({
  children,
  scroll = true,
  style,
  contentContainerStyle,
  footer,
  keyboardShouldPersistTaps = 'handled',
  refreshControl,
}: ScreenProps) {
  const content = scroll ? (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={[styles.scrollContent, contentContainerStyle]}
      keyboardShouldPersistTaps={keyboardShouldPersistTaps}
      showsVerticalScrollIndicator={false}
      refreshControl={refreshControl}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.flex, contentContainerStyle]}>{children}</View>
  );

  return (
    <SafeAreaView edges={['top']} style={[styles.safe, style]}>
      {content}
      {footer}
    </SafeAreaView>
  );
}

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  right?: React.ReactNode;
  compact?: boolean;
}

export function ScreenHeader({
  title,
  subtitle,
  onBack,
  right,
  compact = false,
}: ScreenHeaderProps) {
  return (
    <View style={[styles.header, compact && styles.headerCompact]}>
      <View style={styles.headerLeft}>
        {onBack ? (
          <Pressable
            onPress={onBack}
            hitSlop={12}
            style={({ pressed }) => [
              styles.backButton,
              pressed && styles.pressed,
            ]}
          >
            <Ionicons name="arrow-back" size={21} color={colors.text} />
          </Pressable>
        ) : null}
        <View style={styles.headerTextWrap}>
          <Text style={styles.headerTitle}>{title}</Text>
          {subtitle ? <Text style={styles.headerSubtitle}>{subtitle}</Text> : null}
        </View>
      </View>
      {right ? <View style={styles.headerRight}>{right}</View> : null}
    </View>
  );
}

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
}

export function Card({ children, style, onPress }: CardProps) {
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.card,
          style,
          pressed && styles.cardPressed,
        ]}
      >
        {children}
      </Pressable>
    );
  }
  return <View style={[styles.card, style]}>{children}</View>;
}

interface ButtonProps {
  label: string;
  onPress: () => void;
  icon?: IconName;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  fullWidth?: boolean;
}

export function Button({
  label,
  onPress,
  icon,
  variant = 'primary',
  disabled = false,
  loading = false,
  style,
  fullWidth = false,
}: ButtonProps) {
  const palette = {
    primary: { background: colors.primary, text: colors.white, border: colors.primary },
    secondary: {
      background: colors.primaryLight,
      text: colors.primaryDark,
      border: colors.primaryLight,
    },
    outline: {
      background: colors.surface,
      text: colors.text,
      border: colors.border,
    },
    danger: {
      background: colors.dangerLight,
      text: colors.danger,
      border: colors.dangerLight,
    },
    ghost: {
      background: 'transparent',
      text: colors.primary,
      border: 'transparent',
    },
  }[variant];

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: palette.background,
          borderColor: palette.border,
        },
        fullWidth && styles.fullWidth,
        (disabled || loading) && styles.disabled,
        pressed && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={palette.text} />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={18} color={palette.text} /> : null}
          <Text style={[styles.buttonLabel, { color: palette.text }]}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

interface IconButtonProps {
  icon: IconName;
  onPress: () => void;
  size?: number;
  color?: string;
  background?: string;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

export function IconButton({
  icon,
  onPress,
  size = 40,
  color = colors.text,
  background = colors.surface,
  accessibilityLabel,
  style,
}: IconButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={accessibilityLabel}
      hitSlop={8}
      style={({ pressed }) => [
        styles.iconButton,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: background,
        },
        pressed && styles.pressed,
        style,
      ]}
    >
      <Ionicons name={icon} size={size * 0.48} color={color} />
    </Pressable>
  );
}

interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  color?: string;
  lightColor?: string;
  icon?: IconName;
}

export function Chip({
  label,
  selected = false,
  onPress,
  color = colors.primary,
  lightColor = colors.primaryLight,
  icon,
}: ChipProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: selected ? color : lightColor,
          borderColor: selected ? color : 'transparent',
        },
        pressed && onPress ? styles.pressed : null,
      ]}
    >
      {icon ? (
        <Ionicons
          name={icon}
          size={14}
          color={selected ? colors.white : color}
        />
      ) : null}
      <Text
        style={[
          styles.chipLabel,
          { color: selected ? colors.white : color },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

interface ProgressBarProps {
  value: number;
  color?: string;
  trackColor?: string;
  height?: number;
}

export function ProgressBar({
  value,
  color = colors.primary,
  trackColor = colors.surfaceAlt,
  height = 8,
}: ProgressBarProps) {
  const width = `${Math.round(clamp(value, 0, 1) * 100)}%` as `${number}%`;
  return (
    <View style={[styles.progressTrack, { height, backgroundColor: trackColor }]}>
      <View
        style={[
          styles.progressFill,
          { width, backgroundColor: color, borderRadius: height / 2 },
        ]}
      />
    </View>
  );
}

interface MacroBarProps {
  label: string;
  current: number;
  goal: number;
  color: string;
  unit?: string;
}

export function MacroBar({
  label,
  current,
  goal,
  color,
  unit = 'g',
}: MacroBarProps) {
  return (
    <View style={styles.macroRow}>
      <View style={styles.macroTop}>
        <View style={styles.macroLabelWrap}>
          <View style={[styles.macroDot, { backgroundColor: color }]} />
          <Text style={styles.macroLabel}>{label}</Text>
        </View>
        <Text style={styles.macroValue}>
          {Math.round(current)}
          <Text style={styles.macroGoal}>
            {' '}
            / {Math.round(goal)} {unit}
          </Text>
        </Text>
      </View>
      <ProgressBar value={goal > 0 ? current / goal : 0} color={color} height={7} />
    </View>
  );
}

interface CalorieRingProps {
  consumed: number;
  goal: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  trackColor?: string;
  textColor?: string;
  subTextColor?: string;
}

export function CalorieRing({
  consumed,
  goal,
  size = 132,
  strokeWidth = 11,
  color = colors.white,
  trackColor = 'rgba(255,255,255,0.24)',
  textColor = colors.white,
  subTextColor = 'rgba(255,255,255,0.8)',
}: CalorieRingProps) {
  const radiusValue = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radiusValue;
  const ratio = clamp(goal > 0 ? consumed / goal : 0, 0, 1);
  const offset = circumference * (1 - ratio);
  const remaining = Math.round(goal - consumed);

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radiusValue}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radiusValue}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={styles.ringCenter}>
        <Text style={[styles.ringValue, { color: textColor }]}>
          {Math.abs(remaining)}
        </Text>
        <Text style={[styles.ringLabel, { color: subTextColor }]}>
          {remaining >= 0 ? 'kcal übrig' : 'kcal über Ziel'}
        </Text>
      </View>
    </View>
  );
}

interface EmptyStateProps {
  icon: IconName;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  icon,
  title,
  message,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIcon}>
        <Ionicons name={icon} size={30} color={colors.primary} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyMessage}>{message}</Text>
      {actionLabel && onAction ? (
        <Button
          label={actionLabel}
          onPress={onAction}
          variant="secondary"
          style={styles.emptyButton}
        />
      ) : null}
    </View>
  );
}

interface FoodAvatarProps {
  name: string;
  imageUrl?: string;
  size?: number;
}

export function FoodAvatar({ name, imageUrl, size = 48 }: FoodAvatarProps) {
  return (
    <View
      style={[
        styles.foodAvatar,
        { width: size, height: size, borderRadius: size * 0.32 },
      ]}
    >
      {imageUrl ? (
        <Image
          source={{ uri: imageUrl }}
          style={{ width: size, height: size, borderRadius: size * 0.32 }}
          resizeMode="cover"
        />
      ) : (
        <Text style={{ fontSize: size * 0.46 }}>{foodEmoji(name)}</Text>
      )}
    </View>
  );
}

interface SectionHeaderProps {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
}

export function SectionHeader({
  title,
  actionLabel,
  onAction,
  style,
}: SectionHeaderProps) {
  return (
    <View style={[styles.sectionHeader, style]}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {actionLabel && onAction ? (
        <Pressable onPress={onAction} hitSlop={8}>
          <Text style={styles.sectionAction}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function Divider() {
  return <View style={styles.divider} />;
}

export function Badge({
  label,
  color = colors.primary,
  background = colors.primaryLight,
}: {
  label: string;
  color?: string;
  background?: string;
}) {
  return (
    <View style={[styles.badge, { backgroundColor: background }]}>
      <Text style={[styles.badgeText, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    gap: spacing.md,
  },
  headerCompact: {
    paddingBottom: spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  headerTextWrap: {
    flex: 1,
  },
  headerTitle: {
    ...typography.h1,
    color: colors.text,
  },
  headerSubtitle: {
    ...typography.small,
    color: colors.muted,
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    ...shadow,
  },
  cardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.995 }],
  },
  button: {
    minHeight: 48,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderWidth: 1,
  },
  fullWidth: {
    width: '100%',
  },
  buttonLabel: {
    fontSize: 15,
    fontWeight: '700',
  },
  disabled: {
    opacity: 0.45,
  },
  pressed: {
    opacity: 0.78,
  },
  iconButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  chipLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  progressTrack: {
    width: '100%',
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
  },
  macroRow: {
    gap: 7,
  },
  macroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  macroLabelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  macroDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  macroLabel: {
    ...typography.small,
    color: colors.textSoft,
    fontWeight: '600',
  },
  macroValue: {
    ...typography.small,
    color: colors.text,
    fontWeight: '700',
  },
  macroGoal: {
    color: colors.muted,
    fontWeight: '500',
  },
  ringCenter: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringValue: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -1,
  },
  ringLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 1,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 24,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  emptyTitle: {
    ...typography.h3,
    color: colors.text,
    textAlign: 'center',
  },
  emptyMessage: {
    ...typography.small,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: spacing.xs,
  },
  emptyButton: {
    marginTop: spacing.lg,
  },
  foodAvatar: {
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text,
  },
  sectionAction: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.full,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
});
