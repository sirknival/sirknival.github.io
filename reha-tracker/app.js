/* =============================================================================
 *  REHA-TRACKER · Bergwander-Metapher · VERTIKALES PANORAMA (Topo/Triglav)
 *  -----------------------------------------------------------------------------
 *  Die Route ist eine durchgehende, HOCHKANT-Landschaft, durch die man vertikal
 *  wandert: unten das Tal (Basislager / Unfalltag), oben der Gipfel (Ziel).
 *  Der Ausschnitt des Triglav-Nationalparks ist im Hochformat (~4:1), deshalb
 *  läuft Panning und Parallax von unten nach oben.
 *
 *  Bedienung: ziehen (Maus/Touch), Pfeiltasten hoch/runter, Buttons Tal/Gipfel,
 *  Minimap (rechts) oder Mausrad.
 *  Datenquelle: daten.json · Höhenlinien: topo-triglav.json (echte DEM-Daten).
 * ========================================================================== */

'use strict';

/* -----------------------------------------------------------------------------
 *  1) WELTMASSE & GEOMETRIE (HOCHFORMAT)
 *  Verhältnis WELT_H/WELT_W entspricht dem Seitenverhältnis der Bounding-Box
 *  (~4,06) -> die echten Höhenlinien werden unverzerrt dargestellt.
 * --------------------------------------------------------------------------- */

const WELT_W = 640, WELT_H = 2600;   // muss zu build-topo.py passen
const RAND_X = 100;                  // seitlicher Rand (Serpentinen)
const RAND_OBEN = 150;               // Rand über dem Gipfel
const RAND_UNTEN = 170;              // Rand unter dem Basislager

const SERP_AMP = 150;                // Amplitude der Serpentinen (horizontal)
const SERP_FREQ = 0.16;              // Frequenz der Serpentinen

const RUECKSCHLAG_TIEFE = { klein: 70, mittel: 120, gross: 190 }; // Delle abwärts
const RUECKSCHLAG_BREITE = 4;        // Breite der Delle (in fortschritt-Einheiten)
const SCHRITT = 0.3;                 // Abtastschritt der Route

// Parallax-Tiefe: 1 = Route/Figur (Vordergrund), <1 = Karte (weiter hinten).
const TIEFE = { karte: 0.85, route: 1 };

function el(tag, attrs = {}, ...kinder) {
  const n = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  for (const c of kinder) if (c) n.appendChild(c);
  return n;
}

// Labelausrichtung am linken/rechten Rand, damit Beschriftungen nicht abschneiden.
function labelAnker(x) {
  if (x > WELT_W - 150) return 'end';
  if (x < 150) return 'start';
  return 'middle';
}

/* -----------------------------------------------------------------------------
 *  2) POSITIONS-MATHEMATIK
 *  Hauptachse ist jetzt VERTIKAL: fortschritt 0 (Tal, unten) -> 100 (Gipfel, oben).
 *  x = horizontale Serpentine, y = Fortschritt (+ Rückschlag-Dellen abwärts).
 * --------------------------------------------------------------------------- */

function yProg(p) {
  return (WELT_H - RAND_UNTEN) - (p / 100) * (WELT_H - RAND_OBEN - RAND_UNTEN);
}
function xFuer(p) {
  const x = WELT_W / 2 + SERP_AMP * Math.sin(p * SERP_FREQ);
  return Math.max(RAND_X, Math.min(WELT_W - RAND_X, x));
}
/* --- Positionierung über ECHTE Geo-Koordinaten (lat/lon) --------------------
 * Marker mit lat/lon werden an ihrer tatsächlichen Stelle auf der Karte gesetzt
 * (gemappt über die Bounding-Box der Höhendaten). Die Route zieht als weiche
 * Kurve durch diese Punkte – in Reihenfolge des fortschritt-Werts.
 * Ohne Koordinaten fällt alles auf die automatische Serpentine zurück.
 * ------------------------------------------------------------------------- */

let TOPO_BBOX = null;   // {latMin, latMax, lonMin, lonMax} aus topo-triglav.json
let ANKER = [];         // Route-Stützpunkte {f, x, y}, nach fortschritt sortiert

function geoToWelt(lat, lon) {
  const b = TOPO_BBOX;
  if (!b || typeof lat !== 'number' || typeof lon !== 'number') return null;
  return {
    x: (lon - b.lonMin) / (b.lonMax - b.lonMin) * WELT_W,
    y: (b.latMax - lat) / (b.latMax - b.latMin) * WELT_H,   // Nord = oben
  };
}

