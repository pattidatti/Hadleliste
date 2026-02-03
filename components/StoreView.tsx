import React, { useState } from 'react';
import { ShoppingItem } from '../types';
import { CATEGORIES } from '../constants/commonItems';
import { useSwipe } from '../hooks/useSwipe';
import { haptics } from '../services/haptics';
import { useCatalog } from '../hooks/useCatalog';
import { useToast } from './Toast';

interface StoreViewProps {
  items: ShoppingItem[];
  updateItem: (id: string, updates: Partial<ShoppingItem>) => Promise<void>;
  removeItem: (id: string) => Promise<void>;
  onReset: () => Promise<boolean>;
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
        className={`bg-white flex items-center shadow-sm border border-slate-100 relative z-10 transition-transform duration-75 active:bg-slate-50`}
        style={{ transform: `translateX(-${offset}px)` }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onClick={() => onToggle(item.id)}
      >
        <div className="p-4 flex items-center gap-3 flex-1 min-w-0">
          <div
            className={`w-6 h-6 rounded-full border-2 flex items-center justify-center cursor-pointer transition-all flex-shrink-0 ${item.isBought
              ? 'bg-green-500 border-green-500 scale-105 shadow-lg shadow-green-100'
              : 'border-slate-300'
              }`}
          >
            {item.isBought && <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>}
          </div>
          <div className="flex-1 truncate">
            <span className={`font-medium text-slate-800 ${item.isBought ? 'line-through text-slate-400' : ''}`}>
              {item.name}
            </span>
            {item.quantity > 1 && (
              <span className={`text-xs ml-2 font-bold ${item.isBought ? 'text-slate-300' : 'text-slate-500'}`}>x{item.quantity}</span>
            )}
          </div>
          <div className={`text-[10px] font-black tracking-widest uppercase transition-opacity ${item.isBought ? 'opacity-30' : 'text-slate-400'}`}>
            {item.category === 'Annet' ? '' : item.category}
          </div>
        </div>
      </div>
    </div>
  );
};

const StoreView: React.FC<StoreViewProps> = ({ items, updateItem: updateItemHook, removeItem: removeItemHook, onReset }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isResetting, setIsResetting] = useState(false);
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

  const totalItems = items.length;
  const boughtItems = items.filter(i => i.isBought).length;
  const progress = totalItems === 0 ? 0 : (boughtItems / totalItems) * 100;

  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const activeItems = filteredItems.filter(i => !i.isBought);
  const completedItems = filteredItems.filter(i => i.isBought);

  // Group active items by category
  const groupedActive = CATEGORIES.map(cat => ({
    name: cat,
    items: activeItems.filter(i => (i.category || 'Annet') === cat)
  })).filter(g => g.items.length > 0);

  // Handle items with unknown categories
  const knownCategories = new Set(CATEGORIES);
  const unknownCategoryItems = activeItems.filter(i => !knownCategories.has(i.category || 'Annet'));

  if (unknownCategoryItems.length > 0) {
    groupedActive.push({ name: 'Annet', items: unknownCategoryItems });
  }

  return (
    <div className="space-y-6 pb-12 animate-in fade-in slide-in-from-bottom-2">
      {/* Sticky Summary, Progress, and Search Header */}
      {items.length > 0 && (
        <div className="sticky top-0 z-10 -mx-4 px-4 pt-2 pb-4 bg-slate-50/95 backdrop-blur-md space-y-3 shadow-sm border-b border-slate-200/50">
          {/* Progress Bar & Search Input Container */}
          <div className="space-y-3">
            <div className="flex justify-between items-end text-xs font-black text-slate-500 uppercase tracking-widest px-1">
              <div className="flex flex-col gap-1">
                <span>{boughtItems} av {totalItems} handlet</span>
                <span className="text-indigo-600">{Math.round(progress)}% fullført</span>
              </div>
              {boughtItems > 0 && (
                <button
                  onClick={handleReset}
                  disabled={isResetting}
                  className="bg-white border-2 border-slate-200 px-3 py-1.5 rounded-lg text-[9px] hover:bg-slate-50 active:scale-95 transition-all flex items-center gap-1.5 text-slate-600"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" /><path d="M21 3v5h-5" /><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" /><path d="M3 21v-5h5" /></svg>
                  {isResetting ? 'Nullstiller...' : 'Nullstill'}
                </button>
              )}
            </div>

            <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-500 transition-all duration-500 ease-out shadow-[0_0_10px_rgba(99,102,241,0.5)]"
                style={{ width: `${progress}%` }}
              />
            </div>

            <div className="relative">
              <input
                type="text"
                placeholder="Finn varer..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white border-2 border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all shadow-sm"
              />
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
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
            <p className="text-slate-400">Listen er tom</p>
          </div>
        )}

        {/* Active Items Grouped */}
        {groupedActive.map(group => (
          <div key={group.name} className="space-y-2">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest px-1 sticky top-36 z-0 mix-blend-multiply">{group.name}</h3>
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
          <div className="pt-8 border-t border-slate-200 border-dashed">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest px-1 mb-3">Ferdig handlet</h3>
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
    </div>
  );
};

export default StoreView;
