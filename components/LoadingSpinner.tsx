import React from 'react';

const LoadingSpinner: React.FC = () => {
    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
            <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
        </div>
    );
};

export default LoadingSpinner;
