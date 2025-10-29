// In-Memory Daten (geht verloren wenn Server neu startet, ist aber super zum Testen)

// Gesperrte/geschützte Namen:
export const RESERVED_NAMES = [
  "deepbutterflymusic",
  "dethoxia",
  "darkinfernal",
  "dethox"
];

// Verbotene Wörter im Namen/Titel (du kannst die Liste erweitern)
export const BLOCKED_WORD_PARTS = [
  "sex",
  "pimmel",
  "arsch",
  "hitler",
  "nazi"
];

// Userliste
export const users = [
  {
    id: "1",
    name: "DeepButterflyMusic",
    email: "owner@example.com",
    password: "supergeheim",
    language: "de",
    avatar: "🦋",
    neonColor: "#ff00d9",
    role: "Owner",           // Owner | Admin | Mod | User
    coins: 50000000,         // Owner Start viel Coins
    level: 450,
    prestige: 0,
    profileNote: "Ich bin der Besitzer 🦋",
    blockedUsers: [],        // wen dieser User blockt
    ownedProfileSlots: 5,    // wie viele Bilder/Slots sie haben können
    unlockedCustomTitle: true,
    customTitle: "🦋 Butterfly Queen",
    allowNSFWTitle: false    // Sicherheit: kein Sexcontent
  },
  {
    id: "2",
    name: "Dethoxia",
    email: "dethoxia@example.com",
    password: "admin123",
    language: "de",
    avatar: "🔥",
    neonColor: "#00ffff",
    role: "Admin",
    coins: 20000,
    level: 120,
    prestige: 0,
    profileNote: "Ich helfe beim Moderieren 💎",
    blockedUsers: [],
    ownedProfileSlots: 3,
    unlockedCustomTitle: true,
    customTitle: "Admin Support 💠",
    allowNSFWTitle: false
  },
  {
    id: "3",
    name: "ExampleUser",
    email: "user@example.com",
    password: "pass123",
    language: "en",
    avatar: "😎",
    neonColor: "#00ff99",
    role: "User",
    coins: 500,
    level: 4,
    prestige: 0,
    profileNote: "Hey zusammen ✨",
    blockedUsers: [],
    ownedProfileSlots: 1,
    unlockedCustomTitle: false,
    customTitle: "",
    allowNSFWTitle: false
  }
];

// Lobby Nachrichten (public chat)
export const messages = [
  {
    id: "m1",
    userId: "1",
    displayName: "DeepButterflyMusic",
    avatar: "🦋",
    role: "Owner",
    neonColor: "#ff00d9",
    originalText: "Willkommen in der ButterflyMusic Freunde App 🦋",
    translatedText: "Willkommen in der ButterflyMusic Freunde App 🦋", // später: Übersetzung pro Sprache
    time: new Date().toISOString()
  }
];

// Coins Shop / Unlockables (vereinfachtes Modell)
export const shopItems = [
  {
    id: "title_custom",
    type: "title",
    price: 500,
    name: "Eigenen Neon-Titel freischalten"
  },
  {
    id: "profile_slot",
    type: "slot",
    price: 2000,
    name: "Zusätzlicher Fotoslot fürs Profil"
  },
  {
    id: "color_change",
    type: "color",
    price: 250,
    name: "Neue Neon-Farbe für Namen"
  }
];

// Hilfsfunktionen

export function isNameForbidden(name) {
  const lower = name.toLowerCase();
  if (RESERVED_NAMES.includes(lower)) return true;
  if (BLOCKED_WORD_PARTS.some(bad => lower.includes(bad))) return true;
  return false;
}

export function getUserById(id) {
  return users.find(u => u.id === id);
}

export function getUserByEmailAndPassword(email, password) {
  return users.find(u => u.email === email && u.password === password);
}

export function getUserByEmail(email) {
  return users.find(u => u.email === email);
}

export function addUser(newUser) {
  users.push(newUser);
  return newUser;
}

export function addMessage(msg) {
  messages.push(msg);
  return msg;
}

// Level-System / Prestige
export function addOnlineTimeReward(userId, minutesOnline) {
  // Beispiel: alle 30 Minuten => 50 Coins und +1 Level
  if (minutesOnline < 30) return;
  const u = getUserById(userId);
  if (!u) return;
  u.coins += 50;
  u.level += 1;
  if (u.level > 500) {
    // Prestige Reset
    u.level = 1;
    u.prestige += 1;
    // Bonus: gebe einen Prestige-Titel automatisch
    if (!u.unlockedCustomTitle) {
      u.unlockedCustomTitle = true;
      u.customTitle = "Prestige " + u.prestige;
    }
  }
}

// Coins ausgeben (Shop)
export function buyItem(userId, itemId, customData = {}) {
  const u = getUserById(userId);
  if (!u) {
    return { ok: false, error: "User nicht gefunden." };
  }
  const item = shopItems.find(i => i.id === itemId);
  if (!item) {
    return { ok: false, error: "Item nicht gefunden." };
  }
  if (u.coins < item.price) {
    return { ok: false, error: "Nicht genug Coins." };
  }

  // abbuchen
  u.coins -= item.price;

  // Effekt anwenden
  if (item.type === "title") {
    // Benutzer darf eigenen Titel setzen
    u.unlockedCustomTitle = true;
    if (customData.title) {
      // Sicherheitscheck auf verbotene Wörter
      if (BLOCKED_WORD_PARTS.some(bad => customData.title.toLowerCase().includes(bad))) {
        return { ok: false, error: "Titel nicht erlaubt." };
      }
      u.customTitle = customData.title;
    }
  } else if (item.type === "slot") {
    u.ownedProfileSlots += 1;
  } else if (item.type === "color") {
    if (customData.colorHex) {
      u.neonColor = customData.colorHex;
    }
  }

  return { ok: true, user: u };
}








