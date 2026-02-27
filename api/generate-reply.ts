
import { GoogleGenAI, Type } from "@google/genai";

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: "Method Not Allowed" });
    return;
  }

  try {
    const { name, product, reason } = req.body || {};

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

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

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });

    const text = response.text;
    if (!text) throw new Error("Keine Antwort von der KI erhalten.");

    res.status(200).json({ text });

  } catch (error: any) {
    res.status(500).json({ error: error.message || "Fehler bei der Antwort-Generierung" });
  }
}
