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
- **Prospekte:** Übersichtliche Karten für die offiziellen Prospekte von Aldi, Edeka, REWE, Lidl, Penny, Netto und Kaufland. Ein Tipp öffnet den aktuellen Prospekt des Marktes im Browser.
- **Einkaufsliste:** Artikel manuell oder per Schnellauswahl hinzufügen, nach Kategorien gruppiert, abhaken und erledigte Artikel löschen.
- **Gemeinsame Einkaufsliste:** Raum mit Name und Passwort erstellen oder mit Raumcode und Passwort beitreten. Mehrere Personen können gleichzeitig Artikel hinzufügen, abhaken und löschen; die Liste gleicht sich automatisch ab.
- **Rezepte:** Sechs Startrezepte, eigene Rezepte erstellen, Portionen anpassen und alle Zutaten in die Einkaufsliste übernehmen.
- **Ziele:** Kalorien- und Makroziele bearbeiten, Daten zurücksetzen.

## Gemeinsame Einkaufsliste

Die gemeinsame Liste läuft über einen eigenen Synchronisierungs-Server (`server/sync-server.ts`), der die Räume in einer MongoDB speichert. Die App bringt die Server-Adresse bereits mit, daher ist keine Eingabe einer Server-Adresse nötig. Die Einrichtung ist weiter unten unter **Gemeinsame Liste: ohne Server-Eingabe** beschrieben.

**Raum erstellen**

1. Einkaufsliste öffnen.
2. Unter **Gemeinsam einkaufen** den eigenen Namen und ein Passwort (mindestens 4 Zeichen) eingeben.
3. Auf **Raum erstellen** tippen. Es entsteht ein sechsstelliger Raumcode.
4. Raumcode und Passwort über **Teilen** weitergeben.

**Beitreten**

1. Im selben Bereich **Beitreten** wählen.
2. Namen, Raumcode und Passwort eingeben.
3. Auf **Raum beitreten** tippen. Bereits lokal vorhandene Artikel werden ohne Duplikate mit dem Raum zusammengeführt.

Die App gleicht die Liste alle zwei Sekunden automatisch ab. Änderungen erscheinen auf allen verbundenen Geräten. Gleichzeitige Aktionen sind so abgesichert, dass keiner der beiden Einträge verloren geht: Hinzufügen wird zusammengeführt, doppeltes Löschen desselben Artikels ist folgenlos, und Abhaken wird zuletzt geschrieben.

**Wichtig:**

- Die Synchronisierung funktioniert, solange der Server erreichbar ist. Ist er nicht erreichbar, arbeitet die App mit der lokalen Liste weiter und verbindet sich automatisch wieder, sobald der Server antwortet.
- Raumdaten liegen in der MongoDB des Synchronisierungs-Servers (z. B. MongoDB Atlas). Passwörter werden nur als gesalzener `scrypt`-Hash gespeichert.
- Beim Verlassen bleiben die aktuellen Artikel lokal erhalten; nur die Verbindung zum Raum wird getrennt.

## APK bauen und auf Android installieren

### Variante A: EAS Build (empfohlen, kein Android SDK nötig)

Voraussetzungen: kostenloses Expo-Konto und Internetzugang.

```bash
npx eas-cli@latest login
npx eas-cli@latest init      # einmalig: verknüpft das Projekt
npm run build:apk            # baut eine installierbare APK
```

Nach dem Build zeigt EAS einen Download-Link an. Die APK auf dem Smartphone öffnen und die Installation aus unbekannten Quellen erlauben.

Für den **Google Play Store** stattdessen ein App Bundle bauen:

```bash
npm run build:aab
```

Die `.aab`-Datei anschließend in der Google Play Console hochladen. Für die Veröffentlichung sind dort ein Entwicklerkonto, Screenshots, eine öffentlich erreichbare Datenschutzerklärung, die Angaben im Bereich „Datensicherheit“ und eine Signatur (macht EAS automatisch) nötig. Eine Vorlage für die Datenschutzerklärung liegt in [`PRIVACY.md`](./PRIVACY.md); die Platzhalter müssen vor der Veröffentlichung ergänzt und der Text online bereitgestellt werden.

### Variante B: Lokal bauen (Windows)

Voraussetzungen:

- JDK 17 oder 18 (`JAVA_HOME` gesetzt)
- Android SDK mit `platforms;android-36`, `build-tools;36.0.0` und `ndk;27.1.12297006` (CMake 3.31.6 installiert das Skript bei Bedarf selbst)
- `ANDROID_HOME` zeigt auf das SDK-Verzeichnis

```bash
npm run build:apk:local
```

Das Skript kopiert das Projekt automatisch nach `C:\kk-build` und baut dort. Das ist nötig, weil die CMake-Objektpfade von `react-native-worklets` und `react-native-gesture-handler` im langen Projektordner die Windows-Grenze von 260 Zeichen überschreiten.

Zusätzlich installiert das Skript bei Bedarf **CMake 3.31.6** über das Android SDK und ergänzt die generierte `android/app/build.gradle` um:

```gradle
android {
    externalNativeBuild { cmake { version "3.31.6" } }
}
android.defaultConfig {
    externalNativeBuild { cmake { arguments "-DCMAKE_OBJECT_PATH_MAX=250" } }
}
```

