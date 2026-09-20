# Reha-Route · Version 2 · Topografisch

Persönliche Reha-Tracking-Seite mit Bergwander-Metapher im Stil einer echten
Höhenlinienkarte: dünne Konturlinien in Tinten-Navy, eine Akzentfarbe für die
Route, Hütten als Umriss-Kartensymbole. Sehr aufgeräumt und datengetrieben.

Die Seite ist rein statisch (HTML/CSS/JS/SVG) – kein Build, kein Backend.

## Dateien

| Datei         | Zweck                                                        |
|---------------|-------------------------------------------------------------|
| `index.html`  | Seitengerüst und Sektionen (`data-stil="topografisch"`)     |
| `styles.css`  | Topografisches Design (Navy-Linien, Akzentfarbe, Symbole)   |
| `app.js`      | Lade-, Positions- und Interaktionslogik (kommentiert)       |
| `daten.json`  | **Deine Inhalte** – hier trägst du alles ein                |

> `daten.json` ist mit der Papercraft-Version identisch. `app.js` unterscheidet
> sich inzwischen: Diese Topo-Version ist ein **vertikales Hochformat-Panorama**
> (Tal unten → Gipfel oben, passend zum Hochformat-Ausschnitt des Triglav-NP),
> die Papercraft-Version läuft weiterhin horizontal.

## Lokal öffnen

Weil `daten.json` per `fetch` geladen wird, blockieren Browser das direkte
Öffnen per Doppelklick (`file://`). Starte stattdessen einen kleinen Server im
Ordner:

```bash
python -m http.server 8000
```

Dann im Browser `http://localhost:8000` öffnen.

Auf **GitHub Pages** oder **Netlify** funktioniert die Seite direkt ohne
Server – einfach den Ordnerinhalt hochladen.

## Eigene Daten eintragen (`daten.json`)

Alles wird dynamisch aus dieser Datei gerendert. Du musst keinen Code anfassen.

### Grundgerüst

```jsonc
{
  "unfallDatum": "2026-08-15",              // Startpunkt / Basislager
  "ort": "Nationalpark Bohinj, Slowenien",
  "aktuellerFortschritt": null,             // null = automatisch, sonst 0..100
  "finalesZiel": { ... },
  "huetten": [ ... ],
  "zwischengipfel": [ ... ],
  "rueckschlaege": [ ... ]
}
```

### Der `fortschritt`-Wert (0–100)

Das zentrale Konzept: **jeder Punkt der Route hat einen `fortschritt` zwischen
0 (Basislager/Unfalltag) und 100 (finaler Gipfel).** Daraus ergibt sich die
Position entlang des Wegs.

Die aktuelle Position der Figur ist automatisch der **am weitesten erreichte
Punkt**:
- Eine **Hütte** gilt als erreicht, wenn ihr `datum` in der Vergangenheit liegt.
- Ein **Zwischengipfel** gilt als erreicht, wenn `erreicht: true`.
- Optional überschreibbar mit `"aktuellerFortschritt": 42`.

### Marker an echten Koordinaten platzieren (`lat` / `lon`)

Jeder Marker kann optionale **echte Geo-Koordinaten** bekommen. Dann sitzt er an
seiner tatsächlichen Stelle auf der Triglav-Karte (gemappt über die Bounding-Box
der Höhendaten in `topo-triglav.json`):

```jsonc
"lat": 46.3786,   // Breitengrad  (Nord = oben)
"lon": 13.8368    // Längengrad   (Ost = rechts)
```

- Die **Route zieht als weiche Kurve durch alle Marker mit `lat`/`lon`** – in
  Reihenfolge ihres `fortschritt`-Werts (Reha-Reihenfolge, nicht geografisch).
  `fortschritt` bleibt also für *Reihenfolge* und *aktuelle Position* zuständig,
  `lat`/`lon` bestimmen den *Ort auf der Karte*.
- Marker **ohne** `lat`/`lon` sitzen automatisch auf der Route bei ihrem
  `fortschritt`.
- Koordinaten müssen **innerhalb der Bounding-Box** liegen (siehe
  `build-topo.py` bzw. `topo-triglav.json → bbox`), sonst landet der Marker am
  Rand. Aktuell: lat 46,264–46,409 · lon 13,823–13,874.
- Fehlt `topo-triglav.json` ganz, fällt die Positionierung auf die automatische
  Serpentine (nur `fortschritt`) zurück.

> **Koordinaten-Picker:** Am einfachsten öffnest du
> [`koordinaten-picker.html`](koordinaten-picker.html) (über denselben lokalen
> Server). Die Seite zeigt die aktuellen Höhenlinien und bestehenden Marker;
> ein Klick auf die Karte liefert die passenden `lat`/`lon`-Werte zum Kopieren.
> Alternativ per Rechtsklick in Google/OpenStreetMap („Was ist hier?“).

### Hütte (Termin) mit Hüttenbuch

```jsonc
{
  "id": "physio-start",
  "name": "Physio-Basislager",
  "datum": "2026-09-05",
  "typ": "reha",              // unfall | op | arzttermin | reha (steuert das Badge)
  "fortschritt": 38,          // Reihenfolge / aktuelle Position
  "lat": 46.3180,             // optional: echte Position auf der Karte
  "lon": 13.8385,
  "beschreibung": "Kurzer Text fürs Detail-Panel.",
  "huettenbuch": [
    { "datum": "2026-09-05", "text": "Notiz zu diesem Termin ..." }
  ]
}
```

### Zwischengipfel (Etappenziel zum Abhaken)

