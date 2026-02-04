import React from 'react';

interface LoginScreenProps {
    onSignIn: () => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onSignIn }) => {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-primary p-6">
            <div className="bg-surface p-8 rounded-[2.5rem] shadow-2xl w-full max-w-sm text-center space-y-8 border border-primary">
                <div className="w-20 h-20 bg-accent-primary rounded-3xl mx-auto flex items-center justify-center shadow-accent-primary/20 shadow-2xl rotate-3">
                    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
                        <path d="M3 6h18" />
                        <path d="M16 10a4 4 0 0 1-8 0" />
                    </svg>
                </div>
                <div>
                    <h1 className="text-2xl font-black text-primary mb-2">Smart Handleliste</h1>
                    <p className="text-secondary text-sm">Planlegg, handle og del med familien i sanntid.</p>
                </div>
                <button
                    onClick={onSignIn}
                    className="w-full flex items-center justify-center gap-3 bg-surface border-2 border-primary py-4 px-6 rounded-2xl font-bold text-primary hover:bg-primary active:scale-95 transition-all shadow-sm"
                >
                    <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" />
                    Logg inn med Google
                </button>
            </div>
        </div>
    );
};

export default LoginScreen;
