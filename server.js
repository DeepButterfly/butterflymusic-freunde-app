const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const bcrypt = require("bcryptjs");

// -----------------------------
// In-Memory Daten / Config
// -----------------------------
const roles = {
  OWNER: "owner",
  ADMIN: "admin",
  MOD: "mod",
  USER: "user",
};

const SYSTEM_PROTECTED_NAMES = [
  "deepbutterflymusic",
  "dethoxia",
  "darkinfernal",
  "dethox",
];

const BANNED_WORDS = [
  "pimmel",
  "schlampe",
  "fotze",
  "hurensohn",
  "nutte",
  "arsch",
  "sex",
  "fick",
  "ficken",
  "dick",
  "cock",
  "pussy",
  "penis",
  "titte",
  "titten",
  "boobs"
];

const LINKED_ACCOUNTS = {
  darkinfernal: "dethox",
  dethox: "darkinfernal",
};

const users = [
  {
    id: "1",
    name: "DeepButterflyMusic",
    normalizedName: "deepbutterflymusic",
    email: "owner@example.com",
    // ACHTUNG: für dich lokal ist das Klartext, bcrypt wird erst bei neuen Usern benutzt
    password: "supergeheim",
    avatar: "🦋",
    neonColor: "#ff00d9",
    language: "de",
    role: roles.OWNER,
    level: 1,
    xp: 0,
    coins: 50000,
    blocked: [],
    profileNote: "Be nice or leave ✨",
    canBeBlocked: false
  },
  {
    id: "2",
    name: "Dethoxia",
    normalizedName: "dethoxia",
    email: "alt-owner@example.com",
    password: "supergeheim2",
    avatar: "😎",
    neonColor: "#00ffff",
    language: "en",
    role: roles.ADMIN,
    level: 1,
    xp: 0,
    coins: 20000,
    blocked: [],
    profileNote: "Co-Admin Account",
    canBeBlocked: false
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
    role: roles.ADMIN,
    level: 3,
    xp: 50,
    coins: 15000,
    blocked: [],
    profileNote: "Admin / Partner-Account",
    canBeBlocked: false
  },
  {
    id: "4",
    name: "Dethox",
    normalizedName: "dethox",
    email: "dethox@example.com",
    password: "infernal123",
    avatar: "👾",
    neonColor: "#00ffaa",
    language: "de",
    role: roles.ADMIN,
    level: 3,
    xp: 50,
    coins: 15000,
    blocked: [],
    profileNote: "Zweit-Account von DarkInfernal",
    canBeBlocked: false
  }
];

// Lobby Chat Speicher
const lobbyMessages = [
  {
    fromUserId: "1",
    avatar: "🦋",
    displayName: "DeepButterflyMusic",
    neonColor: "#ff00d9",
    role: roles.OWNER,
    text: "Willkommen in der ButterflyMusic Freunde App 💜 Bitte bleibt respektvoll.",
    timestamp: Date.now(),
  }
];

const onlineUsers = new Set(["1", "2", "3", "4"]);

const ECONOMY = {
  TOTAL_POOL: 100000000,
  COINS_PER_30_MIN: 50,
  MOD_START: 5000,
  ADMIN_START: 15000,
  USER_START: 0,
  OWNER_START: 50000,
};

const LEVEL_CFG = {
  MAX_LEVEL: 500,
  XP_PER_LEVEL: 100,
};

// -----------------------------
// Hilfsfunktionen
// -----------------------------
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

function findUserByEmail(email) {
  return users.find(
    (u) => u.email.toLowerCase() === (email || "").toLowerCase()
  );
}

function findUserByName(nameRaw) {
  const n = normalizeName(nameRaw || "");
  return users.find((u) => u.normalizedName === n);
}

function canBlock(blocker, target) {
  if (target.canBeBlocked === false) return false;
  if ([roles.OWNER, roles.ADMIN, roles.MOD].includes(target.role)) return false;
  return true;
}

function translateMessage(text, lang) {
  // später echter Übersetzer - jetzt Platzhalter
  return `[${lang}] ${text}`;
}

function giveXP(user, xp) {
  user.xp = (user.xp || 0) + xp;
  while (user.xp >= LEVEL_CFG.XP_PER_LEVEL) {
    user.xp -= LEVEL_CFG.XP_PER_LEVEL;
    user.level = (user.level || 1) + 1;
    if (user.level > LEVEL_CFG.MAX_LEVEL) {
      // Prestige Reset nach Level 500
      user.level = 1;
      // hier könnte man dauerhaftes Badge speichern
    }
  }
}

// -----------------------------
// Express Setup
// -----------------------------
const app = express();
app.use(cors());
app.use(bodyParser.json());