// Sammelt alle Marker mit lat/lon als Route-Anker (nach fortschritt sortiert).
function sammleAnker(daten) {
  const anker = [];
  const add = (f, lat, lon) => { const w = geoToWelt(lat, lon); if (w) anker.push({ f, x: w.x, y: w.y }); };
  if (daten.unfallKoordinaten) add(0, daten.unfallKoordinaten.lat, daten.unfallKoordinaten.lon);
  for (const h of daten.huetten ?? []) if (h.lat != null && h.lon != null) add(h.fortschritt, h.lat, h.lon);
  for (const g of daten.zwischengipfel ?? []) if (g.lat != null && g.lon != null) add(g.fortschritt, g.lat, g.lon);
  const z = daten.finalesZiel;
  if (z && z.lat != null && z.lon != null) add(100, z.lat, z.lon);
  anker.sort((a, b) => a.f - b.f);
  ANKER = anker.filter((a, i) => i === 0 || a.f !== anker[i - 1].f);   // Duplikate raus
}

// Catmull-Rom (weiche Kurve durch die Anker).
function catmull(p0, p1, p2, p3, t) {
  const t2 = t * t, t3 = t2 * t;
  return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
}

// Position auf der Route bei fortschritt p (0..100).
function routePos(p) {
  if (ANKER.length < 2) return { x: xFuer(p), y: yProg(p) };   // Fallback: Serpentine
  const a = ANKER;
  const pc = Math.max(a[0].f, Math.min(a[a.length - 1].f, p));
  let i = 0;
  while (i < a.length - 2 && pc > a[i + 1].f) i++;
  const P1 = a[i], P2 = a[i + 1], P0 = a[i - 1] ?? P1, P3 = a[i + 2] ?? P2;
  const t = (pc - P1.f) / ((P2.f - P1.f) || 1);
  return { x: catmull(P0.x, P1.x, P2.x, P3.x, t), y: catmull(P0.y, P1.y, P2.y, P3.y, t) };
}

// Position inkl. Rückschlag-Delle (Delle nur im Serpentinen-Fallback – bei
// echter Geo-Route folgt der Weg dem realen Gelände, Rückschläge sind Marker).
function posAuf(p, rueckschlaege) {
  const pos = routePos(p);
  let y = pos.y;
  if (ANKER.length < 2) {
    for (const r of rueckschlaege ?? []) {
      const tiefe = RUECKSCHLAG_TIEFE[r.einfluss] ?? RUECKSCHLAG_TIEFE.mittel;
      y += tiefe * Math.exp(-((p - r.fortschritt) ** 2) / (2 * RUECKSCHLAG_BREITE ** 2));
    }
  }
  return { x: pos.x, y };
}

// Weltposition eines Markers: echte lat/lon falls vorhanden, sonst auf der Route.
function markerWelt(item, rueckschlaege) {
  if (item && item.lat != null && item.lon != null) { const w = geoToWelt(item.lat, item.lon); if (w) return w; }
  return posAuf(item.fortschritt, rueckschlaege);
}

