
import { GoogleGenAI, Type } from "@google/genai";

const MODEL = "gemini-flash-latest";

/**
 * Hilfsfunktion für Verzögerungen (Backoff)
 */
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Führt den KI-Aufruf mit Retry- und Fallback-Logik aus.
 */
async function generateContentWithRetry(ai: any, prompt: string) {
  const attempts = [
    { model: MODEL, delay: 0 },
    { model: MODEL, delay: 400 },
    { model: MODEL, delay: 900 }
  ];

  let lastError: any = null;

  for (let i = 0; i < attempts.length; i++) {
    const { model, delay } = attempts[i];
    if (delay > 0) await sleep(delay);

    try {
      console.log(`KI-Antwort Versuch ${i + 1} mit Modell: ${model}`);
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
      });
      return response;
    } catch (error: any) {
      lastError = error;
      const status = error.status || error.code || (error.response && error.response.status);
      const message = error.message || "";
      
      const isRetryable = status === 503 || status === 429 || 
                         message.includes("UNAVAILABLE") || 
                         message.includes("RESOURCE_EXHAUSTED") ||
                         message.includes("high demand");

      if (!isRetryable) throw error;
      console.error(`Fehler bei Antwort-Versuch ${i + 1} (${model}): ${message}`);
    }
  }
  throw lastError;
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: "Method Not Allowed" });
    return;
  }

  try {
    const { name, product, reason } = req.body || {};

    if (!process.env.GEMINI_API_KEY) {
      res.status(400).json({ 
        error: "MISSING_API_KEY", 
        message: "GEMINI_API_KEY ist nicht konfiguriert. Bitte den API-Schlüssel in der Umgebung setzen." 
      });
      return;
    }

    // Requires GEMINI_API_KEY in environment variables
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    // The prompt is based on the user's specific request for style and format.
    const prompt = `Erstelle eine Antwort-E-Mail auf Deutsch, die entweder im **formellen** oder im **lockeren/freundlichen** Stil verfasst ist. Verwende die folgenden Daten:

- Name: ${name || '[Name]'}  
- Produkt: ${product || '[Produkt]'}  
- Grund der Reklamation: ${reason || '[Grund]'}  

Nutze einfache Sprache, sei klar, höflich und menschlich. Gib je zwei Antwort-Varianten zurück:
1. Stil: **Formal**
2. Stil: **Locker / Freundlich**

⚠️ WICHTIG:
- Gib ausschließlich die Textvorschläge zurück – kein HTML, kein Script, kein Code.
- Kein Styling, kein zusätzliches Verhalten. Nur den E-Mail-Text.
- Nutze das folgende Format EXAKT:

---

**FORMAL**

Variante 1:  
[Text]

Variante 2:  
[Text]

---

**LOCKER / FREUNDLICH**

Variante 1:  
[Text]

Variante 2:  
[Text]`;

    const response = await generateContentWithRetry(ai, prompt);

    const text = response.text;
    if (!text) throw new Error("Keine Antwort von der KI erhalten.");

    res.status(200).json({ text });

  } catch (error: any) {
    console.error("Gemini API Error (generate-reply):", error);
    const status = error.status || error.code || (error.response && error.response.status);
    const message = error.message || "";

    if (message.includes("API_KEY") || message.includes("key not found")) {
      res.status(400).json({ 
        error: "MISSING_API_KEY", 
        message: "GEMINI_API_KEY ist ungültig oder fehlt." 
      });
    } else if (status === 503 || status === 429 || message.includes("high demand") || message.includes("RESOURCE_EXHAUSTED") || message.includes("UNAVAILABLE")) {
      res.status(503).json({ 
        error: "TEMPORARY_UNAVAILABLE", 
        message: "Die KI ist aktuell stark ausgelastet. Bitte in 1–2 Minuten erneut versuchen." 
      });
    } else {
      res.status(502).json({ 
        error: "AI_REQUEST_FAILED", 
        message: "Die KI-Analyse konnte nicht durchgeführt werden. Bitte später erneut versuchen." 
      });
    }
  }
}
