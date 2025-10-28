const path = require("path");
const express = require("express");
const cors = require("cors");

// -------------------------------------------------
// In-Memory Zustand (einfach)
// -------------------------------------------------
const messages = [
  {
    fromUserId: "0",
    avatar: "🦋",
    displayName: "DeepButterflyMusic",
    neonColor: "#ff00d9",
    role: "Owner",
    text: "Willkommen in der ButterflyMusic Freunde App 💜 Bitte bleibt respektvoll.",
    translatedText: "Willkommen in der ButterflyMusic Freunde App 💜 Bitte bleibt respektvoll.",
    time: new Date().toISOString()
  }
];

// -------------------------------------------------
// App Setup
// -------------------------------------------------
const app = express();
app.use(cors());
app.use(express.json());

// -------------------------------------------------
// API: Lobby Nachrichten holen
// -------------------------------------------------
app.get("/api/lobby/messages", (req, res) => {
  res.json({ messages });
});

// -------------------------------------------------
// API: Lobby neue Nachricht schicken
// -------------------------------------------------
app.post("/api/lobby/messages", (req, res) => {
  const { userId, text } = req.body;
  if (!text || text.trim() === "") {
    return res.status(400).json({ error: "Kein Text übergeben" });
  }

  const newMsg = {
    fromUserId: userId || "0",
    avatar: "🙂",
    displayName: "User",
    neonColor: "#00ffff",
    role: "User",
    text: text.trim(),
    translatedText: text.trim(),
    time: new Date().toISOString()
  };

  messages.push(newMsg);
  res.json({ ok: true });
});

// -------------------------------------------------
// FRONTEND HTML ausliefern
// (das ist ein Basic-Frontend, damit NICHTS weiß bleibt)
// Später ersetzen wir das durch dein Neon-Design
// -------------------------------------------------
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
        background-color: #050108;
        color: #ffffff;
        font-family: system-ui, Arial, sans-serif;
        text-align: center;
        padding: 2rem;
      }

      h1 {
        color: #ff00d9;
        text-shadow: 0 0 10px #ff00d9, 0 0 20px #00ffff, 0 0 40px #8a00ff;
      }

      .chat-box {
        max-width: 600px;
        margin: 1rem auto;
        background: rgba(0,0,0,0.4);
        border: 1px solid #00ffff;
        border-radius: 10px;
        padding: 1rem;
        text-align: left;
        box-shadow:
          0 0 10px rgba(0,255,255,0.5),
          0 0 40px rgba(255,0,217,0.3);
        min-height: 150px;
      }

      .msg {
        margin-bottom: 0.8rem;
        line-height: 1.3rem;
        word-break: break-word;
      }

      .nick {
        font-weight: 600;
        text-shadow: 0 0 6px #ff00d9, 0 0 20px #00ffff;
      }

      .controls {
        margin-top: 1rem;
      }

      input, button {
        background: rgba(0,0,0,0.6);
        border: 1px solid #ff00d9;
        border-radius: 6px;
        color: #fff;
        padding: 0.6rem 0.8rem;
        margin: 0.3rem;
        font-size: 1rem;
        box-shadow:
          0 0 8px rgba(255,0,217,0.6),
          0 0 24px rgba(0,255,255,0.3);
      }

      button {
        cursor: pointer;
        text-shadow: 0 0 6px rgba(255,255,255,0.8);
      }

      .small {
        color: #888;
        font-size: 0.8rem;
        margin-top: 1rem;
      }

    </style>
  </head>
  <body>
    <h1>🦋 ButterflyMusic Freunde App</h1>
    <div class="chat-box" id="messagesBox">Lade Nachrichten...</div>

    <div class="controls">
      <input id="msgInput" placeholder="Schreib etwas..." />
      <button id="sendBtn">Senden</button>
    </div>

    <div class="small">
      Live-Server verbunden mit<br/>
      butterflymusic-freunde-app-backend.onrender.com
    </div>

    <script>
      const API_BASE = "";

      async function loadMessages() {
        const res = await fetch("/api/lobby/messages");
        const data = await res.json();
        const box = document.getElementById("messagesBox");
        box.innerHTML = "";
        data.messages.forEach(m => {
          const d = document.createElement("div");
          d.className = "msg";
          d.innerHTML =
            "<span class='nick' style='color:" + m.neonColor + "'>" +
            m.displayName +
            "</span>: " +
            m.text;
          box.appendChild(d);
        });
      }

      async function sendMessage() {
        const inp = document.getElementById("msgInput");
        const txt = inp.value.trim();
        if (!txt) return;
        await fetch("/api/lobby/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: txt })
        });
        inp.value = "";
        loadMessages();
      }

      document.getElementById("sendBtn").addEventListener("click", sendMessage);

      loadMessages();
    </script>
  </body>
  </html>
  `;
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(html);
});

// -------------------------------------------------
// Server starten
// -------------------------------------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ ButterflyMusic Freunde App Server läuft auf Port ${PORT}`);
});



