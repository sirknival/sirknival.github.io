#!/usr/bin/env python3
"""
Baut echte Hoehenlinien fuer den Triglav-Nationalpark als statische JSON-Datei.

Ablauf:
  1) Hoehengitter (DEM) ueber eine Bounding-Box abtasten (opentopodata, EU-DEM 25 m).
  2) Per Marching-Squares echte Hoehenlinien (Isolinien) berechnen.
  3) In Weltkoordinaten (WELT_W x WELT_H) mappen und als SVG-Pfade ausgeben.

Ergebnis: topo-triglav.json  ->  wird von der Topo-Version geladen.
"""

import json, time, math, urllib.request, urllib.parse, sys

# --- Weltmasse (muessen zu app.js passen) ---
# Hochformat: Verhaeltnis WELT_H/WELT_W ~ Seitenverhaeltnis der Bounding-Box (~4.06).
WELT_W, WELT_H = 640, 2600

# --- Bounding-Box im Triglav-Nationalpark (Hochformat, Tal unten -> Gipfel oben) ---
# Nord oben. Umfasst Bohinj-Tal (Sued) bis Triglav (Nord, 46.3786, 13.8368).
LAT_MIN, LAT_MAX = 46.264164, 46.40917687954663    # Sued -> Nord
LON_MIN, LON_MAX = 13.822684, 13.87443908784201    # West -> Ost

COLS, ROWS = 32, 128                    # Gitteraufloesung (~125 m Rasterweite)
DATASET = "eudem25m"
BATCH = 100                             # max. Punkte pro API-Anfrage
PAUSE = 1.1                             # s zwischen Anfragen (Rate-Limit)

# Benannte Gipfel, die als Label eingezeichnet werden (falls in der Box).
PEAKS = [
    {"name": "Triglav", "lat": 46.3786, "lon": 13.8368, "hoehe": 2864},
    {"name": "Kanjavec", "lat": 46.3597, "lon": 13.8145, "hoehe": 2568},
    {"name": "Bogatin", "lat": 46.2905, "lon": 13.8000, "hoehe": 1977},
]


def gitter_punkte():
    pts = []
    for r in range(ROWS):
        # r=0 -> Norden (oben, LAT_MAX), r=ROWS-1 -> Sueden (unten)
        lat = LAT_MAX - (r / (ROWS - 1)) * (LAT_MAX - LAT_MIN)
        for c in range(COLS):
            lon = LON_MIN + (c / (COLS - 1)) * (LON_MAX - LON_MIN)
            pts.append((lat, lon))
    return pts


def hole_hoehen(pts):
    """Fragt die Hoehen batchweise ab und gibt eine flache Liste zurueck."""
    hoehen = []
    n = len(pts)
    for i in range(0, n, BATCH):
        teil = pts[i:i + BATCH]
        loc = "|".join(f"{lat:.6f},{lon:.6f}" for lat, lon in teil)
        url = f"https://api.opentopodata.org/v1/{DATASET}?" + urllib.parse.urlencode({"locations": loc})
        for versuch in range(4):
            try:
                with urllib.request.urlopen(url, timeout=30) as resp:
                    data = json.load(resp)
                if data.get("status") != "OK":
                    raise RuntimeError(data)
                for res in data["results"]:
                    e = res["elevation"]
                    hoehen.append(float(e) if e is not None else float("nan"))
                break
            except Exception as ex:
                if versuch == 3:
                    print(f"FEHLER bei Batch {i}: {ex}", file=sys.stderr)
                    raise
                time.sleep(2 + versuch * 2)
        print(f"  {min(i + BATCH, n)}/{n} Punkte", file=sys.stderr)
        time.sleep(PAUSE)
    return hoehen


# --- Marching Squares ---------------------------------------------------------
# Segment-Tabelle: pro Fall die zu verbindenden Kanten ('T','R','B','L').
SEGS = {
    1: [("L", "T")], 2: [("T", "R")], 3: [("L", "R")], 4: [("R", "B")],
    5: [("L", "T"), ("R", "B")], 6: [("T", "B")], 7: [("L", "B")],
    8: [("B", "L")], 9: [("B", "T")], 10: [("T", "R"), ("B", "L")],
    11: [("R", "B")], 12: [("R", "L")], 13: [("T", "R")], 14: [("L", "T")],
}


