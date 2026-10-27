---
layout: post
title: "VaSo® – eine interaktive Produktseite für ein Kläranlagen-Umwälzsystem"
date: 2026-08-27 06:00:00
description: Interaktive Single-Page-Produktseite mit Three.js-3D-Modell für ein reales Kundenprojekt im Bereich Faulturm-Technik.
tags: web three-js tailwind projects
categories: projects
thumbnail: assets/img/vaso-hero.jpg
featured: true
---

Für die **Umwelt-Tauchservice · Tauchpartner C. Ulrich GmbH** (Wien, gegründet 1978)
habe ich eine Produktseite für **VaSo®** entworfen und umgesetzt – ein System zur
Durchmischung von Faulbehältern in Kläranlagen. Das Ziel: die Technik verständlich
erklären, die Kennzahlen glaubwürdig belegen und Anlagenbetreiber zur Kontaktaufnahme
bewegen.

<div class="row justify-content-center">
    <div class="col-sm-10 mt-3 mt-md-0">
        {% include figure.liquid loading="eager" path="assets/img/vaso-hero.jpg" class="img-fluid rounded z-depth-1" %}
    </div>
</div>
<div class="caption">
    VaSo®-Produktseite – Hero-Bereich.
</div>

<div class="row justify-content-center">
    <div class="col-sm-8 mt-3">
        <a href="{{ '/vaso/' | relative_url }}" class="btn btn-primary" target="_blank" rel="noopener">▶ Live-Seite öffnen</a>
    </div>
</div>

## Das Projekt

VaSo® arbeitet nach dem Mammutpumpenprinzip: Komprimiertes Gas wird in eine Lanze
(Steigrohr) eingepresst und erzeugt eine kraftvolle Aufwärtsströmung; mehrstufige
Trichter saugen Schlamm aus verschiedenen Höhenzonen an. Eine einzelne Lanze wälzt
so rund **900 m³/h** Schlamm-Wasser-Gemisch bei nur **70 m³/h** Gaseintrag um – ohne
bewegliche Teile im Behälter und ohne Betriebsunterbrechung bei der Nachrüstung.

Die Seite gliedert sich in Vorteile, Technologie-Erklärung, ein interaktiv
erkundbares 3D-Modell der Lanze, Kennzahlen, Referenzen und einen Kontaktbereich.

## Technische Umsetzung

- **Interaktives 3D-Modell:** [Three.js](https://threejs.org/) (r160, als ES-Module
  über eine Importmap geladen) rendert die VaSo®-Lanze – drehbar, zoombar, einzelne
  Bauteile anklickbar für Detailinfos.
- **Bewegtbild:** ein eingebettetes Video zeigt das Steigrohr im Einsatz.
- **Styling:** [Tailwind CSS](https://tailwindcss.com/) mit einem eigenen Dark-Theme
  (Navy/Teal) und den Schriften *Space Grotesk* & *Inter*.
- **Auslieferung:** als schlanke, statische Single-Page gebaut – schnell, ohne
  Framework-Runtime, direkt auf einfachem Webspace lauffähig.

<div class="row justify-content-center">
    <div class="col-sm-10 mt-3 mt-md-0">
        {% include figure.liquid loading="lazy" path="assets/img/vaso-tech-diagram.jpg" class="img-fluid rounded z-depth-1" %}
    </div>
</div>
<div class="caption">
    Strömungsvisualisierung der VaSo®-Lanze im Faulbehälter.
</div>

## Zur Live-Seite

Am besten selbst erkunden: Die [Live-Seite]({{ '/vaso/' | relative_url }}) zeigt das
interaktive 3D-Modell und die vollständige Produktpräsentation.
