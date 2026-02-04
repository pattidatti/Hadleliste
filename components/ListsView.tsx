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
    onDeleteLists: (ids: string[]) => Promise<boolean>;
    onToggleVisibility: (id: string) => Promise<boolean>;
    onLeaveList: (id: string) => Promise<boolean>;
    isOwner: (id: string) => boolean;
    userEmail: string;
    onShareList: (id: string) => void;
    onGenerateSmartList: () => Promise<void>;
    isGenerating: boolean;
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
    onShareList,
    onDeleteLists,
    onGenerateSmartList,
    isGenerating
}) => {
    const [newListName, setNewListName] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isDeletingBulk, setIsDeletingBulk] = useState(false);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newListName.trim() || isCreating) return;

        setIsCreating(true);
        await onCreateList(newListName.trim());
        setNewListName('');
        setIsCreating(false);
    };

    const toggleSelection = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const handleBulkDelete = async () => {
        if (selectedIds.size === 0 || isDeletingBulk) return;
        if (!window.confirm(`Slette ${selectedIds.size} lister permanent?`)) return;

        setIsDeletingBulk(true);
        const success = await onDeleteLists(Array.from(selectedIds));
        setIsDeletingBulk(false);

        if (success) {
            setSelectedIds(new Set());
            setIsEditMode(false);
        }
    };

    const handleSelectAll = () => {
        if (selectedIds.size === lists.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(lists.map(l => l.id)));
        }
    };

    return (
        <div className="flex flex-col h-full bg-primary">
            {/* Header */}
            <header className="bg-surface px-6 py-6 border-b border-primary flex justify-between items-center sticky top-0 z-10 transition-colors">
                <div>
                    <h2 className="text-2xl font-black text-primary">Mine Lister</h2>
                    <p className="text-[10px] font-black text-accent-primary uppercase tracking-widest mt-1">
                        {isEditMode ? `${selectedIds.size} valgt` : 'Administrer dine handlelister'}
                    </p>
                </div>
                <button
                    onClick={() => {
                        setIsEditMode(!isEditMode);
                        if (isEditMode) setSelectedIds(new Set());
                    }}
                    className={`px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${isEditMode ? 'bg-accent-primary text-white shadow-lg shadow-accent-primary/20' : 'bg-primary text-secondary hover:bg-primary/80'
                        }`}
                >
                    {isEditMode ? 'Ferdig' : 'Rediger'}
                </button>
            </header>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-4 py-8 space-y-8 pb-32">

                {/* Create New */}
                <section className="space-y-4">
                    <form onSubmit={handleCreate} className="relative group/create">
                        <div className="absolute inset-0 bg-accent-primary/10 blur-xl rounded-2xl opacity-0 group-focus-within/create:opacity-100 transition-opacity"></div>
                        <div className="relative flex gap-2">
                            <input
                                type="text"
                                placeholder="Gi din nye liste et navn..."
                                className="flex-1 bg-surface border border-primary rounded-2xl px-5 py-4 text-sm font-bold text-primary placeholder:text-secondary/50 outline-none focus:ring-2 focus:ring-accent-primary focus:border-transparent transition-all"
                                value={newListName}
                                onChange={(e) => setNewListName(e.target.value)}
                            />
                            <button
                                disabled={!newListName.trim() || isCreating}
                                className="px-6 bg-primary text-primary border border-secondary/20 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-accent-primary hover:text-white hover:border-transparent disabled:opacity-50 transition-all active:scale-95"
                            >
                                {isCreating ? 'Lager...' : 'Opprett'}
                            </button>
                        </div>
                    </form>


                    {/* Smart List Generator */}
                    <button
                        onClick={onGenerateSmartList}
                        disabled={isGenerating}
                        className="w-full flex items-center justify-center gap-3 py-4 px-5 bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10 border border-violet-500/30 rounded-2xl text-violet-600 dark:text-violet-400 font-bold transition-all hover:from-violet-500/20 hover:to-fuchsia-500/20 active:scale-[0.98] disabled:opacity-50"
                    >
                        {isGenerating ? (
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                <span>Genererer...</span>
                            </div>
                        ) : (
                            <>
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z" />
                                    <path d="M5 19l1 3 1-3 3-1-3-1-1-3-1 3-3 1 3 1z" />
                                </svg>
                                <span>Generer smart liste</span>
                            </>
                        )}
                    </button>
                </section>

                {/* List Entries */}
                <section className="space-y-4">
                    {lists.length === 0 ? (
                        <div className="py-20 text-center opacity-30">
                            <span className="text-6xl mb-4 block">📋</span>
                            <p className="font-black text-secondary">Ingen lister ennå</p>
                        </div>
                    ) : (
                        <div className="grid gap-4">
                            {[...lists].sort((a, b) => {
                                const timeA = (a.updatedAt as any)?.toMillis?.() || a.updatedAt || 0;
                                const timeB = (b.updatedAt as any)?.toMillis?.() || b.updatedAt || 0;
                                return timeB - timeA;
                            }).map(list => (
                                <ListCard
                                    key={list.id}
                                    list={list}
                                    isActive={list.id === currentListId}
                                    isOwner={isOwner(list.id)}
                                    // In edit mode, click card to toggle selection
                                    onSelect={() => isEditMode ? toggleSelection(list.id) : onSelectList(list.id)}
                                    onRename={(name) => onRenameList(list.id, name)}
                                    onDelete={() => onDeleteList(list.id)}
                                    onToggleVisibility={() => onToggleVisibility(list.id)}
                                    onLeave={() => onLeaveList(list.id)}
                                    onShare={() => onShareList(list.id)}
                                    isEditMode={isEditMode}
                                    isSelected={selectedIds.has(list.id)}
                                />
                            ))}
                        </div>
                    )}
                </section>

                {/* Bulk Actions Bar */}
                {isEditMode && lists.length > 0 && (
                    <div className="fixed bottom-24 left-4 right-4 animate-in slide-in-from-bottom-8 duration-300">
                        <div className="bg-surface/80 backdrop-blur-xl border border-primary p-2 rounded-[2rem] shadow-2xl flex gap-2">
                            <button
                                onClick={handleSelectAll}
                                className="flex-1 bg-primary text-secondary py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-primary/80 transition-all"
                            >
                                {selectedIds.size === lists.length ? 'Velg ingen' : 'Velg alle'}
                            </button>
                            <button
                                onClick={handleBulkDelete}
                                disabled={selectedIds.size === 0 || isDeletingBulk}
                                className="flex-1 bg-red-600 text-white py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-red-200 active:scale-95 transition-all disabled:opacity-50"
                            >
                                {isDeletingBulk ? 'Sletter...' : `Slett ${selectedIds.size || ''}`}
                            </button>
                        </div>
                    </div>
                )}

                {/* User Info Footer */}
                <div className="text-center pt-8 border-t border-primary">
                    <p className="text-[10px] font-black text-secondary/30 uppercase tracking-widest">
                        Logget inn som: <span className="text-secondary/60">{userEmail}</span>
                    </p>
                </div>

            </div>
        </div >
    );
};

export default ListsView;
