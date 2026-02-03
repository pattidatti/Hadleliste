import React, { useState, useRef } from 'react';
import { ShoppingItem } from '../types';
import { getSmartCategorization, parseReceiptPrices } from '../services/geminiService';
import { CATEGORIES } from '../constants/commonItems';
import { useToast } from './Toast';
import CatalogMigration from './CatalogMigration';
import { useCatalog } from '../hooks/useCatalog';


interface PlanningViewProps {
  items: ShoppingItem[];
  addItem: (item: Omit<ShoppingItem, 'id' | 'createdAt'>) => Promise<void>;
  updateItem: (id: string, updates: Partial<ShoppingItem>) => Promise<void>;
  removeItem: (id: string) => Promise<void>;
}

const PlanningView: React.FC<PlanningViewProps> = ({ items, addItem: addItemHook, updateItem: updateItemHook, removeItem: removeItemHook }) => {
  const [newItemName, setNewItemName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<string[]>(["Basisvarer"]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const { addToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Hook for Global Catalog
  const { products, getProduct, addOrUpdateProduct } = useCatalog();

  const addItem = async (name: string) => {
    const trimmedName = name.trim();
    if (!trimmedName || isLoading) return;

    if (items.some(i => i.name.toLowerCase() === trimmedName.toLowerCase())) {
      addToast(`${trimmedName} er allerede i listen`, 'info');
      return;
    }

    // 1. Check Global Catalog first (Fast Path)
    const existingProduct = getProduct(trimmedName);

    if (existingProduct) {
      const newItem: ShoppingItem = {
        id: crypto.randomUUID(),
        name: existingProduct.name, // Use canonical name
        quantity: 1,
        unit: existingProduct.unit || 'stk',
        price: existingProduct.price || 0,
        category: existingProduct.category,
        isBought: false,
        createdAt: Date.now()
      };

      await addItemHook(newItem);
      setNewItemName('');
      addToast(`La til ${existingProduct.name}`, 'success');

      // Update popularity in background
      addOrUpdateProduct(existingProduct.name);
    } else {
      // 2. AI Fallback (Slow Path)
      setIsLoading(true);
      try {
        const category = await getSmartCategorization(trimmedName);

        // Save to global catalog immediately for next time
        await addOrUpdateProduct(trimmedName, 0, category);

        const newItem: ShoppingItem = {
          id: crypto.randomUUID(),
          name: trimmedName,
          quantity: 1,
          unit: 'stk',
          price: 0,
          category,
          isBought: false,
          createdAt: Date.now()
        };

        await addItemHook(newItem);
        setNewItemName('');
        addToast(`La til ${trimmedName}`, 'success');
      } catch (error) {
        console.error(error);
        addToast("Feil ved kategorisering", 'error');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleScanReceipt = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsScanning(true);

    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = (reader.result as string).split(',')[1];
        const scannedResults = await parseReceiptPrices(base64String);

        if (scannedResults.length > 0) {
          let updatedCount = 0;
          const newItems = items.map(item => {
            // Fuzzy matching
            const match = scannedResults.find(res =>
              res.name.toLowerCase().includes(item.name.toLowerCase()) ||
              item.name.toLowerCase().includes(res.name.toLowerCase())
            );

            if (match) {
              updatedCount++;
              // Also update the Global Catalog with this new price!
              addOrUpdateProduct(item.name, match.price);
              return { ...item, price: match.price };
            }
            return item;
          });

          // Note: Scan receipt still uses a bulk approach conceptually, 
          // but we should probably update items one by one or keep it as is if it's rare.
          // For now, let's update individual items that changed.
          for (const item of newItems) {
            const original = items.find(i => i.id === item.id);
            if (original && original.price !== item.price) {
              await updateItemHook(item.id, { price: item.price });
            }
          }
          addToast(`Oppdaterte priser fra kvitteringen.`, 'success');
        } else {
          addToast("Klarte ikke å lese priser fra kvitteringen. Prøv et tydeligere bilde.", 'error');
        }
        setIsScanning(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error(error);
      setIsScanning(false);
    }
  };

  const toggleCategory = (catName: string) => {
    setExpandedCategories(prev =>
      prev.includes(catName) ? prev.filter(c => c !== catName) : [...prev, catName]
    );
  };

  const removeItem = async (id: string) => {
    await removeItemHook(id);
  };

  const updateItem = async (id: string, updates: Partial<ShoppingItem>) => {
    // If user manually updates price, sync to global catalog
    if (updates.price !== undefined) {
      const item = items.find(i => i.id === id);
      if (item) {
        addOrUpdateProduct(item.name, updates.price);
      }
    }
    await updateItemHook(id, updates);
  };

  const totalPrice = items.reduce((acc, item) => acc + (item.price * item.quantity), 0);

  const activeGrouped = CATEGORIES.map(cat => ({
    name: cat,
    items: items.filter(i => i.category === cat)
  })).filter(group => group.items.length > 0);

  // Group GLOBAL products for the catalog view
  const catalogGrouped = CATEGORIES.map(cat => ({
    name: cat,
    items: products.filter(p => p.category === cat)
  }));
  // Add "Annet" for anything else
  const otherItems = products.filter(p => !CATEGORIES.includes(p.category));
  if (otherItems.length > 0) {
    catalogGrouped.push({ name: 'Annet', items: otherItems });
  }

  const suggestions = newItemName.length >= 2 ? products
    .filter(p => !p.deleted && p.name.toLowerCase().includes(newItemName.toLowerCase()))
    .slice(0, 5) : [];

  return (
    <div className="flex flex-col gap-8 pb-32">
      <CatalogMigration />

      {/* Search & Add Bar */}
      <section className="w-full relative z-10">
        <div className="flex gap-2">
          <form onSubmit={(e) => { e.preventDefault(); addItem(newItemName); setShowSuggestions(false); }} className="relative flex-1">
            <input
              type="text"
              value={newItemName}
              onChange={(e) => {
                setNewItemName(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => {
                // Delay hiding suggestions to allow for clicks
                setTimeout(() => setShowSuggestions(false), 200);
              }}
              placeholder="Søk eller legg til ny vare..."
              className="w-full pl-4 pr-12 py-3.5 bg-white border border-slate-200 rounded-2xl shadow-sm focus:ring-2 focus:ring-indigo-500 transition-all outline-none text-sm font-medium"
            />
            <button
              type="submit"
              disabled={!newItemName.trim() || isLoading}
              className="absolute right-1.5 top-1.5 bottom-1.5 px-3 bg-indigo-600 text-white rounded-xl font-bold active:scale-95 transition-transform disabled:opacity-50"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="M12 5v14" /></svg>
              )}
            </button>

            {/* Floating Suggestions Dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-2 bg-white/80 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="py-1">
                  {suggestions.map(product => (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => {
                        addItem(product.name);
                        setShowSuggestions(false);
                      }}
                      className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors text-left"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 flex items-center justify-center bg-indigo-50 rounded-xl text-indigo-600">
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="M12 5v14" /></svg>
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-800">{product.name}</p>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{product.category}</p>
                        </div>
                      </div>
                      {product.price > 0 && (
                        <span className="text-xs font-black text-indigo-500">{product.price},-</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </form>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-3.5 bg-white border border-slate-200 rounded-2xl shadow-sm text-indigo-600 hover:bg-indigo-50 active:scale-95 transition-all"
            title="Skann kvittering"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg>
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleScanReceipt}
            accept="image/*"
            capture="environment"
            className="hidden"
          />
        </div>
      </section>

      {/* Scanner Overlay */}
      {isScanning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/90 backdrop-blur-md">
          <div className="text-center space-y-6 px-10">
            <div className="relative w-24 h-24 mx-auto">
              <div className="absolute inset-0 border-4 border-indigo-500 rounded-2xl animate-pulse"></div>
              <div className="absolute top-0 left-0 right-0 h-1 bg-indigo-400 shadow-[0_0_15px_rgba(129,140,248,0.8)] animate-[scan_2s_ease-in-out_infinite]"></div>
              <div className="flex items-center justify-center h-full">
                <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg>
              </div>
            </div>
            <div>
              <h3 className="text-white font-bold text-xl mb-2">Leser kvittering...</h3>
              <p className="text-slate-400 text-sm">Gemini analyserer priser og varer for deg.</p>
            </div>
          </div>
          <style>{`
            @keyframes scan {
              0%, 100% { top: 0%; }
              50% { top: 95%; }
            }
          `}</style>
        </div>
      )}

      {/* ACTIVE SHOPPING LIST */}
      <section className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Valgte varer</h2>
          <span className="text-xs font-medium text-slate-400">{items.length} varer</span>
        </div>

        {items.length === 0 ? (
          <div className="py-6 text-center bg-white/50 rounded-3xl border border-dashed border-slate-200">
            <p className="text-slate-400 text-sm font-medium">Ingen varer valgt ennå.<br />Velg fra katalogen under.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {activeGrouped.map(group => (
              <div key={group.name} className="space-y-2">
                <h3 className="px-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">{group.name}</h3>
                {group.items.map(item => (
                  <div key={item.id} className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm animate-in slide-in-from-left-2 duration-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-slate-800 text-sm">{item.name}</span>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="p-1.5 text-slate-300 hover:text-red-500 active:text-red-600 transition-colors"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                      </button>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center bg-slate-50 rounded-xl p-0.5 border border-slate-100">
                        <button
                          onClick={() => updateItem(item.id, { quantity: Math.max(1, item.quantity - 1) })}
                          className="w-7 h-7 flex items-center justify-center text-indigo-600 font-black hover:bg-white rounded-lg transition-colors"
                        >–</button>
                        <span className="w-8 text-center text-xs font-bold text-slate-700">{item.quantity}</span>
                        <button
                          onClick={() => updateItem(item.id, { quantity: item.quantity + 1 })}
                          className="w-7 h-7 flex items-center justify-center text-indigo-600 font-black hover:bg-white rounded-lg transition-colors"
                        >+</button>
                      </div>
                      <div className="flex-1 relative flex items-center gap-2">
                        <div className="relative flex-1">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[9px] font-bold text-slate-400 uppercase">kr</span>
                          <input
                            type="number"
                            placeholder="0.00"
                            value={item.price || ''}
                            onChange={(e) => updateItem(item.id, { price: parseFloat(e.target.value) || 0 })}
                            className="w-full pl-7 pr-3 py-1.5 bg-slate-50 border-none rounded-xl text-xs font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none"
                          />
                        </div>
                        {(item.price || 0) > 0 && (
                          <div className="flex flex-col items-end min-w-[3.5rem]">
                            <span className="text-[9px] font-black text-indigo-400 uppercase leading-none mb-0.5">Total</span>
                            <span className="text-xs font-black text-slate-700 whitespace-nowrap">
                              {(item.price * item.quantity).toFixed(2)} <span className="text-[10px] font-normal text-slate-400 font-sans">kr</span>
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* MASTER CATALOG */}
      <section className="space-y-4 pt-4 border-t border-slate-200">
        <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide px-1">Katalog</h2>

        <div className="space-y-3">
          {catalogGrouped.map(cat => (
            cat.items.length > 0 && (
              <div key={cat.name} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <button
                  onClick={() => toggleCategory(cat.name)}
                  className="w-full px-4 py-3.5 flex items-center justify-between text-left active:bg-slate-50 transition-colors"
                >
                  <span className="text-sm font-bold text-slate-700">{cat.name} <span className="opacity-50 font-normal">({cat.items.length})</span></span>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18" height="18"
                    viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                    strokeLinecap="round" strokeLinejoin="round"
                    className={`text-slate-400 transition-transform duration-300 ${expandedCategories.includes(cat.name) ? 'rotate-180' : ''}`}
                  >
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </button>

                {expandedCategories.includes(cat.name) && (
                  <div className="px-4 pb-4 flex flex-wrap gap-2 animate-in fade-in slide-in-from-top-1">
                    {cat.items.map(product => {
                      const isAdded = items.some(i => i.name.toLowerCase() === product.name.toLowerCase());
                      return (
                        <button
                          key={product.id}
                          onClick={() => addItem(product.name)}
                          disabled={isAdded || isLoading}
                          className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 border ${isAdded
                            ? 'bg-slate-50 border-slate-100 text-slate-300'
                            : 'bg-indigo-50 border-indigo-100 text-indigo-700 active:scale-95 shadow-sm active:shadow-none'
                            }`}
                        >
                          {isAdded ? (
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14" /><path d="M5 12h14" /></svg>
                          )}
                          {product.name}
                          {product.price > 0 && <span className="text-indigo-400 font-normal ml-0.5">{product.price},-</span>}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )
          ))}
        </div>
      </section>

      {/* Sticky Summary Bar */}
      {items.length > 0 && (
        <div className="fixed bottom-6 left-4 right-4 max-w-md mx-auto bg-slate-900 text-white p-4 rounded-3xl shadow-2xl flex justify-between items-center z-30 animate-in slide-in-from-bottom-12">
          <div>
            <span className="text-slate-400 text-[9px] uppercase font-black tracking-widest block mb-0.5">Estimert Total</span>
            <span className="text-xl font-black text-white">{totalPrice.toFixed(2)} <span className="text-xs font-normal text-slate-400">kr</span></span>
          </div>
          <div className="flex flex-col items-end">
            <span className="px-2 py-1 bg-indigo-600 rounded-lg text-[10px] font-black uppercase tracking-wider mb-1">
              {items.length} {items.length === 1 ? 'vare' : 'varer'}
            </span>
            <span className="text-[10px] text-slate-400 font-medium">Klar til å handle?</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlanningView;
