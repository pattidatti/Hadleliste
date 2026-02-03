
import React, { useState } from 'react';
import { ShoppingItem, CATEGORIES } from '../types';

interface StoreViewProps {
  items: ShoppingItem[];
  setItems: (items: ShoppingItem[]) => void;
}

const StoreView: React.FC<StoreViewProps> = ({ items, setItems }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const toggleBought = (id: string) => {
    setItems(items.map(item => 
      item.id === id ? { ...item, isBought: !item.isBought } : item
    ));
  };

  const boughtCount = items.filter(i => i.isBought).length;
  const progress = items.length > 0 ? (boughtCount / items.length) * 100 : 0;
  const totalPrice = items.reduce((acc, item) => acc + (item.price * item.quantity), 0);

  // Filter items based on search term (only for active items)
  const activeItems = items.filter(i => 
    !i.isBought && i.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const completedItems = items.filter(i => i.isBought);

  const groupedActive = CATEGORIES.map(cat => ({
    name: cat,
    items: activeItems.filter(i => i.category === cat)
  })).filter(group => group.items.length > 0);

  return (
    <div className="space-y-6 pb-12 animate-in fade-in slide-in-from-bottom-2">
      {/* Sticky Summary, Progress, and Search Header */}
      {items.length > 0 && (
        <div className="sticky top-0 z-10 -mx-4 px-4 pt-2 pb-4 bg-slate-50/95 backdrop-blur-md space-y-3 shadow-sm border-b border-slate-200/50">
          {/* Total Price Card */}
          <div className="bg-slate-900 text-white p-5 rounded-3xl shadow-xl flex justify-between items-center overflow-hidden relative">
            <div className="relative z-10">
              <span className="text-slate-400 text-[10px] uppercase font-black tracking-widest block mb-0.5">Totalpris</span>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black">{totalPrice.toLocaleString('no-NO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                <span className="text-sm font-medium text-slate-400">kr</span>
              </div>
            </div>
            <div className="relative z-10 text-right">
               <span className="text-slate-400 text-[10px] uppercase font-black tracking-widest block mb-1">Status</span>
               <span className="px-2.5 py-1 bg-indigo-600 rounded-lg text-xs font-black uppercase tracking-wider">
                {Math.round(progress)}%
               </span>
            </div>
            {/* Decorative background circle */}
            <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-indigo-500/20 rounded-full blur-2xl"></div>
          </div>

          {/* Progress Bar & Search Input Container */}
          <div className="space-y-3">
            <div className="bg-white p-1 rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
               <div className="h-1.5 w-full bg-slate-50 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-indigo-600 transition-all duration-700 ease-out shadow-[0_0_8px_rgba(79,70,229,0.4)]"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {/* Search Input */}
            <div className="relative group">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none group-focus-within:text-indigo-500 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Søk i gjenværende varer..."
                className="w-full pl-10 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none placeholder:text-slate-300 shadow-sm"
              />
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-300 hover:text-slate-500 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Shopping List */}
      <div className="space-y-4 pt-2">
        {items.length === 0 ? (
          <div className="py-20 text-center bg-white/50 rounded-3xl border border-dashed border-slate-200 mx-1">
            <p className="text-slate-500 font-medium text-sm px-6">Listen er tom. Gå til planlegging for å legge til varer!</p>
          </div>
        ) : (
          <>
            {/* Grouped Active Items */}
            {groupedActive.length > 0 ? (
              groupedActive.map(group => (
                <div key={group.name} className="space-y-2">
                  <h3 className="px-1 text-[11px] font-bold text-slate-400 uppercase tracking-widest">{group.name}</h3>
                  {group.items.map(item => (
                    <button
                      key={item.id}
                      onClick={() => toggleBought(item.id)}
                      className="w-full text-left bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 active:scale-[0.98] transition-all hover:border-indigo-100 animate-in slide-in-from-left-2 duration-200"
                    >
                      <div className="w-6 h-6 border-2 border-slate-200 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors">
                        {/* Status Checkbox Placeholder */}
                      </div>
                      <div className="flex-1 flex justify-between items-center">
                        <div>
                          <span className="font-bold text-slate-800 block text-sm">{item.name}</span>
                          <span className="text-xs text-slate-400 font-medium">{item.quantity} stk</span>
                        </div>
                        {item.price > 0 && (
                          <div className="text-right">
                            <span className="text-xs font-black text-slate-600 block">{(item.price * item.quantity).toFixed(0)} kr</span>
                            <span className="text-[9px] text-slate-300 font-bold">à {item.price}</span>
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              ))
            ) : (items.filter(i => !i.isBought).length > 0 && searchTerm) ? (
              <div className="py-12 text-center opacity-50">
                <p className="text-slate-500 text-sm font-medium">Ingen treff på "{searchTerm}"</p>
              </div>
            ) : activeItems.length === 0 && completedItems.length > 0 && !searchTerm ? (
              <div className="py-12 text-center bg-green-50 rounded-3xl border border-dashed border-green-200 animate-in zoom-in-95 mx-1">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 text-green-600 rounded-full mb-3">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                </div>
                <p className="text-green-800 font-bold text-sm">Alt handlet!</p>
                <p className="text-green-600/70 text-xs font-medium">God tur hjem!</p>
              </div>
            ) : null}

            {/* Completed Section */}
            {completedItems.length > 0 && (
              <div className={`pt-6 border-t border-slate-200 mt-8 transition-opacity duration-300 ${searchTerm ? 'opacity-30 pointer-events-none' : 'opacity-60'}`}>
                <h3 className="px-1 mb-3 text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                  Handlet ({completedItems.length})
                </h3>
                <div className="space-y-2">
                  {completedItems.map(item => (
                    <button
                      key={item.id}
                      onClick={() => toggleBought(item.id)}
                      className="w-full text-left bg-slate-100 p-3 rounded-xl border border-slate-200 flex items-center gap-4 transition-all"
                    >
                      <div className="w-5 h-5 bg-green-500 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                      </div>
                      <span className="font-medium text-slate-500 line-through decoration-slate-400 text-sm">{item.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default StoreView;
