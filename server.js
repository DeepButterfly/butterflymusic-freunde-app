const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// ---- ROLES ----
const ROLES = {
  OWNER: "owner",
  ADMIN: "admin",
  USER: "user"
};

// ---- USERS (simulierte Datenbank im Speicher) ----
const users = [
  {
    id: "1",
    name: "DeepButterflyMusic",
    email: "owner@example.com",
    password: "supergeheim",
    avatar: "🦋",
    neonColor: "#ff00d9",
    language: "de",
    role: ROLES.OWNER,
    coins: 50000,
    level: 1,
    profileNote: "Be nice or leave"
  },
  {
    id: "2",
    name: "Dethoxia",
    email: "dethoxia@example.com",
    password: "dethoxia123",
    avatar: "😎",
    neonColor: "#00ffff",
    language: "en",
    role: ROLES.ADMIN,
    coins: 20000,
    level: 1,
    profileNote: "Co-Admin Account"
  },
  {
    id: "3",
    name: "TestUser01",
    email: "user@example.com",
    password: "user12345",
    avatar: "🙂",
    neonColor: "#00ffaa",
    language: "de",
    role: ROLES.USER,
    coins: 200,
    level: 1,
    profileNote: "Ich liebe Neon"
  }
];

// Wir tun so, als wären alle online:
const onlineUsers = new Set(["1","2","3"]);

// Chat Verlauf Start
const lobbyMessages = [
  {
    fromUserId: "1",
    displayName: "DeepButterflyMusic",
    avatar: "🦋",
    neonColor: "#ff00d9",
    role: "owner",
    text: "Willkommen in der ButterflyMusic Freunde App. Bitte bleibt respektvoll.",
    timestamp: Date.now()
  }
];

// ---- HELFER ----
function findUserByEmail(email) {
  const lower = (email || "").toLowerCase();
  return users.find(u => u.email.toLowerCase() === lower);
}

// ---- TEST-ROUTE FÜR DICH ----
// Wenn du deine Render-URL im Browser öffnest, MUSS das hier kommen.
app.get("/", (req, res) => {
  res.type("html").send(`
    <html>
      <head>
        <meta charset="utf-8" />
        <title>ButterflyMusic Freunde App</title>
        <style>
          body { background:#000; color:#ff00d9; font-family: sans-serif; text-align:center; padding:40px; }
          .box { background:#111; border:1px solid #ff00d9; padding:20px; border-radius:10px; max-width:400px; margin:0 auto; box-shadow:0 0 20px #ff00d9; }
          h1 { font-size:18px; line-height:1.4; color:#fff; text-shadow:0 0 8px #ff00d9,0 0 20px #00ffff; }
          p { font-size:14px; color:#ccc; }
          code { color:#0f0; font-size:12px; white-space:pre-wrap; word-break:break-word; }
        </style>
      </head>
      <body>
        <div class="box">
          <h1>ButterflyMusic Freunde App Backend läuft</h1>
          <p>Wenn du das hier siehst, ist der Server online.</p>
          <p>Teste API z. B. /api/online oder /api/lobby/messages</p>
        </div>
      </body>
    </html>
  `);
});

// ---- API: Login ----
app.post("/api/login", (req, res) => {
  const email = req.body.email || "";
  const password = req.body.password || "";

  const u = findUserByEmail(email);
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
      avatar: u.avatar,
      neonColor: u.neonColor,
      language: u.language,
      coins: u.coins,
      level: u.level,
      profileNote: u.profileNote
    }
  });
});

// ---- API: Registrieren ----
app.post("/api/register", (req, res) => {
  const name = (req.body.name || "").trim();
  const email = (req.body.email || "").trim().toLowerCase();
  const password = req.body.password || "";
  const language = req.body.language || "de";
  const avatar = req.body.avatar || "🙂";
  const neonColor = req.body.neonColor || "#ff00d9";

  if (!name || !email || !password) {
    return res.status(400).json({ error: "Fehlende Daten." });
  }
  if (name.length < 6) {
    return res.status(400).json({ error: "Name zu kurz (min. 6 Zeichen)." });
  }

  const reserved = ["deepbutterflymusic","dethoxia","darkinfernal","dethox"];
  if (reserved.includes(name.toLowerCase())) {
    return res.status(403).json({ error: "Dieser Name ist reserviert." });
  }

  if (findUserByEmail(email)) {
    return res.status(400).json({ error: "E-Mail schon vergeben." });
  }

  const newUser = {
    id: Date.now().toString(),
    name,
    email,
    password,
    avatar,
    neonColor,
    language,
    role: ROLES.USER,
    coins: 0,
    level: 1,
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
      language: newUser.language,
      coins: newUser.coins,
      level: newUser.level,
      profileNote: newUser.profileNote
    }
  });
});

// ---- API: Chat lesen ----
app.get("/api/lobby/messages", (req, res) => {
  const out = lobbyMessages.map(m => ({
    displayName: m.displayName,
    avatar: m.avatar,
    neonColor: m.neonColor,
    role: m.role,
    text: m.text,
    time: new Date(m.timestamp).toISOString()
  }));
  return res.json({ messages: out });
});

// ---- API: Chat schreiben ----
app.post("/api/lobby/messages", (req, res) => {
  const userId = req.body.userId;
  const text = (req.body.text || "").trim();

  if (!text) {
    return res.status(400).json({ error: "Kein Text." });
  }

  const u = users.find(x => x.id === userId);
  if (!u) {
    return res.status(401).json({ error: "User nicht gefunden / nicht eingeloggt." });
  }

  const msg = {
    fromUserId: u.id,
    displayName: u.name,
    avatar: u.avatar,
    neonColor: u.neonColor,
    role: u.role,
    text: text,
    timestamp: Date.now()
  };

  lobbyMessages.push(msg);
  return res.json({ ok: true });
});

// ---- API: Wer ist online ----
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
  return res.json({ users: list });
});

// ---- API: Profil ----
app.get("/api/profile/:uid", (req, res) => {
  const uid = req.params.uid;
  const u = users.find(x => x.id === uid);
  if (!u) {
    return res.status(404).json({ error: "User nicht gefunden." });
  }
  return res.json({
    id: u.id,
    name: u.name,
    avatar: u.avatar,
    neonColor: u.neonColor,
    language: u.language,
    role: u.role,
    coins: u.coins,
    level: u.level,
    profileNote: u.profileNote
  });
});

// ---- SERVER START ----
const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log("ButterflyMusic Freunde App Backend läuft auf Port " + PORT);
});





