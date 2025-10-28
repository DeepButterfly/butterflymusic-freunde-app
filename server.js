const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const bcrypt = require("bcryptjs");

const {
  users,
  roles,
  SYSTEM_PROTECTED_NAMES,
  BANNED_WORDS,
  LINKED_ACCOUNTS,
  lobbyMessages,
  onlineUsers,
  ECONOMY,
  LEVEL_CFG,
} = require("./data.js");

const app = express();
app.use(cors());
app.use(bodyParser.json());

// -------------------------------------------------
// Hilfsfunktionen
// -------------------------------------------------
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

function getLinkedUser(user) {
  const partnerName = LINKED_ACCOUNTS[user.normalizedName];
  if (partnerName) {
    const partner = users.find((u) => u.normalizedName === partnerName);
    if (partner) return partner;
  }
  return null;
}

function canBlock(blocker, target) {
  // Admins / Mods / Owner / geschützte Namen dürfen NICHT geblockt werden
  if (target.canBeBlocked === false) return false;
  if ([roles.OWNER, roles.ADMIN, roles.MOD].includes(target.role)) return false;
  return true;
}

function addCoins(user, amount) {
  user.coins += amount;
}

function translateMessage(text, lang) {
  // Platzhalter für echte Übersetzung
  return `[${lang}] ${text}`;
}

function giveXP(user, xp) {
  user.xp += xp;
  while (user.xp >= LEVEL_CFG.XP_PER_LEVEL) {
    user.xp -= LEVEL_CFG.XP_PER_LEVEL;
    user.level += 1;
    if (user.level > LEVEL_CFG.MAX_LEVEL) {
      // Prestige-Reset über Level 500
      user.level = 1;
      // Hier könnte ein dauerhaftes "Legend"-Badge kommen
    }
  }
}

// checke ob ein angegebener Anzeigename schmutzige/verbotene Wörter enthält
function containsBannedWord(nameRaw) {
  const lower = (nameRaw || "").toLowerCase();
  return BANNED_WORDS.some((w) => lower.includes(w));
}

// -------------------------------------------------
// Registrierung
// -------------------------------------------------
app.post("/api/register", async (req, res) => {
  const { name, email, password, language, avatar, neonColor } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: "Fehlende Daten." });
  }

  if (name.length < 6) {
    return res.status(400).json({ error: "Name zu kurz." });
  }

  // keine schmutzigen / sexuellen / beleidigenden Namen
  if (containsBannedWord(name)) {
    return res.status(400).json({
      error: "Dieser Name ist nicht erlaubt.",
    });
  }

  const normalized = normalizeName(name);

  // niemand darf geschützte Hauptnamen nehmen
  if (SYSTEM_PROTECTED_NAMES.includes(normalized)) {
    return res.status(403).json({ error: "Dieser Name ist reserviert." });
  }

  // niemand darf bestehenden Namen faken durch 0->o usw.
  if (users.find((u) => u.normalizedName === normalized)) {
    return res
      .status(400)
      .json({ error: "Name existiert schon / ist zu ähnlich." });
  }

  if (findUserByEmail(email)) {
    return res.status(400).json({ error: "E-Mail schon vergeben." });
  }

  // Passwort verschlüsseln
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
    profileNote: "",
    profilePic: null,
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
// Login
// -------------------------------------------------
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;

  const u = findUserByEmail(email || "");
  if (!u) {
    return res
      .status(401)
      .json({ error: "Falsche E-Mail oder Passwort." });
  }

  const okPw = await bcrypt
    .compare(password || "", u.password)
    .catch(() => false);
  if (!okPw) {
    return res
      .status(401)
      .json({ error: "Falsche E-Mail oder Passwort." });
  }

  // Linked Account Rechte angleichen
  const partner = getLinkedUser(u);
  if (partner && partner.role !== u.role) {
    partner.role = u.role;
    partner.canBeBlocked = false;
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
      linkedAccount: partner ? partner.name : null,
    },
  });
});

// -------------------------------------------------
// Lobby-Chat abrufen
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
// Lobby-Chat neue Nachricht senden
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

  // Belohnung fürs Schreiben:
  giveXP(u, 5);
  addCoins(u, 1);

  res.json({ ok: true });
});

// -------------------------------------------------
// Wer ist online
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
// Blockieren / Entblocken
// -------------------------------------------------
app.post("/api/block", (req, res) => {
  const { byUserId, targetName } = req.body;

  const blocker = users.find((u) => u.id === byUserId);
  if (!blocker) {
    return res.status(401).json({ error: "Blocker nicht gefunden." });
  }

  const target = findUserByName(targetName || "");
  if (!target) {
    return res.status(404).json({ error: "Ziel nicht gefunden." });
  }

  if (!canBlock(blocker, target)) {
    return res.status(403).json({
      error: "Diese Person darf nicht blockiert werden.",
    });
  }

  if (!blocker.blocked.includes(target.id)) {
    blocker.blocked.push(target.id);
  }

  res.json({ ok: true, blocked: blocker.blocked });
});

app.post("/api/unblock", (req, res) => {
  const { byUserId, targetName } = req.body;

  const blocker = users.find((u) => u.id === byUserId);
  const target = findUserByName(targetName || "");

  if (!blocker || !target) {
    return res.status(404).json({ error: "User nicht gefunden." });
  }

  blocker.blocked = blocker.blocked.filter((id) => id !== target.id);

  res.json({ ok: true, blocked: blocker.blocked });
});

// -------------------------------------------------
// Rolle setzen (nur Owner = DeepButterflyMusic)
app.post("/api/setRole", (req, res) => {
  const { ownerId, targetName, newRole } = req.body;

  const owner = users.find((u) => u.id === ownerId);
  if (!owner || owner.role !== roles.OWNER) {
    return res
      .status(403)
      .json({ error: "Nur der Besitzer darf Rollen setzen." });
  }

  const target = findUserByName(targetName || "");
  if (!target) {
    return res.status(404).json({ error: "Ziel nicht gefunden." });
  }

  if (![roles.ADMIN, roles.MOD, roles.USER].includes(newRole)) {
    return res.status(400).json({ error: "Ungültige Rolle." });
  }

  // Rolle setzen
  target.role = newRole;

  // Coins anpassen
  if (newRole === roles.ADMIN && target.coins < ECONOMY.ADMIN_START) {
    target.coins = ECONOMY.ADMIN_START;
  }
  if (newRole === roles.MOD && target.coins < ECONOMY.MOD_START) {
    target.coins = ECONOMY.MOD_START;
  }

  // Admins / Mods nicht blockbar
  if ([roles.ADMIN, roles.MOD].includes(target.role)) {
    target.canBeBlocked = false;
  } else {
    target.canBeBlocked = true;
  }

  // Linked Account synchronisieren
  const partner = getLinkedUser(target);
  if (partner) {
    partner.role = newRole;
    partner.canBeBlocked = false;
  }

  res.json({
    ok: true,
    target: {
      name: target.name,
      role: target.role,
      coins: target.coins,
      linked: partner ? partner.name : null,
    },
  });
});

// -------------------------------------------------
// Profil eines Users
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
    profileNote: u.profileNote,
    profilePic: u.profilePic,
  });
});

// -------------------------------------------------
// Musik Upload (Kinderschutz / Jugendschutz: noch gesperrt)
app.post("/api/music/upload", (req, res) => {
  return res.status(403).json({
    error: "Musik-Upload ist geschützt / Filter aktiv / kommt später.",
  });
});

// -------------------------------------------------
// Server starten (Render-kompatibel)
const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ ButterflyMusic Freunde App Server läuft auf Port ${PORT}`);
});



