import React, { useState } from 'react';
import { SharedList } from '../types';
import ListCard from './ListCard';

interface ListsViewProps {
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
    onShareList: (id: string) => void;
}

const ListsView: React.FC<ListsViewProps> = ({
    lists,
    currentListId,
    onSelectList,
    onCreateList,
    onRenameList,
    onDeleteList,
    onToggleVisibility,
    onLeaveList,
    isOwner,
    userEmail,
    onShareList
}) => {
    const [newListName, setNewListName] = useState('');
    const [isCreating, setIsCreating] = useState(false);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newListName.trim() || isCreating) return;

        setIsCreating(true);
        await onCreateList(newListName.trim());
        setNewListName('');
        setIsCreating(false);
    };

    return (
        <div className="flex flex-col h-full bg-slate-50">
            {/* Header */}
            <header className="bg-white px-6 py-8 border-b border-slate-100">
                <h2 className="text-2xl font-black text-slate-900">Mine Lister</h2>
                <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mt-1">Administrer dine handlelister</p>
            </header>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-4 py-8 space-y-8 pb-32">

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
                            {[...lists].sort((a, b) => b.updatedAt - a.updatedAt).map(list => (
                                <ListCard
                                    key={list.id}
                                    list={list}
                                    isActive={list.id === currentListId}
                                    isOwner={isOwner(list.id)}
                                    // Modified: Just select, don't close (not a modal anymore)
                                    onSelect={() => onSelectList(list.id)}
                                    onRename={(name) => onRenameList(list.id, name)}
                                    onDelete={() => onDeleteList(list.id)}
                                    onToggleVisibility={() => onToggleVisibility(list.id)}
                                    onLeave={() => onLeaveList(list.id)}
                                    onShare={() => onShareList(list.id)}
                                />
                            ))}
                        </div>
                    )}
                </section>

                {/* User Info Footer */}
                <div className="text-center pt-8 border-t border-slate-100">
                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
                        Logget inn som: <span className="text-slate-500">{userEmail}</span>
                    </p>
                </div>

            </div>
        </div>
    );
};

export default ListsView;
