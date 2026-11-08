# Frühwarnsystem – GitHub Pages

Quellenorientiertes, responsives Dashboard zu zehn gesellschaftlichen und politischen Frühwarnindikatoren für Berlin und Deutschland. Die sichtbare Gesamteinschätzung ist eine **qualitative Handlungsempfehlung, keine gemessene Gefahrwahrscheinlichkeit**. Die erste Datenausgabe enthält eine **begrenzte redaktionelle Einordnung mit Stand 8. November 2026**. Für eine umfassende Neubewertung müssen sämtliche Bereiche erneut geprüft werden.

## Enthalten

- Fertige Website (`site/index.html`, `styles.css`, `app.js`), ohne externe Fonts oder Trackingdienste.
- Genau zehn Indikatoren mit Erklärungen, datierter Einordnung, möglichen Entwicklungen, Eskalationsschwellen, Gegenindikatoren und echten Quellenlinks.
- Große sechsstufige Skala, Verlaufsansicht mit ausschließlich dokumentierten Bewertungen, Filter und Suche.
- Technischer Quellenmonitor mit regelmäßigem Workflow und manueller Ausführung über GitHub Actions.
- GitHub Pages Deployment und einfache Tests.

## Website veröffentlichen

1. In GitHub ein neues **öffentliches Repository** anlegen (GitHub Pages über GitHub Free ist bei öffentlichen Repositories verfügbar). In das Repository den **Inhalt** dieses Pakets hochladen, sodass `.github/workflows/pages.yml` und `site/index.html` im Repository liegen. GitHub Actions sind für das Repository zuzulassen.
2. Unter **Settings → Pages → Build and deployment → Source** die Option **GitHub Actions** wählen.
3. Den Workflow **„Frühwarnsystem — Quellencheck und Website“** unter **Actions** einmal per **Run workflow** starten. Er überprüft ausgewählte Webseiten technisch und stellt danach die Website bereit.
4. Die anschließend von GitHub Pages angezeigte Adresse verwenden. Die Website ruft beim Öffnen sowie bei **„Anzeigen aktualisieren“** die aktuell veröffentlichten JSON-Dateien ab.
5. Der Workflow läuft danach **am 8. jedes Monats um 07:23 UTC** automatisch. Durch die Sommer-/Winterzeit entspricht das in Berlin 08:23 bzw. 09:23 Uhr; GitHub kann geplante Läufe verzögern. Ein manueller Lauf ist jederzeit unter Actions möglich.

**Wichtig:** Der Button in der öffentlichen Webseite lädt die neuesten **bereits veröffentlichten** Daten. Er löst keinen GitHub-Workflow aus; das wäre von einer öffentlichen statischen Website ohne sichere Authentifizierung nicht vertretbar. Besitzer:innen starten einen neuen Quellencheck über **GitHub → Actions → Run workflow**.

**Repositoryschutz:** Der Workflow benötigt Schreibrechte für den Commit der automatischen `monitor.json`. Wenn Branch Protection automatische Bot-Commits sperrt, den Workflow entsprechend anpassen. Keine Zugangsdaten in HTML oder JavaScript speichern.

## Was aktualisiert sich automatisch?

Der Workflow prüft eine kuratierte Liste offizieller und institutioneller Webseiten auf Textänderungen und durchsucht den Bundestags-RSS-Feed nach relevanten Titeln. Er schreibt den technischen Status nach `site/data/monitor.json` und veröffentlicht ihn. Fehlschläge, Änderungen und letzte Abrufzeiten sind sichtbar; erkannte Änderungen bleiben **ungeprüfte Recherchehinweise**.

**Nicht automatisch:** Die handlungsbezogene Stufe 0–5 und die inhaltlichen Absätze. Ein geänderter Webseiten-Hash kann auf eine Pressemitteilung, Navigation, Korrektur oder eine substantielle politische Änderung zurückgehen. Deshalb wäre eine automatische Gleichsetzung von Textänderungen mit politischer Gefahr methodisch falsch. Der fachliche Stand wird bewusst aus `site/data/assessment.json` geladen und **erst nach Quellenprüfung geändert**. Sobald diese Datei redaktionell geändert und ins Repository übernommen wird, passt die Website ihre Anzeige automatisch an.

## Redaktionelles Update

1. Veröffentlichungen nachprüfen: tatsächliche Änderungen, Gegenevidenz, Datum und Rechtsstatus unterscheiden.
2. `site/data/assessment.json` bearbeiten: `evaluatedAt`, `overall`, passende `indicators`, zugehörige `sources` und bei geänderter Stufe `history`.
3. Aktualisierung committen. Die Website wird automatisch neu veröffentlicht.
4. Wenn es keine substanzielle Neubewertung gibt, bleibt das redaktionelle Datum unverändert. So wird keine Aktualität vorgetäuscht.

## Lokal ansehen / testen

```bash
python3 -m http.server 8765 --directory site
```

Dann `http://localhost:8765` öffnen. Direktes Öffnen via `file://` funktioniert wegen der lokalen JSON-Abrufe nicht zuverlässig. Automatische Quellenabrufe funktionieren nur dort, wo die externen Quellen erreichbar sind.

```bash
python3 -m unittest discover -s tests -v
```

## Datenschutz, Methodik und Grenzen

- Keine Formulare für persönliche Gesundheitsdaten, keine Nutzerkonten und kein Tracking.
- Die Webseite speichert keine individuellen Profile. GitHub Pages als Hosting kann eigene Verbindungsdaten verarbeiten.
- Signalstärke einzelner Marker ≠ Handlungsstufe für alle Menschen.
- Der automatische Check prüft Seiten **technisch**, nicht juristisch, politikwissenschaftlich oder sicherheitspsychologisch.
- Der Quellenmonitor erkennt möglicherweise falsch-positive Textänderungen oder verpasst Entwicklungen außerhalb seiner Quellenauswahl. Fehlende Änderungen sind **kein Entwarnungsnachweis**.
- GitHub Actions kann geplante Läufe verzögern und sie in inaktiven öffentlichen Repositories deaktivieren.
- Die Website ersetzt weder individuelle Schutzberatung noch ärztliche oder juristische Beratung.

## Weiterentwicklung

Für vollständig automatisierte *inhaltliche* Vorschläge wäre ein zusätzlicher, abgesicherter Recherche-/Bewertungsdienst sinnvoll: gezielte Quellenrecherche → strukturiertes Dossier mit Fundstellen → unabhängige Gegenprüfung → Änderungsvorschlag als Pull Request → Freigabe → neue Warnstufe. **Ohne menschliche Freigabe sollten folgenschwere Warnstufensprünge nicht publiziert werden.**