function routenPunkte(rueckschlaege) {
  const punkte = [];
  for (let p = 0; p <= 100 + 1e-9; p += SCHRITT) {
    const pp = Math.min(p, 100);
    const pos = posAuf(pp, rueckschlaege);
    punkte.push({ p: pp, x: pos.x, y: pos.y });
  }
  return punkte;
}
function pfadString(punkte) {
  if (!punkte.length) return '';
  return punkte.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt.x.toFixed(2)} ${pt.y.toFixed(2)}`).join(' ');
}

/* -----------------------------------------------------------------------------
 *  3) ZUSTAND AUS DATEN ABLEITEN
 * --------------------------------------------------------------------------- */

function parseDatum(s) { return s ? new Date(s + 'T00:00:00') : null; }

function aktuellerFortschritt(daten, heute) {
  if (typeof daten.aktuellerFortschritt === 'number') {
    return Math.max(0, Math.min(100, daten.aktuellerFortschritt));
  }
  let max = 2;
  for (const h of daten.huetten ?? []) {
    const d = parseDatum(h.datum);
    if (d && d <= heute) max = Math.max(max, h.fortschritt ?? 0);
  }
  for (const g of daten.zwischengipfel ?? []) {
    if (g.erreicht) max = Math.max(max, g.fortschritt ?? 0);
  }
  return Math.min(100, max);
}

/* -----------------------------------------------------------------------------
 *  4) DATUMS- UND TEXT-HELFER
 * --------------------------------------------------------------------------- */

function formatDatum(s) {
  const d = parseDatum(s);
  if (!d) return '—';
  return d.toLocaleDateString('de-AT', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
const TYP_LABEL = { unfall: 'Unfalltag', op: 'Operation', arzttermin: 'Arzttermin', reha: 'Reha / Physio' };

/* -----------------------------------------------------------------------------
 *  5) HINTERGRUND: ECHTE HÖHENLINIEN DES TRIGLAV-NATIONALPARKS
 *  Alle Höhenlinien liegen auf EINER Karten-Ebene (kein Parallax zwischen
 *  einzelnen Konturbändern – die Karte ist eine zusammenhängende Fläche).
 * --------------------------------------------------------------------------- */

function hoehenlinien(svg, { cx, cy, ringe, dx, dy }) {   // nur Fallback
  for (let i = ringe; i >= 1; i--) {
    svg.appendChild(el('ellipse', { class: 'hoehenlinie', cx, cy, rx: i * dx, ry: i * dy }));
  }
}

function zeichneKarte(karteSvg, topo) {
  if (!topo) {   // Fallback ohne echte Daten: schematische Konturen
    for (let i = 0; i < 8; i++) hoehenlinien(karteSvg, { cx: 320, cy: 200 + i * 300, ringe: 4, dx: 90, dy: 40 });
    return;
  }
  const alle = [...(topo.ebenen?.fern ?? []), ...(topo.ebenen?.mittel ?? [])];
  for (const l of alle) {
    karteSvg.appendChild(el('path', { class: `hoehenlinie ${l.index ? 'hoehenlinie-index' : ''}`, d: l.d }));
  }
  for (const g of topo.gipfel ?? []) {
    const grp = el('g', { class: 'topo-gipfel', transform: `translate(${g.x}, ${g.y})` });
    grp.appendChild(el('path', { class: 'topo-gipfel-kreuz', d: 'M-6 0 L6 0 M0 -6 L0 6' }));
    const t = el('text', { class: 'topo-gipfel-label', x: 9, y: 4 });
    t.textContent = `${g.name} ${g.hoehe} m`;
    grp.appendChild(t);
    karteSvg.appendChild(grp);
  }
  if (topo.quelle && !document.querySelector('.topo-quelle')) {
    const q = document.createElement('p');
    q.className = 'topo-quelle';
    q.textContent = topo.quelle;
    document.getElementById('panorama')?.appendChild(q);
  }
}

// Lädt die Höhendaten (Bounding-Box + Höhenlinien) einmalig.
async function ladeTopo() {
  try {
    const res = await fetch('topo-triglav.json', { cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return await res.json();
  } catch (err) {
    console.warn('topo-triglav.json nicht geladen:', err);
    return null;
  }
}

/* -----------------------------------------------------------------------------
 *  6) ROUTE, MARKER & FIGUR (Vordergrund-Ebene)
 * --------------------------------------------------------------------------- */

function zeichneRoute(svg, punkte, cp, rueckschlaege) {
  const erledigt = punkte.filter(pt => pt.p <= cp);
  const offen = punkte.filter(pt => pt.p >= cp);
  const uebergang = { p: cp, ...posAuf(cp, rueckschlaege) };
  erledigt.push(uebergang);
  offen.unshift(uebergang);
  svg.appendChild(el('path', { class: 'route route-offen', d: pfadString(offen) }));
  svg.appendChild(el('path', { class: 'route route-erledigt', d: pfadString(erledigt) }));
}

// labelSeite: -1 = Label links vom Marker, +1 = rechts (bei engem Abstand versetzt).
function huettenMarker(h, x, y, erreicht) {
  const g = el('g', {
    class: `marker huette ${erreicht ? 'ist-erreicht' : 'ist-offen'}`,
    tabindex: '0', role: 'button', 'aria-label': `Hütte: ${h.name}`,
    transform: `translate(${x}, ${y})`,
  });
  g.appendChild(el('rect', { class: 'huette-wand', x: -11, y: -22, width: 22, height: 17, rx: 1 }));
  g.appendChild(el('polygon', { class: 'huette-dach', points: '-15,-22 0,-34 15,-22' }));
  g.appendChild(el('circle', { class: 'huette-fuss', cx: 0, cy: 0, r: 3.5 }));
  const t = el('text', { class: 'marker-label', x: 0, y: 22, 'text-anchor': labelAnker(x) });
  t.textContent = h.name;
  g.appendChild(t);
  return g;
}

function gipfelMarker(gpf, x, y) {
  const g = el('g', {
    class: `marker zwischengipfel ${gpf.erreicht ? 'ist-erreicht' : 'ist-offen'}`,
    tabindex: '0', role: 'button', 'aria-label': `Zwischengipfel: ${gpf.name}`,
    transform: `translate(${x}, ${y})`,
  });
  g.appendChild(el('polygon', { class: 'gipfel-form', points: '-14,0 0,-28 14,0' }));
  if (gpf.erreicht) {
    g.appendChild(el('line', { class: 'fahne-mast', x1: 0, y1: -28, x2: 0, y2: -46 }));
    g.appendChild(el('polygon', { class: 'fahne-tuch', points: '0,-46 15,-41 0,-36' }));
  }
  // Gipfel-Labels oberhalb -> keine Kollision mit Hütten-Labels (unterhalb).
  const t = el('text', { class: 'marker-label', x: 0, y: gpf.erreicht ? -52 : -34, 'text-anchor': labelAnker(x) });
  t.textContent = gpf.name;
  g.appendChild(t);
  return g;
}

function rueckschlagMarker(r, x, y) {
  const g = el('g', {
    class: 'marker rueckschlag', tabindex: '0', role: 'button',
    'aria-label': `Rückschlag am ${formatDatum(r.datum)}`,
    transform: `translate(${x}, ${y})`,
  });
  g.appendChild(el('polygon', { class: 'warn-form', points: '0,-17 15,9 -15,9' }));
  const t = el('text', { class: 'warn-zeichen', x: 0, y: 5, 'text-anchor': 'middle' });
  t.textContent = '!';
  g.appendChild(t);
  return g;
}

function zeichneFinalgipfel(svg, ziel, pos) {
  const x = pos.x, y = pos.y;
  const g = el('g', {
    class: `marker finalgipfel ${ziel.erreicht ? 'ist-erreicht' : 'ist-offen'}`,
    tabindex: '0', role: 'button', 'aria-label': `Finaler Gipfel: ${ziel.name}`,
    transform: `translate(${x}, ${y})`,
  });
  g.appendChild(el('polygon', { class: 'gipfel-gross', points: '-34,0 0,-66 34,0' }));
  g.appendChild(el('polygon', { class: 'gipfel-schnee', points: '-12,-44 0,-66 12,-44 0,-54' }));
  g.appendChild(el('line', { class: 'fahne-mast', x1: 0, y1: -66, x2: 0, y2: -94 }));
  g.appendChild(el('polygon', { class: 'fahne-tuch', points: '0,-94 24,-87 0,-80' }));
  const t = el('text', { class: 'marker-label gipfel-label', x: 0, y: -80, 'text-anchor': labelAnker(x) });
  t.textContent = ziel.name;
  g.appendChild(t);
  svg.appendChild(g);
}

function zeichneFigur(svg, x, y) {
  const g = el('g', { class: 'wanderfigur', transform: `translate(${x}, ${y})` });
  g.appendChild(el('circle', { class: 'positions-puls', cx: 0, cy: -16, r: 24 }));
  g.appendChild(el('circle', { class: 'figur-kopf', cx: 0, cy: -34, r: 6 }));
  g.appendChild(el('polygon', { class: 'figur-koerper', points: '-9,-7 0,-28 9,-7' }));
  g.appendChild(el('line', { class: 'figur-stock', x1: 10, y1: -32, x2: 15, y2: -2 }));
  svg.appendChild(g);
}

/* -----------------------------------------------------------------------------
 *  7) MODAL (Detail-Panel)
 * --------------------------------------------------------------------------- */

const modal = document.getElementById('modal');
const modalInhalt = document.getElementById('modal-inhalt');

function oeffneModal({ titel, datum, typ, beschreibung, eintraege = [] }) {
  modalInhalt.innerHTML = '';
  const kopf = document.createElement('div'); kopf.className = 'modal-kopf';
  const h = document.createElement('h3'); h.textContent = titel; kopf.appendChild(h);
  if (typ) { const b = document.createElement('span'); b.className = 'badge'; b.textContent = TYP_LABEL[typ] || typ; kopf.appendChild(b); }
  modalInhalt.appendChild(kopf);
  if (datum) { const d = document.createElement('p'); d.className = 'modal-datum'; d.textContent = formatDatum(datum); modalInhalt.appendChild(d); }
  if (beschreibung) { const b = document.createElement('p'); b.className = 'modal-beschreibung'; b.textContent = beschreibung; modalInhalt.appendChild(b); }

  const bt = document.createElement('h4'); bt.className = 'buch-titel'; bt.textContent = 'Hüttenbuch'; modalInhalt.appendChild(bt);
  if (eintraege.length) {
    const liste = document.createElement('ul'); liste.className = 'huettenbuch';
    for (const e of eintraege) {
      const li = document.createElement('li');
      const dt = document.createElement('span'); dt.className = 'buch-datum'; dt.textContent = formatDatum(e.datum);
      const tx = document.createElement('span'); tx.className = 'buch-text'; tx.textContent = e.text;
      li.append(dt, tx); liste.appendChild(li);
    }
    modalInhalt.appendChild(liste);
  } else {
    const leer = document.createElement('p'); leer.className = 'buch-leer'; leer.textContent = 'Noch kein Eintrag in diesem Hüttenbuch.'; modalInhalt.appendChild(leer);
  }
  modal.classList.add('offen'); modal.setAttribute('aria-hidden', 'false');
  document.getElementById('modal-schliessen').focus();
}
function schliesseModal() { modal.classList.remove('offen'); modal.setAttribute('aria-hidden', 'true'); }

/* -----------------------------------------------------------------------------
 *  8) TEXT-SEKTIONEN (Counter, Zwischenziele, Gipfelbuch)
 * --------------------------------------------------------------------------- */

function aktualisiereCounter(daten, heute) {
  const start = parseDatum(daten.unfallDatum);
  const tage = Math.max(0, Math.floor((heute - start) / 86400000));
  const wochen = Math.floor(tage / 7), restTage = tage % 7;
  document.getElementById('timer-tage').textContent = tage;
  document.getElementById('timer-wochen').textContent = `${wochen} Wochen${restTage ? ` ${restTage} Tage` : ''} unterwegs`;
  document.getElementById('unfall-ort').textContent = daten.ort;
  document.getElementById('unfall-datum').textContent = formatDatum(daten.unfallDatum);
  document.getElementById('ziel-name-counter').textContent = daten.finalesZiel?.name ?? '';
}

function rendereZwischenziele(daten) {
  const box = document.getElementById('zwischenziele-liste');
  box.innerHTML = '';
  const gipfel = [...(daten.zwischengipfel ?? [])].sort((a, b) => a.fortschritt - b.fortschritt);
  for (const g of gipfel) {
    const li = document.createElement('li');
    li.className = `ziel-eintrag ${g.erreicht ? 'ist-erreicht' : 'ist-offen'}`;
    const icon = document.createElement('span'); icon.className = 'ziel-icon'; icon.textContent = g.erreicht ? '✓' : '○';
    const inner = document.createElement('div');
    const name = document.createElement('span'); name.className = 'ziel-titel'; name.textContent = g.name;
    const meta = document.createElement('span'); meta.className = 'ziel-meta';
    meta.textContent = g.erreicht ? `erreicht am ${formatDatum(g.erreichtAm)}` : `Ziel: ${formatDatum(g.zieldatum)}`;
    inner.append(name, meta);
    if (g.beschreibung) { const be = document.createElement('span'); be.className = 'ziel-beschreibung'; be.textContent = g.beschreibung; inner.appendChild(be); }
    li.append(icon, inner); box.appendChild(li);
  }
}

function rendereGipfelbuch(ziel) {
  const abschnitt = document.getElementById('gipfelbuch');
  const gesperrt = document.getElementById('gipfelbuch-gesperrt');
  const inhalt = document.getElementById('gipfelbuch-inhalt');
  document.getElementById('ziel-beschreibung').textContent = ziel.beschreibung || '';
  if (ziel.erreicht) {
    abschnitt.classList.add('freigeschaltet'); gesperrt.hidden = true; inhalt.hidden = false; inhalt.innerHTML = '';
    for (const e of ziel.gipfelbuch ?? []) {
      const div = document.createElement('div'); div.className = 'gipfel-eintrag';
      const dt = document.createElement('span'); dt.className = 'buch-datum'; dt.textContent = formatDatum(e.datum);
      const tx = document.createElement('p'); tx.textContent = e.text; div.append(dt, tx); inhalt.appendChild(div);
    }
    if (!(ziel.gipfelbuch ?? []).length) inhalt.innerHTML = '<p class="buch-leer">Gipfel erreicht – trage hier deinen ersten Eintrag ein.</p>';
  } else {
    abschnitt.classList.remove('freigeschaltet'); gesperrt.hidden = false; inhalt.hidden = true;
  }
}

/* -----------------------------------------------------------------------------
 *  9) MINIMAP (schmale, VERTIKALE Gesamtübersicht am rechten Rand)
 * --------------------------------------------------------------------------- */

const MINI_W = 64;
let miniFenster = null;

function baueMinimap(daten, cp, rueckschlaege, figurWeltY) {
  const wrap = document.getElementById('minimap');
  wrap.innerHTML = '';
  const svg = el('svg', { class: 'minimap-svg', viewBox: `0 0 ${MINI_W} ${WELT_H}`, preserveAspectRatio: 'none', 'aria-hidden': 'true' });
  const xm = MINI_W / 2;

  // Route senkrecht: unten Tal -> oben Gipfel (nach Welt-y der Anker).
  const yBei = p => posAuf(p, rueckschlaege).y;
  svg.appendChild(el('line', { class: 'mini-offen', x1: xm, y1: yBei(cp), x2: xm, y2: yBei(100) }));
  svg.appendChild(el('line', { class: 'mini-erledigt', x1: xm, y1: yBei(0), x2: xm, y2: yBei(cp) }));

  for (const h of daten.huetten ?? []) svg.appendChild(el('circle', { class: 'mini-huette', cx: xm, cy: markerWelt(h, rueckschlaege).y, r: 9 }));
  for (const g of daten.zwischengipfel ?? []) {
    const y = markerWelt(g, rueckschlaege).y;
    svg.appendChild(el('polygon', { class: `mini-gipfel ${g.erreicht ? 'ist-erreicht' : ''}`, points: `${xm - 10},${y + 9} ${xm},${y - 11} ${xm + 10},${y + 9}` }));
  }
  const yf = yBei(100);
  svg.appendChild(el('polygon', { class: 'mini-final', points: `${xm - 13},${yf + 11} ${xm},${yf - 15} ${xm + 13},${yf + 11}` }));
  svg.appendChild(el('circle', { class: 'mini-figur', cx: xm, cy: figurWeltY, r: 12 }));

  miniFenster = el('rect', { class: 'mini-fenster', x: 3, y: 0, width: MINI_W - 6, height: 400, rx: 6 });
  svg.appendChild(miniFenster);
  wrap.appendChild(svg);
}

/* -----------------------------------------------------------------------------
 *  10) PAN-STEUERUNG (VERTIKAL)
 * --------------------------------------------------------------------------- */

const panorama = document.getElementById('panorama');
let ebenen = [];
let pan = 0, maxPan = 0, sichtbH = 0, skala = 1;
let figurWeltY = 0;
let wurdeGezogen = false;

function klemme(p) { return Math.max(0, Math.min(maxPan, p)); }

function wendeAn() {
  for (const e of ebenen) e.el.style.transform = `translateY(${(-pan * e.tiefe).toFixed(1)}px)`;
  if (miniFenster) { miniFenster.setAttribute('y', pan / skala); miniFenster.setAttribute('height', sichtbH / skala); }
}
function setzePan(p, glatt = false) { panorama.classList.toggle('gleiten', glatt); pan = klemme(p); wendeAn(); }

function messeAusschnitt() {
  sichtbH = panorama.clientHeight;
  skala = panorama.clientWidth / WELT_W;   // Ebenen füllen die Breite (width:100%)
  maxPan = Math.max(0, WELT_H * skala - sichtbH);
  pan = klemme(pan);
}
function zentriereAuf(weltY, glatt = true) { setzePan(weltY * skala - sichtbH / 2, glatt); }

function initSteuerung() {
  // --- Ziehen (Capture erst ab echter Bewegung, damit Klicks durchkommen) ---
  let bereit = false, ziehtGerade = false, startY = 0, startPan = 0, pid = null;
  const SCHWELLE = 8;

  panorama.addEventListener('pointerdown', ev => {
    if (ev.button !== undefined && ev.button !== 0) return;
    if (ev.target.closest && ev.target.closest('.steuerung, .counter, .minimap')) return;
    bereit = true; ziehtGerade = false; wurdeGezogen = false;
    startY = ev.clientY; startPan = pan; pid = ev.pointerId;
    panorama.classList.remove('gleiten');
  });
  panorama.addEventListener('pointermove', ev => {
    if (!bereit) return;
    const dy = ev.clientY - startY;
    if (!ziehtGerade) {
      if (Math.abs(dy) <= SCHWELLE) return;
      ziehtGerade = true; wurdeGezogen = true;
      panorama.classList.add('zieht');
      try { panorama.setPointerCapture(pid); } catch (_) {}
    }
    pan = klemme(startPan - dy);   // nach unten ziehen -> zum Gipfel hoch
    wendeAn();
  });
  const beenden = () => {
    if (!bereit) return; bereit = false;
    if (ziehtGerade) { ziehtGerade = false; panorama.classList.remove('zieht'); try { panorama.releasePointerCapture(pid); } catch (_) {} }
  };
  panorama.addEventListener('pointerup', beenden);
  panorama.addEventListener('pointercancel', beenden);

  // --- Mausrad: vertikal pannen ---
  panorama.addEventListener('wheel', ev => { ev.preventDefault(); setzePan(pan + ev.deltaY, false); }, { passive: false });

  // --- Pfeiltasten hoch/runter ---
  panorama.addEventListener('keydown', ev => {
    if (ev.key === 'ArrowUp')   { ev.preventDefault(); setzePan(pan - sichtbH * 0.6, true); }
    if (ev.key === 'ArrowDown') { ev.preventDefault(); setzePan(pan + sichtbH * 0.6, true); }
  });

  // --- Buttons: Tal (runter) / Gipfel (hoch) / Jetzt ---
  document.getElementById('btn-vergangenheit').addEventListener('click', () => setzePan(pan + sichtbH * 0.7, true)); // Tal
  document.getElementById('btn-zukunft').addEventListener('click', () => setzePan(pan - sichtbH * 0.7, true));       // Gipfel
  document.getElementById('btn-jetzt').addEventListener('click', () => zentriereAuf(figurWeltY, true));

  // --- Minimap (vertikal) ---
  const mini = document.getElementById('minimap');
  const miniPan = clientY => {
    const rect = mini.getBoundingClientRect();
    const weltY = ((clientY - rect.top) / rect.height) * WELT_H;
    setzePan(weltY * skala - sichtbH / 2, true);
  };
  let miniZieht = false;
  mini.addEventListener('pointerdown', ev => { miniZieht = true; mini.setPointerCapture(ev.pointerId); miniPan(ev.clientY); });
  mini.addEventListener('pointermove', ev => { if (miniZieht) miniPan(ev.clientY); });
  mini.addEventListener('pointerup', ev => { miniZieht = false; try { mini.releasePointerCapture(ev.pointerId); } catch (_) {} });

  window.addEventListener('resize', () => { messeAusschnitt(); wendeAn(); });
}

/* -----------------------------------------------------------------------------
 *  11) AUFBAU DER PANORAMA-EBENEN
 * --------------------------------------------------------------------------- */

function baueBuehne(daten, cp, topo) {
  const buehne = document.getElementById('buehne');
  buehne.innerHTML = '';
  const rueckschlaege = daten.rueckschlaege ?? [];

  // Zwei Ebenen: Karte (echte Höhenlinien) + Route/Figur. Beide füllen per
  // CSS die Breite (width:100%) und werden nur vertikal verschoben.
  const karte = el('svg', { class: 'ebene ebene-karte', viewBox: `0 0 ${WELT_W} ${WELT_H}`, preserveAspectRatio: 'xMidYMid meet' });
  const route = el('svg', { class: 'ebene ebene-route', id: 'route-svg', viewBox: `0 0 ${WELT_W} ${WELT_H}`, preserveAspectRatio: 'xMidYMid meet' });

  zeichneKarte(karte, topo);

  const punkte = routenPunkte(rueckschlaege);
  zeichneRoute(route, punkte, cp, rueckschlaege);
  zeichneFinalgipfel(route, daten.finalesZiel, markerWelt(daten.finalesZiel, rueckschlaege));

  const klickBar = (m, fn) => {
    m.addEventListener('click', () => { if (!wurdeGezogen) fn(); });
    m.addEventListener('keydown', ev => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); fn(); } });
  };

  const heute = new Date();
  for (const h of daten.huetten ?? []) {
    const { x, y } = markerWelt(h, rueckschlaege);
    const erreicht = (parseDatum(h.datum) ?? heute) <= heute;
    const m = huettenMarker(h, x, y, erreicht);
    klickBar(m, () => oeffneModal({ titel: h.name, datum: h.datum, typ: h.typ, beschreibung: h.beschreibung, eintraege: h.huettenbuch ?? [] }));
    route.appendChild(m);
  }
  for (const g of daten.zwischengipfel ?? []) {
    const { x, y } = markerWelt(g, rueckschlaege);
    const m = gipfelMarker(g, x, y);
    klickBar(m, () => oeffneModal({
      titel: g.name, datum: g.erreicht ? g.erreichtAm : g.zieldatum,
      beschreibung: (g.beschreibung || '') + (g.erreicht ? '' : `  ·  Noch offen (Ziel: ${formatDatum(g.zieldatum)}).`),
      eintraege: [],
    }));
    route.appendChild(m);
  }
  for (const r of rueckschlaege) {
    const { x, y } = markerWelt(r, rueckschlaege);
    const m = rueckschlagMarker(r, x, y);
    klickBar(m, () => oeffneModal({ titel: 'Rückschlag', datum: r.datum, beschreibung: r.beschreibung, eintraege: [] }));
    route.appendChild(m);
  }

  const fpos = posAuf(cp, rueckschlaege);
  figurWeltY = fpos.y;
  zeichneFigur(route, fpos.x, fpos.y);

  buehne.append(karte, route);
  ebenen = [{ el: karte, tiefe: TIEFE.karte }, { el: route, tiefe: TIEFE.route }];
}

/* -----------------------------------------------------------------------------
 *  12) DATEN LADEN + INITIALISIEREN
 * --------------------------------------------------------------------------- */

async function ladeDaten() {
  try {
    const res = await fetch('daten.json', { cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return await res.json();
  } catch (err) {
    if (window.REHA_DATEN) return window.REHA_DATEN;
    zeigeLadefehler(err); throw err;
  }
}
function zeigeLadefehler(err) {
  const ov = document.getElementById('ladefehler');
  if (ov) { ov.hidden = false; const d = document.getElementById('ladefehler-detail'); if (d) d.textContent = String(err); }
}

async function init() {
  const daten = await ladeDaten();
  const topo = await ladeTopo();
  TOPO_BBOX = topo?.bbox ?? null;   // Grundlage für die lat/lon-Positionierung
  sammleAnker(daten);               // Route-Anker aus echten Koordinaten

  const heute = new Date();
  const cp = aktuellerFortschritt(daten, heute);
  document.title = 'Reha-Route · ' + (daten.finalesZiel?.name ?? 'Genesung');

  aktualisiereCounter(daten, heute);
  baueBuehne(daten, cp, topo);
  baueMinimap(daten, cp, daten.rueckschlaege ?? [], figurWeltY);
  rendereZwischenziele(daten);
  rendereGipfelbuch(daten.finalesZiel);
  initSteuerung();

  requestAnimationFrame(() => { messeAusschnitt(); zentriereAuf(figurWeltY, false); });
  setInterval(() => aktualisiereCounter(daten, new Date()), 60000);
}

// Modal-Interaktionen.
document.getElementById('modal-schliessen').addEventListener('click', schliesseModal);
modal.addEventListener('click', ev => { if (ev.target === modal) schliesseModal(); });

// Overlay „Etappen & Gipfel".
const uebersicht = document.getElementById('uebersicht');
function oeffneUebersicht() { uebersicht.classList.add('offen'); uebersicht.setAttribute('aria-hidden', 'false'); document.getElementById('uebersicht-schliessen').focus(); }
function schliesseUebersicht() { uebersicht.classList.remove('offen'); uebersicht.setAttribute('aria-hidden', 'true'); }
document.getElementById('btn-uebersicht').addEventListener('click', oeffneUebersicht);
document.getElementById('uebersicht-schliessen').addEventListener('click', schliesseUebersicht);
document.getElementById('uebersicht-backdrop').addEventListener('click', schliesseUebersicht);

document.addEventListener('keydown', ev => { if (ev.key === 'Escape') { schliesseModal(); schliesseUebersicht(); } });

init();
