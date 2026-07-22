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

// Usage tracking helper with in-memory fallback
const inMemoryUsage = new Map<string, { count: number; date: string }>();
let isFirestoreAvailable = true;

// Dynamic daily limit (default 50)
let customDailyLimit = parseInt(process.env.AI_DAILY_LIMIT || "50", 10);

// Admin limit management endpoints
app.get("/api/admin/limit", (req, res) => {
  res.json({ limit: customDailyLimit });
});

app.post("/api/admin/limit", (req, res) => {
  const { limit } = req.body;
  if (typeof limit === "number" && limit >= 1) {
    customDailyLimit = Math.floor(limit);
    return res.json({ success: true, limit: customDailyLimit });
  }
  return res.status(400).json({ error: "无效的限额数字" });
});

async function checkUsage(clientId: string): Promise<{ allowed: boolean; remaining: number }> {
  const today = new Date().toISOString().split("T")[0];
  const usageId = `${clientId}_${today}`;
  const DAILY_LIMIT = customDailyLimit;

  if (db && isFirestoreAvailable) {
    try {
      const usageRef = db.collection("ai_usage").doc(usageId);
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
    } catch (e: any) {
      if (e?.code === 7 || (e?.message && (e.message.includes("PERMISSION_DENIED") || e.message.includes("not been used")))) {
        console.warn("Firestore API not enabled or permitted. Falling back to in-memory usage tracking.");
        isFirestoreAvailable = false;
      } else {
        console.warn("Firestore usage check warning:", e?.message || e);
      }
    }
  }

  // Fallback in-memory tracking
  const mem = inMemoryUsage.get(clientId);
  let count = 0;
  if (mem && mem.date === today) {
    count = mem.count;
  }

  if (count >= DAILY_LIMIT) {
    return { allowed: false, remaining: 0 };
  }

  inMemoryUsage.set(clientId, { count: count + 1, date: today });
  return { allowed: true, remaining: DAILY_LIMIT - (count + 1) };
}

function isValidImageUrl(url: string): boolean {
  if (!url || typeof url !== "string") return false;
  const lower = url.toLowerCase().trim();
  
  if (!lower.startsWith("http://") && !lower.startsWith("https://")) return false;
  
  // Known high-quality direct image hosts
  if (lower.includes("doubanio.com") || 
      lower.includes("mzstatic.com") || 
      lower.includes("ytimg.com") ||
      lower.includes("media-amazon.com") ||
      lower.includes("images-na.ssl-images-amazon.com") ||
      lower.includes("steamstatic.com") ||
      lower.includes("gcores.com") ||
      lower.includes("shinchosha.co.jp") ||
      lower.includes("akamaihd.net")) {
    return true;
  }
  
  // Exclude common webpage URL patterns instead of actual direct images
  if (lower.includes("google.com/imgres") || 
      lower.includes("google.com/url") ||
      lower.includes("search?") ||
      lower.includes("wikipedia.org/wiki/") ||
      (lower.includes("douban.com/") && !lower.includes("doubanio.com/")) ||
      lower.includes("imdb.com/title/") ||
      lower.includes("bangumi.tv/subject/") ||
      lower.includes(".html") || 
      lower.includes(".htm")) {
    return false;
  }
  
  // We want to make sure it's an actual image extension or is from a reliable image host
  const hasImageExtension = /\.(jpg|jpeg|png|webp|gif|svg|bmp)(\?.*)?$/i.test(lower);
  const isImageHost = lower.includes("unsplash.com") || 
                      lower.includes("openlibrary.org") || 
                      lower.includes("vignette.wikia.nocookie.net");
                      
  return hasImageExtension || isImageHost;
}

// Helper to validate and sanitize AI parse output
function sanitizeParseResult(resultText: string): { data?: any; error?: string } {
  let json: any = {};
  try {
    json = JSON.parse(resultText);
  } catch (e) {
    return { error: "无法解析该网址或内容，请检查输入或手动填写。" };
  }

  if (json.error && typeof json.error === "string") {
    return { error: json.error };
  }

  const title = json.title ? String(json.title).trim() : "";
  const invalidTitles = ["unknown", "n/a", "null", "undefined", "未知", "无", "解析失败", "error", "none", "n/a title"];
  if (!title || invalidTitles.includes(title.toLowerCase())) {
    return { error: "无法解析该网址或内容，请检查链接或手动填写。" };
  }

  if (json.coverUrl && !isValidImageUrl(json.coverUrl)) {
    json.coverUrl = "";
  }

  return { data: json };
}

