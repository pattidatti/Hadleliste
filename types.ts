
export interface ShoppingItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  price: number;
  category: string;
  isBought: boolean;
  createdAt: number;
}

export enum AppMode {
  PLANNING = 'PLANNING',
  STORE = 'STORE'
}

export const CATEGORIES = [
  "Grønnsaker & Frukt",
  "Meieri & Egg",
  "Kjøtt & Fisk",
  "Brød & Bakevarer",
  "Frysevarer",
  "Tørrvarer",
  "Drikke",
  "Snacks & Godteri",
  "Hus & Hjem",
  "Personlig pleie",
  "Annet"
];

export interface GeminiSuggestion {
  name: string;
  category: string;
  estimatedPrice?: number;
}

export interface SharedList {
  id: string;
  name: string;
  ownerId: string;
  ownerEmail: string;
  collaborators: string[];
  updatedAt: number;
}
