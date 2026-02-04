
import { GoogleGenAI, Type } from "@google/genai";
import { GeminiSuggestion, RecurringItem } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getSmartCategorization = async (itemName: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: `Kategoriser følgende matvare eller husholdningsartikkel: "${itemName}". Svar med kun ett kategorinavn fra denne listen: "Basisvarer", "Ost & Pålegg", "Middag & Kjøtt", "Pizza & Bakst", "Wok & Krydder", "Taco", "Barn & Hygiene", "Hus & Hjem", "Annet".`,
    });
    return response.text.trim();
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Annet";
  }
};

export const getShoppingSuggestions = async (prompt: string): Promise<GeminiSuggestion[]> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: `Basert på denne forespørselen: "${prompt}", foreslå en liste over varer som trengs. Returner som JSON.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              category: { type: Type.STRING },
              estimatedPrice: { type: Type.NUMBER }
            },
            required: ["name", "category"]
          }
        }
      }
    });
    return JSON.parse(response.text);
  } catch (error) {
    console.error("Gemini Suggestions Error:", error);
    return [];
  }
};

export const parseReceiptPrices = async (base64Image: string): Promise<{ name: string, price: number }[]> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: [
        {
          inlineData: {
            mimeType: 'image/jpeg',
            data: base64Image
          }
        },
        {
          text: "Analyser denne kvitteringen. Finn alle varenavn og deres priser. Returner kun en JSON-matrise med objekter som har 'name' (string) og 'price' (number). Ignorer pant, rabatter og totalsummer."
        }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              price: { type: Type.NUMBER }
            },
            required: ["name", "price"]
          }
        }
      }
    });
    return JSON.parse(response.text);
  } catch (error) {
    console.error("Receipt Parse Error:", error);
    return [];
  }
};

export interface SmartListSuggestion {
  name: string;
  reason: 'frequent' | 'recurring' | 'seasonal' | 'complementary';
  confidence: number;
}

export const generateSmartShoppingList = async (
  frequentItems: { name: string; count: number }[],
  recurringPatterns: RecurringItem[],
  currentListItems: string[],
  shoppingPatterns: { preferredDays: number[]; preferredHours: number[] },
  availableItems: string[]
): Promise<SmartListSuggestion[]> => {
  try {
    const overdue = recurringPatterns
      .filter(p => p.daysSinceLastPurchase >= p.avgIntervalDays * 0.9)
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 10);

    const prompt = `
Du er en intelligent handleliste-assistent for en familie.
Din oppgave er å velge relevante varer fra vår EKSISTERENDE varekatalog.
Du må IKKE finne på nye varer. Du må IKKE gjette priser.

**Kontekst:**
1. **Ofte kjøpt:** ${frequentItems.slice(0, 15).map(i => `${i.name} (${i.count}x)`).join(', ')}
2. **Mønster (Overtid):** ${overdue.map(p => `${p.name} (kjøpt hver ${p.avgIntervalDays}. dag)`).join(', ') || 'Ingen'}
3. **Allerede på listen (Ignorer disse):** ${currentListItems.length > 0 ? currentListItems.join(', ') : 'Listen er tom'}

**VAREKATALOG (Velg KUN fra denne listen):**
${availableItems.join(', ')}

**Oppgave:**
Velg 5-15 varer fra VAREKATALOGEN som familien sannsynligvis trenger nå.
Baser valget på historikk og sunn fornuft (hva passer sammen med det de ofte kjøper?).
Hvis katalogen er tom eller veldig liten, kan du foreslå generiske basisvarer (Banan, Melk, Brød, Egg).

Returner JSON:
[
  { "name": "Eksakt Varenavn fra Katalogen", "reason": "recurring" | "frequent" | "seasonal" | "complementary", "confidence": 0.0-1.0 }
]
`;

    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              // We don't ask AI for category or price anymore, we look it up in DB
              reason: { type: Type.STRING, enum: ["frequent", "recurring", "seasonal", "complementary"] },
              confidence: { type: Type.NUMBER }
            },
            required: ["name", "reason", "confidence"]
          }
        }
      }
    });

    return JSON.parse(response.text);
  } catch (error) {
    console.error("Smart List Generation Error:", error);
    return [];
  }
};
