
import { AnalysisResult, Sentiment } from "../types";

const MAX_CONTENT_LENGTH = 12000; // Safety limit to prevent 413 Payload Too Large

/**
 * Frontend-Service für die E-Mail-Analyse.
 * Bereinigt den Inhalt vor dem Senden, um Größenbeschränkungen einzuhalten.
 */
export const analyzeEmail = async (content: string): Promise<AnalysisResult> => {
  try {
    // 1. Payload verkleinern: Große Base64-Blöcke (Anhänge) entfernen, die das Limit sprengen
    let sanitizedContent = content;
    
    // Entferne Strings, die wie massive Base64-Blöcke aussehen (über 500 Zeichen ohne Leerzeichen)
    sanitizedContent = sanitizedContent.replace(/[a-zA-Z0-9+/]{500,}/g, '[ANHANG_ENTFERNT]');

    // 2. Harte Kürzung auf ein sicheres Limit
    if (sanitizedContent.length > MAX_CONTENT_LENGTH) {
      sanitizedContent = sanitizedContent.slice(0, MAX_CONTENT_LENGTH) + "\n\n... [Inhalt für API-Analyse gekürzt]";
    }

    const response = await fetch('/api/analyze-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        content: sanitizedContent 
      }),
    });

    // 3. Fehler-Handling ohne ungeprüftes .json()
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error(`Analyse-Fehler (${response.status}):`, errorData);
      
      if (errorData.error === "MISSING_API_KEY" || errorData.error === "AI_REQUEST_FAILED") {
        const err = new Error(errorData.message || "KI-Fehler");
        (err as any).code = errorData.error;
        throw err;
      }
      
      throw new Error(`Server meldet Status ${response.status}`);
    }

    return await response.json();
  } catch (e: any) {
    console.error("Frontend API-Verbindungsfehler:", e);
    
    // Wenn es ein spezieller KI-Fehler ist, werfen wir ihn weiter, damit das UI reagieren kann
    if (e.code === "MISSING_API_KEY" || e.code === "AI_REQUEST_FAILED") {
      throw e;
    }

    // Rückfall-Ergebnis bei allgemeinen Fehlern (z.B. Timeout oder 413)
    return {
      sentiment: Sentiment.NEUTRAL,
      category: "Analyse fehlgeschlagen",
      product: "N/A",
      reason: "Inhalt zu komplex oder Server-Limit",
      branch: "Manuelle Prüfung erforderlich",
      summary: "Die KI-Analyse konnte für diese E-Mail nicht vollständig durchgeführt werden. Bitte prüfen Sie den Originaltext manuell.",
      cleanBody: "Analyse aufgrund technischer Limits übersprungen."
    };
  }
};

/**
 * Generiert Antwortvorschläge basierend auf den extrahierten E-Mail-Daten.
 */
export const generateReplySuggestions = async (name: string, product: string, reason: string): Promise<string> => {
  try {
    const response = await fetch('/api/generate-reply', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name, product, reason }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      if (errorData.error === "MISSING_API_KEY" || errorData.error === "AI_REQUEST_FAILED") {
        const err = new Error(errorData.message || "KI-Fehler");
        (err as any).code = errorData.error;
        throw err;
      }
      throw new Error("Fehler beim Abrufen der Vorschläge");
    }
    const data = await response.json();
    return data.text;
  } catch (e: any) {
    console.error(e);
    if (e.code === "MISSING_API_KEY" || e.code === "AI_REQUEST_FAILED") {
      throw e;
    }
    return "Fehler beim Generieren der Vorschläge.";
  }
};
