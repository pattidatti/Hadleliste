
import React, { useState } from 'react';
import { SharedList } from '../types';
import ListCard from './ListCard';

interface ListsSheetProps {
    isOpen: boolean;
    onClose: () => void;
    lists: SharedList[];
    currentListId: string | null;
    onSelectList: (id: string) => void;
    onCreateList: (name: string) => Promise<void>;
    onRenameList: (id: string, name: string) => Promise<boolean>;
    onDeleteList: (id: string) => Promise<boolean>;
    onToggleVisibility: (id: string) => Promise<boolean>;
    onLeaveList: (id: string) => Promise<boolean>;
    isOwner: (id: string) => boolean;
    userEmail: string;
}

const ListsSheet: React.FC<ListsSheetProps> = ({
    isOpen,
    onClose,
    lists,
    currentListId,
    onSelectList,
    onCreateList,
    onRenameList,
    onDeleteList,
    onToggleVisibility,
    onLeaveList,
    isOwner,
    userEmail
}) => {
    const [newListName, setNewListName] = useState('');
    const [isCreating, setIsCreating] = useState(false);

    if (!isOpen) return null;

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newListName.trim() || isCreating) return;

        setIsCreating(true);
        await onCreateList(newListName.trim());
        setNewListName('');
        setIsCreating(false);
    };

    return (
        <div className="fixed inset-0 z-[60] bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="absolute inset-y-0 right-0 w-full max-w-md bg-slate-50 flex flex-col shadow-2xl animate-in slide-in-from-right duration-500">

                {/* Header */}
                <header className="bg-white px-6 pt-10 pb-6 border-b border-slate-100 flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-black text-slate-900">Mine Lister</h2>
                        <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mt-1">Administrer dine handlelister</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-12 h-12 flex items-center justify-center rounded-2xl bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                    </button>
                </header>

                {/* Content */}
                <div className="flex-1 overflow-y-auto px-4 py-8 space-y-8">

                    {/* Create New */}
                    <section className="space-y-4">
                        <form onSubmit={handleCreate} className="relative group">
                            <div className="absolute inset-0 bg-indigo-500/10 blur-xl rounded-2xl opacity-0 group-focus-within:opacity-100 transition-opacity"></div>
                            <div className="relative flex gap-2">
                                <input
                                    type="text"
                                    placeholder="Gi din nye liste et navn..."
                                    className="flex-1 bg-white border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                                    value={newListName}
                                    onChange={(e) => setNewListName(e.target.value)}
                                />
                                <button
                                    disabled={!newListName.trim() || isCreating}
                                    className="px-6 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-600 disabled:opacity-50 transition-all active:scale-95"
                                >
                                    {isCreating ? 'Lager...' : 'Opprett'}
                                </button>
                            </div>
                        </form>
                    </section>

                    {/* List Entries */}
                    <section className="space-y-4">
                        {lists.length === 0 ? (
                            <div className="py-20 text-center opacity-30">
                                <span className="text-6xl mb-4 block">📋</span>
                                <p className="font-black text-slate-400">Ingen lister ennå</p>
                            </div>
                        ) : (
                            <div className="grid gap-4">
                                {lists.sort((a, b) => b.updatedAt - a.updatedAt).map(list => (
                                    <ListCard
                                        key={list.id}
                                        list={list}
                                        isActive={list.id === currentListId}
                                        isOwner={isOwner(list.id)}
                                        onSelect={() => { onSelectList(list.id); onClose(); }}
                                        onRename={(name) => onRenameList(list.id, name)}
                                        onDelete={() => onDeleteList(list.id)}
                                        onToggleVisibility={() => onToggleVisibility(list.id)}
                                        onLeave={() => onLeaveList(list.id)}
                                    />
                                ))}
                            </div>
                        )}
                    </section>

                </div>

                {/* Footer */}
                <footer className="bg-white border-t border-slate-100 p-6">
                    <p className="text-center text-[10px] font-black text-slate-300 uppercase tracking-widest">
                        Logget inn som: <span className="text-slate-500">{userEmail}</span>
                    </p>
                </footer>

            </div>
        </div>
    );
};

export default ListsSheet;
