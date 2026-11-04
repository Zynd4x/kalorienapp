import * as Haptics from 'expo-haptics';

export function tapFeedback(): void {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {
    // Haptik ist optional und auf manchen Geräten nicht verfügbar.
  });
}

export function successFeedback(): void {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
    () => {
      // Haptik ist optional und auf manchen Geräten nicht verfügbar.
    },
  );
}

export function warningFeedback(): void {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(
    () => {
      // Haptik ist optional und auf manchen Geräten nicht verfügbar.
    },
  );
}
