import { router } from 'expo-router';

/**
 * Navigate back when possible. Falls back to a sensible route when the
 * current screen was opened directly (deep link / fresh start) and there is
 * no navigation history to go back to.
 */
export function goBack(fallback = '/') {
  if (router.canGoBack()) {
    router.back();
    return;
  }
  router.replace(fallback);
}
