import React, { useState } from 'react';
import { useToast } from './Toast';

interface ShareModalProps {
    isOpen: boolean;
    onClose: () => void;
    onShare: (email: string) => Promise<boolean>;
    listName?: string;
    collaborators?: string[];
    ownerEmail?: string;
    onRemoveCollaborator?: (email: string) => Promise<boolean>;
    isOwner?: boolean;
}

const ShareModal: React.FC<ShareModalProps> = ({
    isOpen,
    onClose,
    onShare,
    listName,
    collaborators = [],
    ownerEmail,
    onRemoveCollaborator,
    isOwner
}) => {
    const [email, setEmail] = useState('');
    const [isSharing, setIsSharing] = useState(false);
    const { addToast } = useToast();

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim() || isSharing) return;

        setIsSharing(true);
        const success = await onShare(email);
        if (success) {
            addToast(`Invitasjon sendt til ${email}`, 'success');
            setEmail('');
        } else {
            addToast('Kunne ikke sende invitasjon', 'error');
        }
        setIsSharing(false);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-300"
                onClick={onClose}
            />
            <div className="relative bg-surface w-full max-w-sm rounded-[2.5rem] shadow-2xl overflow-hidden border border-primary animate-in zoom-in-95 slide-in-from-bottom-10 duration-500">
                <div className="px-8 pt-10 pb-8">
                    <header className="mb-8">
                        <h2 className="text-2xl font-black text-primary mb-1">Del liste</h2>
                        <p className="text-[10px] font-black text-accent-primary uppercase tracking-widest">{listName || "Laster..."}</p>
                    </header>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-[10px] font-black text-secondary uppercase tracking-widest mb-2 ml-1">Legg til via e-post</label>
                            <div className="relative flex gap-2">
                                <input
                                    type="email"
                                    required
                                    placeholder="venn@eksempel.no"
                                    autoFocus
                                    className="flex-1 bg-primary border-none rounded-2xl px-5 py-4 text-sm font-bold text-primary placeholder:text-secondary/50 outline-none focus:ring-2 focus:ring-accent-primary transition-all"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                                <button
                                    type="submit"
                                    disabled={!email.trim() || isSharing}
                                    className="w-14 bg-primary text-primary border border-secondary/20 rounded-2xl flex items-center justify-center hover:bg-accent-primary hover:text-white hover:border-transparent active:scale-95 transition-all disabled:opacity-50 shadow-lg shadow-black/5"
                                >
                                    {isSharing ? (
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="M12 5v14" /></svg>
                                    )}
                                </button>
                            </div>
                        </div>
                    </form>

                    {collaborators.length > 0 && (
                        <div className="mt-10">
                            <label className="block text-[10px] font-black text-secondary uppercase tracking-widest mb-4 ml-1">Deltakere ({collaborators.length})</label>
                            <div className="space-y-3 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                                {collaborators.map(cEmail => (
                                    <div key={cEmail} className="flex items-center justify-between p-3 bg-primary rounded-2xl border border-primary">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="w-8 h-8 rounded-full bg-surface border border-primary flex items-center justify-center text-[10px] font-black text-secondary/40">
                                                {cEmail.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-xs font-bold text-primary truncate">{cEmail}</p>
                                                {ownerEmail === cEmail && <p className="text-[8px] font-black text-accent-primary uppercase tracking-widest">Eier</p>}
                                            </div>
                                        </div>
                                        {isOwner && ownerEmail !== cEmail && onRemoveCollaborator && (
                                            <button
                                                onClick={() => onRemoveCollaborator(cEmail)}
                                                className="w-8 h-8 flex items-center justify-center text-secondary/30 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <button
                        onClick={onClose}
                        className="w-full mt-8 py-4 text-[10px] font-black text-secondary/30 uppercase tracking-[0.2em] hover:text-secondary/60 transition-colors"
                    >
                        Lukk
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ShareModal;