// -------------------------------------------------
// API: Registrierung
// -------------------------------------------------
app.post("/api/register", async (req, res) => {
  const { name, email, password, language, avatar, neonColor } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: "Fehlende Daten." });
  }

  if (name.length < 6) {
    return res.status(400).json({ error: "Name zu kurz." });
  }

  const lower = (name || "").toLowerCase();
  if (BANNED_WORDS.some((w) => lower.includes(w))) {
    return res.status(400).json({ error: "Dieser Name ist nicht erlaubt." });
  }

  const normalized = normalizeName(name);

  if (SYSTEM_PROTECTED_NAMES.includes(normalized)) {
    return res.status(403).json({ error: "Dieser Name ist reserviert." });
  }

  if (users.find((u) => u.normalizedName === normalized)) {
    return res.status(400).json({ error: "Name existiert schon / zu ähnlich." });
  }

  if (findUserByEmail(email)) {
    return res.status(400).json({ error: "E-Mail schon vergeben." });
  }

  // Hash für neue User
  const hashed = await bcrypt.hash(password, 10);

  const newUser = {
    id: String(Date.now()),
    name,
    normalizedName: normalized,
    email,
    password: hashed,
    avatar: avatar || "🙂",
    neonColor: neonColor || "#ff00d9",
    language: language || "de",
    role: roles.USER,
    level: 1,
    xp: 0,
    coins: ECONOMY.USER_START,
    blocked: [],
    canBeBlocked: true,
  };

  users.push(newUser);
  onlineUsers.add(newUser.id);

  return res.json({
    ok: true,
    user: {
      id: newUser.id,
      name: newUser.name,
      role: newUser.role,
      coins: newUser.coins,
      level: newUser.level,
      avatar: newUser.avatar,
      neonColor: newUser.neonColor,
      language: newUser.language,
    },
  });
});

// -------------------------------------------------
// API: Login
// -------------------------------------------------
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;

  const u = findUserByEmail(email || "");
  if (!u) {
    return res.status(401).json({ error: "Falsche E-Mail oder Passwort." });
  }

  // bei den Default-Usern oben ist password noch Klartext.
  // Deswegen: wenn bcrypt fehlschlägt, erlauben wir auch Klartextvergleich.
  let okPw = false;
  try {
    okPw = await bcrypt.compare(password || "", u.password);
  } catch (e) {
    okPw = (password === u.password);
  }
  if (!okPw) {
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
    },
  });
});

// -------------------------------------------------
// API: Lobby Messages holen
// -------------------------------------------------
app.get("/api/lobby/messages", (req, res) => {
  const lang = req.query.lang || "de";

  const msgs = lobbyMessages.map((m) => ({
    ...m,
    translatedText: translateMessage(m.text, lang),
    time: new Date(m.timestamp).toISOString(),
  }));

  res.json({ messages: msgs });
});

// -------------------------------------------------
// API: Neue Lobby Nachricht
// -------------------------------------------------
app.post("/api/lobby/messages", (req, res) => {
  const { userId, text } = req.body;

  const u = users.find((x) => x.id === userId);
  if (!u) {
    return res.status(401).json({ error: "User nicht gefunden." });
  }

  const newMsg = {
    fromUserId: u.id,
    avatar: u.avatar,
    displayName: u.name,
    neonColor: u.neonColor,
    role: u.role,
    text,
    timestamp: Date.now(),
  };

  lobbyMessages.push(newMsg);

  // XP / Coins Belohnung
  giveXP(u, 5);
  u.coins += 1;

  res.json({ ok: true });
});

// -------------------------------------------------
// API: Wer ist online?
// -------------------------------------------------
app.get("/api/online", (req, res) => {
  const list = users
    .filter((u) => onlineUsers.has(u.id))
    .map((u) => ({
      id: u.id,
      name: u.name,
      avatar: u.avatar,
      neonColor: u.neonColor,
      role: u.role,
    }));

  res.json({ users: list });
});

// -------------------------------------------------
// API: Profil abrufen
// -------------------------------------------------
app.get("/api/profile/:userId", (req, res) => {
  const userId = req.params.userId;

  const u = users.find((x) => x.id === userId);
  if (!u) {
    return res.status(404).json({ error: "User nicht gefunden." });
  }

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
    profileNote: u.profileNote || "",
  });
});

// -------------------------------------------------
// API: Musik Upload (gesperrt)
app.post("/api/music/upload", (req, res) => {
  return res.status(403).json({
    error: "Musik-Upload ist geschützt / Filter aktiv / kommt später.",
  });
});

// -------------------------------------------------
// FRONTEND AUSLIEFERN
// -------------------------------------------------

// Die komplette HTML deiner App als String.
// Wichtig: API_BASE zeigt auf dieselbe Domain (kein localhost mehr)
const FRONT_HTML = `
<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width,initial-scale=1.0" />
<title>ButterflyMusic Freunde App</title>
<style>
/* (KÜRZUNG: hier kommt dein kompletter CSS aus index.html rein) */
body { background:#000; color:#fff; font-family:sans-serif; }
</style>
</head>
<body>
<div id="app-root">Lädt ButterflyMusic Freunde App… 🦋</div>
<script>
// hier kommt dein komplettes JS aus index.html rein, nur:
// const API_BASE = "" wird ersetzt durch leeren String,
// weil wir jetzt auf derselben Domain laufen.

const API_BASE = "";

// Beispiel-Test:
fetch("/api/lobby/messages?lang=de")
 .then(r=>r.json())
 .then(d=>{
   const root=document.getElementById("app-root");
   root.innerHTML = "<pre style='white-space:pre-wrap;color:#0ff'>" + JSON.stringify(d,null,2) + "</pre>";
 })
 .catch(e=>{
   document.getElementById("app-root").textContent = "Fehler beim Laden 😭";
});
</script>
</body>
</html>
`;

// Diese Route liefert die Seite, wenn jemand die Hauptadresse öffnet
app.get("/", (req, res) => {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(FRONT_HTML);
});

// -------------------------------------------------
// Server starten (Render-kompatibel)
// -------------------------------------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ ButterflyMusic Freunde App Server läuft auf Port ${PORT}`);
});



