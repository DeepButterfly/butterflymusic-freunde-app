// ButterflyMusic Freunde App Backend
// Version: Stufe 1 (Login, Chat, Coins, Level, Online, Profile)
const express = require("express");
const cors = require("cors");
const app = express();

app.use(cors());
app.use(express.json());

// ---------------------------------------------
// ROLES / KONFIGURATION
// ---------------------------------------------
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

// Name normalisieren
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

// ---------------------------------------------
// "In-Memory"-Datenbank
// ---------------------------------------------
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

const onlineUsers = new Set(["1", "2", "3", "4"]);

const LEVEL_CFG = { MAX_LEVEL: 500, XP_PER_LEVEL: 100 };

function addXPandCoins(u, xpGain, coinGain) {
  u.xp = (u.xp || 0) + xpGain;
  u.coins = (u.coins || 0) + coinGain;
  while (u.xp >= LEVEL_CFG.XP_PER_LEVEL) {
    u.xp -= LEVEL_CFG.XP_PER_LEVEL;
    u.level = (u.level || 1) + 1;
    if (u.level > LEVEL_CFG.MAX_LEVEL) u.level = 1;
  }
}

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

function findUserByEmail(email) {
  return users.find(
    u => u.email.toLowerCase() === (email || "").toLowerCase()
  );
}

function translateMessage(text, lang) {
  return `[${lang}] ${text}`;
}

// ---------------------------------------------
// API: Registrierung
// ---------------------------------------------
app.post("/api/register", (req, res) => {
  const { name, email, password, language, avatar, neonColor } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: "Fehlende Daten." });
  }
  if (name.length < 6) {
    return res.status(400).json({ error: "Name zu kurz (min. 6 Zeichen)." });
  }

  const lowered = name.toLowerCase();
  if (BANNED_WORDS.some(w => lowered.includes(w))) {
    return res.status(400).json({ error: "Dieser Name ist nicht erlaubt." });
  }

  const norm = normalizeName(name);
  if (RESERVED_NAMES.includes(norm)) {
    return res.status(403).json({ error: "Dieser Name ist reserviert." });
  }

  if (users.find(u => u.normalizedName === norm)) {
    return res.status(400).json({ error: "Name existiert schon / zu ähnlich." });
  }

  if (findUserByEmail(email)) {
    return res.status(400).json({ error: "E-Mail schon vergeben." });
  }

  const newUser = {
    id: String(Date.now()),
    name,
    normalizedName: norm,
    email,
    password,
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

  res.json({ ok: true, user: newUser });
});

// ---------------------------------------------
// API: Login
// ---------------------------------------------
app.post("/api/login", (req, res) => {
  const { email, password } = req.body;
  const u = findUserByEmail(email || "");
  if (!u || u.password !== password) {
    return res.status(401).json({ error: "Falsche E-Mail oder Passwort." });
  }
  onlineUsers.add(u.id);
  res.json({ ok: true, user: u });
});

// ---------------------------------------------
// API: Chatnachrichten lesen
// ---------------------------------------------
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

// ---------------------------------------------
// API: Nachricht senden
// ---------------------------------------------
app.post("/api/lobby/messages", (req, res) => {
  const { userId, text } = req.body;
  if (!text || !text.trim()) {
    return res.status(400).json({ error: "Kein Text." });
  }
  const u = users.find(x => x.id === userId);
  if (!u) return res.status(401).json({ error: "User nicht gefunden." });
  addXPandCoins(u, 5, 1);
  lobbyMessages.push({
    fromUserId: u.id,
    avatar: u.avatar,
    displayName: u.name,
    neonColor: u.neonColor,
    role: u.role,
    text: text.trim(),
    timestamp: Date.now()
  });
  res.json({ ok: true });
});

// ---------------------------------------------
// API: Online-Liste
// ---------------------------------------------
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

// ---------------------------------------------
// API: Profil abrufen
// ---------------------------------------------
app.get("/api/profile/:uid", (req, res) => {
  const u = users.find(x => x.id === req.params.uid);
  if (!u) return res.status(404).json({ error: "User nicht gefunden." });
  res.json(u);
});

// ---------------------------------------------
// START SERVER
// ---------------------------------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ ButterflyMusic Freunde App Backend läuft auf Port ${PORT}`);
});





