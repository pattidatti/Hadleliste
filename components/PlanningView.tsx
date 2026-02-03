
import React, { useState, useRef } from 'react';
import { ShoppingItem } from '../types';
import { getSmartCategorization, parseReceiptPrices } from '../services/geminiService';
import { CATEGORIES, CATALOG } from '../constants/commonItems';

interface PlanningViewProps {
  items: ShoppingItem[];
  setItems: (items: ShoppingItem[]) => void;
}

const PlanningView: React.FC<PlanningViewProps> = ({ items, setItems }) => {
  const [newItemName, setNewItemName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<string[]>(["Basisvarer"]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addItem = async (name: string) => {
    if (!name.trim() || isLoading) return;

    if (items.some(i => i.name.toLowerCase() === name.toLowerCase())) return;

    setIsLoading(true);
    const category = await getSmartCategorization(name);

    const newItem: ShoppingItem = {
      id: crypto.randomUUID(),
      name: name.trim(),
      quantity: 1,
      unit: 'stk',
      price: 0,
      category,
      isBought: false,
      createdAt: Date.now()
    };

    setItems([newItem, ...items]);
    setNewItemName('');
    setIsLoading(false);
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
            // Simple matching: find if the scanned name contains our item name or vice versa
            const match = scannedResults.find(res =>
              res.name.toLowerCase().includes(item.name.toLowerCase()) ||
              item.name.toLowerCase().includes(res.name.toLowerCase())
            );

            if (match) {
              updatedCount++;
              return { ...item, price: match.price };
            }
            return item;
          });

          setItems(newItems);
          alert(`Oppdaterte priser for ${updatedCount} varer fra kvitteringen.`);
        } else {
          alert("Klarte ikke å lese priser fra kvitteringen. Prøv et tydeligere bilde.");
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

  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const updateItem = (id: string, updates: Partial<ShoppingItem>) => {
    setItems(items.map(item => item.id === id ? { ...item, ...updates } : item));
  };

  const totalPrice = items.reduce((acc, item) => acc + (item.price * item.quantity), 0);

  const activeGrouped = CATEGORIES.map(cat => ({
    name: cat,
    items: items.filter(i => i.category === cat)
  })).filter(group => group.items.length > 0);

  return (
    <div className="space-y-8 pb-32 animate-in fade-in slide-in-from-bottom-2">

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

      {/* Search & Add Bar */}
      <div className="sticky top-[148px] z-10 -mx-4 px-4 py-2 bg-slate-50/90 backdrop-blur-sm">
        <div className="flex gap-2">
          <form onSubmit={(e) => { e.preventDefault(); addItem(newItemName); }} className="relative flex-1">
            <input
              type="text"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              placeholder="Søk eller legg til ny vare..."
              className="w-full pl-4 pr-12 py-3.5 bg-white border border-slate-200 rounded-2xl shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none text-sm"
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
          </form>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-3.5 bg-white border border-slate-200 rounded-2xl shadow-sm text-indigo-600 hover:bg-indigo-50 active:scale-95 transition-all"
            title="Skann kvittering for å oppdatere priser"
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
      </div>

      {/* ACTIVE SHOPPING LIST */}
      <section className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Valgte varer</h2>
          <span className="text-xs font-medium text-slate-400">{items.length} varer</span>
        </div>

        {items.length === 0 ? (
          <div className="py-12 text-center bg-white/50 rounded-3xl border border-dashed border-slate-200">
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
                      <div className="flex-1 relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[9px] font-bold text-slate-400 uppercase">kr</span>
                        <input
                          type="number"
                          placeholder="0.00"
                          value={item.price || ''}
                          onChange={(e) => updateItem(item.id, { price: parseFloat(e.target.value) || 0 })}
                          className="w-full pl-7 pr-3 py-1.5 bg-slate-50 border-none rounded-xl text-xs font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
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
          {CATALOG.map(cat => (
            <div key={cat.name} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <button
                onClick={() => toggleCategory(cat.name)}
                className="w-full px-4 py-3.5 flex items-center justify-between text-left active:bg-slate-50 transition-colors"
              >
                <span className="text-sm font-bold text-slate-700">{cat.name}</span>
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
                  {cat.items.map(itemName => {
                    const isAdded = items.some(i => i.name.toLowerCase() === itemName.toLowerCase());
                    return (
                      <button
                        key={itemName}
                        onClick={() => addItem(itemName)}
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
                        {itemName}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
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
