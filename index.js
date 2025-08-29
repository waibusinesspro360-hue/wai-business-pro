// Wai Business Pro — Fuzzy WhatsApp Auto-Reply (Web API)
// Minimal Express server with fuzzy-matching replies.
// Author: Vitthal Jiddimani

const express = require("express");
const app = express();

app.use(express.json());

// ---- Health / Home (Uptime check) ----
app.get("/", (_req, res) => {
  res.send("Wai Business Pro Fuzzy Auto-Reply is Running! ✅");
});

// ---- Domain knowledge (Marathi + English mix) ----
const KB = [
  {
    tag: "pricing",
    patterns: [
      "किंमत", "किमती", "प्राईस", "price", "charges", "किती पैसे", "rate"
    ],
    replies: [
      "लिस्टिंग फी फक्त ₹99 — फोटो, लोकेशन, वेळा, कॉल/व्हॉट्सअप बटण सगळं!",
      "₹99 बेसिक लिस्टिंग. अपग्रेड्स हवे असतील तर नंतर add करू शकतो."
    ],
  },
  {
    tag: "howto",
    patterns: [
      "कसे करायचे", "how to", "process", "steps", "join", "लिस्टिंग कसं", "register"
    ],
    replies: [
      "Add Listing वर क्लिक करा → तपशील भरा → ₹99 पेमेंट → तुमची लिस्ट ऑटो-पब्लिश!",
      "प्रोसेस: नाव/पत्ता/फोटो → Razorpay ₹99 → लगेच लाईव्ह. मदत हवी तर 'help' टाईप करा."
    ],
  },
  {
    tag: "support",
    patterns: ["help", "सपोर्ट", "संपर्क", "contact", "issue", "problem", "मदत"],
    replies: [
      "सपोर्ट: waibusinesspro360@gmail.com — 24x7 ईमेल. त्वरित मदतीसाठी 'HELP NOW' लिहा.",
      "तुमचा प्रश्न पाठवा, आम्ही लगेच उत्तर देऊ. 📩 waibusinesspro360@gmail.com"
    ],
  },
  {
    tag: "hours",
    patterns: ["वेळ", "timings", "hours", "open", "closing time", "कधी उघडते"],
    replies: [
      "डिरेक्टरी 24x7 ऑनलाइन आहे. व्यवसायांचे वेळा त्यांच्या पेजवर दिलेले असतात.",
    ],
  },
  {
    tag: "greeting",
    patterns: ["hi", "hello", "नमस्कार", "हॅलो", "hey", "काय रे"],
    replies: [
      "नमस्कार! 👋 Wai Business Pro मध्ये स्वागत आहे. काय मदत करू?",
      "Hello! How can I help you with your business listing today?"
    ],
  },
];

// ---- Utility: normalize + simple fuzzy score (token overlap + levenshtein-lite) ----
const norm = s =>
  (s || "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

function tokenOverlapScore(a, b) {
  const A = new Set(norm(a).split(" "));
  const B = new Set(norm(b).split(" "));
  if (!A.size || !B.size) return 0;
  let hit = 0;
  for (const t of A) if (B.has(t)) hit++;
  return hit / Math.max(A.size, B.size);
}

function lev(a, b) {
  a = norm(a); b = norm(b);
  const m = a.length, n = b.length;
  if (!m && !n) return 1;
  const dp = Array(n + 1).fill(0);
  for (let j = 0; j <= n; j++) dp[j] = j;
  for (let i = 1; i <= m; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = dp[j];
      dp[j] = Math.min(
        dp[j] + 1,
        dp[j - 1] + 1,
        prev + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
      prev = tmp;
    }
  }
  const dist = dp[n];
  const maxLen = Math.max(m, n) || 1;
  return 1 - dist / maxLen; // 0..1 (1 is exact)
}

function fuzzyBestMatch(text) {
  let best = { tag: null, score: 0 };
  for (const item of KB) {
    for (const pat of item.patterns) {
      const s = Math.max(
        tokenOverlapScore(text, pat),
        lev(text, pat)
      );
      if (s > best.score) best = { tag: item.tag, score: s };
    }
  }
  return best;
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ---- API: POST /wa  { text: "...", from?: "9198..." }
app.post("/wa", (req, res) => {
  const text = (req.body && req.body.text) || "";
  const from = (req.body && req.body.from) || "user";
  const q = text.trim();

  if (!q) {
    return res.json({
      ok: true,
      to: from,
      reply:
        "नमस्कार! तुमचा मेसेज रिकामा आला. कृपया प्रश्न लिहा — उदा. 'प्राईस काय?'",
    });
  }

  const { tag, score } = fuzzyBestMatch(q);

  // जर स्कोअर कमी असेल तर generic fallback
  if (!tag || score < 0.42) {
    return res.json({
      ok: true,
      to: from,
      reply:
        "समजलं. कृपया थोडं स्पष्ट लिहाल का? (उदा. 'किंमत', 'कसे करायचे', 'सपोर्ट').",
      intentScore: Number(score.toFixed(2)),
    });
  }

  const found = KB.find(x => x.tag === tag);
  return res.json({
    ok: true,
    to: from,
    tag,
    intentScore: Number(score.toFixed(2)),
    reply: pick(found.replies),
  });
});

// ---- Start (Render uses PORT env) ----
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server started on", PORT);
});
