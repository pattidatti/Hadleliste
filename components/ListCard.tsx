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
}

const ListCard: React.FC<ListCardProps> = ({
    list,
    isActive,
    isOwner,
    onSelect,
    onRename,
    onDelete,
    onToggleVisibility,
    onLeave
}) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isRenaming, setIsRenaming] = useState(false);
    const [newName, setNewName] = useState(list.name);
    const [isDeleting, setIsDeleting] = useState(false);
    const { addToast } = useToast();
    const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

    const { onTouchStart, onTouchMove, onTouchEnd, touchDelta } = useSwipe(
        () => {
            if (isOwner) setIsConfirmingDelete(true);
        },
        undefined,
        100
    );

    const handleRename = async () => {
        if (newName.trim() && newName !== list.name) {
            const success = await onRename(newName);
            if (success) setIsRenaming(false);
        } else {
            setIsRenaming(false);
        }
    };

    return (
        <div className="relative group select-none">
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
                    ? 'bg-indigo-600 border-indigo-500 shadow-xl shadow-indigo-200 text-white'
                    : 'bg-white border-slate-100 hover:border-indigo-100 shadow-sm text-slate-800'
                    }`}
                style={{
                    transform: isOwner && touchDelta > 0 ? `translateX(-${Math.min(touchDelta, 150)}px)` : 'translateX(0)',
                }}
                onTouchStart={isOwner ? onTouchStart : undefined}
                onTouchMove={isOwner ? onTouchMove : undefined}
                onTouchEnd={isOwner ? onTouchEnd : undefined}
            >
                <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0" onClick={() => !isRenaming && onSelect()}>
                        {isRenaming ? (
                            <input
                                autoFocus
                                className="w-full bg-white/20 border-none outline-none rounded-lg px-2 py-1 text-white font-bold placeholder:text-white/50"
                                value={newName}
                                onClick={(e) => e.stopPropagation()}
                                onChange={(e) => setNewName(e.target.value)}
                                onBlur={handleRename}
                                onKeyDown={(e) => e.key === 'Enter' && handleRename()}
                            />
                        ) : (
                            <div className="flex items-center gap-2">
                                <h3 className="font-black text-lg truncate">{list.name}</h3>
                                {list.isPrivate ? (
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-black uppercase tracking-wider ${isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-400'}`}>Privat</span>
                                ) : (
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-black uppercase tracking-wider ${isActive ? 'bg-white/20 text-white' : 'bg-indigo-50 text-indigo-400'}`}>Delt</span>
                                )}
                            </div>
                        )}
                        <p className={`text-[10px] font-bold uppercase tracking-widest mt-1 opacity-60 ${isActive ? 'text-white' : 'text-slate-400'}`}>
                            {list.ownerEmail === list.ownerEmail && isOwner ? 'Eies av deg' : `Delt av ${list.ownerEmail}`}
                        </p>
                    </div>

                    <div className="relative">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsMenuOpen(!isMenuOpen);
                            }}
                            className={`w-10 h-10 flex items-center justify-center rounded-2xl transition-colors ${isActive ? 'hover:bg-white/10 text-white' : 'hover:bg-slate-50 text-slate-400'
                                }`}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1" /><circle cx="12" cy="5" r="1" /><circle cx="12" cy="19" r="1" /></svg>
                        </button>

                        {isMenuOpen && (
                            <>
                                <div className="fixed inset-0 z-30" onClick={(e) => { e.stopPropagation(); setIsMenuOpen(false); }} />
                                <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-2xl border border-slate-100 py-2 z-40 animate-in fade-in zoom-in-95 duration-200">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setIsRenaming(true); setIsMenuOpen(false); }}
                                        className="w-full px-4 py-2.5 text-left text-sm font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /><path d="m15 5 4 4" /></svg>
                                        Gi nytt navn
                                    </button>

                                    {isOwner ? (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onToggleVisibility(); setIsMenuOpen(false); }}
                                            className="w-full px-4 py-2.5 text-left text-sm font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                {list.isPrivate
                                                    ? <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></>
                                                    : <><rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></>
                                                }
                                            </svg>
                                            {list.isPrivate ? "Gjør delt" : "Gjør privat"}
                                        </button>
                                    ) : null}

                                    <div className="h-px bg-slate-100 my-1 mx-2" />

                                    {isOwner ? (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setIsConfirmingDelete(true); }}
                                            className="w-full px-4 py-2.5 text-left text-sm font-bold text-red-600 hover:bg-red-50 flex items-center gap-2"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /><line x1="10" x2="10" y1="11" y2="17" /><line x1="14" x2="14" y1="11" y2="17" /></svg>
                                            Slett liste
                                        </button>
                                    ) : (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onLeave(); }}
                                            className="w-full px-4 py-2.5 text-left text-sm font-bold text-red-600 hover:bg-red-50 flex items-center gap-2"
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
                            className="flex-1 bg-white text-red-600 py-2 rounded-xl font-black text-xs uppercase shadow-lg hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center"
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
