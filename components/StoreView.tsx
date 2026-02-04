import React, { useState } from 'react';
import { ShoppingItem, ShoppingSession } from '../types';
import { CATEGORIES } from '../constants/commonItems';
import { useSwipe } from '../hooks/useSwipe';
import { haptics } from '../services/haptics';
import { useCatalog } from '../hooks/useCatalog';
import { useToast } from './Toast';
import { CompleteTripResult } from '../hooks/useShoppingList';

interface StoreViewProps {
  items: ShoppingItem[];
  updateItem: (id: string, updates: Partial<ShoppingItem>) => Promise<void>;
  removeItem: (id: string) => Promise<void>;
  onReset: () => Promise<boolean>;
  onComplete: (storeName?: string) => CompleteTripResult;
  onSaveSession: (listId: string, session: Omit<ShoppingSession, 'id'>) => Promise<void>;
  categoryOrder?: string[]; // Learned category order from store-pathing
  lastShopperEmail?: string;
}

const SwipeableItem = ({ item, onToggle, onDelete }: { item: ShoppingItem, onToggle: (id: string) => void, onDelete: (id: string) => void }) => {
  const { onTouchStart, onTouchMove, onTouchEnd, touchDelta } = useSwipe(() => onDelete(item.id), undefined, 100);

  // Cap the visual offset
  const offset = Math.min(Math.max(touchDelta, 0), 100);

  return (
    <div className="relative overflow-hidden mb-2 rounded-xl">
      {/* Background Actions */}
      <div className="absolute inset-y-0 right-0 w-24 bg-red-500 flex items-center justify-center text-white font-bold text-xs rounded-r-xl z-0">
        SLETT
      </div>

      {/* Foreground Content */}
      <div
        className={`bg-surface flex items-center shadow-sm border border-primary relative z-10 transition-transform duration-75 active:bg-primary`}
        style={{ transform: `translateX(-${offset}px)` }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onClick={() => onToggle(item.id)}
      >
        <div className="p-4 flex items-center gap-3 flex-1 min-w-0">
          <div
            className={`w-6 h-6 rounded-full border-2 flex items-center justify-center cursor-pointer transition-all flex-shrink-0 ${item.isBought
              ? 'bg-green-500 border-green-500 scale-105 shadow-lg shadow-green-100/20'
              : 'border-secondary/30'
              }`}
          >
            {item.isBought && <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>}
          </div>
          <div className="flex-1 truncate">
            <span className={`font-medium text-primary ${item.isBought ? 'line-through text-secondary/30' : ''}`}>
              {item.name}
            </span>
            {item.quantity > 1 && (
              <span className={`text-xs ml-2 font-bold ${item.isBought ? 'text-secondary/20' : 'text-secondary/60'}`}>x{item.quantity}</span>
            )}
          </div>
          <div className={`text-[10px] font-black tracking-widest uppercase transition-opacity ${item.isBought ? 'opacity-30' : 'text-secondary/50'}`}>
            {item.category === 'Annet' ? '' : item.category}
          </div>
        </div>
      </div>
    </div>
  );
};

const StoreView: React.FC<StoreViewProps> = ({ items, updateItem: updateItemHook, removeItem: removeItemHook, onReset, onComplete, onSaveSession, categoryOrder, lastShopperEmail }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [completionResult, setCompletionResult] = useState<CompleteTripResult | null>(null);
  const [storeName, setStoreName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const { addOrUpdateProduct } = useCatalog();
  const { addToast } = useToast();

  const toggleBought = async (id: string) => {
    const item = items.find(i => i.id === id);
    if (!item) return;
    const newStatus = !item.isBought;
    // If marking as bought, update global price intelligence
    if (newStatus === true) {
      addOrUpdateProduct(item.name, item.price, item.category);
    }
    haptics.medium();
    await updateItemHook(id, { isBought: newStatus });
  };

  const handleReset = async () => {
    const hasBoughtItems = items.some(i => i.isBought);
    if (!hasBoughtItems || isResetting) return;

    if (window.confirm('Vil du nullstille hele listen? Alle lister blir markert som "ukjøpt".')) {
      setIsResetting(true);
      const success = await onReset();
      setIsResetting(false);

      if (success) {
        addToast("Listen er nullstilt", "success");
        haptics.warning();
      } else {
        addToast("Kunne ikke nullstille listen", "error");
      }
    }
  };

  const deleteItem = async (id: string) => {
    if (window.confirm('Slette denne varen?')) {
      haptics.warning();
      await removeItemHook(id);
    }
  };

  // Open completion modal
  const handleComplete = () => {
    const result = onComplete();
    setCompletionResult(result);
    setShowCompletionModal(true);
  };

  // Save session and reset list
  const handleSaveAndReset = async () => {
    if (!completionResult?.session) return;

    setIsSaving(true);
    try {
      await onSaveSession(completionResult.session.listId, completionResult.session);
      await onReset();
      setShowCompletionModal(false);
      setCompletionResult(null);
      setStoreName('');
      addToast('Handelen er lagret! 🎉', 'success');
      haptics.success();
    } catch (error) {
      console.error('Failed to save session:', error);
      addToast('Kunne ikke lagre handelen', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const totalItems = items.length;
  const boughtItems = items.filter(i => i.isBought).length;
  const progress = totalItems === 0 ? 0 : (boughtItems / totalItems) * 100;

  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const activeItems = filteredItems.filter(i => !i.isBought);
  const completedItems = filteredItems.filter(i => i.isBought);

  // Smart Sort: Use learned categoryOrder if available, fallback to default CATEGORIES
  const effectiveCategoryOrder = categoryOrder && categoryOrder.length > 0
    ? [...categoryOrder, ...CATEGORIES.filter(c => !categoryOrder.includes(c))]
    : CATEGORIES;

  // Group active items by category using learned order
  const groupedActive = effectiveCategoryOrder.map(cat => ({
    name: cat,
    items: activeItems.filter(i => (i.category || 'Annet') === cat)
  })).filter(g => g.items.length > 0);

  // Handle items with unknown categories
  const knownCategories = new Set(effectiveCategoryOrder);
  const unknownCategoryItems = activeItems.filter(i => !knownCategories.has(i.category || 'Annet'));

  if (unknownCategoryItems.length > 0) {
    groupedActive.push({ name: 'Annet', items: unknownCategoryItems });
  }

  const isSmartSorted = categoryOrder && categoryOrder.length > 0;

  return (
    <div className="space-y-6 pb-12 animate-in fade-in slide-in-from-bottom-2">
      {/* Sticky Summary, Progress, and Search Header */}
      {items.length > 0 && (
        <div className="sticky top-0 z-10 -mx-4 px-4 pt-2 pb-4 bg-primary/95 backdrop-blur-md space-y-3 shadow-sm border-b border-primary/50">
          {/* Progress Bar & Search Input Container */}
          <div className="space-y-3">
            <div className="flex justify-between items-end text-xs font-black text-secondary uppercase tracking-widest px-1">
              <div className="flex flex-col gap-1">
                <span>{boughtItems} av {totalItems} handlet</span>
                <span className="text-accent-primary">{Math.round(progress)}% fullført</span>
              </div>
              {boughtItems > 0 && (
                <button
                  onClick={handleReset}
                  disabled={isResetting}
                  className="bg-surface border-2 border-primary px-3 py-1.5 rounded-lg text-[9px] hover:bg-primary active:scale-95 transition-all flex items-center gap-1.5 text-secondary"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" /><path d="M21 3v5h-5" /><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" /><path d="M3 21v-5h5" /></svg>
                  {isResetting ? 'Nullstiller...' : 'Nullstill'}
                </button>
              )}
            </div>

            <div className="h-3 bg-primary/80 border border-primary rounded-full overflow-hidden">
              <div
                className="h-full bg-accent-primary transition-all duration-500 ease-out shadow-[0_0_10px_rgba(99,102,241,0.5)]"
                style={{ width: `${progress}%` }}
              />
            </div>

            {isSmartSorted && (
              <div className="flex items-center gap-1.5 px-1">
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                  ✨ Optimal rute
                  {lastShopperEmail && (
                    <span className="text-emerald-400 font-normal">• {lastShopperEmail.split('@')[0]}</span>
                  )}
                </span>
              </div>
            )}

            <div className="relative">
              <input
                type="text"
                placeholder="Finn varer..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-surface border-2 border-primary rounded-xl text-sm text-primary placeholder:text-secondary/50 focus:ring-2 focus:ring-accent-primary focus:border-accent-primary outline-none transition-all shadow-sm"
              />
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-secondary/50">
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
              </svg>
            </div>
          </div>
        </div>
      )}

      {/* Shopping List */}
      <div className="space-y-6 pt-2">
        {items.length === 0 && (
          <div className="text-center py-12 opacity-50">
            <p className="text-secondary">Listen er tom</p>
          </div>
        )}

        {/* Active Items Grouped */}
        {groupedActive.map(group => (
          <div key={group.name} className="space-y-2">
            <h3 className="text-xs font-black text-secondary uppercase tracking-widest px-1 sticky top-36 z-0 mix-blend-multiply dark:mix-blend-screen">{group.name}</h3>
            {group.items.map(item => (
              <SwipeableItem
                key={item.id}
                item={item}
                onToggle={toggleBought}
                onDelete={deleteItem}
              />
            ))}
          </div>
        ))}

        {/* Completed Items */}
        {completedItems.length > 0 && (
          <div className="pt-8 border-t border-primary border-dashed">
            <h3 className="text-xs font-black text-secondary uppercase tracking-widest px-1 mb-3">Ferdig handlet</h3>
            <div className="space-y-2 opacity-60 grayscale transition-all hover:grayscale-0 hover:opacity-100">
              {completedItems.map(item => (
                <SwipeableItem
                  key={item.id}
                  item={item}
                  onToggle={toggleBought}
                  onDelete={deleteItem}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Floating Complete Button */}
      {boughtItems > 0 && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50">
          <button
            onClick={handleComplete}
            className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold py-3.5 px-8 rounded-full shadow-xl shadow-emerald-500/30 flex items-center gap-2 hover:shadow-2xl hover:scale-105 active:scale-95 transition-all"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Fullført
          </button>
        </div>
      )}

      {/* Completion Modal */}
      {showCompletionModal && completionResult && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-surface rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-5 animate-in zoom-in-95">
            <div className="text-center">
              <div className="text-5xl mb-3">🎉</div>
              <h2 className="text-xl font-black text-primary">Handel fullført!</h2>
              <p className="text-secondary text-sm mt-1">
                {completionResult.session?.items.length || 0} varer handlet
              </p>
            </div>

            {/* Missed Items Warning */}
            {completionResult.missedItems.length > 0 && (
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-2xl p-4">
                <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-bold text-sm mb-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                  {completionResult.missedItems.length} varer ikke kjøpt
                </div>
                <ul className="text-xs text-amber-600 dark:text-amber-300 space-y-1 max-h-24 overflow-auto">
                  {completionResult.missedItems.map(item => (
                    <li key={item.id}>• {item.name}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Optional Store Name */}
            <div>
              <label className="text-xs font-bold text-secondary uppercase tracking-wide block mb-2">
                Butikk (valgfritt)
              </label>
              <input
                type="text"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                placeholder="F.eks. Rema 1000, Kiwi..."
                className="w-full px-4 py-3 bg-primary border-2 border-primary rounded-xl text-primary placeholder:text-secondary/40 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              />
            </div>

            {/* Total */}
            <div className="flex justify-between items-center py-3 border-t border-b border-primary">
              <span className="text-secondary font-medium">Totalt brukt</span>
              <span className="text-2xl font-black text-primary">
                {(completionResult.session?.totalSpent || 0).toFixed(0)} kr
              </span>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowCompletionModal(false);
                  setCompletionResult(null);
                }}
                className="flex-1 py-3 px-4 border-2 border-primary rounded-xl font-bold text-secondary hover:bg-primary transition-colors"
              >
                Avbryt
              </button>
              <button
                onClick={handleSaveAndReset}
                disabled={isSaving}
                className="flex-1 py-3 px-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold rounded-xl shadow-lg hover:shadow-xl active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {isSaving ? 'Lagrer...' : 'Lagre & Nullstill'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StoreView;
