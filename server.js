// server.js
// ButterflyMusic Freunde App – Stufe 1
// Frontend (Neon-Lobby) + Backend (Login, Chat, Coins, Level)

const express = require("express");
const cors = require("cors");
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// -------------------------------------------------
// KONFIG / KONSTANTEN
// -------------------------------------------------
const ROLES = {
  OWNER: "owner",
  ADMIN: "admin",
  MOD: "mod",
  USER: "user",
};

const RESERVED_NAMES = [
  "deepbutterflymusic",
  "dethoxia",
  "darkinfernal",
  "dethox"
];

const BANNED_WORDS = [
  "pimmel","schlampe","fotze","hurensohn","nutte","arsch",
  "sex","fick","ficken","dick","cock","pussy","penis",
  "titte","titten","boobs","porno","porn"
];

// Name vereinheitlichen für Vergleich / Filter
function normalizeName(str) {
  return (str || "")
    .toLowerCase()
    .replace(/0/g, "o")
    .replace(/1/g, "i")
    .replace(/3/g, "e")
    .replace(/4/g, "a")
    .replace(/@/g, "a")
    .replace(/\$/g, "s")
    .replace(/5/g, "s")
    .replace(/7/g, "t")
    .trim();
}

// -------------------------------------------------
// "Datenbank" im RAM (nur zum Starten)
// Später kommt da echte DB hin.
// -------------------------------------------------
const users = [
  {
    id: "1",
    name: "DeepButterflyMusic",
    normalizedName: "deepbutterflymusic",
    email: "owner@example.com",
    password: "supergeheim",
    avatar: "🦋",
    neonColor: "#ff00d9",
    language: "de",
    role: ROLES.OWNER,
    coins: 50000,
    level: 1,
    xp: 0,
    canBeBlocked: false,
    profileNote: "Be nice or leave ✨"
  },
  {
    id: "2",
    name: "Dethoxia",
    normalizedName: "dethoxia",
    email: "dethoxia@example.com",
    password: "dethoxia123",
    avatar: "😎",
    neonColor: "#00ffff",
    language: "en",
    role: ROLES.ADMIN,
    coins: 20000,
    level: 1,
    xp: 0,
    canBeBlocked: false,
    profileNote: "Co-Admin Account"
  },
  {
    id: "3",
    name: "DarkInfernal",
    normalizedName: "darkinfernal",
    email: "darkinfernal@example.com",
    password: "infernal123",
    avatar: "🔥",
    neonColor: "#ff3300",
    language: "de",
    role: ROLES.ADMIN,
    coins: 15000,
    level: 3,
    xp: 50,
    canBeBlocked: false,
    profileNote: "Admin / Partner-Account"
  },
  {
    id: "4",
    name: "TestUser01",
    normalizedName: "testuser01",
    email: "user@example.com",
    password: "user12345",
    avatar: "🙂",
    neonColor: "#00ffaa",
    language: "de",
    role: ROLES.USER,
    coins: 200,
    level: 1,
    xp: 10,
    canBeBlocked: true,
    profileNote: "Ich liebe Neon 😍"
  }
];

// Wer wird als "online" angezeigt beim Start:
const onlineUsers = new Set(["1","2","3","4"]);

// Level-/Coin-System
const LEVEL_CFG = {
  MAX_LEVEL: 500,
  XP_PER_LEVEL: 100
};

function addXPandCoins(u, xpGain, coinGain) {
  u.xp = (u.xp || 0) + xpGain;
  u.coins = (u.coins || 0) + coinGain;

  while (u.xp >= LEVEL_CFG.XP_PER_LEVEL) {
    u.xp -= LEVEL_CFG.XP_PER_LEVEL;
    u.level = (u.level || 1) + 1;

    if (u.level > LEVEL_CFG.MAX_LEVEL) {
      // Prestige-Reset:
      // Level wieder 1, wir könnten hier später ein Badge vergeben
      u.level = 1;
    }
  }
}

// erster Chatverlauf
const lobbyMessages = [
  {
    fromUserId: "1",
    avatar: "🦋",
    displayName: "DeepButterflyMusic",
    neonColor: "#ff00d9",
    role: "owner",
    text: "Willkommen in der ButterflyMusic Freunde App 💜 Bitte bleibt respektvoll.",
    timestamp: Date.now()
  }
];

