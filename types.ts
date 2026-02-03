
export interface ShoppingItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  price: number;
  category: string;
  isBought: boolean;
  createdAt: number;
  sortOrder: number;
  checkedAt?: number; // Timestamp when marked as bought (for learning)
}

export interface Product {
  id: string; // normalized lowercase ID
  name: string; // Display name
  category: string;
  price: number;
  unit?: string;
  lastUpdated: number;
  count: number; // Popularity
  deleted?: boolean;
  deletedAt?: number;
  deletedBy?: string;
}

export interface PriceHistoryRecord {
  id?: string;
  oldPrice: number;
  newPrice: number;
  updatedAt: number;
  updatedBy: string;
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
  // Store-Pathing fields
  categoryOrder?: string[];
  itemPathWeights?: Record<string, number>;
  lastShopperEmail?: string;
}

export interface UserSettings {
  globalCategoryOrder: string[];
  lastUsedListId?: string;
  routeAutoSync?: boolean;
}
