
import { GoogleGenAI, Type } from "@google/genai";
import { GeminiSuggestion } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getSmartCategorization = async (itemName: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
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
      model: 'gemini-3-flash-preview',
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

export const parseReceiptPrices = async (base64Image: string): Promise<{name: string, price: number}[]> => {
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