def welt(x, y):
    return (x / (COLS - 1) * WELT_W, y / (ROWS - 1) * WELT_H)


def kante(name, c, r, tl, tr, br, bl, L):
    """Interpolierter Schnittpunkt auf der genannten Zellkante (Gitterkoords)."""
    if name == "T":
        t = (L - tl) / (tr - tl); return (c + t, r)
    if name == "B":
        t = (L - bl) / (br - bl); return (c + t, r + 1)
    if name == "L":
        t = (L - tl) / (bl - tl); return (c, r + t)
    if name == "R":
        t = (L - tr) / (br - tr); return (c + 1, r + t)


def isolinie(Z, L):
    """Alle Segmente der Hoehenlinie L als SVG-Pfad ('M..L..M..L..')."""
    teile = []
    for r in range(ROWS - 1):
        for c in range(COLS - 1):
            tl, tr = Z[r][c], Z[r][c + 1]
            bl, br = Z[r + 1][c], Z[r + 1][c + 1]
            if any(math.isnan(v) for v in (tl, tr, br, bl)):
                continue
            case = (1 if tl >= L else 0) | (2 if tr >= L else 0) | \
                   (4 if br >= L else 0) | (8 if bl >= L else 0)
            if case in (0, 15):
                continue
            for a, b in SEGS[case]:
                try:
                    p1 = welt(*kante(a, c, r, tl, tr, br, bl, L))
                    p2 = welt(*kante(b, c, r, tl, tr, br, bl, L))
                except ZeroDivisionError:
                    continue
                teile.append(f"M{p1[0]:.1f} {p1[1]:.1f}L{p2[0]:.1f} {p2[1]:.1f}")
    return "".join(teile)


def main():
    print("Hole DEM-Gitter …", file=sys.stderr)
    pts = gitter_punkte()
    flach = hole_hoehen(pts)
    Z = [flach[r * COLS:(r + 1) * COLS] for r in range(ROWS)]

    gueltig = [v for v in flach if not math.isnan(v)]
    hmin, hmax = min(gueltig), max(gueltig)
    print(f"Hoehe {hmin:.0f}–{hmax:.0f} m", file=sys.stderr)

    # Hoehenlinien alle 100 m; Index-Linien (dicker) alle 500 m.
    intervall, index_iv = 100, 500
    start = int(math.ceil(hmin / intervall) * intervall)
    ende = int(math.floor(hmax / intervall) * intervall)
    level_werte = list(range(start, ende + 1, intervall))

    # Alle Höhenlinien kommen auf EINE Karten-Ebene ("mittel"). Ein Parallax
    # zwischen einzelnen Konturbändern wäre unsinnig – die Karte ist eine Fläche.
    fern, mittel = [], []
    for L in level_werte:
        d = isolinie(Z, L)
        if not d:
            continue
        mittel.append({"h": L, "index": (L % index_iv == 0), "d": d})

    def peak_welt(p):
        if not (LAT_MIN <= p["lat"] <= LAT_MAX and LON_MIN <= p["lon"] <= LON_MAX):
            return None
        x = (p["lon"] - LON_MIN) / (LON_MAX - LON_MIN) * WELT_W
        y = (LAT_MAX - p["lat"]) / (LAT_MAX - LAT_MIN) * WELT_H
        return {"name": p["name"], "hoehe": p["hoehe"], "x": round(x, 1), "y": round(y, 1)}

    gipfel = [g for g in (peak_welt(p) for p in PEAKS) if g]

    out = {
        "quelle": "EU-DEM 25 m via opentopodata.org · Triglav-Nationalpark, Slowenien",
        "bbox": {"latMin": LAT_MIN, "latMax": LAT_MAX, "lonMin": LON_MIN, "lonMax": LON_MAX},
        "welt": {"w": WELT_W, "h": WELT_H},
        "raster": {"cols": COLS, "rows": ROWS},
        "hoehe": {"min": round(hmin), "max": round(hmax), "intervall": intervall},
        "gipfel": gipfel,
        "ebenen": {"fern": fern, "mittel": mittel},
    }
    ziel = sys.argv[1] if len(sys.argv) > 1 else "topo-triglav.json"
    with open(ziel, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, separators=(",", ":"))
    print(f"Geschrieben: {ziel}  ({len(fern)+len(mittel)} Hoehenlinien)", file=sys.stderr)


if __name__ == "__main__":
    main()
