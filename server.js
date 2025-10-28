const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// ==============================
// ROLES & USER STORAGE
// ==============================

const ROLES = {
  OWNER: "owner",
  ADMIN: "admin",
  MOD: "mod",
  USER: "user",
};

// Namen, die NIEMAND benutzen darf
const RESERVED_NAMES = [
  "deepbutterflymusic",
  "dethoxia",
  "darkinfernal",
  "dethox",
];

// Wörter, die NICHT erlaubt sind im Namen
const BANNED_WORDS = [
  "pimmel","schlampe","fotze","hurensohn","nutte","arsch",
  "sex","fick","ficken","dick","cock","pussy","penis",
  "titte","titten","boobs"
];

// kleines Hilfsding: Sonderzeichen 0->o usw. rausfiltern
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

// unsere "Datenbank" im Speicher
const users = [
  {
    id: "1",
    name: "DeepButterflyMusic",
    normalizedName: "deepbutterflymusic",
    email: "owner@example.com",
    password: "supergeheim", // Klartext jetzt, später Hash
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
    email: "alt-owner@example.com",
    password: "supergeheim2",
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
  },
];

// wer gerade online ist (IDs)
const onlineUsers = new Set(["1","2","3","4"]);

// XP/Level Regeln
const LEVEL_CFG = {
  MAX_LEVEL: 500,
  XP_PER_LEVEL: 100,
};

// Chat-Speicher
const lobbyMessages = [
  {
    fromUserId: "1",
    avatar: "🦋",
    displayName: "DeepButterflyMusic",
    neonColor: "#ff00d9",
    role: "owner",
    text: "Willkommen in der ButterflyMusic Freunde App 💜 Bitte bleibt respektvoll.",
    time: Date.now(),
  }
];

// Hilfsfunktionen
function giveXP(user, xp) {
  user.xp = (user.xp || 0) + xp;
  while (user.xp >= LEVEL_CFG.XP_PER_LEVEL) {
    user.xp -= LEVEL_CFG.XP_PER_LEVEL;
    user.level = (user.level || 1) + 1;
    if (user.level > LEVEL_CFG.MAX_LEVEL) {
      user.level = 1; // Prestige Reset geplant
    }
  }
}

function findUserByEmail(email) {
  return users.find(
    u => u.email.toLowerCase() === (email || "").toLowerCase()
  );
}

// ==============================
// API: REGISTER
// ==============================

app.post("/api/register", (req, res) => {
  const { name, email, password, language, avatar, neonColor } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: "Fehlende Daten." });
  }
  if (name.length < 6) {
    return res.status(400).json({ error: "Name zu kurz." });
  }

  const lower = (name || "").toLowerCase();
  if (BANNED_WORDS.some(w => lower.includes(w))) {
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
    password, // später ersetzen wir das durch Hash
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

// ==============================
// API: LOGIN
// ==============================
app.post("/api/login", (req, res) => {
  const { email, password } = req.body;

  const u = findUserByEmail(email || "");
  if (!u) return res.status(401).json({ error: "Falsche E-Mail oder Passwort." });

  // aktuell Plaintext-Vergleich (später bcrypt)
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
    }
  });
});

// ==============================
// API: Lobby Nachrichten lesen
// ==============================
app.get("/api/lobby/messages", (req, res) => {
  const lang = req.query.lang || "de";

  const translated = lobbyMessages.map(m => {
    return {
      ...m,
      translatedText: `[${lang}] ${m.text}`,
      isoTime: new Date(m.time).toISOString(),
    };
  });

  res.json({ messages: translated });
});

// ==============================
// API: Lobby Nachricht senden
// ==============================
app.post("/api/lobby/messages", (req, res) => {
  const { userId, text } = req.body;
  if (!text || !text.trim()) {
    return res.status(400).json({ error: "Kein Text" });
  }

  const u = users.find(x => x.id === userId);
  if (!u) {
    return res.status(401).json({ error: "User nicht gefunden / nicht eingeloggt." });
  }

  // XP/Coins für Aktivität
  giveXP(u, 5);
  u.coins += 1;

  const msg = {
    fromUserId: u.id,
    avatar: u.avatar,
    displayName: u.name,
    neonColor: u.neonColor,
    role: u.role,
    text: text.trim(),
    time: Date.now(),
  };
  lobbyMessages.push(msg);

  res.json({ ok: true });
});

