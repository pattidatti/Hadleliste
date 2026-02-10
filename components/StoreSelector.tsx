import React, { useState, useEffect } from 'react';
import { Store } from '../types';
import { useStores } from '../hooks/useStores';

interface StoreSelectorProps {
    onSelect: (store: Store) => void;
    activeStoreId?: string;
    variant?: 'default' | 'minimal' | 'completion';
}

export const StoreSelector: React.FC<StoreSelectorProps> = ({ onSelect, activeStoreId, variant = 'default' }) => {
    const { myStores, searchStores, createStore, loading, getStore } = useStores();
    const [isOpen, setIsOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'mine' | 'all'>('mine');
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<Store[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [fetchedActiveStore, setFetchedActiveStore] = useState<Store | null>(null);

    // Active store details (check myStores first, then fetched)
    const activeStore = myStores.find(s => s.id === activeStoreId) || fetchedActiveStore;

    // Fetch active store if we don't have it (e.g. shared list context)
    useEffect(() => {
        console.log("DEBUG: StoreSelector Effect. ActiveStoreId:", activeStoreId, "Found locally:", !!myStores.find(s => s.id === activeStoreId));

        if (activeStoreId && !myStores.find(s => s.id === activeStoreId)) {
            console.log("DEBUG: StoreSelector fetching missing store:", activeStoreId);
            const fetchIt = async () => {
                const s = await getStore(activeStoreId);
                console.log("DEBUG: StoreSelector fetched:", s);
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

    // Debounced search active
    // Debounced search active - NOW enabled for 'mine' tab too (as fallback)
    useEffect(() => {
        if (searchTerm.length >= 2) {
            const timer = setTimeout(async () => {
                setIsSearching(true);
                const results = await searchStores(searchTerm);
                setSearchResults(results);
                setIsSearching(false);
            }, 300);
            return () => clearTimeout(timer);
        } else {
            setSearchResults([]);
        }
    }, [searchTerm, activeTab]);

    const handleCreate = async () => {
        if (!searchTerm.trim()) return;
        setIsCreating(true);
        const newStore = await createStore(searchTerm);
        setIsCreating(false);

        if (newStore) {
            handleSelect(newStore);
        }
    };

    const handleSelect = (store: Store) => {
        onSelect(store);
        setIsOpen(false);
        // For completion variant, keep the selected name in the input
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
                        {myStores.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase())).length > 0 && (
                            <div className="p-2">
                                <div className="text-[10px] uppercase font-black text-secondary tracking-widest px-2 mb-1">Dine butikker</div>
                                {myStores.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase())).map(store => (
                                    <button key={store.id} onClick={() => handleSelect(store)} className="w-full text-left px-3 py-2 hover:bg-primary rounded-lg flex items-center gap-3 group">
                                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: store.color || '#ccc' }} />
                                        <span className="font-bold text-sm text-primary group-hover:text-accent-primary transition-colors">{store.name}</span>
                                    </button>
                                ))}
                            </div>
                        )}

                        {searchTerm.length >= 2 && myStores.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase())).length === 0 && (
                            <div className="p-2 border-t border-primary/10">
                                <div className="text-[10px] uppercase font-black text-secondary tracking-widest px-2 mb-1">Globale treff</div>
                                {isSearching ? (
                                    <div className="p-4 text-center text-xs text-secondary">Leter...</div>
                                ) : searchResults.length > 0 ? (
                                    searchResults.map(store => (
                                        <button key={store.id} onClick={() => handleSelect(store)} className="w-full text-left px-3 py-2 hover:bg-primary rounded-lg flex items-center gap-3">
                                            <span className="font-bold text-sm text-primary">{store.name}</span>
                                        </button>
                                    ))
                                ) : (
                                    <button onClick={handleCreate} disabled={isCreating} className="w-full text-left px-3 py-2 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 rounded-lg flex items-center gap-2 font-bold text-sm">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                                        Opprett "{searchTerm}"
                                    </button>
                                )}
                            </div>
                        )}
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

                        {/* TABS */}
                        <div className="flex p-1 bg-primary/30 m-2 rounded-xl">
                            <button
                                onClick={() => setActiveTab('mine')}
                                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${activeTab === 'mine' ? 'bg-surface shadow-sm text-primary' : 'text-secondary hover:text-primary'}`}
                            >
                                Mine Butikker
                            </button>
                            <button
                                onClick={() => setActiveTab('all')}
                                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${activeTab === 'all' ? 'bg-surface shadow-sm text-primary' : 'text-secondary hover:text-primary'}`}
                            >
                                Søk Globalt
                            </button>
                        </div>

                        {activeTab === 'all' && (
                            <div className="px-3 pb-2">
                                <input
                                    type="text"
                                    placeholder="Søk etter butikk..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    autoFocus
                                    className="w-full px-3 py-2 bg-primary rounded-xl text-sm font-medium border-none outline-none focus:ring-2 focus:ring-accent-primary/20"
                                />
                            </div>
                        )}

                        <div className="max-h-60 overflow-y-auto px-2 pb-2 space-y-1">
                            {activeTab === 'mine' ? (
                                myStores.length > 0 ? (
                                    myStores.map(store => (
                                        <button
                                            key={store.id}
                                            onClick={() => handleSelect(store)}
                                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${activeStoreId === store.id ? 'bg-accent-primary/10 ring-1 ring-accent-primary/50' : 'hover:bg-primary'}`}
                                        >
                                            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black shadow-sm" style={{ backgroundColor: store.color }}>
                                                {store.name.slice(0, 1).toUpperCase()}
                                            </div>
                                            <div className="text-left flex-1">
                                                <div className="text-sm font-bold text-primary">{store.name}</div>
                                                <div className="text-[10px] text-secondary">Din rute lagret</div>
                                            </div>
                                            {activeStoreId === store.id && (
                                                <div className="w-2 h-2 bg-accent-primary rounded-full animate-pulse" />
                                            )}
                                        </button>
                                    ))
                                ) : (
                                    <div className="p-4 text-center text-xs text-secondary">
                                        Du har ingen lagrede butikker ennå.
                                        <br />Søk globalt for å legge til.
                                    </div>
                                )
                            ) : (
                                // GLOBAL SEARCH RESULTS
                                isSearching ? (
                                    <div className="p-4 text-center">
                                        <div className="w-4 h-4 border-2 border-accent-primary border-t-transparent rounded-full animate-spin mx-auto" />
                                    </div>
                                ) : searchResults.length > 0 ? (
                                    searchResults.map(store => (
                                        <button
                                            key={store.id}
                                            onClick={() => handleSelect(store)}
                                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-primary transition-colors"
                                        >
                                            <div className="w-8 h-8 rounded-lg bg-surface border border-primary flex items-center justify-center text-xs font-black">
                                                {store.name.slice(0, 1).toUpperCase()}
                                            </div>
                                            <div className="text-left flex-1">
                                                <div className="text-sm font-bold text-primary">{store.name}</div>
                                                <div className="text-[10px] text-secondary">Global butikk</div>
                                            </div>
                                        </button>
                                    ))
                                ) : searchTerm.length >= 2 ? (
                                    <button
                                        onClick={handleCreate}
                                        disabled={isCreating}
                                        className="w-full flex items-center gap-3 px-3 py-3 rounded-xl bg-emerald-500/5 text-emerald-600 hover:bg-emerald-500/10 transition-colors"
                                    >
                                        <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                                        </div>
                                        <div className="text-left flex-1">
                                            <div className="text-sm font-bold">Opprett ny butikk</div>
                                            <div className="text-[10px] opacity-70">"{searchTerm}"</div>
                                        </div>
                                    </button>
                                ) : (
                                    <div className="p-4 text-center text-xs text-secondary opacity-50">
                                        Skriv minst 2 bokstaver for å søke...
                                    </div>
                                )
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};
