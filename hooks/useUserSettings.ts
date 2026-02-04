import { useState, useEffect, useCallback } from 'react';
import { doc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from './useAuth';
import { UserSettings } from '../types';
import { CATEGORIES } from '../constants/commonItems';

export const useUserSettings = () => {
    const { user } = useAuth();
    const [settings, setSettings] = useState<UserSettings | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Subscribe to user settings
    useEffect(() => {
        if (!user) {
            setSettings(null);
            setIsLoading(false);
            return;
        }

        const userDocRef = doc(db, 'users', user.uid);

        const unsubscribe = onSnapshot(
            userDocRef,
            (snapshot) => {
                if (snapshot.exists()) {
                    setSettings(snapshot.data() as UserSettings);
                } else {
                    // Initialize with default settings
                    const defaultSettings: UserSettings = {
                        globalCategoryOrder: CATEGORIES,
                        routeAutoSync: true,
                    };
                    setDoc(userDocRef, defaultSettings);
                    setSettings(defaultSettings);
                }
                setIsLoading(false);
            },
            (error) => {
                console.error('Error fetching user settings:', error);
                setIsLoading(false);
            }
        );

        return () => unsubscribe();
    }, [user]);

    // Update category order globally
    const updateCategoryOrder = useCallback(
        async (newOrder: string[]) => {
            if (!user) return;

            const userDocRef = doc(db, 'users', user.uid);
            await updateDoc(userDocRef, { globalCategoryOrder: newOrder });
        },
        [user]
    );

    // Set last used list for inheritance
    const setLastUsedList = useCallback(
        async (listId: string) => {
            if (!user) return;

            const userDocRef = doc(db, 'users', user.uid);
            await updateDoc(userDocRef, { lastUsedListId: listId });
        },
        [user]
    );

    // Reset all learned routes
    const resetLearning = useCallback(async () => {
        if (!user) return;

        const userDocRef = doc(db, 'users', user.uid);
        await updateDoc(userDocRef, {
            globalCategoryOrder: CATEGORIES,
            lastUsedListId: null,
        });
    }, [user]);

    // Update theme choice
    const updateTheme = useCallback(
        async (theme: 'light' | 'dark') => {
            if (!user) return;

            const userDocRef = doc(db, 'users', user.uid);
            await updateDoc(userDocRef, { theme });
        },
        [user]
    );

    return {
        settings,
        isLoading,
        updateCategoryOrder,
        setLastUsedList,
        updateTheme,
        resetLearning,
    };
};
