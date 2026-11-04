# KalorienKompass

Mobile Android-App (Expo / React Native) zum Tracken von Kalorien und Makros, zum Scannen von Barcodes, zum Durchstöbern von Prospekten und zum Verwalten einer Einkaufsliste mit Rezepten.

## Schnellstart mit Expo Go

Voraussetzungen:

- Node.js 20 oder neuer
- npm
- Expo Go auf dem Android-Gerät (aktuelle Version für SDK 58)
- Internetzugang (für den Tunnel)

```bash
cd kalorienapp
npm install
npm start
```

`npm start` nutzt standardmäßig einen **ngrok-Tunnel**. Dadurch funktioniert der QR-Code auch dann, wenn Handy und Rechner in unterschiedlichen Netzen sind oder das WLAN den direkten Zugriff blockiert. Anschließend den QR-Code im Terminal mit Expo Go scannen.

Wenn Rechner und Handy im selben WLAN sind und direkt miteinander kommunizieren dürfen, kann auch der schnellere LAN-Modus verwendet werden:

```bash
npm run start:lan
```

Die App startet direkt ohne weitere Konfiguration. Alle Daten bleiben lokal auf dem Gerät.

### Fehler „Failed to download remote update“

Dieser Fehler bedeutet fast immer, dass Expo Go den JavaScript-Bundle nicht vom Rechner herunterladen kann. Ursachen sind meist:

- Handy und Rechner sind in unterschiedlichen Netzen (z. B. WLAN vs. LAN/VLAN).
- Das WLAN blockiert die Kommunikation zwischen Geräten (Client Isolation).
- Die Windows-Firewall blockiert Port `8081`.
- Der QR-Code zeigt auf eine alte bzw. nicht erreichbare IP-Adresse.

**Lösung:** Tunnel-Modus verwenden:

```bash
npm run start:tunnel
```

Der QR-Code enthält dann eine öffentliche `*.exp.direct`-Adresse und funktioniert netzwerkunabhängig. Falls der Tunnel nicht erreichbar ist, Expo Go aktualisieren und den Rechner ggf. mit dem Handy-Hotspot verbinden und `npm run start:lan` verwenden.

## Funktionen

- **Heute:** Kalorienring, Makro-Balken, Wasser-Tracker, Mahlzeiten (Frühstück, Mittag, Abend, Snack) und Tagesnavigation.
- **Scannen:** Barcode mit der Kamera scannen oder manuell eingeben. Nährwerte kommen von Open Food Facts; zusätzlich gibt es eine lokale Lebensmittel-Suche als Fallback.
- **Prospekte:** Direktlinks zu den offiziellen Prospekten von Aldi, Edeka, REWE, Lidl, Penny, Netto und Kaufland sowie Beispielangebote, die sich mit einem Tipp zur Einkaufsliste hinzufügen lassen.
- **Einkaufsliste:** Artikel manuell oder per Schnellauswahl hinzufügen, nach Kategorien gruppiert, abhaken und erledigte Artikel löschen.
- **Rezepte:** Sechs Startrezepte, eigene Rezepte erstellen, Portionen anpassen und alle Zutaten in die Einkaufsliste übernehmen.
- **Ziele:** Kalorien- und Makroziele bearbeiten, Daten zurücksetzen.

## Datenquellen und Hinweise

- **Open Food Facts** (`world.openfoodfacts.org`): Produktdaten und Nährwerte. Die Datenbank ist community-gepflegt, Angaben können unvollständig oder abweichend sein. Bei Fehlern oder Rate-Limits zeigt die App lokale Vorschläge.
- **Prospekte:** Es gibt keine kostenlose, offizielle Echtzeit-API für alle Handelsketten. Die App öffnet daher die offiziellen Prospekt-Seiten im Browser. Die angezeigten Angebote und Preise sind ausdrücklich **Beispielangebote**.
- **Barcode-Scannen:** Die Kamera funktioniert nur auf einem echten Gerät in Expo Go. Im Web-Browser wird stattdessen die manuelle Barcode-Eingabe bzw. Suche verwendet.
- **Speicherung:** AsyncStorage auf dem Gerät. Es werden keine Daten an Dritte übertragen. Über **Ziele → Alle Daten zurücksetzen** lassen sich die lokalen Daten löschen.

## Nützliche Befehle

```bash
npm start                 # Dev-Server mit ngrok-Tunnel starten
npm run start:tunnel      # Explizit Tunnel-Modus
npm run start:lan         # LAN-Modus (gleiches Netzwerk)
npx tsc --noEmit          # TypeScript prüfen
npx expo-doctor           # Abhängigkeiten und Konfiguration prüfen
npx expo export --platform android   # Android-Bundle testen
```

## Projektstruktur

```
src/
  app/          Expo-Router-Routen (dünne Re-Exports)
  screens/      Bildschirme (Home, Scan, Offers, List, Recipes, Goals, ...)
  components/   Gemeinsame UI-Komponenten
  context/      Globaler App-State und Persistenz
  api/          Open-Food-Facts-Anbindung
  data/         Lokale Lebensmittel und Startrezepte
  lib/          Datum-, Nährwert- und Haptik-Helfer
```
