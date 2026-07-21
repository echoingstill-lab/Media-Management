import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import { initializeApp, getApps, App } from "firebase-admin/app";
import { getFirestore, FieldValue, Firestore } from "firebase-admin/firestore";
import OpenAI from "openai";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "15mb" }));

// Initialize Firebase Admin
let firebaseApp: App | null = null;
if (!getApps().length) {
  try {
    firebaseApp = initializeApp();
  } catch (e) {
    console.warn("Firebase Admin failed to initialize. Usage tracking will be disabled.");
  }
}
const db: Firestore | null = getApps().length ? getFirestore() : null;

// Lazy initializer for Gemini client to prevent startup crashes if key is missing
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(customKey?: string): GoogleGenAI | null {
  const apiKey = customKey || process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  aiClient = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
  return aiClient;
}

// DeepSeek Client (OpenAI compatible)
function getDeepSeekClient(customKey?: string): OpenAI | null {
  const apiKey = customKey || process.env.DEEPSEEK_API_KEY;
  if (!apiKey) return null;
  return new OpenAI({
    apiKey,
    baseURL: "https://api.deepseek.com",
  });
}

// Usage tracking helper
async function checkUsage(clientId: string): Promise<{ allowed: boolean; remaining: number }> {
  if (!db) return { allowed: true, remaining: 999 };
  
  const today = new Date().toISOString().split("T")[0];
  const usageId = `${clientId}_${today}`;
  const usageRef = db.collection("ai_usage").doc(usageId);
  
  // You can adjust the daily limit here or via AI_DAILY_LIMIT env var
  const DAILY_LIMIT = parseInt(process.env.AI_DAILY_LIMIT || "10", 10);
  
  try {
    const doc = await usageRef.get();
    const data = doc.data();
    const count = data?.count || 0;
    
    if (count >= DAILY_LIMIT) {
      return { allowed: false, remaining: 0 };
    }
    
    await usageRef.set({
      count: count + 1,
      last_request: FieldValue.serverTimestamp(),
    }, { merge: true });
    
    return { allowed: true, remaining: DAILY_LIMIT - (count + 1) };
  } catch (e) {
    console.error("Usage check error:", e);
    return { allowed: true, remaining: 1 }; // Default to allow on error
  }
}

// API: Parse Book/Movie/Anime/Music links or titles using Gemini + Search Grounding
app.post("/api/parse-link", async (req, res) => {
  try {
    const { url, userApiKey, provider, baseUrl, model, clientId } = req.body;
    if (!url || typeof url !== "string") {
      return res.status(400).json({ error: "Please provide a valid URL or title." });
    }

    // Usage check for shared key (public mode)
    let usageInfo = { allowed: true, remaining: 999 };
    if (!userApiKey) {
      usageInfo = await checkUsage(clientId || req.ip || "anonymous");
      if (!usageInfo.allowed) {
        const limit = process.env.AI_DAILY_LIMIT || "10";
        return res.status(429).json({ 
          error: `今日 AI 解析次数已达上限（${limit}次）。请明日再试，或在设置中配置您自己的 API KEY。` 
        });
      }
    }

    // Determine which AI to use
    let activeProvider = provider;
    if (!activeProvider) {
      if (userApiKey) {
        activeProvider = "openai"; // Default for personal key if not specified
      } else {
        activeProvider = process.env.GEMINI_API_KEY ? "gemini" : "openai";
      }
    }
    
    const prompt = `You are a professional media cataloging assistant. Parse this user input: "${url}".
Return a JSON object with: title, type (one of: 'book', 'movie', 'tv', 'anime', 'music', 'game', 'other'), creator, coverUrl, description (1-2 sentences in Chinese), tags (array), rating (null or number 0-10), releaseYear.
If searching for cover, use a direct image URL or generate a portrait SVG Data URL.`;

    if (activeProvider === "gemini" && !baseUrl) {
      const ai = getGeminiClient(userApiKey);
      if (!ai) {
        return res.status(400).json({ error: "Gemini API key is not configured." });
      }

      const response = await ai.models.generateContent({
        model: model || "gemini-2.0-flash",
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json",
        }
      });

      const resultText = response.text?.trim() || "{}";
      const resultJson = JSON.parse(resultText);
      return res.json({ success: true, data: resultJson, remaining: usageInfo.remaining });
    } else {
      // OpenAI compatible (DeepSeek, Local LLM, etc.)
      const apiKey = userApiKey || process.env.DEEPSEEK_API_KEY;
      const finalBaseUrl = baseUrl || (userApiKey ? "https://api.openai.com/v1" : "https://api.deepseek.com");
      
      // Auto-detect model if not provided
      let finalModel = model;
      if (!finalModel) {
        if (finalBaseUrl.includes("deepseek.com")) {
          finalModel = "deepseek-chat";
        } else if (finalBaseUrl.includes("openai.com")) {
          finalModel = "gpt-4o-mini";
        } else {
          // Default to a common standard or keep it generic
          finalModel = userApiKey ? "gpt-4o-mini" : "deepseek-chat";
        }
      }

      if (!apiKey) {
        return res.status(400).json({ error: "API key is not configured." });
      }

      const client = new OpenAI({
        apiKey,
        baseURL: finalBaseUrl,
      });

      const response = await client.chat.completions.create({
        model: finalModel,
        messages: [
          { role: "system", content: "You are a helpful assistant that parses media information into JSON." },
          { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" }
      });

      const resultText = response.choices[0].message.content || "{}";
      const resultJson = JSON.parse(resultText);
      return res.json({ success: true, data: resultJson, remaining: usageInfo.remaining });
    }
  } catch (error: any) {
    console.error("AI parse link error:", error);
    res.status(500).json({ error: error.message || "Failed to parse link." });
  }
});

// Configure Vite or Static files depending on environment
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT} (http://localhost:${PORT})`);
  });
}

if (!process.env.VERCEL) {
  startServer();
}

export default app;
