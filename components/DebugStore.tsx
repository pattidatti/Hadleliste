import React, { useState } from 'react';
import { useStores } from '../hooks/useStores';

export const DebugStore: React.FC<{ activeStoreId?: string }> = ({ activeStoreId }) => {
    const { myStores, searchStores, getStore } = useStores();
    const [searchTerm, setSearchTerm] = useState('');
    const [results, setResults] = useState<any[]>([]);
    const [logs, setLogs] = useState<string[]>([]);
    const [fetchedStore, setFetchedStore] = useState<any>(null);

    const log = (msg: string) => setLogs(prev => [msg, ...prev].slice(0, 10));

    const doSearch = async () => {
        log(`Searching: ${searchTerm}`);
        try {
            const res = await searchStores(searchTerm);
            log(`Found: ${res.length}`);
            setResults(res);
        } catch (e: any) {
            log(`Error: ${e.message}`);
        }
    };

    const doFetch = async () => {
        if (!activeStoreId) return log("No Active ID");
        log(`Fetching ${activeStoreId}...`);
        try {
            const s = await getStore(activeStoreId);
            setFetchedStore(s);
            log(s ? `Got: ${s.name}` : "Not Found");
        } catch (e: any) {
            log(`Fetch Error: ${e.message}`);
        }
    };

    return (
        <div className="fixed bottom-4 right-4 bg-black/90 text-white p-4 rounded-lg text-xs z-[100] max-w-[90vw] w-80 max-h-[50vh] overflow-auto shadow-2xl border border-white/20">
            <h3 className="font-bold mb-2 text-emerald-400 flex justify-between">
                STORE DEBUGGER v2
                <button onClick={() => setLogs([])}>CLR</button>
            </h3>

            <div className="mb-2 bg-white/10 p-2 rounded">
                <div><strong>Active ID:</strong> {activeStoreId || 'undefined'}</div>
                <div><strong>Local?</strong> {myStores.find(s => s.id === activeStoreId) ? 'YES' : 'NO'}</div>
                <div><strong>Fetched?</strong> {fetchedStore ? fetchedStore.name : 'NO'}</div>
                <button onClick={doFetch} className="mt-1 bg-blue-500 px-2 py-1 rounded w-full">Force Fetch Active</button>
            </div>

            <div className="mb-2 border-t border-white/20 pt-2">
                <strong>Search Test:</strong>
                <div className="flex gap-2 mt-1">
                    <input
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="text-black px-1 flex-1 rounded"
                        placeholder="Search..."
                    />
                    <button onClick={doSearch} className="bg-emerald-500 px-2 rounded">Go</button>
                </div>
            </div>

            {results.length > 0 && (
                <div className="mb-2 bg-emerald-900/30 p-1 rounded">
                    <strong>Results ({results.length}):</strong>
                    {results.map(r => (
                        <div key={r.id} className="ml-1 text-[10px] truncate border-b border-white/10">{r.name}</div>
                    ))}
                </div>
            )}

            <div className="mt-2 border-t border-white/20 pt-2 font-mono text-[10px]">
                <strong>Logs:</strong>
                {logs.map((l, i) => (
                    <div key={i} className="border-b border-white/5 py-0.5 opacity-80">{l}</div>
                ))}
            </div>
        </div>
    );
};
