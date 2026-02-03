
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

export interface Product {
  id: string; // normalized lowercase ID
  name: string; // Display name
  category: string;
  price: number;
  unit?: string;
  lastUpdated: number;
  count: number; // Popularity
}

export enum AppMode {
  LISTS = 'LISTS',
  PLANNING = 'PLANNING',
  STORE = 'STORE',
  REGISTER = 'REGISTER'
}

// CATEGORIES is now exported from constants/commonItems.ts

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
  isPrivate?: boolean;
  deletedAt?: number;
}
