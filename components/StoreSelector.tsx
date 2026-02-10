import React, { useState, useEffect } from 'react';
import { Store } from '../types';
import { useStores } from '../hooks/useStores';

interface StoreSelectorProps {
    onSelect: (store: Store) => void;
    activeStoreId?: string;
    variant?: 'default' | 'minimal' | 'completion';
}

export const StoreSelector: React.FC<StoreSelectorProps> = ({ onSelect, activeStoreId, variant = 'default' }) => {
    const { myStores, allStores, searchStores, createStore, loading, getStore, updateMyLayout } = useStores();
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [fetchedActiveStore, setFetchedActiveStore] = useState<Store | null>(null);
    const [isCreating, setIsCreating] = useState(false);


    // Active store details (check myStores first, then fetched)
    const activeStore = myStores.find(s => s.id === activeStoreId) || fetchedActiveStore;

    // Fetch active store if we don't have it (e.g. shared list context)
    useEffect(() => {
        if (activeStoreId && !myStores.find(s => s.id === activeStoreId)) {
            const fetchIt = async () => {
                const s = await getStore(activeStoreId);
                if (s) setFetchedActiveStore(s);
            };
            fetchIt();
        }
    }, [activeStoreId, myStores, getStore]);

    // Sync search term with active store for completion variant
    useEffect(() => {
        if (variant === 'completion' && activeStoreId) {
            const s = myStores.find(s => s.id === activeStoreId);
            if (s) setSearchTerm(s.name);
        }
    }, [activeStoreId, myStores, variant]);

    // Filter and Sort Logic
    const filteredGlobal = allStores.filter(s =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleSelect = async (store: Store) => {
        // Ensure user has a personal connection (layout) to this store
        // so it shows up in "Sist brukte" next time.
        await updateMyLayout(store.id, store.defaultCategoryOrder || []);

        onSelect(store);
        setIsOpen(false);
        if (variant === 'completion') {
            setSearchTerm(store.name);
        }
    };


    if (variant === 'completion') {
        // Minimal embedded version for the completion modal
        return (
            <div className="space-y-3">
                <div className="relative">
                    <input
                        type="text"
                        placeholder="Butikknavn (f.eks. Rema 1000)"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onFocus={() => {
                            setIsOpen(true);
                            setActiveTab('mine');
                        }}
                        className="w-full px-4 py-3 bg-primary border-2 border-primary rounded-xl text-primary placeholder:text-secondary/40 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none font-bold"
                    />
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="absolute right-4 top-1/2 -translate-y-1/2 text-secondary/50">
                        <path d="m21 21-4.3-4.3" /><circle cx="11" cy="11" r="8" />
                    </svg>
                </div>

                {isOpen && (
                    <div className="bg-surface border border-primary/20 rounded-xl shadow-lg overflow-hidden animate-in fade-in zoom-in-95 max-h-60 overflow-y-auto">
                        {/* Unified Searchable List */}
                        <div className="p-2 space-y-2">
                            {/* Current / Recent Stores */}
                            {myStores.length > 0 && searchTerm === '' && (
                                <div className="space-y-1">
                                    <div className="text-[10px] uppercase font-black text-secondary tracking-widest px-2 py-1">Sist brukte</div>
                                    {myStores.map(store => (
                                        <button key={store.id} onClick={() => handleSelect(store)} className="w-full text-left px-3 py-2 hover:bg-primary rounded-lg flex items-center gap-3 transition-colors">
                                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: store.color || '#ccc' }} />
                                            <span className="font-bold text-sm text-primary">{store.name}</span>
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* All Stores / Global Search Results */}
                            <div className="space-y-1">
                                <div className="text-[10px] uppercase font-black text-secondary tracking-widest px-2 py-1">
                                    {searchTerm ? 'Søkeresultater' : 'Alle butikker'}
                                </div>

                                {filteredGlobal.length > 0 ? (
                                    filteredGlobal
                                        .filter(s => !myStores.find(ms => ms.id === s.id) || searchTerm !== '') // Show all in search, or non-recents in browse
                                        .map(store => (
                                            <button key={store.id} onClick={() => handleSelect(store)} className="w-full text-left px-3 py-2 hover:bg-primary rounded-lg flex items-center gap-3 transition-colors opacity-90 hover:opacity-100">
                                                {!searchTerm && <div className="w-2 h-2 rounded-full opacity-30" style={{ backgroundColor: store.color || '#ccc' }} />}
                                                {searchTerm && <div className="w-2 h-2 rounded-full" style={{ backgroundColor: store.color || '#ccc' }} />}
                                                <span className={`${searchTerm ? 'font-bold' : 'font-medium'} text-sm text-primary`}>{store.name}</span>
                                            </button>
                                        ))
                                ) : searchTerm.length >= 2 ? (
                                    <button onClick={() => createStore(searchTerm).then(s => s && handleSelect(s))} disabled={isCreating} className="w-full text-left px-3 py-3 bg-emerald-500/5 text-emerald-600 hover:bg-emerald-500/10 rounded-xl flex items-center gap-3 font-black text-sm transition-all animate-in slide-in-from-top-1">
                                        <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                                        </div>
                                        <div>
                                            <div>Opprett "{searchTerm}"</div>
                                            <div className="text-[9px] opacity-70 font-bold uppercase tracking-tighter">Finner ikke butikken i oversikten</div>
                                        </div>
                                    </button>
                                ) : (
                                    <div className="p-4 text-center text-xs text-secondary opacity-50 font-medium italic">
                                        Ingen treff i databasen...
                                    </div>
                                )}
                            </div>
                        </div>

                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="relative z-50">
            {/* TRIGGER */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`
                    relative group flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all duration-300 w-full text-left
                    ${isOpen ? 'bg-surface border-primary ring-2 ring-accent-primary/20' : 'bg-surface border-primary/50 hover:border-primary shadow-sm hover:shadow-md'}
                `}
            >
                {activeStore ? (
                    <>
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center shadow-sm" style={{ backgroundColor: activeStore.color || '#e2e8f0' }}>
                            <span className="text-xs font-black opacity-50">{activeStore.name.slice(0, 1).toUpperCase()}</span>
                        </div>
                        <div className="flex-1">
                            <div className="text-[9px] font-bold text-secondary uppercase tracking-widest leading-none mb-1">Planlegger for</div>
                            <div className="font-bold text-primary text-sm leading-none">{activeStore.name}</div>
                        </div>
                    </>
                ) : (
                    <>
                        <div className="w-8 h-8 rounded-xl bg-primary/50 flex items-center justify-center border border-dashed border-secondary/30">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-secondary"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
                        </div>
                        <div className="flex-1">
                            <div className="text-[9px] font-bold text-secondary uppercase tracking-widest leading-none mb-1">Planlegger for</div>
                            <div className="font-bold text-primary text-sm leading-none opacity-50">Ingen butikk valgt</div>
                        </div>
                    </>
                )}

                <div className="absolute right-4 top-1/2 -translate-y-1/2 transition-transform duration-300 group-hover:translate-y-[-40%]">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`text-secondary ${isOpen ? 'rotate-180' : ''}`}><path d="m6 9 6 6 6-6" /></svg>
                </div>
            </button>

            {/* POPOVER */}
            {isOpen && (
                <>
                    <div className="fixed inset-0 z-40 bg-black/5 backdrop-blur-[1px]" onClick={() => setIsOpen(false)} />
                    <div className="absolute top-full left-0 right-0 mt-2 bg-surface rounded-2xl shadow-2xl border border-primary/20 z-50 overflow-hidden animate-in fade-in zoom-in-95 origin-top">

                        {/* SEARCH INPUT */}
                        <div className="p-2 pb-0">
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Søk eller velg butikk..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    autoFocus
                                    className="w-full pl-10 pr-4 py-3 bg-primary/50 rounded-xl text-sm font-bold text-primary placeholder:text-secondary/40 border-none outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                                />
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary/50">
                                    <path d="m21 21-4.3-4.3" /><circle cx="11" cy="11" r="8" />
                                </svg>
                            </div>
                        </div>

                        {/* LIST AREA */}
                        <div className="max-h-80 overflow-y-auto px-1 pb-2 scrollbar-hide">
                            {/* Current Active Highlight */}
                            {activeStore && !searchTerm && (
                                <div className="p-1">
                                    <div className="text-[10px] uppercase font-black text-emerald-500 tracking-widest px-3 py-1">Aktiv nå</div>
                                    <div className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-emerald-500/5 ring-1 ring-emerald-500/20">
                                        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black shadow-sm" style={{ backgroundColor: activeStore.color || '#ccc' }}>
                                            {activeStore.name.slice(0, 1).toUpperCase()}
                                        </div>
                                        <div className="flex-1">
                                            <div className="text-sm font-black text-emerald-700">{activeStore.name}</div>
                                        </div>
                                        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                                    </div>
                                </div>
                            )}

                            {/* Recent Stores */}
                            {myStores.filter(s => s.id !== activeStoreId).length > 0 && !searchTerm && (
                                <div className="p-1">
                                    <div className="text-[10px] uppercase font-black text-secondary tracking-widest px-3 py-1 opacity-70">Ofte besøkt</div>
                                    {myStores.filter(s => s.id !== activeStoreId).map(store => (
                                        <button
                                            key={store.id}
                                            onClick={() => handleSelect(store)}
                                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-primary transition-all group"
                                        >
                                            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black shadow-sm opacity-80 group-hover:opacity-100 transition-opacity" style={{ backgroundColor: store.color }}>
                                                {store.name.slice(0, 1).toUpperCase()}
                                            </div>
                                            <div className="text-left flex-1">
                                                <div className="text-sm font-bold text-primary group-hover:text-emerald-600 transition-colors">{store.name}</div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Global / Other Stores */}
                            <div className="p-1">
                                {(!searchTerm && allStores.length > 0) && (
                                    <div className="text-[10px] uppercase font-black text-secondary tracking-widest px-3 py-1 opacity-50">Alle butikker</div>
                                )}

                                {searchTerm && (
                                    <div className="text-[10px] uppercase font-black text-secondary tracking-widest px-3 py-1">Søkeresultater</div>
                                )}

                                {filteredGlobal
                                    .filter(s => s.id !== activeStoreId && (searchTerm || !myStores.find(ms => ms.id === s.id)))
                                    .map(store => (
                                        <button
                                            key={store.id}
                                            onClick={() => handleSelect(store)}
                                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-primary transition-all group"
                                        >
                                            <div className="w-8 h-8 rounded-lg bg-primary/50 flex items-center justify-center text-xs font-black shadow-sm group-hover:bg-primary transition-colors" style={{ backgroundColor: searchTerm ? store.color : undefined }}>
                                                {store.name.slice(0, 1).toUpperCase()}
                                            </div>
                                            <div className="text-left flex-1">
                                                <div className="text-sm font-bold text-primary">{store.name}</div>
                                            </div>
                                        </button>
                                    ))
                                }

                                {/* Empty / Create State */}
                                {searchTerm && filteredGlobal.length === 0 && (
                                    <button
                                        onClick={() => createStore(searchTerm).then(s => s && handleSelect(s))}
                                        disabled={isCreating}
                                        className="w-full flex items-center gap-4 px-3 py-4 rounded-2xl bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 transition-all border-2 border-dashed border-emerald-500/20"
                                    >
                                        <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14m-7-7v14" /></svg>
                                        </div>
                                        <div className="text-left">
                                            <div className="text-sm font-black">Opprett "{searchTerm}"</div>
                                            <div className="text-[10px] font-bold uppercase tracking-tighter opacity-70">Finner ikke butikken i listen</div>
                                        </div>
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </>

            )}
        </div>
    );
};
