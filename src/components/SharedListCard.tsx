import React, { useEffect, useState } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card } from './ui';
import { useApp } from '../context/AppContext';
import { loadSyncServerUrl, saveSyncServerUrl } from '../api/syncServerSetting';
import { DEFAULT_SYNC_SERVER_URL, formatSyncServer } from '../config/syncServer';
import { colors, radius, spacing, typography } from '../theme';
import { successFeedback } from '../lib/haptics';
import type { SharedStatus } from '../types';

type Mode = 'create' | 'join';

const STATUS_LABEL: Record<SharedStatus, string> = {
  disconnected: 'Nicht verbunden',
  connecting: 'Verbinde …',
  online: 'Verbunden',
  offline: 'Offline',
  error: 'Fehler',
};

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

export function SharedListCard() {
  const {
    sharedConnection,
    sharedStatus,
    sharedError,
    sharedLastSync,
    createSharedRoom,
    joinSharedRoom,
    leaveSharedRoom,
    syncSharedNow,
  } = useApp();

  const [mode, setMode] = useState<Mode>('create');
  const [name, setName] = useState(sharedConnection?.name ?? '');
  const [room, setRoom] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [serverUrl, setServerUrl] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    if (sharedConnection?.name) setName(sharedConnection.name);
  }, [sharedConnection?.name]);

  useEffect(() => {
    let active = true;
    loadSyncServerUrl().then((value) => {
      if (active) setServerUrl(value);
    });
    return () => {
      active = false;
    };
  }, []);

  const submit = async () => {
    if (busy) return;
    setBusy(true);
    setFormError(null);
    try {
      // Die Adresse zuerst sichern: Sie bestimmt, wohin die Anfrage geht.
      await saveSyncServerUrl(serverUrl);

      const result =
        mode === 'create'
          ? await createSharedRoom(name, password)
          : await joinSharedRoom(name, room, password);

      if (result.ok) {
        successFeedback();
        setPassword('');
        setRoom('');
      } else {
        setFormError(result.message ?? 'Die Verbindung ist fehlgeschlagen.');
      }
    } finally {
      setBusy(false);
    }
  };

  const handleShare = async () => {
    if (!sharedConnection) return;
    const text =
      `Gemeinsame Einkaufsliste in KalorienKompass\n` +
      `Raumcode: ${sharedConnection.room}\n` +
      `Passwort: ${sharedConnection.password}\n\n` +
      `So beitreten: Einkaufsliste → Gemeinsam einkaufen → Beitreten`;

    if (Platform.OS === 'web') {
      Alert.alert('Raum teilen', text);
      return;
    }

    try {
      await Share.share({ message: text });
    } catch {
      Alert.alert('Raum teilen', text);
    }
  };

  const handleSync = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await syncSharedNow();
    } finally {
      setBusy(false);
    }
  };

  const confirmLeave = () => {
    if (Platform.OS === 'web') {
      // Alert.alert unterstützt im Web keine Buttons, daher window.confirm.
      const canAsk =
        typeof window !== 'undefined' && typeof window.confirm === 'function';
      if (
        !canAsk ||
        window.confirm(
          'Gemeinsame Liste verlassen?\n\nDeine Artikel bleiben lokal erhalten. Die Verbindung zum Raum wird getrennt.',
        )
      ) {
        void leaveSharedRoom();
      }
      return;
    }

    Alert.alert(
      'Gemeinsame Liste verlassen?',
      'Deine Artikel bleiben lokal erhalten. Die Verbindung zum Raum wird getrennt.',
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Verlassen',
          style: 'destructive',
          onPress: () => {
            void leaveSharedRoom();
          },
        },
      ],
    );
  };

  if (sharedConnection) {
    const isOnline = sharedStatus === 'online';
    const isError = sharedStatus === 'error';
    const statusColor = isOnline
      ? colors.primary
      : isError
        ? colors.danger
        : colors.accent;
    const statusBackground = isOnline
      ? colors.primaryLight
      : isError
        ? colors.dangerLight
        : colors.accentLight;

    return (
      <Card style={styles.connectedCard}>
        <View style={styles.connectedHeader}>
          <View style={styles.connectedTitleWrap}>
            <View style={styles.connectedIcon}>
              <Ionicons name="people" size={20} color={colors.primary} />
            </View>
            <View style={styles.connectedTitleText}>
              <Text style={styles.connectedTitle}>Gemeinsame Liste</Text>
              <Text style={styles.connectedSubtitle}>
                {sharedConnection.name
                  ? `Angemeldet als ${sharedConnection.name}`
                  : 'Gemeinsam einkaufen'}
              </Text>
            </View>
          </View>
          <View
            style={[styles.statusBadge, { backgroundColor: statusBackground }]}
          >
            <View
              style={[styles.statusDot, { backgroundColor: statusColor }]}
            />
            <Text style={[styles.statusText, { color: statusColor }]}>
              {STATUS_LABEL[sharedStatus]}
            </Text>
          </View>
        </View>

        <View style={styles.codeBox}>
          <View style={styles.codeTextWrap}>
            <Text style={styles.codeLabel}>RAUMCODE</Text>
            <Text selectable style={styles.codeValue}>
              {sharedConnection.room}
            </Text>
          </View>
          <Pressable
            onPress={handleShare}
            hitSlop={8}
            style={({ pressed }) => [
              styles.shareButton,
              pressed && styles.pressed,
            ]}
          >
            <Ionicons name="share-social-outline" size={17} color={colors.primary} />
            <Text style={styles.shareButtonText}>Teilen</Text>
          </Pressable>
        </View>

        <Text style={styles.syncHint}>
          {sharedLastSync
            ? `Zuletzt synchronisiert um ${formatTime(sharedLastSync)} Uhr. Änderungen erscheinen automatisch bei allen.`
            : 'Die Liste wird automatisch mit allen im Raum abgeglichen.'}
        </Text>

        {sharedError && sharedStatus !== 'online' ? (
          <View style={styles.errorBox}>
            <Ionicons
              name="cloud-offline-outline"
              size={16}
              color={colors.danger}
            />
            <Text style={styles.errorText}>{sharedError}</Text>
          </View>
        ) : null}

        <View style={styles.actionRow}>
          <Button
            label="Jetzt abgleichen"
            icon="sync-outline"
            variant="secondary"
            onPress={handleSync}
            loading={busy}
            style={styles.actionButton}
          />
          <Button
            label="Verlassen"
            icon="exit-outline"
            variant="outline"
            onPress={confirmLeave}
            style={styles.actionButton}
          />
        </View>
      </Card>
    );
  }

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Ionicons name="people-outline" size={22} color={colors.primary} />
        </View>
        <View style={styles.headerTextWrap}>
          <Text style={styles.title}>Gemeinsam einkaufen</Text>
          <Text style={styles.subtitle}>
            Erstelle einen Raum oder tritt mit Raumcode und Passwort bei.
          </Text>
        </View>
      </View>

      <View style={styles.modeRow}>
        <Pressable
          onPress={() => {
            setMode('create');
            setFormError(null);
          }}
          style={[
            styles.modeButton,
            mode === 'create' && styles.modeButtonActive,
          ]}
        >
          <Ionicons
            name="add-circle-outline"
            size={16}
            color={mode === 'create' ? colors.white : colors.primary}
          />
          <Text
            style={[
              styles.modeText,
              mode === 'create' && styles.modeTextActive,
            ]}
          >
            Raum erstellen
          </Text>
        </Pressable>
        <Pressable
          onPress={() => {
            setMode('join');
            setFormError(null);
          }}
          style={[
            styles.modeButton,
            mode === 'join' && styles.modeButtonActive,
          ]}
        >
          <Ionicons
            name="enter-outline"
            size={16}
            color={mode === 'join' ? colors.white : colors.primary}
          />
          <Text
            style={[
              styles.modeText,
              mode === 'join' && styles.modeTextActive,
            ]}
          >
            Beitreten
          </Text>
        </Pressable>
      </View>

      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="Dein Name, z. B. Alex"
        placeholderTextColor={colors.muted}
        style={styles.input}
        maxLength={40}
        autoCapitalize="words"
        returnKeyType="next"
      />

      {mode === 'join' ? (
        <TextInput
          value={room}
          onChangeText={(value) =>
            setRoom(value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8))
          }
          placeholder="Raumcode, z. B. K7M2QX"
          placeholderTextColor={colors.muted}
          style={[styles.input, styles.codeInput]}
          maxLength={8}
          autoCapitalize="characters"
          autoCorrect={false}
          returnKeyType="next"
        />
      ) : null}

      <TextInput
        value={password}
        onChangeText={setPassword}
        placeholder="Passwort (mindestens 4 Zeichen)"
        placeholderTextColor={colors.muted}
        style={styles.input}
        maxLength={100}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="done"
        onSubmitEditing={submit}
      />

      {formError ? (
        <View style={styles.errorBox}>
          <Ionicons name="alert-circle-outline" size={16} color={colors.danger} />
          <Text style={styles.errorText}>{formError}</Text>
        </View>
      ) : null}

      <Button
        label={mode === 'create' ? 'Raum erstellen' : 'Raum beitreten'}
        icon={mode === 'create' ? 'add-circle-outline' : 'enter-outline'}
        onPress={submit}
        loading={busy}
        fullWidth
      />

      <Text style={styles.footnote}>
        Beim Beitreten werden deine bisherigen lokalen Artikel mit dem Raum
        zusammengeführt. Beide Geräte können gleichzeitig Artikel hinzufügen,
        abhaken und löschen.
      </Text>

      <Pressable
        onPress={() => setShowAdvanced((value) => !value)}
        hitSlop={8}
        style={({ pressed }) => [
          styles.advancedToggle,
          pressed && styles.pressed,
        ]}
      >
        <Ionicons
          name={showAdvanced ? 'chevron-up' : 'chevron-down'}
          size={14}
          color={colors.muted}
        />
        <Text style={styles.advancedToggleText}>Erweitert</Text>
      </Pressable>

      {showAdvanced ? (
        <View style={styles.serverBlock}>
          <Text style={styles.serverLabel}>Server-Adresse</Text>
          <TextInput
            value={serverUrl}
            onChangeText={setServerUrl}
            onEndEditing={() => {
              void saveSyncServerUrl(serverUrl);
            }}
            placeholder={formatSyncServer(DEFAULT_SYNC_SERVER_URL)}
            placeholderTextColor={colors.muted}
            style={styles.input}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
          />
          <Text style={styles.serverHint}>
            {serverUrl
              ? 'Eigene Adresse aktiv. Leeren, um wieder den eingebauten Server zu nutzen.'
              : `Leer lassen – die App nutzt automatisch ${formatSyncServer(DEFAULT_SYNC_SERVER_URL)}.`}
          </Text>
          {serverUrl ? (
            <Pressable
              onPress={() => {
                setServerUrl('');
                void saveSyncServerUrl('');
              }}
              hitSlop={8}
              style={({ pressed }) => [
                styles.resetServer,
                pressed && styles.pressed,
              ]}
            >
              <Ionicons name="refresh-outline" size={14} color={colors.primary} />
              <Text style={styles.resetServerText}>Auf Standard zurücksetzen</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.xs,
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextWrap: {
    flex: 1,
  },
  title: {
    ...typography.h3,
    color: colors.text,
  },
  subtitle: {
    ...typography.small,
    color: colors.muted,
    marginTop: 2,
    lineHeight: 18,
  },
  modeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
  },
  modeButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  modeButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  modeText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  modeTextActive: {
    color: colors.white,
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
  codeInput: {
    letterSpacing: 2,
    fontWeight: '800',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    backgroundColor: colors.dangerLight,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    color: colors.danger,
    fontWeight: '600',
  },
  footnote: {
    fontSize: 11,
    lineHeight: 16,
    color: colors.muted,
    marginTop: 2,
  },
  serverBlock: {
    gap: 6,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  serverLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
    color: colors.muted,
    textTransform: 'uppercase',
  },
  serverHint: {
    fontSize: 11,
    lineHeight: 16,
    color: colors.muted,
  },
  advancedToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: spacing.xs,
    paddingVertical: 4,
  },
  advancedToggleText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.muted,
  },
  resetServer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
  },
  resetServerText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  connectedCard: {
    gap: spacing.md,
    backgroundColor: colors.surface,
  },
  connectedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  connectedTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  connectedIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  connectedTitleText: {
    flex: 1,
  },
  connectedTitle: {
    ...typography.h3,
    color: colors.text,
  },
  connectedSubtitle: {
    fontSize: 11,
    color: colors.muted,
    marginTop: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: radius.full,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
  },
  codeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  codeTextWrap: {
    flex: 1,
  },
  codeLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
    color: colors.muted,
  },
  codeValue: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 3,
    color: colors.text,
    marginTop: 1,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.surface,
    borderRadius: radius.full,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: colors.border,
  },
  shareButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  syncHint: {
    fontSize: 11,
    lineHeight: 16,
    color: colors.muted,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionButton: {
    flex: 1,
  },
  pressed: {
    opacity: 0.7,
  },
});