// -------------------------------------------------
// Hilfsfunktionen
// -------------------------------------------------
function findUserByEmail(email) {
  return users.find(
    u => u.email.toLowerCase() === (email || "").toLowerCase()
  );
}

// Platzhalter-"Übersetzung"
function translateMessage(text, lang) {
  return `[${lang}] ${text}`;
}

// -------------------------------------------------
// API: Registrierung
// -------------------------------------------------
app.post("/api/register", (req, res) => {
  const { name, email, password, language, avatar, neonColor } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: "Fehlende Daten." });
  }
  if (name.length < 6) {
    return res.status(400).json({ error: "Name zu kurz (min. 6 Zeichen)." });
  }

  const loweredName = (name || "").toLowerCase();
  if (BANNED_WORDS.some(w => loweredName.includes(w))) {
    return res.status(400).json({ error: "Dieser Name ist nicht erlaubt." });
  }

  const norm = normalizeName(name);
  if (RESERVED_NAMES.includes(norm)) {
    return res.status(403).json({ error: "Dieser Name ist reserviert." });
  }

  // kein fast gleicher Name doppelt
  if (users.find(u => u.normalizedName === norm)) {
    return res.status(400).json({ error: "Name existiert schon / zu ähnlich." });
  }

  // doppelte E-Mail verhindern
  if (findUserByEmail(email)) {
    return res.status(400).json({ error: "E-Mail schon vergeben." });
  }

  const newUser = {
    id: String(Date.now()),
    name,
    normalizedName: norm,
    email,
    password, // ACHTUNG: später bitte hashen!
    avatar: avatar || "🙂",
    neonColor: neonColor || "#ff00d9",
    language: language || "de",
    role: ROLES.USER,
    coins: 0,
    level: 1,
    xp: 0,
    canBeBlocked: true,
    profileNote: ""
  };

  users.push(newUser);
  onlineUsers.add(newUser.id);

  return res.json({
    ok: true,
    user: {
      id: newUser.id,
      name: newUser.name,
      role: newUser.role,
      avatar: newUser.avatar,
      neonColor: newUser.neonColor,
      coins: newUser.coins,
      level: newUser.level,
      language: newUser.language,
      profileNote: newUser.profileNote
    }
  });
});

// -------------------------------------------------
// API: Login
// -------------------------------------------------
app.post("/api/login", (req, res) => {
  const { email, password } = req.body;

  const u = findUserByEmail(email || "");
  if (!u || u.password !== password) {
    return res.status(401).json({ error: "Falsche E-Mail oder Passwort." });
  }

  onlineUsers.add(u.id);

  return res.json({
    ok: true,
    user: {
      id: u.id,
      name: u.name,
      role: u.role,
      level: u.level,
      coins: u.coins,
      avatar: u.avatar,
      neonColor: u.neonColor,
      language: u.language,
      profileNote: u.profileNote || ""
    }
  });
});

// -------------------------------------------------
// API: Nachrichten der Lobby laden
// -------------------------------------------------
app.get("/api/lobby/messages", (req, res) => {
  const lang = req.query.lang || "de";

  const out = lobbyMessages.map(m => ({
    avatar: m.avatar,
    displayName: m.displayName,
    neonColor: m.neonColor,
    role: m.role,
    translatedText: translateMessage(m.text, lang),
    time: new Date(m.timestamp).toISOString()
  }));

  res.json({ messages: out });
});

// -------------------------------------------------
// API: Nachricht schicken
// -------------------------------------------------
app.post("/api/lobby/messages", (req, res) => {
  const { userId, text } = req.body;

  if (!text || !text.trim()) {
    return res.status(400).json({ error: "Kein Text." });
  }

  const u = users.find(x => x.id === userId);
  if (!u) {
    return res.status(401).json({ error: "User nicht gefunden / nicht eingeloggt." });
  }

  // Coins + XP fürs Schreiben
  addXPandCoins(u, 5, 1);

  const msg = {
    fromUserId: u.id,
    avatar: u.avatar,
    displayName: u.name,
    neonColor: u.neonColor,
    role: u.role,
    text: text.trim(),
    timestamp: Date.now()
  };

  lobbyMessages.push(msg);

  return res.json({ ok: true });
});

