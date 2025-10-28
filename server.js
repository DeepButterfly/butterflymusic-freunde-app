// server.js
// ButterflyMusic Freunde App Backend
// passt zu deiner index.html mit Neon-Lobby

const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// -------------------------------------------------
// ROLES / NAMEN / VERBOTENE WÖRTER
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
  "dethox",
];

const BANNED_WORDS = [
  "pimmel","schlampe","fotze","hurensohn","nutte","arsch",
  "sex","fick","ficken","dick","cock","pussy","penis",
  "titte","titten","boobs"
];

// Hilfsfunktion um Namen zu vergleichen ohne Tricks wie P1mmel
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
// "Datenbank" im Speicher (RAM) – nur zum Start
// Später kann das in echte DB umziehen.
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
    profileNote: "Be nice or leave ✨",
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
    profileNote: "Co-Admin Account",
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
    profileNote: "Admin / Partner-Account",
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
    role: ROLES.ADMIN,
    coins: 15000,
    level: 3,
    xp: 50,
    canBeBlocked: false,
    profileNote: "Zweit-Account von DarkInfernal",
  }
];

// Wer gerade online ist
const onlineUsers = new Set(["1","2","3","4"]);

// Level-System Basics
const LEVEL_CFG = {
  MAX_LEVEL: 500,
  XP_PER_LEVEL: 100,
};

// Chat-Verlauf in der Lobby
const lobbyMessages = [
  {
    fromUserId: "1",
    avatar: "🦋",
    displayName: "DeepButterflyMusic",
    neonColor: "#ff00d9",
    role: "owner",
    text: "Willkommen in der ButterflyMusic Freunde App 💜 Bitte bleibt respektvoll.",
    timestamp: Date.now(),
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

function giveXP(user, amount) {
  user.xp = (user.xp || 0) + amount;
  while (user.xp >= LEVEL_CFG.XP_PER_LEVEL) {
    user.xp -= LEVEL_CFG.XP_PER_LEVEL;
    user.level = (user.level || 1) + 1;
    if (user.level > LEVEL_CFG.MAX_LEVEL) {
      // Reset nach 500
      user.level = 1;
      // Später: hier könnte man ein "Prestige Badge" vergeben
    }
  }
}

// Platzhalter-Übersetzung (später echte Übersetzung)
function translateMessage(text, lang) {
  return `[${lang}] ${text}`;
}

// -------------------------------------------------
// ROUTE: Registrierung
// -------------------------------------------------
app.post("/api/register", (req, res) => {
  const { name, email, password, language, avatar, neonColor } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: "Fehlende Daten." });
  }
  if (name.length < 6) {
    return res.status(400).json({ error: "Name zu kurz." });
  }

  const loweredName = (name || "").toLowerCase();
  if (BANNED_WORDS.some(w => loweredName.includes(w))) {
    return res.status(400).json({ error: "Dieser Name ist nicht erlaubt." });
  }

  const norm = normalizeName(name);
  if (RESERVED_NAMES.includes(norm)) {
    return res.status(403).json({ error: "Dieser Name ist reserviert." });
  }

  // Name darf nicht fast identisch wie bestehende sein
  if (users.find(u => u.normalizedName === norm)) {
    return res.status(400).json({ error: "Name existiert schon / zu ähnlich." });
  }

  // E-Mail darf nicht doppelt sein
  if (findUserByEmail(email)) {
    return res.status(400).json({ error: "E-Mail schon vergeben." });
  }

  const newUser = {
    id: String(Date.now()),
    name,
    normalizedName: norm,
    email,
    password, // ⚠ später mit Hash absichern
    avatar: avatar || "🙂",
    neonColor: neonColor || "#ff00d9",
    language: language || "de",
    role: ROLES.USER,
    coins: 0,
    level: 1,
    xp: 0,
    canBeBlocked: true,
    profileNote: "",
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
    }
  });
});

// -------------------------------------------------
// ROUTE: Login
// -------------------------------------------------
app.post("/api/login", (req, res) => {
  const { email, password } = req.body;

  const u = findUserByEmail(email || "");
  if (!u) {
    return res.status(401).json({ error: "Falsche E-Mail oder Passwort." });
  }

  if (u.password !== password) {
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
      profileNote: u.profileNote || "",
    }
  });
});

// -------------------------------------------------
// ROUTE: Lobby Nachrichten abrufen (mit Übersetzung)
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
// ROUTE: Neue Chat-Nachricht senden
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

  // Level/Coins Belohnung fürs Schreiben
  giveXP(u, 5);
  u.coins += 1;

  const msg = {
    fromUserId: u.id,
    avatar: u.avatar,
    displayName: u.name,
    neonColor: u.neonColor,
    role: u.role,
    text: text.trim(),
    timestamp: Date.now(),
  };

  lobbyMessages.push(msg);

  return res.json({ ok: true });
});

// -------------------------------------------------
// ROUTE: Wer ist online
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
// ROUTE: Profildaten holen
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
    profileNote: u.profileNote || "",
  });
});

// -------------------------------------------------
// START SERVER (Render-kompatibel)
// -------------------------------------------------
const PORT = process.env.PORT || 3000;

// ganz wichtig für Render: 0.0.0.0 binden
app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ ButterflyMusic Freunde App Backend läuft auf Port ${PORT}`);
});




