import React, { useState } from 'react';

interface ShareModalProps {
    isOpen: boolean;
    onClose: () => void;
    onShare: (email: string) => Promise<boolean>;
}

const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose, onShare }) => {
    const [email, setEmail] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async () => {
        if (!email.trim() || isSubmitting) return;

        setIsSubmitting(true);
        const success = await onShare(email);
        setIsSubmitting(false);

        if (success) {
            alert(`${email} er lagt til i listen!`);
            setEmail('');
            onClose();
        } else {
            alert("Kunne ikke legge til person. Sjekk tilgangen din.");
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSubmit();
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm">
            <div className="bg-white rounded-3xl p-8 w-full max-w-xs shadow-2xl space-y-6 animate-in zoom-in-95">
                <div className="text-center">
                    <h3 className="text-lg font-black text-slate-900">Del denne listen</h3>
                    <p className="text-xs text-slate-500 mt-1">Legg til e-posten til den du vil dele med.</p>
                </div>
                <input
                    type="email"
                    placeholder="navn@epost.no"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    autoFocus
                />
                <div className="flex gap-2">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 text-slate-500 font-bold text-sm"
                        disabled={isSubmitting}
                    >
                        Avbryt
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting || !email.trim()}
                        className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm shadow-indigo-100 shadow-lg disabled:opacity-50"
                    >
                        {isSubmitting ? 'Deler...' : 'Del'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ShareModal;
