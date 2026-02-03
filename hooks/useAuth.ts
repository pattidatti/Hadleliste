import { useState, useEffect } from 'react';
import { auth, onAuthStateChanged, signIn, logOut } from '../services/firebase';
import type { User } from '../services/firebase';

export interface UseAuthReturn {
    user: User | null;
    loading: boolean;
    signIn: () => Promise<any>;
    logOut: () => Promise<void>;
}

export const useAuth = (): UseAuthReturn => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (u) => {
            setUser(u);
            setLoading(false);
        });
        return unsubscribe;
    }, []);

    return { user, loading, signIn, logOut };
};

export default useAuth;
