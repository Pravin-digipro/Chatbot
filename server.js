require("dotenv").config();
const express = require("express");
const axios   = require("axios");
const cors    = require("cors");
const { DataAPIClient } = require("@datastax/astra-db-ts");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const ADMIN_KEY    = process.env.ADMIN_KEY || "digipro2024";

// ── AstraDB ──────────────────────────────────────────────────────────────────
const client            = new DataAPIClient(process.env.ASTRA_DB_APPLICATION_TOKEN);
const db                = client.db(process.env.ASTRA_DB_API_ENDPOINT);
const knowledgeCol      = db.collection(process.env.ASTRA_DB_COLLECTION);
const leadsCol          = db.collection("digipro_leads");
const settingsCol       = db.collection("digipro_settings");

(async () => {
  for (const name of ["digipro_leads", "digipro_settings"]) {
    try { await db.createCollection(name); } catch {}
  }
  console.log("Collections ready");
})();

// ── Default chatbot settings ──────────────────────────────────────────────────
const DEFAULT_SETTINGS = {
  botName:         "DigiPro Growth Consultant",
  greeting:        "Hi! 👋 I'm DigiPro's consultant assistant.\n\nWhat can I help you with today?",
  primaryColor1:   "#6366f1",
  primaryColor2:   "#06b6d4",
  headerAvatarUrl: "https://static.wixstatic.com/media/34385c_824d9838d8754e5992987ad9bcf17d76~mv2.jpg",
  botAvatarUrl:    "https://res.cloudinary.com/dbqjuze5g/image/upload/v1771938306/user_xojavv.png"
};

// ── System prompt ─────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are a consultant assistant for DigiPro, a digital marketing agency. You help visitors by answering their questions and connecting them with the right DigiPro expert.

CONVERSATION FLOW — follow this order:

STEP 1 — GREETING & NAME:
If the visitor says hi / hello / hey with no specific question → respond warmly and ask for their name.
Example: "Hi there! Great to connect with you. What's your name?"

STEP 2 — UNDERSTAND THEIR NEED:
Once you know their name, greet them by name and ask what you can help them with.
Example: "Nice to meet you, Ravi! What brings you to DigiPro today?"

STEP 3 — ANSWER & RECOMMEND EXPERT:
When they share their need, answer it directly using DigiPro context, mention the right expert by name, then IMMEDIATELY ask:
"Would you like me to connect you with [expert name]?"
Never stop after recommending — always follow up with this question.

STEP 4 — COLLECT EMAIL (MANDATORY BEFORE CONFIRMING CONNECTION):
When the visitor says yes / sure / okay / interested to connecting with an expert:
→ Your reply MUST only ask for their email. Nothing else.
→ Say: "Could you share your email address so [Expert name] can reach out to you directly?"

If the visitor keeps adding more requirements BEFORE giving their email:
→ Briefly acknowledge ("Noted! I'll make sure our team covers all of that.")
→ Then immediately redirect back: "Could you share your email so we can connect you with the right people?"
→ Do NOT keep answering new questions until email is collected.

STRICT RULES ON CONFIRMATION:
→ NEVER say "our team will reach out", "I'll connect you", or anything implying the connection is done — UNTIL the visitor has provided a valid email address (contains @ and a domain).
→ Only after a valid email is given: "Perfect! [Expert name] will reach out to you at [email] soon. Is there anything else I can help you with?"
→ Do NOT ask for email again after this point.

GOLDEN RULE — NEVER LET THE CONVERSATION DIE:
Every single reply MUST end with either a question or a call-to-action.
Never end with just a statement. Always keep the conversation moving forward.
If visitor goes quiet, nudge: "Is there anything else you'd like to know?"

NOTE: If a visitor skips the greeting and starts with a direct question, answer it first, then ask for their name naturally.

EXPERT MAPPING — mention by name when relevant:
- Website / web issues / hacking / speed / development → Pravin Rajamani or Vijayakumar (Web Development team)
- SEO / Google ranking / search traffic → Vinod Emmanuel (Digital Marketing Specialist)
- Branding / logo / brand identity / positioning → Gowtham Srinivas (Lead – Brand Strategy)
- Content / blog / copywriting / articles → Grishma Raj (Lead – Content)
- Design / creatives / visuals / banners → Vishnu Anil (Lead – Graphic Design)
- Social media / Instagram / community growth → Janani Iyer (Co-Founder, Social Media)
- Ads / paid campaigns / performance / ROI → Vinod Emmanuel (Digital Marketing Specialist)
- Multiple needs / not sure / general enquiry → Pavithra Krishnamourthy (Client Growth Manager)

