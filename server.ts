import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, GenerateContentParameters } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "15mb" }));

  // API Endpoint for Secure Gemini API proxy with Search Grounding
  app.post("/api/ai/chat", async (req, res) => {
    try {
      const { messages, systemInstruction, model, customApiKey, useGrounding } = req.get("Content-Type")?.includes("json") ? req.body : {};

      // Determine the API Key to use: choose local environment secret or fallback safely
      const apiKey = process.env.GEMINI_API_KEY || customApiKey;
      if (!apiKey) {
        return res.status(400).json({
          error: {
            message: "API Key do Gemini ausente. Configure a chave de API do Gemini no painel de Secrets ou nas Configurações do aplicativo."
          }
        });
      }

      // Initialize the modern @google/genai SDK on the server-side
      const ai = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build"
          }
        }
      });

      const chosenModel = model || "gemini-3.5-flash";

      // Translate client messages into the structure required by @google/genai.
      // Message format: role: "user" | "model", parts: [{ text: "..." }]
      const contents = (messages || []).map((msg: any) => ({
        role: msg.role === "user" ? "user" : "model",
        parts: [{ text: msg.text || "" }]
      }));

      const config: any = {
        systemInstruction: systemInstruction || "Você é um tutor jurídico especialista na magistratura.",
        temperature: 1.0,
      };

      if (useGrounding) {
        config.tools = [{ googleSearch: {} }];
      }

      const params: GenerateContentParameters = {
        model: chosenModel,
        contents: contents,
        config: config
      };

      const aiResponse = await ai.models.generateContent(params);

      // Extract the response text
      const replyText = aiResponse.text || "";

      // Extract grounding sources if they exist (Google Search chunks)
      let sources = null;
      const chunks = aiResponse.candidates?.[0]?.groundingMetadata?.groundingChunks;
      if (chunks && chunks.length) {
        sources = chunks
          .filter((c: any) => c.web)
          .map((c: any) => ({
            uri: c.web.uri,
            title: c.web.title
          }));
      }

      return res.json({
        text: replyText,
        sources: sources
      });

    } catch (error: any) {
      console.error("Gemini API Error helper:", error);
      return res.status(500).json({
        error: {
          message: error.message || "Erro interno ao processar a requisição da IA."
        }
      });
    }
  });

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", time: new Date().toISOString() });
  });

  // Vite middleware integration
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
    console.log(`[Codex Backend] Server is running at http://localhost:${PORT}`);
  });
}

startServer();
