require("dotenv").config();
const express = require("express");
const axios = require("axios");
const cors = require("cors");
const { DataAPIClient } = require("@datastax/astra-db-ts");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

const GROQ_API_KEY = process.env.GROQ_API_KEY;

// Astra Setup
const client = new DataAPIClient(process.env.ASTRA_DB_APPLICATION_TOKEN);
const db = client.db(process.env.ASTRA_DB_API_ENDPOINT);
const collection = db.collection(process.env.ASTRA_DB_COLLECTION);

(async () => {
  try {
    const allDocs = await collection.find({}, { limit: 20 }).toArray();
    console.log("ALL DOCUMENTS IN COLLECTION:");
    console.log(allDocs);
  } catch (err) {
    console.error("DEBUG ERROR:", err);
  }
})();

app.post("/chat", async (req, res) => {

  const userMessage = req.body.message;
  

  if (!userMessage) {
    return res.status(400).json({ error: "Message is required" });
  }

  const cleanMsg = userMessage.trim().toLowerCase();

  if (["hi", "hello", "hey"].includes(cleanMsg)) {
    return res.json({ reply: "Hi 😊 How can I help you?" });
  }

  try {

    // ✅ Astra auto-vector search
const results = await collection.find(
  {},
  {
    vector: userMessage,
    limit: 20
  }
).toArray();

    const contextText = results.map(doc => doc.content).join("\n");

    if (!contextText) {
      return res.json({ reply: "I couldn't find relevant information." });
    }

    const aiResponse = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: "llama-3.1-8b-instant",
        messages: [
          {
            role: "system",
            content: `You are DigiPro's assistant.

You MUST answer strictly using the provided context.
Do NOT use outside knowledge.
If the answer is not found in the context, say:
"I don't have that information available right now."
You must answer strictly from context.
If context contains team information, list ALL team members.
Do not say you don't have information if team data exists in context.

Response Rules:
- For team questions, list all team members from context.
- For services questions, list only the services from context.
- If pricing is asked and not in context, clearly say it is not available.
- Do not generate generic marketing content.
- Be friendly but factual.`
          },
          {
            role: "user",
            content: `Context:
${contextText}

Question:
${userMessage}`
          }
        ],
        temperature: 0.3
      },
      {
        headers: {
          Authorization: `Bearer ${GROQ_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    const reply =
      aiResponse.data.choices?.[0]?.message?.content ||
      "Sorry, I couldn't generate a response.";

    res.json({ reply });

  } catch (error) {
    console.error("FULL ERROR:", error.response?.data || error.message);
    res.status(500).json({ reply: "Something went wrong." });
  }
});

app.listen(3001, () => {
  console.log("🚀 RAG Server running at http://localhost:3001");
});