BUTTERFLYMUSIC FREUNDE APP – DEPLOY ANLEITUNG (KOSTENLOS)

1. GITHUB ACCOUNT
- Gehe auf github.com, kostenlos anmelden.
- Neues Public Repository erstellen, z.B. butterflymusic-freunde-app.
- Diese Dateien hochladen:
  - package.json
  - server.js
  - data.js
  - Dockerfile
  - render.yaml
  - index.html
  - README-DEPLOY.txt

2. FRONTEND LIVE MACHEN (GITHUB PAGES)
- In deinem Repo auf GitHub:
  Settings -> Pages -> "Deploy from a branch".
- Branch: main (root auswählen).
- GitHub gibt dir eine URL:
  https://DEINNAME.github.io/butterflymusic-freunde-app
Das ist deine öffentliche Seite (index.html wird angezeigt).

3. BACKEND STARTEN (RENDER, FREE)
- Auf render.com kostenlos registrieren.
- "New +" -> "Web Service".
- Verbinde dein GitHub Repo.
- Build Command: npm install
- Start Command: npm start
- Plan: free
- Deploy.
Render gibt dir eine URL wie:
  https://butterflymusic-server.onrender.com

4. FRONTEND MIT BACKEND VERBINDEN
- Öffne index.html.
- Finde die Zeile:
  const API_BASE = "http://localhost:3000";
- Ersetze sie durch deine Render-URL, z.B.:
  const API_BASE = "https://butterflymusic-server.onrender.com";
- Dann committen/pushen.
- Fertig.

5. WAS DIE USER DANN SEHEN
- Neon Login / Registrierung, inkl. Sprachauswahl.
- Verbotene/eklige Namen werden abgelehnt.
- Geschützte Namen (DeepButterflyMusic, Dethoxia, DarkInfernal, Dethox) sind reserviert.
- Nach Login: Lobby-Chat mit Zeitstempel und Übersetzungsanzeige.
- Coins + Level steigen beim Schreiben.
- Online-Liste mit Rollen (owner / admin / mod / user).
- Profil mit Avatar, Coins, Level, Sprache.
- Blockieren geschützt: Admins / Owner / Mods sind nicht blockbar.
- Musik-Upload ist gesperrt (Jugendschutz).

6. WICHTIG
- Bitte erstmal keine echten privaten Passwörter verwenden beim Testen.
- Solange keine externe Datenbank läuft, gehen Daten verloren,
  wenn der Server neu startet (das ist normal in dieser Phase).