```jsonc
{
  "id": "vollbelastung",
  "name": "Vollbelastung",
  "fortschritt": 55,
  "zieldatum": "2026-10-01",
  "erreicht": false,          // auf true setzen, wenn geschafft
  "erreichtAm": null,
  "lat": 46.3420,             // optional: echte Position auf der Karte
  "lon": 13.8320,
  "beschreibung": "Optionaler Text."
}
```

### Rückschlag (Weg dellt kurz nach unten)

```jsonc
{
  "datum": "2026-09-01",
  "fortschritt": 34,          // wo auf der Route die Delle sitzt
  "beschreibung": "Was passiert ist.",
  "einfluss": "mittel"        // klein | mittel | gross (Tiefe der Delle)
}
```

Der zurückgelegte Weg bleibt sichtbar – ein Rückschlag „löscht“ nichts.

### Finaler Gipfel + Gipfelbuch

```jsonc
"finalesZiel": {
  "name": "Marathon unter 3:00 h",
  "zieldatum": null,
  "beschreibung": "...",
  "erreicht": false,          // solange false: Gipfelbuch bleibt gesperrt
  "erreichtAm": null,
  "lat": 46.3786,             // optional: echte Gipfelposition (hier Triglav)
  "lon": 13.8368,
  "gipfelbuch": [ /* erst befüllen, wenn erreicht */ ]
}
```

## Echte Topo-Daten (Triglav-Nationalpark)

Der Höhenlinien-Hintergrund sind **keine erfundenen Kreise**, sondern echte
Geländedaten aus dem Triglav-Nationalpark (Bohinj-Region, Slowenien):

- Quelle: **EU-DEM 25 m** über die freie API von opentopodata.org.
- Ein Höhengitter über die Region wird abgetastet, daraus per
  **Marching-Squares** die Höhenlinien (Isolinien, alle 100 m) berechnet und
  in `topo-triglav.json` gebacken. Die App lädt nur diese Datei – **kein
  Internet zur Laufzeit nötig**, bleibt also offline- und statisch-tauglich.
- Aktueller Ausschnitt: Bohinj-Tal (≈526 m) bis **Triglav 2864 m**, Hochformat
  (~16 km N–S × 4 km O–W).
- Fehlt `topo-triglav.json`, fällt die Seite automatisch auf schematische
  Konturen zurück.

### Daten neu erzeugen / Region ändern

```bash
python build-topo.py topo-triglav.json
```

In `build-topo.py` oben lassen sich Bounding-Box (`LAT_MIN…`, `LON_MIN…`),
Gitterauflösung (`COLS`, `ROWS`), Höhenlinien-Intervall (`intervall`,
`index_iv`) und die benannten Gipfel (`PEAKS`) anpassen. Das Skript hält das
API-Rate-Limit (1 Anfrage/s) ein und braucht nur die Python-Standardbibliothek.

**Parameter passend zum Ausschnitt wählen (wichtig für unverzerrte Linien):**

1. Seitenverhältnis der Box berechnen (Breite mit `cos(Breitengrad)` korrigieren):
   `Höhe:Breite = ΔLat·111 / (ΔLon·111·cos(lat))`.
   Beispiel aktueller Ausschnitt: ~16,1 km / 3,98 km ≈ **4,06 : 1** (Hochformat).
2. `WELT_W`/`WELT_H` **im selben Verhältnis** setzen (hier 640 × 2600) – und
   **identisch in `app.js`** (Konstanten `WELT_W`, `WELT_H`). Bei Querformat
   entsprechend breiter statt höher.
3. `COLS`/`ROWS` im selben Verhältnis, so dass die Rasterweite ~100–150 m ergibt
   (hier 32 × 128 → ~125 m). `COLS·ROWS` ≤ ~5000 halten (Rate-Limit, ~1 Min).
4. `intervall` = Höhenlinien-Abstand: 100 m für zoomige/steile Ausschnitte,
   200 m für großflächige. `index_iv` = jede N-te Linie kräftiger (hier 500 m).

## Bedienung

Die Landschaft ist ein **vertikal begehbares Hochformat-Panorama**: ziehen,
Pfeiltasten hoch/runter, die Buttons **▲ Gipfel / ▼ Tal** oder die Minimap
(rechter Rand) verschieben den Ausschnitt – unten das Tal (Basislager, Unfalltag),
oben der Gipfel (Ziel). Die Karte bewegt sich als eine Ebene, die Route/Figur
liegt mit leichtem Parallax davor. Der Tagecounter bleibt als Overlay sichtbar,
**● Jetzt** springt zur aktuellen Position. Bewusst ohne Prozentanzeige – der
Fortschritt zeigt sich an der Position der Figur.

**Etappen & Gipfel:** Die Übersicht der Zwischengipfel und das Gipfelbuch sind
standardmäßig ausgeblendet und öffnen sich als Overlay-Panel über den Button
**📖 Etappen & Gipfel** an der Hero-Karte (schließen per ×, Klick auf den
Hintergrund oder Esc).

## Anpassen des Designs

- Farben (Navy, Akzent) & Abstände: oben in `styles.css` unter `:root`.
- Echte Höhenlinien laden/zeichnen: Funktion `zeichneKarte()` in `app.js`.
- Welt-Größe & Routengeometrie: Konstanten am Anfang von `app.js`
  (`WELT_W`, `WELT_H`, `RAND_X`, `SERP_AMP`/`SERP_FREQ` für die Serpentinen,
  `yProg()`/`xFuer()`). **`WELT_W`/`WELT_H` müssen zu `build-topo.py` passen.**
- Parallax-Tiefe der Ebenen (Karte vs. Route): Objekt `TIEFE` in `app.js`.
