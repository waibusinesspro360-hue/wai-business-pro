// index.js
// WhatsApp Cloud API Webhook + Auto-Reply (with simple fuzzy matching)

const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");

const app = express();
app.use(bodyParser.json());

// ====== CONFIG (env) ======
const PORT = process.env.PORT || 3000;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN || "vithoba@9044"; // Facebook मध्ये जे टाकशील तेच
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;               // Permanent/Long-Lived token
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;             // WABA phone number id

// ====== Helpers ======
async function sendText(to, body) {
  if (!WHATSAPP_TOKEN || !PHONE_NUMBER_ID) {
    console.error("❌ WHATSAPP_TOKEN/PHONE_NUMBER_ID missing");
    return;
  }
  const url = `https://graph.facebook.com/v20.0/${PHONE_NUMBER_ID}/messages`;
  const payload = {
    messaging_product: "whatsapp",
    to,
    type: "text",
    text: { body }
  };
  await axios.post(url, payload, {
    headers: {
      Authorization: `Bearer ${WHATSAPP_TOKEN}`,
      "Content-Type": "application/json"
    }
  });
}

// अतिशय सोपी fuzzy logic (keywords → reply)
function fuzzyReply(userText) {
  const t = (userText || "").toLowerCase();

  const intents = [
    { k: ["hi", "hello", "namaste", "नमस्कार", "हॅलो"], r: "नमस्कार! मी तुमचा WhatsApp सहाय्यक. कशी मदत करू?" },
    { k: ["price", "rates", "किंमत", "भाव", "charges"], r: "आमचे बेसिक प्लॅन फ्री, प्रीमियम प्लॅन नंतर ठरवू. तुम्हाला कोणता हवा?" },
    { k: ["help", "मदत", "support"], r: "तुमचा प्रश्न टाका—मी लगेच उत्तर देतो." },
    { k: ["timing", "वेळ", "working"], r: "आमची सेवा 24x7 उपलब्ध आहे. 🙂" },
  ];

  for (const it of intents) {
    if (it.k.some(k => t.includes(k))) return it.r;
  }

  // default smart fallback
  return `तुमचा मेसेज मिळाला: “${userText}”.\nमी समजून घेऊन मदत करतो. कृपया थोडक्यात काय हवं ते सांगा.`;
}

// ====== Routes ======

// health
app.get("/", (_req, res) => res.send("Wai Business Pro Fuzzy Auto-Reply is Running! ✅"));

// META verification
app.get("/wa", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("✅ Webhook verified");
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
});

// receive messages
app.post("/wa", async (req, res) => {
  try {
    // Meta ला पटकन 200 द्यायचा—मग reply logic चालू
    res.sendStatus(200);

    const entry = req.body?.entry?.[0];
    const change = entry?.changes?.[0];
    const messages = change?.value?.messages;
    if (!messages || !messages[0]) return;

    const msg = messages[0];
    const from = msg.from;                       // user's whatsapp number (MSISDN)
    const userText = msg.text?.body || "";

    console.log("📩 Incoming:", { from, userText });

    const reply = fuzzyReply(userText);
    await sendText(from, reply);
    console.log("📤 Replied:", reply);
  } catch (e) {
    console.error("Webhook error:", e?.response?.data || e.message);
  }
});

// start
app.listen(PORT, () => console.log(`✅ Server started on ${PORT}`));
