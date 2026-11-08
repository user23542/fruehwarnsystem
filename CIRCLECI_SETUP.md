# Frühwarnsystem – CircleCI-Umstellung

Projekt: https://github.com/user23542/fruehwarnsystem

## Ziel

CircleCI prüft die bestehenden Tests, übernimmt das vorherige technische Quellenprotokoll aus dem Branch `gh-pages`, prüft die Quellen auf Änderungen und veröffentlicht das gesamte Verzeichnis `site/` auf `gh-pages`. Eine Textänderung ändert **niemals ungeprüft die Risikostufe** in `assessment.json`.

Das GitHub-Actions-Kontingent wird **nicht** für eigene GitHub-Actions-Quellenchecks verwendet. GitHub Pages startet für die Auslieferung selbst weiterhin einen GitHub-eigenen Deployment-Workflow. Wenn GitHub selbst alle Actions-Runs blockiert, ist zusätzlich ein anderes Hosting erforderlich.

## 1. Diese Erweiterung in Termux einspielen

ZIP herunterladen und dann ausführen:

```bash
cd ~/fruehwarnsystem
unzip -o ~/storage/downloads/Fruehwarnsystem_CircleCI_Erweiterung.zip -d .
git add .circleci/config.yml CIRCLECI_SETUP.md
git commit -m "CircleCI fuer Fruehwarnsystem einrichten"
git push origin main
```

Prüfen, ob die Datei unter `https://github.com/user23542/fruehwarnsystem/blob/main/.circleci/config.yml` sichtbar ist.

**Nicht sofort die alte GitHub-Action erneut starten.** Wenn CircleCI funktioniert, kann sie durch Verschieben oder Umbenennen von `.github/workflows/pages.yml` deaktiviert werden.

## 2. Nur für dieses Repository gültigen Deploy-Key erzeugen

In Termux:

```bash
pkg install -y openssh coreutils
mkdir -p ~/.ssh
ssh-keygen -t ed25519 -f ~/.ssh/fruehwarnsystem_circleci -C 'fruehwarnsystem-circleci' -N ''
cat ~/.ssh/fruehwarnsystem_circleci.pub
```

Die **öffentliche** Schlüsselzeile ausgeben und in GitHub unter
https://github.com/user23542/fruehwarnsystem/settings/keys
über **Add deploy key** eintragen. **Allow write access** aktivieren (notwendig, damit CircleCI den `gh-pages`-Branch aktualisieren darf).

Die **private** Schlüsseldatei `~/.ssh/fruehwarnsystem_circleci` nicht in GitHub oder in den Chat laden.

Für den Eintrag in CircleCI wird der private Key ausschließlich **lokal** in Base64 umgewandelt:

```bash
base64 -w 0 ~/.ssh/fruehwarnsystem_circleci; printf '\n'
```

Diesen Wert nur unter **CircleCI → Frühwarnsystem → Project Settings → Environment Variables** mit dem Namen `GH_PAGES_DEPLOY_KEY_B64` ablegen. Niemals in Quellcode, Markdown, Screenshots oder Chat einfügen.

## 3. CircleCI-Projekt verbinden

https://app.circleci.com/ öffnen, GitHub-Verbindung auswählen und `user23542/fruehwarnsystem` als Projekt einrichten. Config Source und Checkout Source müssen auf demselben Repository liegen. Config Path: `.circleci/config.yml`. Hauptbranch `main`.

Über **Trigger Pipeline** einen Testlauf auf `main` starten. Die Tests und die Quellenprüfung müssen erfolgreich durchlaufen, anschließend muss der Branch `gh-pages` vorhanden sein.

Für monatliche Aktualisierungen einen **Schedule Trigger** unter CircleCI Project Settings einrichten: am 8. jedes Monats, z. B. 08:23 Uhr Ortszeit. Schedule Trigger werden im CircleCI-Webinterface konfiguriert; der ältere `schedule`-Block im Workflow funktioniert nicht bei allen GitHub-App-Integrationen.

## 4. GitHub Pages umstellen

https://github.com/user23542/fruehwarnsystem/settings/pages

Unter **Build and deployment → Source** `Deploy from a branch` auswählen, danach Branch `gh-pages` und Ordner `/(root)` wählen; **Save**.

Erst wenn CircleCI erfolgreich gepusht hat, kann dieser Branch im Dropdown ausgewählt werden.

Die Website soll danach unter https://user23542.github.io/fruehwarnsystem/ erscheinen.

## Sicherheit und technische Grenzen

- Das System berechnet keine neue politische Handlungsstufe aus bloßen Hash-Änderungen.
- Der automatische Quellenmonitor zeigt nur technische Quellenänderungen oder Abruffehler.
- Der CircleCI-Schlüssel erhält nur Schreibzugriff auf das eine GitHub-Repository.
- Bei Verlust der CircleCI- oder GitHub-Schlüssel können Keys in beiden Oberflächen widerrufen werden.
- Wird GitHub Pages trotz Wechsel auf Branch-Publikation wegen einer generellen GitHub-Actions-Sperre nicht bereitgestellt, braucht die statische Website einen anderen Host wie Cloudflare Pages. CircleCI selbst kann die GitHub-Pages-internen Deployments nicht ersetzen.

## Offizielle Dokumentation

- CircleCI SSH Keys: https://circleci.com/docs/guides/integration/add-ssh-key/
- CircleCI Schedule Triggers: https://circleci.com/docs/guides/orchestrate/scheduled-pipelines/
- CircleCI manuell starten: https://circleci.zendesk.com/hc/en-us/articles/36230514624027-How-to-manually-run-a-pipeline
- GitHub Pages aus Branch: https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site
- GitHub SSH Hostfingerprints: https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/githubs-ssh-key-fingerprints
