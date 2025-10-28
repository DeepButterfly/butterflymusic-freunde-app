// data.js
// Temporäre In-Memory-"Datenbank". Später kann man hier echte DB einbauen.

const roles = {
  OWNER: "owner",
  ADMIN: "admin",
  MOD: "mod",
  USER: "user",
};

// Geschützte Namen: diese Accounts dürfen nicht blockiert werden / sind reserviert.
const SYSTEM_PROTECTED_NAMES = [
  "deepbutterflymusic",
  "dethoxia",
  "darkinfernal",
  "dethox",
];

// Wörter/Sätze, die im Namen NICHT erlaubt sind
// Du kannst hier jederzeit mehr hinzufügen (alles klein schreiben).
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

// Verknüpfte Accounts (beide Namen gehören derselben Person)
const LINKED_ACCOUNTS = {
  darkinfernal: "dethox",
  dethox: "darkinfernal",
};

// Vordefinierte Users (du + deine geschützten Accounts)
const users = [
  {
    id: "1",
    name: "DeepButterflyMusic",
    normalizedName: "deepbutterflymusic",
    email: "owner@example.com",
    password: "supergeheim", // Hinweis: Bcrypt greift erst für neue Registrierungen.
    avatar: "🦋",
    neonColor: "#ff00d9",
    language: "de",
    role: roles.OWNER,
    level: 1,
    xp: 0,
    coins: 50000,
    blocked: [],
    profileNote: "Be nice or leave ✨",
    profilePic: null,
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
    profilePic: null,
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
    profilePic: null,
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
    profilePic: null,
    canBeBlocked: false
  }
];

// Erster Willkommens-Chat
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

// Online-Simulation
const onlineUsers = new Set(["1", "2", "3", "4"]);

// Coins / Economy-Einstellungen
const ECONOMY = {
  TOTAL_POOL: 100_000_000,
  COINS_PER_30_MIN: 50,
  MOD_START: 5000,
  ADMIN_START: 15000,
  USER_START: 0,
  OWNER_START: 50000,
};

// Level / Prestige-System
const LEVEL_CFG = {
  MAX_LEVEL: 500,
  XP_PER_LEVEL: 100,
};

module.exports = {
  users,
  roles,
  SYSTEM_PROTECTED_NAMES,
  BANNED_WORDS,
  LINKED_ACCOUNTS,
  lobbyMessages,
  onlineUsers,
  ECONOMY,
  LEVEL_CFG,
};