// ==============================
// API: Wer ist online?
// ==============================
app.get("/api/online", (req, res) => {
  const list = users
    .filter(u => onlineUsers.has(u.id))
    .map(u => ({
      id: u.id,
      name: u.name,
      avatar: u.avatar,
      neonColor: u.neonColor,
      role: u.role,
    }));

  res.json({ users: list });
});

// ==============================
// API: Profil
// ==============================
app.get("/api/profile/:id", (req,res) => {
  const id = req.params.id;
  const u = users.find(x => x.id === id);
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
    profileNote: u.profileNote,
  });
});

// ==============================
// FRONTEND HTML
// ==============================
//
// Das ist eine abgespeckte Version von deiner echten Neon-Seite:
// - Login/Registrieren Panel
// - Lobby-Chat
// - Profil rechts
//
// Wichtig: Jetzt ist alles in EINER Seite. Kein Weiß.
//

app.get("/", (req, res) => {
  const html = `
<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width,initial-scale=1.0" />
<title>ButterflyMusic Freunde App</title>
<style>
body {
  margin:0;
  min-height:100vh;
  background: radial-gradient(circle at 20% 20%, rgba(255,0,217,0.22) 0%, transparent 60%),
              radial-gradient(circle at 80% 30%, rgba(0,255,255,0.18) 0%, transparent 60%),
              radial-gradient(circle at 50% 80%, rgba(140,0,255,0.22) 0%, transparent 60%),
              radial-gradient(circle at 50% 50%, rgba(0,0,0,1) 0%, rgba(0,0,0,0.5) 60%);
  background-color:#050108;
  color:#fff;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, "Inter", Roboto, "Segoe UI", sans-serif;
  display:flex;
  flex-direction:column;
  align-items:center;
  padding:1rem;
  text-shadow:0 0 10px #ff00d9,0 0 20px #00ffff;
}

/* login panel */
#authPanel {
  background: rgba(0,0,0,0.7);
  border:1px solid rgba(255,0,217,0.4);
  box-shadow:0 0 20px rgba(255,0,217,0.5),0 0 60px rgba(0,255,255,0.3);
  border-radius:1rem;
  padding:1rem;
  width:320px;
  max-width:90%;
  color:#fff;
  margin-bottom:1rem;
}
h1.appTitle{
  margin:0 0 .5rem 0;
  text-align:center;
  font-size:1.1rem;
  color:#ff00d9;
  text-shadow:0 0 8px #ff00d9,0 0 20px #00ffff,0 0 40px #8a00ff;
}
.labelSmall{
  font-size:0.7rem;
  color:#aaa;
  margin-top:.5rem;
  margin-bottom:.2rem;
}
input,select,button{
  width:100%;
  background:rgba(0,0,0,0.5);
  border:1px solid #00ffff;
  color:#fff;
  border-radius:0.5rem;
  padding:0.5rem;
  font-size:0.8rem;
  box-shadow:0 0 10px rgba(0,255,255,0.4),0 0 30px rgba(255,0,217,0.2);
}
button{
  background: radial-gradient(circle at 20% 20%, rgba(255,0,217,1) 0%, rgba(138,0,255,1) 40%, rgba(0,0,0,0) 70%);
  border:1px solid #ff00d9;
  cursor:pointer;
  margin-top:.5rem;
}

/* lobby / profil bereich */
#mainArea {
  width:100%;
  max-width:900px;
  display:none; /* erst sichtbar nach login */
  gap:1rem;
  flex-wrap:wrap;
  justify-content:center;
}

.panelChat {
  flex:1 1 500px;
  max-width:500px;
  background:rgba(0,0,0,0.5);
  border:1px solid rgba(0,255,255,0.4);
  border-radius:0.8rem;
  box-shadow:0 0 20px rgba(0,255,255,0.4),0 0 60px rgba(255,0,217,0.25);
  padding:1rem;
}
#chatMessages {
  background:#000;
  border:1px solid #00ffff;
  border-radius:0.5rem;
  min-height:150px;
  max-height:200px;
  overflow-y:auto;
  padding:.5rem;
  font-size:0.8rem;
  line-height:1.2rem;
  box-shadow:0 0 8px rgba(0,255,255,0.6),0 0 30px rgba(255,0,217,0.3);
}
.msgLine { margin-bottom:.7rem; word-break:break-word; }
.nick { font-weight:600; }

.chatSendRow {
  display:flex;
  flex-wrap:wrap;
  gap:.5rem;
  margin-top:.7rem;
}
.chatSendRow input{
  flex:1 1 auto;
}
.chatSendRow button{
  flex:0 0 auto;
  width:auto;
  min-width:70px;
}

/* profil panel */
.panelProfile {
  flex:0 1 300px;
  max-width:300px;
  background:rgba(0,0,0,0.5);
  border:1px solid rgba(255,0,217,0.4);
  border-radius:0.8rem;
  box-shadow:0 0 20px rgba(255,0,217,0.4),0 0 60px rgba(0,255,255,0.25);
  padding:1rem;
  font-size:0.8rem;
  line-height:1.2rem;
}
.profileRowTitle {
  font-size:0.7rem;
  color:#aaa;
}
.profileValue {
  background:rgba(0,0,0,0.4);
  border:1px solid rgba(0,255,255,0.3);
  border-radius:0.5rem;
  padding:.4rem .5rem;
  margin-bottom:.5rem;
  box-shadow:0 0 8px rgba(0,255,255,0.3),0 0 24px rgba(255,0,217,0.2);
  color:#fff;
  word-break:break-word;
}

.footerInfo {
  margin-top:1rem;
  font-size:0.6rem;
  color:#aaa;
  text-align:center;
}
</style>
</head>
<body>

<div id="authPanel">
  <h1 class="appTitle">🦋 ButterflyMusic Freunde App</h1>
  <div class="labelSmall">Modus</div>
  <select id="authMode">
    <option value="login">Einloggen</option>
    <option value="register">Registrieren</option>
  </select>

  <div class="labelSmall">Name (min. 6 Zeichen)</div>
  <input id="authName" placeholder="z.B. NeonRider99" />

  <div class="labelSmall">E-Mail</div>
  <input id="authEmail" placeholder="deinname@example.com" />

  <div class="labelSmall">Passwort</div>
  <input id="authPass" type="password" placeholder="Passwort" />

  <div class="labelSmall">Sprache</div>
  <select id="authLang">
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

  <div class="labelSmall">Avatar (Emoji)</div>
  <input id="authAvatar" placeholder="🦋 😎 👾 🔥 🙂" />

  <div class="labelSmall">Farbe für deinen Namen (Neon)</div>
  <input id="authColor" value="#ff00d9" />

  <div id="authError" style="color:#ff6b6b; font-size:0.7rem; min-height:1rem; text-shadow:0 0 6px #ff0000;"></div>

  <button id="authBtn">Los geht's</button>

  <div style="font-size:0.6rem; color:#888; line-height:1rem; margin-top:.5rem;">
    Geschützte Namen:<br/>
    DeepButterflyMusic, Dethoxia,<br/>
    DarkInfernal, Dethox<br/>
    sind reserviert.<br/>
    Beleidigende / sexuelle Namen verboten.
  </div>
</div>

<div id="mainArea">
  <div class="panelChat">
    <div id="chatMessages"></div>
    <div class="chatSendRow">
      <input id="chatInput" placeholder="Schreib etwas..." />
      <button id="chatSendBtn">Senden</button>
    </div>
    <div class="footerInfo">
      Live-Server verbunden mit<br/>
      butterflymusic-freunde-app-backend.onrender.com
    </div>
  </div>

  <div class="panelProfile">
    <div class="profileRowTitle">Name</div>
    <div class="profileValue" id="pName">-</div>

    <div class="profileRowTitle">Rolle</div>
    <div class="profileValue" id="pRole">-</div>

    <div class="profileRowTitle">Sprache</div>
    <div class="profileValue" id="pLang">-</div>

    <div class="profileRowTitle">Level</div>
    <div class="profileValue" id="pLevel">-</div>

    <div class="profileRowTitle">Coins</div>
    <div class="profileValue" id="pCoins">-</div>

    <div class="profileRowTitle">Status</div>
    <div class="profileValue" id="pNote">-</div>
  </div>
</div>

<script>
let currentUser = null;

// =======================
// Login / Register
// =======================
const authMode   = document.getElementById("authMode");
const authName   = document.getElementById("authName");
const authEmail  = document.getElementById("authEmail");
const authPass   = document.getElementById("authPass");
const authLang   = document.getElementById("authLang");
const authAvatar = document.getElementById("authAvatar");
const authColor  = document.getElementById("authColor");
const authError  = document.getElementById("authError");
const authBtn    = document.getElementById("authBtn");

const authPanel  = document.getElementById("authPanel");
const mainArea   = document.getElementById("mainArea");

// Profil-Anzeige
const pName  = document.getElementById("pName");
const pRole  = document.getElementById("pRole");
const pLang  = document.getElementById("pLang");
const pLevel = document.getElementById("pLevel");
const pCoins = document.getElementById("pCoins");
const pNote  = document.getElementById("pNote");

// Chat
const chatMessagesDiv = document.getElementById("chatMessages");
const chatInput       = document.getElementById("chatInput");
const chatSendBtn     = document.getElementById("chatSendBtn");

// API Base ist leer, weil Frontend & Backend gleiche Domain sind
const API_BASE = "";

// Klick auf "Los geht's"
authBtn.addEventListener("click", async () => {
  authError.textContent = "";

  const mode = authMode.value;
  const email = authEmail.value.trim();
  const pass  = authPass.value.trim();

  try {
    let resp;
    if (mode === "register") {
      resp = await fetch(API_BASE + "/api/register", {
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({
          name: authName.value.trim(),
          email,
          password: pass,
          language: authLang.value,
          avatar: authAvatar.value.trim() || "🙂",
          neonColor: authColor.value.trim() || "#ff00d9"
        })
      });
    } else {
      resp = await fetch(API_BASE + "/api/login", {
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({
          email,
          password: pass
        })
      });
    }

    const data = await resp.json();
    if (!resp.ok || data.error) {
      authError.textContent = data.error || "Fehler.";
      return;
    }

    currentUser = data.user;
    showMainUI(currentUser);
    loadMessages();
  } catch (err) {
    authError.textContent = "Verbindungsfehler.";
  }
});

// Hauptebene sichtbar machen + Profil füllen
function showMainUI(user){
  if (!user) return;
  authPanel.style.display = "none";
  mainArea.style.display = "flex";

  pName.textContent  = user.name;
  pRole.textContent  = user.role;
  pLang.textContent  = user.language || "-";
  pLevel.textContent = user.level ?? "-";
  pCoins.textContent = user.coins ?? "-";
  pNote.textContent  = user.profileNote || "(kein Status gesetzt)";
}

// =======================
// Chat laden + senden
// =======================
async function loadMessages(){
  const res = await fetch(API_BASE + "/api/lobby/messages?lang=" + encodeURIComponent(currentUser?.language || "de"));
  const data = await res.json();

  chatMessagesDiv.innerHTML = "";
  data.messages.forEach(m => {
    const line = document.createElement("div");
    line.className = "msgLine";
    line.innerHTML =
      "<span class='nick' style='color:" + m.neonColor + "'>" +
      m.displayName +
      "</span>: " +
      m.text +
      "<br><span style='color:#888;font-size:0.7rem;'>(" +
      new Date(m.isoTime).toLocaleString() +
      ", " + m.role + ")</span>";
    chatMessagesDiv.appendChild(line);
  });

  chatMessagesDiv.scrollTop = chatMessagesDiv.scrollHeight;
}

chatSendBtn.addEventListener("click", async () => {
  if (!currentUser) {
    alert("Bitte erst einloggen.");
    return;
  }
  const text = chatInput.value.trim();
  if (!text) return;
  chatInput.value = "";

  await fetch(API_BASE + "/api/lobby/messages", {
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body: JSON.stringify({
      userId: currentUser.id,
      text
    })
  });

  loadMessages();
});
</script>

<div class="footerInfo" style="margin-top:2rem;">
  Admin / Owner können nicht blockiert werden. Sexuelle / beleidigende Namen verboten.
</div>

</body>
</html>
  `;
  res.setHeader("Content-Type","text/html; charset=utf-8");
  res.send(html);
});

// ==============================
// SERVER START
// ==============================
const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log("✅ ButterflyMusic Freunde App Server läuft auf Port " + PORT);
});




