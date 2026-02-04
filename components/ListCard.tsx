import React, { useState } from 'react';
import { SharedList } from '../types';
import { useSwipe } from '../hooks/useSwipe';
import { useToast } from './Toast';

interface ListCardProps {
    list: SharedList;
    isActive: boolean;
    isOwner: boolean;
    onSelect: () => void;
    onRename: (newName: string) => Promise<boolean>;
    onDelete: () => Promise<boolean>;
    onToggleVisibility: () => Promise<boolean>;
    onLeave: () => Promise<boolean>;
    onShare: () => void;
    isEditMode?: boolean;
    isSelected?: boolean;
}

const ListCard: React.FC<ListCardProps> = ({
    list,
    isActive,
    isOwner,
    onSelect,
    onRename,
    onDelete,
    onToggleVisibility,
    onLeave,
    onShare,
    isEditMode = false,
    isSelected = false
}) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isRenaming, setIsRenaming] = useState(false);
    const [newName, setNewName] = useState(list.name);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const { addToast } = useToast();
    const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

    // Optimistic state for immediate UI feedback
    const [optimisticName, setOptimisticName] = useState(list.name);

    // Sync optimistic/local view when PROP updates (server caught up)
    React.useEffect(() => {
        setOptimisticName(list.name);
    }, [list.name]);

    // Sync input field when entering rename mode
    React.useEffect(() => {
        if (isRenaming) {
            setNewName(optimisticName);
        }
    }, [isRenaming, optimisticName]);

    const { onTouchStart, onTouchMove, onTouchEnd, touchDelta } = useSwipe(
        () => {
            if (isOwner) setIsConfirmingDelete(true);
        },
        undefined,
        100
    );

    const handleRename = async () => {
        const trimmed = newName.trim();
        if (!trimmed || trimmed === optimisticName || isSaving) {
            setIsRenaming(false);
            return;
        }

        setIsSaving(true);
        // Optimistically update UI immediately
        const success = await onRename(trimmed);

        setIsSaving(false);

        if (success) {
            setOptimisticName(trimmed); // UPDATE UI INSTANTLY
            setIsRenaming(false);
        } else {
            addToast("Kunne ikke endre navn", "error");
            setNewName(optimisticName); // Revert input
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleRename();
        }
    };

    // Completely disable swipe handlers when renaming to prevent conflicts
    const swipeHandlers = isRenaming ? {} : {
        onTouchStart: isOwner ? onTouchStart : undefined,
        onTouchMove: isOwner ? onTouchMove : undefined,
        onTouchEnd: isOwner ? onTouchEnd : undefined
    };

    return (
        <div className={`relative group select-none ${isMenuOpen ? 'z-50' : 'z-0'}`}>
            {/* Swipe Background (Delete Action) - Only for owner */}
            {isOwner && (
                <div className="absolute inset-0 bg-red-600 rounded-3xl flex items-center justify-end pr-6 transition-all">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                        <path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                    </svg>
                </div>
            )}

            {/* Main Card Content */}
            <div
                className={`relative p-4 rounded-3xl border transition-all duration-300 ${isActive
                    ? 'bg-accent-primary border-accent-primary shadow-xl shadow-accent-primary/20 text-white'
                    : 'bg-surface border-primary hover:border-accent-primary/30 shadow-sm text-primary'
                    } ${isSelected ? 'ring-4 ring-red-500 border-red-500 bg-red-500/10' : ''}`}
                style={{
                    transform: isOwner && !isRenaming && touchDelta > 0 ? `translateX(-${Math.min(touchDelta, 150)}px)` : 'translateX(0)',
                }}
                {...swipeHandlers}
            >
                <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0" onClick={() => !isRenaming && onSelect()}>
                        {isRenaming ? (
                            <input
                                autoFocus
                                type="text"
                                className="w-full bg-white/20 border-none outline-none rounded-lg px-2 py-1 text-white font-bold placeholder:text-white/40"
                                value={newName}
                                onClick={(e) => e.stopPropagation()}
                                onTouchStart={(e) => e.stopPropagation()}
                                onChange={(e) => setNewName(e.target.value)}
                                onBlur={handleRename}
                                onKeyDown={handleKeyDown}
                            />
                        ) : (
                            <div className="flex items-center gap-3">
                                {isEditMode && (
                                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-red-600 border-red-600' : 'bg-surface border-primary'
                                        }`}>
                                        {isSelected && (
                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                                        )}
                                    </div>
                                )}
                                <div>
                                    <h3
                                        className={`font-black text-lg truncate ${isOwner && !isEditMode ? 'cursor-pointer active:opacity-70' : ''}`}
                                        onClick={(e) => {
                                            if (isOwner && !isEditMode) {
                                                e.stopPropagation();
                                                setIsRenaming(true);
                                            }
                                        }}
                                    >
                                        {optimisticName}
                                    </h3>
                                    {list.isPrivate ? (
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-black uppercase tracking-wider ${isActive ? 'bg-white/20 text-white' : 'bg-primary text-secondary'}`}>Privat</span>
                                    ) : (
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-black uppercase tracking-wider ${isActive ? 'bg-white/20 text-white' : 'bg-accent-primary/10 text-accent-primary'}`}>Delt</span>
                                    )}
                                </div>
                            </div>
                        )}
                        <p className={`text-[10px] font-bold uppercase tracking-widest mt-1 opacity-60 ${isActive ? 'text-white' : 'text-secondary'}`}>
                            {list.ownerEmail === list.ownerEmail && isOwner ? 'Eies av deg' : `Delt av ${list.ownerEmail}`}
                        </p>
                    </div>

                    <div className="relative">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsMenuOpen(!isMenuOpen);
                            }}
                            className={`w-10 h-10 flex items-center justify-center rounded-2xl transition-colors ${isActive ? 'hover:bg-white/10 text-white' : 'hover:bg-primary text-secondary'
                                }`}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1" /><circle cx="12" cy="5" r="1" /><circle cx="12" cy="19" r="1" /></svg>
                        </button>

                        {isMenuOpen && (
                            <>
                                <div className="fixed inset-0 z-30" onClick={(e) => { e.stopPropagation(); setIsMenuOpen(false); }} />
                                <div className="absolute right-0 mt-2 w-48 bg-surface rounded-2xl shadow-2xl border border-primary py-2 z-40 animate-in fade-in zoom-in-95 duration-200">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setIsRenaming(true); setIsMenuOpen(false); }}
                                        className="w-full px-4 py-2.5 text-left text-sm font-bold text-primary hover:bg-primary transition-colors flex items-center gap-2"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /><path d="m15 5 4 4" /></svg>
                                        Gi nytt navn
                                    </button>



                                    <div className="h-px bg-primary my-1 mx-2" />

                                    {isOwner ? (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setIsMenuOpen(false); onShare(); }}
                                            className="w-full px-4 py-2.5 text-left text-sm font-bold text-primary hover:bg-primary transition-colors flex items-center gap-2"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" /><polyline points="16 6 12 2 8 6" /><line x1="12" x2="12" y1="2" y2="15" /></svg>
                                            Del med andre
                                        </button>
                                    ) : null}

                                    {/* Collaborators List */}
                                    {list.collaborators.length > 1 && (
                                        <div className="px-4 py-2 border-t border-primary">
                                            <p className="text-[10px] font-black uppercase text-secondary/50 mb-1">Delt med:</p>
                                            <div className="space-y-1">
                                                {list.collaborators.filter(email => email !== list.ownerEmail).map(email => (
                                                    <div key={email} className="text-xs text-secondary truncate flex items-center gap-1.5">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-accent-primary"></div>
                                                        {email}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <div className="h-px bg-primary my-1 mx-2" />

                                    {isOwner ? (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setIsConfirmingDelete(true); }}
                                            className="w-full px-4 py-2.5 text-left text-sm font-bold text-red-500 hover:bg-red-500/10 transition-colors flex items-center gap-2"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /><line x1="10" x2="10" y1="11" y2="17" /><line x1="14" x2="14" y1="11" y2="17" /></svg>
                                            Slett liste
                                        </button>
                                    ) : (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onLeave(); }}
                                            className="w-full px-4 py-2.5 text-left text-sm font-bold text-red-500 hover:bg-red-500/10 transition-colors flex items-center gap-2"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" x2="9" y1="12" y2="12" /></svg>
                                            Forlat liste
                                        </button>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {isConfirmingDelete && (
                <div className="absolute inset-0 bg-red-600 rounded-3xl z-50 flex flex-col items-center justify-center p-4 animate-in fade-in zoom-in">
                    <p className="font-bold text-white mb-4 text-center">Slett "{list.name}" permanent?</p>
                    <div className="flex gap-2 w-full">
                        <button
                            onClick={async (e) => {
                                e.stopPropagation();
                                setIsDeleting(true);
                                const success = await onDelete();
                                setIsDeleting(false);

                                if (success) {
                                    setIsConfirmingDelete(false);
                                    addToast(`"${list.name}" ble lagt i papirkurven`, 'success');
                                } else {
                                    addToast('Kunne ikke slette liste', 'error');
                                    setIsConfirmingDelete(false);
                                }
                            }}
                            disabled={isDeleting}
                            className="flex-1 bg-white text-red-600 py-2 rounded-xl font-black text-xs uppercase shadow-lg hover:bg-primary disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center"
                        >
                            {isDeleting ? 'Sletter...' : 'Ja, slett'}
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); setIsConfirmingDelete(false); }}
                            disabled={isDeleting}
                            className="flex-1 bg-red-700 text-white py-2 rounded-xl font-black text-xs uppercase shadow-lg hover:bg-red-800 disabled:opacity-50"
                        >Avbryt</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ListCard;