// -------------------------------------------------
// API: Wer ist online
// -------------------------------------------------
app.get("/api/online", (req, res) => {
  const list = users
    .filter(u => onlineUsers.has(u.id))
    .map(u => ({
      id: u.id,
      name: u.name,
      avatar: u.avatar,
      neonColor: u.neonColor,
      role: u.role
    }));

  res.json({ users: list });
});

// -------------------------------------------------
// API: Profil holen
// -------------------------------------------------
app.get("/api/profile/:uid", (req, res) => {
  const uid = req.params.uid;
  const u = users.find(x => x.id === uid);
  if (!u) return res.status(404).json({ error: "User nicht gefunden." });

  res.json({
    id: u.id,
    name: u.name,
    avatar: u.avatar,
    neonColor: u.neonColor,
    language: u.language,
    role: u.role,
    coins: u.coins,
    level: u.level,
    xp: u.xp,
    profileNote: u.profileNote || ""
  });
});

// -------------------------------------------------
// FRONTEND ausliefern
// Das ist deine komplette Neon-Oberfläche als eine Seite
// -------------------------------------------------
app.get("/", (req, res) => {
  // Hier kommt deine HTML aus index.html rein.
  // WICHTIG: API_BASE zeigt jetzt auf dieselbe Domain (leer = gleicher Server)
  res.type("html").send(`<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width,initial-scale=1.0" />
<title>ButterflyMusic Freunde App</title>
<style>
/* ------ DEIN CSS 1:1 (abgekürzt hier im Chat nicht nochmal wiederholen) ---- */
/* Du nimmst GENAU den kompletten <style> Block aus deiner Version
   und fügst ihn hier ein, anstelle von diesem Kommentar.
   ALLES von @keyframes pulseGlow ... bis zum @media ... { }  */
</style>
</head>
<body>

<!-- ------ DEIN BODY 1:1 ------ -->
<!-- Glitzer -->
<div class="sparkle s1"></div>
<div class="sparkle s2"></div>
<div class="sparkle s3"></div>
<div class="sparkle s4"></div>
<div class="sparkle s5"></div>

<header>
  <div class="app-left">
    <div class="logo-circle">🦋</div>
    <div class="app-title-block">
      <div class="app-name">ButterflyMusic Freunde App</div>
      <div class="app-sub">Lobby / Community-Zentrale</div>
    </div>
  </div>

  <div class="app-right">
    <div class="user-info">
      <div class="name" id="uiUserName">– nicht eingeloggt –</div>
      <div class="role" id="uiUserRole">-</div>
    </div>

    <div class="lang-select-wrap">
      <label for="lobbyLang">Sprache</label>
      <select id="lobbyLang">
        <option value="de">Deutsch</option>
        <option value="en">English</option>
        <option value="fr">Français</option>
        <option value="hu">Magyar</option>
        <option value="pl">Polski</option>
        <option value="zh">中文</option>
        <option value="es">Español</option>
        <option value="it">Italiano</option>
        <option value="tr">Türkçe</option>
        <option value="ru">Русский</option>
      </select>
    </div>
  </div>
</header>

<main>
  <section class="panel" id="chatPanel">
    <div class="panel-header">
      <div class="title">
        <div class="title-main" id="lobbyTitle">Lobby-Chat</div>
        <div class="title-sub" id="lobbySub">Alle können hier schreiben 🦋</div>
      </div>
      <div style="font-size:0.7rem;color:var(--text-dim);">
        <span id="onlineCount">0</span> online
      </div>
    </div>

    <div class="chat-messages" id="chatMessages"></div>

    <div class="chat-input-area">
      <input id="chatInput" type="text" placeholder="Nachricht schreiben..." />
      <button id="sendBtn">Senden</button>
    </div>
  </section>

  <section class="side-col">
    <div class="box">
      <div class="box-head">
        <span id="onlineTitle">Online jetzt</span>
        <span style="font-size:0.7rem;color:var(--text-dim);" id="startPrivateLabel">Privatchat starten</span>
      </div>
      <div class="online-scroll" id="onlineUsers"></div>
    </div>

    <div class="box">
      <div class="box-head">
        <span id="profileTitle">Dein Profil</span>
        <span style="font-size:0.6rem;color:var(--text-dim);" id="profilePrivateLabel">Privat</span>
      </div>
      <div class="profile-body" id="profileArea">
        <div class="profile-topline">
          <div class="profile-avatar" id="profileAvatar">🦋</div>
          <div class="profile-nameblock">
            <div class="profile-name" id="profileName" style="color:#ff00d9;">
              – nicht eingeloggt –
            </div>
            <div class="profile-role" id="profileRole">-</div>
          </div>
        </div>

        <div class="profile-row">
          <label id="labelProfileLang">Sprache</label>
          <div class="value" id="profileLangValue">-</div>
        </div>

        <div class="profile-row">
          <label id="labelProfileCoins">Coins</label>
          <div class="value" id="profileCoinsValue">-</div>
        </div>

        <div class="profile-row">
          <label id="labelProfileLevel">Level</label>
          <div class="value" id="profileLevelValue">-</div>
        </div>

        <div class="profile-row">
          <label id="labelProfileNote">Status / Info über dich</label>
          <div class="value" id="profileNoteValue">(Bitte einloggen)</div>
        </div>

        <div class="edit-profile-btn" id="editProfileBtn">
          Profil bearbeiten
        </div>
      </div>
    </div>
  </section>
</main>

<div id="authPanel">
  <div class="auth-card">
    <div class="auth-title">Willkommen 🦋</div>
    <div class="auth-sub">
      ButterflyMusic Freunde App<br/>
      Bitte einloggen oder registrieren.
    </div>

    <div class="auth-row">
      <label for="inputMode">Modus</label>
      <select id="inputMode">
        <option value="login">Einloggen</option>
        <option value="register">Registrieren</option>
      </select>
    </div>

    <div class="auth-row">
      <label for="inputName">Dein Name (min. 6 Zeichen)</label>
      <input id="inputName" placeholder="z.B. NeonRider99" />
    </div>

    <div class="auth-row">
      <label for="inputEmail">E-Mail</label>
      <input id="inputEmail" type="email" placeholder="deinname@example.com" />
    </div>

    <div class="auth-row">
      <label for="inputPass">Passwort</label>
      <input id="inputPass" type="password" placeholder="Passwort" />
    </div>

    <div class="auth-row">
      <label for="inputLang">Sprache</label>
      <select id="inputLang">
        <option value="de">Deutsch</option>
        <option value="en">English</option>
        <option value="hu">Magyar</option>
        <option value="fr">Français</option>
        <option value="pl">Polski</option>
        <option value="zh">中文</option>
        <option value="es">Español</option>
        <option value="it">Italiano</option>
        <option value="tr">Türkçe</option>
        <option value="ru">Русский</option>
      </select>
    </div>

    <div class="auth-row">
      <label for="inputAvatar">Avatar (Emoji)</label>
      <input id="inputAvatar" placeholder="🦋 😎 👾 🔥 🙂" />
    </div>

    <div class="auth-row">
      <label for="inputColor">Name-Farbe (Neon)</label>
      <input id="inputColor" placeholder="#ff00d9" value="#ff00d9" />
    </div>

    <div id="errorBox" style="color:#ff7b7b;text-shadow:0 0 6px #ff0000;font-size:0.7rem;min-height:1rem;text-align:center;"></div>

    <div class="auth-btn" id="authSubmitBtn">Los geht's</div>

    <div class="small-note" style="font-size:0.6rem;line-height:0.9rem;color:#8a8a8a;text-align:center;">
      Geschützte Namen:<br/>
      DeepButterflyMusic, Dethoxia,<br/>
      DarkInfernal, Dethox<br/>
      sind reserviert.<br/>
      Beleidigende / sexuelle Namen sind verboten.
    </div>
  </div>
</div>

<script>
// Wichtig: jetzt ist API_BASE einfach leer, weil dieselbe Domain benutzt wird.
const API_BASE = "";

// (Ab hier kommt dein kompletter <script>-Inhalt aus deiner index.html:
// applyUILanguage, lobbyTranslations, Login-Handler, loadMessages,
// loadOnline, loadProfile, usw. – 1:1 reinkopieren, aber
// die Zeile mit const API_BASE = "..."; NICHT doppelt machen.)
</script>

</body>
</html>`);
});

// -------------------------------------------------
// SERVER START
// -------------------------------------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log("✅ ButterflyMusic Freunde App läuft auf Port " + PORT);
});





