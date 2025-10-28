// ======================================================
// ButterflyMusic Freunde App Backend
// ======================================================

import express from "express";
import cors from "cors";
import bodyParser from "body-parser";

const app = express();
app.use(cors());
app.use(bodyParser.json());

// --- In-Memory Datenbank (temporär) ---
const users = [];
const messages = [
  {
    fromUserId: "0",
    avatar: "🦋",
    displayName: "DeepButterflyMusic",
    neonColor: "#ff00d9",
    role: "owner",
    text: "Willkommen in der ButterflyMusic Freunde App 💜 Bitte bleibt respektvoll.",
    translatedText: "Willkommen in der ButterflyMusic Freunde App 💜 Bitte bleibt respektvoll.",
    time: new Date().toISOString(),
  },
];

// ======================================================
// 1️⃣ Registrierung
// ======================================================
app.post("/api/register", (req, res) => {
  const { name, email, password, language, avatar, neonColor } = req.body;

  if (!name || !email || !password)
    return res.status(400).json({ error: "Fehlende Angaben." });

  // Geschützte Namen
  const blockedNames = [
    "pimmel",
    "arsch",
    "fuck",
    "DeepButterflyMusic",
    "Dethoxia",
    "DarkInfernal",
    "Dethox",
  ];

  if (blockedNames.some((w) => name.toLowerCase().includes(w.toLowerCase()))) {
    return res.status(403).json({ error: "Name ist nicht erlaubt oder geschützt." });
  }

  const user = {
    id: Date.now().toString(),
    name,
    email,
    password,
    language: language || "de",
    avatar: avatar || "🙂",
    neonColor: neonColor || "#ff00d9",
    coins: 100,
    level: 1,
    role: "user",
    profileNote: "",
  };

  users.push(user);
  return res.json({ user });
});

// ======================================================
// 2️⃣ Login
// ======================================================
app.post("/api/login", (req, res) => {
  const { email, password } = req.body;
  const u = users.find((usr) => usr.email === email && usr.password === password);
  if (!u) return res.status(401).json({ error: "Falsche E-Mail oder Passwort." });
  return res.json({ user: u });
});

// ======================================================
// 3️⃣ Nachrichten abrufen
// ======================================================
app.get("/api/lobby/messages", (req, res) => {
  res.json({ messages });
});

// ======================================================
// 4️⃣ Nachricht senden
// ======================================================
app.post("/api/lobby/messages", (req, res) => {
  const { userId, text } = req.body;
  const user = users.find((u) => u.id === userId);
  if (!user) return res.status(400).json({ error: "Benutzer nicht gefunden." });

  const msg = {
    fromUserId: user.id,
    avatar: user.avatar,
    displayName: user.name,
    neonColor: user.neonColor,
    role: user.role,
    text,
    translatedText: text,
    time: new Date().toISOString(),
  };

  messages.push(msg);
  res.json({ success: true });
});

// ======================================================
// 5️⃣ Online-Liste
// ======================================================
app.get("/api/online", (req, res) => {
  res.json({ users });
});

// ======================================================
// 6️⃣ Profil anzeigen
// ======================================================
app.get("/api/profile/:id", (req, res) => {
  const u = users.find((usr) => usr.id === req.params.id);
  if (!u) return res.status(404).json({ error: "Benutzer nicht gefunden." });
  res.json(u);
});

// ======================================================
// 7️⃣ Musik-Upload (noch gesperrt)
// ======================================================
app.post("/api/music/upload", (req, res) => {
  return res.status(403).json({
    error: "Musik-Upload ist geschützt / Filter aktiv / kommt später.",
  });
});

// ======================================================
// 8️⃣ Server starten (Render-kompatibel)
// ======================================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ ButterflyMusic Freunde App Server läuft auf Port ${PORT}`);
});


