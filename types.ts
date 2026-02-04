
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

// Shopping History Types
export interface ShoppingSession {
  id: string;
  listId: string;
  listName: string;
  completedAt: number;
  completedBy: string;
  items: SessionItem[];
  totalSpent: number;
  missedItems: string[];
  startedAt?: number;
  duration?: number;
  dayOfWeek: number;    // 0-6 (Sunday-Saturday)
  hourOfDay: number;    // 0-23
  storeName?: string;
}

export interface SessionItem {
  name: string;
  quantity: number;
  price: number;
  category: string;
}

export interface ShoppingStats {
  totalTrips: number;
  totalSpent: number;
  avgPerTrip: number;
  frequentItems: { name: string; count: number }[];
  monthlySpend: { month: string; amount: number }[];
  preferredDays: number[];
  preferredHours: number[];
  avgDuration?: number;
}

export interface RecurringItem {
  name: string;
  avgIntervalDays: number;
  lastPurchased: number;
  confidence: number;
  suggestedNextPurchase: number;
  daysSinceLastPurchase: number;
}

export enum AppMode {
  LISTS = 'LISTS',
  PLANNING = 'PLANNING',
  STORE = 'STORE',
  REGISTER = 'REGISTER',
  DASHBOARD = 'DASHBOARD'
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
  theme?: 'light' | 'dark';
}