Beides ist nötig, weil AGP standardmäßig CMake 3.22 mit `-DCMAKE_OBJECT_PATH_MAX=1024` aufruft. Damit meldet CMake zu lange Pfade nur, verkürzt sie aber nicht – der Build bricht dann mit `ninja: error: mkdir(...): No such file or directory` ab. Mit CMake 3.31 und einem realistischen Grenzwert werden zu lange Objektnamen automatisch per MD5 gekürzt.

Die fertige APK liegt danach unter `release/KalorienKompass-1.0.0.apk`.

Sie ist mit dem Debug-Schlüssel signiert und damit direkt installierbar, aber **nicht** für den Play Store geeignet. Für den Store bitte Variante A verwenden.

### Gemeinsame Liste: ohne Server-Eingabe

Die App bringt eine fest hinterlegte Server-Adresse mit
(`src/config/syncServer.ts`). Nutzer geben deshalb nur noch an:

- **Raum erstellen:** Name + Passwort (mindestens 4 Zeichen)
- **Beitreten:** Name + Raumcode + Passwort

Die Adresse lässt sich bei Bedarf unter **Erweitert** ändern. Sie wird dann nur
auf diesem Gerät gespeichert.

#### 1. Datenbank anlegen (MongoDB Atlas, dauerhaft kostenlos)

1. Auf <https://www.mongodb.com/cloud/atlas/register> registrieren.
2. Kostenlosen Cluster **M0** anlegen (512 MB Speicher, kein Ablaufdatum).
3. Unter **Database Access** einen Datenbank-Benutzer mit Passwort anlegen.
4. Unter **Network Access** `0.0.0.0/0` freigeben (Render vergibt wechselnde IPs).
5. Unter **Connect → Drivers** den Connection String kopieren:
   `mongodb+srv://BENUTZER:PASSWORT@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority

Sonderzeichen im Passwort müssen URL-kodiert werden: `%` → `%25`, `!` → `%21`,
`@` → `%40`, `#` → `%23`. Sonst schlägt die Verbindung fehl.

#### 2. Server deployen (Render, kostenlos)

1. Projekt zu GitHub hochladen (`.env` bleibt dank `.gitignore` außen vor).
2. Bei <https://render.com> mit GitHub anmelden.
3. **New + → Blueprint** wählen und das Repository angeben. Render liest
   `render.yaml` und legt den Dienst `kalorienkompass-sync` an.
4. Als Umgebungsvariable `MONGODB_URI` den Atlas-String eintragen.
5. Nach dem Deploy prüfen: `https://kalorienkompass-sync.onrender.com/health`

Heißt der Dienst anders, die URL in `src/config/syncServer.ts` eintragen und die
App neu bauen. Alternativ einmalig in der App unter **Erweitert** ändern.

Der kostenlose Tarif schläft nach 15 Minuten Ruhe ein. Der erste Aufruf danach
dauert etwa 30–60 Sekunden; die App weist darauf hin.

#### 3. Lokal testen

```bash
npm run sync:server
```

Der Server läuft auf Port `8787` und bietet `GET /health`,
`GET /api/shopping` (Status) sowie `POST /api/shopping` (Raumoperationen).
Ohne `MONGODB_URI` wird eine lokale MongoDB unter `mongodb://127.0.0.1:27017`
verwendet.

Für zwei Handys im selben WLAN `http://<PC-IP>:8787` unter **Erweitert**
eintragen. Port 8787 muss in der Firewall freigegeben sein.


## Datenquellen und Hinweise

- **Open Food Facts** (`world.openfoodfacts.org`): Produktdaten und Nährwerte. Die Datenbank ist community-gepflegt, Angaben können unvollständig oder abweichend sein. Bei Fehlern oder Rate-Limits zeigt die App lokale Vorschläge.
- **Prospekte:** Es gibt keine kostenlose, offizielle Echtzeit-API für alle Handelsketten. Die App listet daher die Märkte als Karten und öffnet die offiziellen Prospekt-Seiten im Browser. Angebote und Preise werden nicht in der App gespeichert, sondern stammen direkt aus dem aktuellen Prospekt des Marktes.
- **Barcode-Scannen:** Die Kamera funktioniert nur auf einem echten Gerät in Expo Go. Im Web-Browser wird stattdessen die manuelle Barcode-Eingabe bzw. Suche verwendet.
- **Speicherung:** Tagebuch, Ziele und Einkaufsliste liegen lokal in AsyncStorage auf dem Gerät. Diese lokalen Daten werden nicht an Dritte übertragen. Über **Ziele → Alle Daten zurücksetzen** lassen sich die lokalen Daten löschen. Ausnahme ist die ausdrücklich aktivierte gemeinsame Einkaufsliste (siehe nächster Punkt).
- **Gemeinsame Liste:** Die Raumdaten liegen in der MongoDB-Datenbank des selbst betriebenen Servers (z. B. MongoDB Atlas). Passwörter werden ausschließlich als scrypt-Hash gespeichert. Ohne eingerichteten Server bleiben alle anderen Funktionen lokal nutzbar.

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
  context/      Globaler App-State, Persistenz und Synchronisierung
  api/          Open-Food-Facts-Anbindung und Client für die gemeinsame Liste
  server/       Serverspeicher und eigenständiger Sync-Server
  data/         Lokale Lebensmittel und Startrezepte
  lib/          Datum-, Nährwert- und Haptik-Helfer
  app/api/      API-Routen des Dev-Servers (z. B. shopping+api.ts)
```
