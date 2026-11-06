/**
 * Server-Adresse, die in der App fest hinterlegt ist.
 *
 * Dadurch brauchen Nutzer beim Erstellen oder Beitreten nur Name, Raumcode und
 * Passwort - keine Server-Adresse.
 *
 * Diese Adresse muss auf den eigenen Server zeigen. Sie laesst sich auf drei
 * Wegen ueberschreiben (in dieser Reihenfolge):
 *
 *   1. In der App unter "Erweitert" (gilt nur fuer dieses Geraet)
 *   2. Beim Build ueber EXPO_PUBLIC_SYNC_URL
 *   3. Durch Aendern dieser Konstante
 *
 * Wenn der Dienst bei Render genau "kalorienkompass-sync" heisst, passt die
 * Adresse unten automatisch. Ansonsten hier die eigene URL eintragen und die
 * App neu bauen.
 */
export const DEFAULT_SYNC_SERVER_URL =
  'https://kalorienkompass-sync.onrender.com';

/** Kuerzere Anzeige der Adresse fuer die Oberflaeche. */
export function formatSyncServer(url: string): string {
  return url.replace(/^https?:\/\//i, '').replace(/\/+$/, '');
}
