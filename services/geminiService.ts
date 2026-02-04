
import { GoogleGenAI, Type } from "@google/genai";
import { GeminiSuggestion, RecurringItem } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getSmartCategorization = async (itemName: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: `Kategoriser følgende matvare eller husholdningsartikkel: "${itemName}". Svar med kun ett kategorinavn fra denne listen: "Grønnsaker & Frukt", "Meieri & Egg", "Kjøtt & Fisk", "Brød & Bakevarer", "Frysevarer", "Tørrvarer", "Drikke", "Snacks & Godteri", "Hus & Hjem", "Personlig pleie", "Annet".`,
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
  category: string;
  reason: 'frequent' | 'recurring' | 'seasonal' | 'complementary';
  confidence: number;
}

export const generateSmartShoppingList = async (
  frequentItems: { name: string; count: number }[],
  recurringPatterns: RecurringItem[],
  currentListItems: string[],
  shoppingPatterns: { preferredDays: number[]; preferredHours: number[] }
): Promise<SmartListSuggestion[]> => {
  try {
    const overdue = recurringPatterns
      .filter(p => p.daysSinceLastPurchase >= p.avgIntervalDays * 0.9)
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 10);

    const prompt = `
Du er en intelligent handleliste-assistent. Analyser brukerens mønstre og foreslå varer.

**Data:**
1. **Ofte kjøpt (Topp 15):** ${frequentItems.slice(0, 15).map(i => `${i.name} (${i.count}x)`).join(', ')}
2. **Forfalt/Mønster (Høy prioritet):** ${overdue.map(p => `${p.name} (kjøpt hver ${p.avgIntervalDays}. dag, sist for ${p.daysSinceLastPurchase} dager siden)`).join(', ') || 'Ingen'}
3. **Handle-tidspunkt:** Vanligste dager: ${shoppingPatterns.preferredDays.join(', ')}. Timer: ${shoppingPatterns.preferredHours.join(', ')}.
4. **Allerede på listen:** ${currentListItems.length > 0 ? currentListItems.join(', ') : 'Listen er tom'}

**Oppgave:**
Foreslå 5-10 varer som mangler på listen. Prioriter varer som "burde" vært kjøpt nå basert på mønster, deretter basisvarer.
Unngå varer som allerede er på listen.

Returner JSON:
[
  { "name": "Varenavn", "category": "Kategori", "reason": "recurring" | "frequent" | "seasonal" | "complementary", "confidence": 0.0-1.0 }
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
              category: { type: Type.STRING },
              reason: { type: Type.STRING, enum: ["frequent", "recurring", "seasonal", "complementary"] },
              confidence: { type: Type.NUMBER }
            },
            required: ["name", "category", "reason", "confidence"]
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
