
import { GoogleGenAI, Type } from "@google/genai";

enum Sentiment {
  POSITIVE = "Positive",
  NEUTRAL = "Neutral",
  NEGATIVE = "Negative",
}

interface AnalysisResult {
  sentiment: Sentiment;
  category: string;
  product: string;
  branch: string;
  reason: string;
  summary: string;
  cleanBody?: string;
  employeeId?: string;
  employeeName?: string;
  subject?: string;
  from?: string;
  to?: string;
  date?: string;
}

const PRIMARY_MODEL = "gemini-1.5-flash-latest";
const FALLBACK_MODEL = "gemini-1.5-pro-latest";
const MAX_ANALYSIS_CHARS = 15000; // Reduced for stability as requested

/**
 * Wandelt rohe URLs im Text in klickbare HTML-Links um, falls diese noch nicht verlinkt sind.
 */
function linkify(text: string): string {
  // Regex erkennt URLs, die mit http:// oder https:// beginnen
  // Verhindert das Verlinken von URLs, die bereits Teil eines href-Attributs sind.
  const urlRegex = /(?<!href=["'])(https?:\/\/[^\s<]+)/gi;
  
  return text.replace(urlRegex, (url) => {
    // Falls die URL am Ende ein Satzzeichen hat, das nicht zur URL gehört (z.B. Punkt am Satzende)
    const cleanUrl = url.replace(/[.,!?;:]$/, '');
    const trailingPunctuation = url.slice(cleanUrl.length);
    
    return `<a href="${cleanUrl}" target="_blank" rel="noopener noreferrer">${cleanUrl}</a>${trailingPunctuation}`;
  });
}

/**
 * Bereinigt HTML-Inhalt gemäß den Benutzeranforderungen:
 * Erlaubt nur <p>, <br>, <b>, <a> (mit href, target, rel) und <img> (mit src) Tags.
 * Entfernt alle anderen Tags (style, script, div, span, etc.).
 */
function sanitizeEmailHtml(html: string): string {
  if (!html) return "";

  // 1. Dekodiere codierte HTML-Zeichen für die Verarbeitung
  let text = html
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, "'")
    .replace(/&amp;/gi, '&')
    .replace(/&nbsp;/gi, ' ');

  // 2. Entferne kritische/unnötige Tags samt Inhalt
  text = text.replace(/<(style|script|meta|link|head|iframe|object|embed|title)[^>]*>[\s\S]*?<\/\1>/gi, "");

  // 3. Entferne alle Tags außer den explizit erlaubten: p, br, b, a, img
  text = text.replace(/<(?!(\/?(p|br|b|a|img)\b))[^>]+>/gi, "");

  // 4. Cleanup & Linkify
  
  // Spezialfall: Entferne lokale Pfadfragmente, die direkt vor einer URL stehen 
  // (z.B. /geteilte-inhalte/uuid<https://url> oder /pfad/id https://url)
  // Wir entfernen den Pfadteil vor dem < oder vor dem Leerzeichen/URL.
  text = text.replace(/\/[^\s<>]*?\/[a-zA-Z0-9-]+\s*<(https?:\/\/[^>]+)>/gi, '$1');
  text = text.replace(/\/[^\s<>]*?\/[a-zA-Z0-9-]+\s+(https?:\/\/[^\s<]+)/gi, '$1');
  
  // Entferne potenzielle Markdown-Link-Reste [Link](URL), falls die KI gepatzt hat.
  text = text.replace(/\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/gi, '$2');
  
  // Dann wandeln wir alle verbleibenden rohen URLs in Links um.
  text = linkify(text);

  // 5. Bereinige Whitespace
  text = text.replace(/[ \t]+/g, " ");
  
  return text.trim();
}

/**
 * Hilfsfunktion für Verzögerungen (Backoff)
 */
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Führt den KI-Aufruf mit Retry- und Fallback-Logik aus.
 */
async function generateContentWithRetry(ai: any, contents: any, config: any) {
  const attempts = [
    { model: PRIMARY_MODEL, delay: 0 },
    { model: PRIMARY_MODEL, delay: 400 },
    { model: PRIMARY_MODEL, delay: 900 },
    { model: FALLBACK_MODEL, delay: 500 } // Letzter Versuch mit Fallback-Modell
  ];

  let lastError: any = null;

  for (let i = 0; i < attempts.length; i++) {
    const { model, delay } = attempts[i];
    
    if (delay > 0) await sleep(delay);

    try {
      console.log(`KI-Analyse Versuch ${i + 1} mit Modell: ${model}`);
      const response = await ai.models.generateContent({
        model,
        contents,
        config
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

      console.error(`Fehler bei Versuch ${i + 1} (${model}): Status ${status}, Nachricht: ${message}`);

      if (!isRetryable) {
        // Nicht-retryfähiger Fehler (z.B. 400 Bad Request) sofort werfen
        throw error;
      }
      
      // Wenn es der letzte Versuch war, wird die Schleife beendet und der Fehler unten behandelt
    }
  }

  throw lastError;
}

/**
 * Server-Handler für die E-Mail-Analyse.
 */
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: "Method Not Allowed" });
    return;
  }

  try {
    const { content } = req.body || {};

    if (!content) {
      res.status(400).json({ error: "Kein Inhalt zur Analyse übermittelt." });
      return;
    }

    if (!process.env.GEMINI_API_KEY) {
      res.status(400).json({ 
        error: "MISSING_API_KEY", 
        message: "GEMINI_API_KEY ist nicht konfiguriert. Bitte den API-Schlüssel in der Umgebung setzen." 
      });
      return;
    }

    // Requires GEMINI_API_KEY in environment variables
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const truncatedContent = content.length > MAX_ANALYSIS_CHARS 
      ? content.substring(0, MAX_ANALYSIS_CHARS)
      : content;

    const contents = `Analysiere die folgende E-Mail (EML/MSG Rohdaten). Extrahiere Metadaten und erstelle eine hochgradig strukturierte, bereinigte HTML-Version des Textkörpers.

      STRIKTE ANFORDERUNGEN FÜR 'cleanBody':
      1. ORIGINALITÄT: Gib den ORIGINALEN Textkörper zurück. Keine Texte erfinden oder löschen. Behalte die Reihenfolge und Leerzeichen bei.
      2. STRUKTUR: Behalte den ursprünglichen Aufbau exakt bei.
      3. HTML-FORMATIERUNG: Nutze NUR <p>, <br>, <b>, <a>, <img>.
      4. LINK-FORMATIERUNG: JEDE URL im Text MUSS zwingend als klickbarer HTML-Link im Format <a href="URL" target="_blank" rel="noopener noreferrer">URL</a> dargestellt werden.
      5. SPEZIALFALL FOTO-PFADE: Achte besonders auf Zeilen wie 'Foto: /geteilte-inhalte/ID<URL>'. Entferne ZWINGEND den lokalen Pfadteil (z.B. /geteilte-inhalte/...) und die Klammern < >. Zeige NUR die klickbare URL als Text an.
      6. KEINE DOPPELTEN INHALTE: Zeige niemals Pfadfragmente und URL kombiniert. Nur die URL zählt.
      7. BILDER: Behalte <img> Tags mit ihren src-Attributen bei.
      8. REINIGUNG: Entferne <div>, <span>, <table>, <style>, <script>.
      
      E-Mail Rohdaten:
      ${truncatedContent}
      `;

    const config = {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          sentiment: { type: Type.STRING, enum: ["Positive", "Neutral", "Negative"] },
          category: { type: Type.STRING },
          product: { type: Type.STRING },
          reason: { type: Type.STRING },
          branch: { type: Type.STRING },
          cleanBody: { type: Type.STRING, description: "Der originalgetreue Textkörper in bereinigtem HTML (p, br, b, a, img)." },
          summary: { type: Type.STRING },
          subject: { type: Type.STRING },
          from: { type: Type.STRING },
          to: { type: Type.STRING },
          date: { type: Type.STRING },
          employeeId: { type: Type.STRING },
          employeeName: { type: Type.STRING }
        },
        required: ["sentiment", "category", "product", "reason", "branch", "summary", "cleanBody", "subject", "from", "to", "date"]
      },
    };

    const response = await generateContentWithRetry(ai, contents, config);

    // Access the response text using the .text property (not a method).
    const text = response.text;
    if (!text) throw new Error("Keine Antwort von der KI erhalten.");

    const data = JSON.parse(text.trim());
    
    // Finaler Sicherheitscheck und Sanitizing der erlaubten Tags
    const result: AnalysisResult = {
      sentiment: (data.sentiment as Sentiment) || Sentiment.NEUTRAL,
      category: data.category || "Allgemein",
      product: data.product || "N/A",
      reason: data.reason || "N/A",
      branch: data.branch || "Hauptzentrale",
      cleanBody: sanitizeEmailHtml(data.cleanBody || ""),
      summary: data.summary || "Keine Zusammenfassung verfügbar.",
      subject: data.subject || "Kein Betreff",
      from: data.from || "Unbekannt",
      to: data.to || "Zentrale",
      date: data.date || new Date().toISOString(),
      employeeId: data.employeeId,
      employeeName: data.employeeName
    };

    res.status(200).json(result);

  } catch (error: any) {
    console.error("Gemini API Error (analyze-email):", error);
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