TONE:
- Knowledgeable and helpful, like a real consultant
- Conversational — not robotic, not over-salesy
- Keep replies to 2-3 sentences

RULES:
- Use DigiPro context for facts — never invent services, names, or clients
- If something is outside DigiPro's scope, say so and suggest the closest service
- If pricing is asked, say the team will share a tailored quote
- Ask for email AFTER helping — never before

OUTPUT — always valid JSON, nothing else:
{
  "reply": "your response here",
  "lead": {
    "name": "extracted name or null",
    "email": "extracted email or null",
    "interest": "one-line summary of their need or null"
  }
}`;

// ── Public: chatbot settings ──────────────────────────────────────────────────
app.get("/settings", async (req, res) => {
  try {
    const docs = await settingsCol.find({}).toArray();
    res.json(docs[0] || DEFAULT_SETTINGS);
  } catch {
    res.json(DEFAULT_SETTINGS);
  }
});

// ── Chat ──────────────────────────────────────────────────────────────────────
app.post("/chat", async (req, res) => {
  const { message, history = [], leadAlreadySaved = false } = req.body;
  if (!message) return res.status(400).json({ error: "Message is required" });

  try {
    const results = await knowledgeCol.find({}, { vector: message, limit: 10 }).toArray();
    const contextText = results.map(d => d.content).filter(Boolean).join("\n\n");
    const systemContent = SYSTEM_PROMPT + (contextText ? `\n\nDIGIPRO KNOWLEDGE BASE:\n${contextText}` : "");

    const aiRes = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: "llama-3.1-8b-instant",
        messages: [{ role: "system", content: systemContent }, ...history, { role: "user", content: message }],
        temperature: 0.4,
        response_format: { type: "json_object" }
      },
      { headers: { Authorization: `Bearer ${GROQ_API_KEY}`, "Content-Type": "application/json" } }
    );

    let parsed;
    try { parsed = JSON.parse(aiRes.data.choices?.[0]?.message?.content || "{}"); }
    catch { parsed = { reply: "I'm having a moment — could you rephrase that?", lead: {} }; }

    const { reply, lead = {} } = parsed;

    let leadCaptured = false;
    const isValidEmail = lead.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.email);
    if (!leadAlreadySaved && isValidEmail) {
      const uid = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      await leadsCol.insertOne({
        uid,
        name:        lead.name    || null,
        email:       lead.email,
        interest:    lead.interest || null,
        capturedAt:  new Date().toISOString()
      });
      leadCaptured = true;
      console.log(`Lead captured: ${lead.name} — ${lead.email}`);
    }

    res.json({ reply: reply || "Sorry, I couldn't generate a response.", leadCaptured });

  } catch (err) {
    console.error("Chat error:", err.response?.data || err.message);
    res.status(500).json({ reply: "Something went wrong. Please try again.", leadCaptured: false });
  }
});

// ── Admin auth middleware ─────────────────────────────────────────────────────
function adminAuth(req, res, next) {
  if (req.headers["x-admin-key"] !== ADMIN_KEY) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

// ── Admin: stats ──────────────────────────────────────────────────────────────
app.get("/admin/stats", adminAuth, async (req, res) => {
  try {
    const leads   = await leadsCol.find({}).toArray();
    const today   = new Date().toISOString().slice(0, 10);
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();

    const byInterest = {};
    leads.forEach(l => {
      const key = l.interest || "General";
      byInterest[key] = (byInterest[key] || 0) + 1;
    });

    res.json({
      total:     leads.length,
      today:     leads.filter(l => l.capturedAt?.startsWith(today)).length,
      thisWeek:  leads.filter(l => l.capturedAt > weekAgo).length,
      byInterest
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Admin: leads list ─────────────────────────────────────────────────────────
app.get("/admin/leads", adminAuth, async (req, res) => {
  try {
    const leads = await leadsCol.find({}).toArray();
    leads.sort((a, b) => new Date(b.capturedAt) - new Date(a.capturedAt));
    res.json(leads);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Admin: delete lead ────────────────────────────────────────────────────────
app.delete("/admin/leads/:uid", adminAuth, async (req, res) => {
  try {
    await leadsCol.deleteOne({ uid: req.params.uid });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Admin: save settings ──────────────────────────────────────────────────────
app.post("/admin/settings", adminAuth, async (req, res) => {
  try {
    const existing = await settingsCol.find({}).toArray();
    if (existing.length > 0) {
      await settingsCol.updateOne({ _id: existing[0]._id }, { $set: req.body });
    } else {
      await settingsCol.insertOne(req.body);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(3001, () => console.log("Server running at http://localhost:3001"));
