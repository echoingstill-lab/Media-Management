import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "15mb" }));

// Lazy initializer for Gemini client to prevent startup crashes if key is missing
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return null;
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// API: Parse Book/Movie/Anime/Music links or titles using Gemini + Search Grounding
app.post("/api/parse-link", async (req, res) => {
  try {
    const { url } = req.body;
    if (!url || typeof url !== "string") {
      return res.status(400).json({ error: "Please provide a valid URL or title." });
    }

    const ai = getGeminiClient();
    if (!ai) {
      return res.status(400).json({
        error: "Gemini API key is not configured in Secrets. Please add GEMINI_API_KEY to proceed with AI link parsing.",
      });
    }

    const prompt = `You are a professional media cataloging assistant. Parse this user input, which may be a link (e.g. Douban, IMDb, Goodreads, Bangumi, Spotify, Bilibili) or a search query for a book, movie, TV series, anime, music album, or video game: "${url}".

Your task is to search the web and return structured cataloging metadata.
Guidelines for coverUrl:
- Find a direct, high-quality public cover image URL from official or reliable sites (like Douban, IMDb, Bangumi, Amazon, Wikipedia, etc.).
- If a high-quality direct cover URL cannot be found, GENERATE a beautiful, modern inline SVG cover as a Data URL (e.g., "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' ...>...</svg>").
- The SVG should be a portrait layout (aspect ratio roughly 2:3, e.g., width 400, height 600) with a modern, eye-safe dark slate or warm minimalist abstract geometric gradient background, elegant typography displaying the title and creator/author, and clean styling. Ensure all quotes inside the SVG are single quotes, and characters like '<' or '>' are properly encoded or raw as valid svg to avoid broken URLs.

Return a JSON object matching the requested schema.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: "The official title of the media" },
            type: { 
              type: Type.STRING, 
              description: "Must be exactly one of: 'book', 'movie', 'tv', 'anime', 'music', 'game', 'other'" 
            },
            creator: { type: Type.STRING, description: "The author, director, music artist, or development studio" },
            coverUrl: { 
              type: Type.STRING, 
              description: "A valid direct image URL, or a gorgeous custom portrait inline SVG Data URL representing the media" 
            },
            description: { type: Type.STRING, description: "A brief, elegant summary of the media (1-2 sentences in Chinese)" },
            tags: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING }, 
              description: "Suggested tags in Chinese. For books: e.g. '纸质书', '电子书', '学习', '工具书'. For movies: '剧情', '科幻', etc." 
            },
            rating: { type: Type.NUMBER, description: "Average rating out of 10 if available, otherwise null" },
            releaseYear: { type: Type.STRING, description: "Release year or full date" }
          },
          required: ["title", "type", "creator", "coverUrl", "description", "tags"]
        }
      }
    });

    const resultText = response.text?.trim() || "{}";
    const resultJson = JSON.parse(resultText);

    res.json({ success: true, data: resultJson });
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