// API: Parse Book/Movie/Anime/Music links or titles using Gemini + Search Grounding
app.post("/api/parse-link", async (req, res) => {
  try {
    const { url, userApiKey, provider, baseUrl, model, clientId, isAdmin } = req.body;
    if (!url || typeof url !== "string") {
      return res.status(400).json({ error: "Please provide a valid URL or title." });
    }

    // Usage check for shared key (public mode)
    let usageInfo = { allowed: true, remaining: 999 };
    if (!userApiKey) {
      if (isAdmin) {
        // Admin mode gets unlimited parse usage
        usageInfo = { allowed: true, remaining: 9999 };
      } else {
        usageInfo = await checkUsage(clientId || req.ip || "anonymous");
        if (!usageInfo.allowed) {
          return res.status(429).json({ 
            error: `今日 AI 解析次数已达上限（${customDailyLimit}次）。管理员登录或在设置中配置个人 API KEY 可不受限制。` 
          });
        }
      }
    }

    // Determine which AI to use
    let activeProvider = provider;
    if (!activeProvider) {
      if (userApiKey) {
        activeProvider = "openai"; 
      } else {
        // Prioritize SiliconFlow if configured, then Gemini, then DeepSeek
        if (process.env.SILICONFLOW_API_KEY) {
          activeProvider = "siliconflow";
        } else if (process.env.GEMINI_API_KEY) {
          activeProvider = "gemini";
        } else {
          activeProvider = "openai";
        }
      }
    }
    
    const prompt = `You are a professional media cataloging assistant specializing in Chinese and International media (books, movies, TV shows, anime, music albums, video games).
User Input: "${url}"

Tasks:
1. Identify the media item from the input. 
2. If the input is a Douban Link (e.g., movie.douban.com/subject/1292052/), prioritize information from that specific Douban entry.
3. If the input URL or text is invalid, random gibberish, an unparseable generic webpage, or CANNOT be matched to a real book, movie, TV show, anime, album, or game, you MUST return JSON:
   { "error": "无法解析该网址或内容，请检查链接或手动输入" }
4. If valid, return a JSON object:
   - title: (string) Official Chinese title (e.g., "肖申克的救赎")
   - type: (one of: 'book', 'movie', 'tv', 'anime', 'music', 'game', 'other')
   - creator: (string) Author/Director/Studio/Artist
   - coverUrl: (string) DIRECT static image URL ending in .jpg, .png, .webp. If none found, use empty string "".
   - description: (string) Chinese summary (1-2 sentences)
   - tags: (array of strings in Chinese)
   - rating: (number 0-10 or null)
   - releaseYear: (number or string or null)

CRITICAL: Do NOT invent fake or placeholder titles if you are uncertain. Return { "error": "无法解析该网址或内容，请检查链接或手动输入" } instead.`;

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
      const sanitized = sanitizeParseResult(resultText);
      if (sanitized.error) {
        return res.status(400).json({ error: sanitized.error });
      }

      return res.json({ success: true, data: sanitized.data, remaining: usageInfo.remaining });
    } else {
      // OpenAI compatible (SiliconFlow, DeepSeek, Local LLM, etc.)
      let apiKey = userApiKey;
      let finalBaseUrl = baseUrl;
      let finalModel = model;

      if (!userApiKey) {
        if (activeProvider === "siliconflow") {
          apiKey = process.env.SILICONFLOW_API_KEY;
          finalBaseUrl = "https://api.siliconflow.cn/v1";
          finalModel = model || "deepseek-ai/DeepSeek-V3";
        } else {
          apiKey = process.env.DEEPSEEK_API_KEY;
          finalBaseUrl = "https://api.deepseek.com";
          finalModel = model || "deepseek-chat";
        }
      } else {
        // Personal Key
        if (activeProvider === "siliconflow") {
          finalBaseUrl = baseUrl || "https://api.siliconflow.cn/v1";
          finalModel = model || "deepseek-ai/DeepSeek-V3";
        } else {
          finalBaseUrl = baseUrl || "https://api.openai.com/v1";
          if (!finalModel) {
            if (finalBaseUrl.includes("deepseek.com")) finalModel = "deepseek-chat";
            else if (finalBaseUrl.includes("openai.com")) finalModel = "gpt-4o-mini";
            else finalModel = "gpt-4o-mini";
          }
        }
      }

      if (!apiKey) {
        return res.status(400).json({ error: `${activeProvider} API key is not configured.` });
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
      const sanitized = sanitizeParseResult(resultText);
      if (sanitized.error) {
        return res.status(400).json({ error: sanitized.error });
      }

      return res.json({ success: true, data: sanitized.data, remaining: usageInfo.remaining });
    }
  } catch (error: any) {
    console.error("AI parse link error:", error);
    res.status(500).json({ error: error.message || "无法解析该网址或内容，请检查链接或手动输入。" });
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
