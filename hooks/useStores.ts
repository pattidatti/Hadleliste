import { useState, useEffect, useCallback } from 'react';
import {
    db,
    collection,
    query,
    where,
    onSnapshot,
    addDoc,
    doc,
    setDoc,
    updateDoc,
    serverTimestamp,
    getDoc,
    getDocs
} from '../services/firebase';
import { Store, UserStoreLayout } from '../types';
import { useAuth } from './useAuth';
import { CATEGORIES } from '../constants/commonItems';

export const useStores = () => {
    const { user } = useAuth();
    const [myLayouts, setMyLayouts] = useState<UserStoreLayout[]>([]);
    const [allStores, setAllStores] = useState<Store[]>([]);
    const [loading, setLoading] = useState(true);

    // 1. Subscribe to My Personal Layouts
    useEffect(() => {
        if (!user) {
            setMyLayouts([]);
            setLoading(false);
            return;
        }

        const q = query(collection(db, "users", user.uid, "storeLayouts"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const layouts = snapshot.docs.map(d => d.data() as UserStoreLayout);
            setMyLayouts(layouts);
        });

        return unsubscribe;
    }, [user]);

    // 2. Fetch ALL non-deleted stores (Unified Fetching)
    useEffect(() => {
        const q = query(collection(db, "stores"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const stores = snapshot.docs
                .map(d => ({ id: d.id, ...d.data() } as Store))
                .filter(s => !s.deletedAt);
            setAllStores(stores);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching all stores:", error);
            setLoading(false);
        });

        return unsubscribe;
    }, []);

    // 3. Derived: myStores (Recent/Used stores)
    // Memoized subset of allStores that have a layout, sorted by lastUsed
    const myStores = allStores
        .filter(s => myLayouts.some(l => l.storeId === s.id))
        .sort((a, b) => {
            const layoutA = myLayouts.find(l => l.storeId === a.id);
            const layoutB = myLayouts.find(l => l.storeId === b.id);
            return (layoutB?.lastUsed || 0) - (layoutA?.lastUsed || 0);
        });

    // SEARCH: Filter allStores locally for speed
    const searchStores = async (searchTerm: string): Promise<Store[]> => {
        if (!searchTerm || searchTerm.length < 2) return [];
        const lowerTerm = searchTerm.toLowerCase();
        return allStores.filter(s => s.name?.toLowerCase().includes(lowerTerm));
    };

    // CREATE: New Global Store
    const createStore = async (name: string): Promise<Store | null> => {
        if (!user) return null;

        try {
            // 1. Create Public Store Entity
            // Generate ID manually to construct full object before saving if needed, 
            // but addDoc does it for us. We'll construct data first.

            const storeData: Omit<Store, 'id'> = {
                name: name.trim(),
                ownerId: user.uid,
                defaultCategoryOrder: CATEGORIES, // Default generic order
                createdAt: Date.now(),
                // Generate a pastel color based on name hash (placeholder logic)
                color: generatePastelColor(name)
            };

            const storeRef = await addDoc(collection(db, "stores"), storeData);
            const storeId = storeRef.id;

            // 2. Immediately subscribe user to it (Create Personal Layout)
            await updateMyLayout(storeId, CATEGORIES); // Initialize with default

            // Return full store object
            return { id: storeId, ...storeData };
        } catch (e) {
            console.error("Failed to create store:", e);
            return null;
        }
    };

    // UPDATE LAYOUT: The "Smart Learning" Core
    const updateMyLayout = async (storeId: string, itemOrder: string[]) => {
        if (!user) return;

        // Simplify item order to Category Order
        // 1. We receive a list of Item IDs or Names in the order they were picked?
        // Actually, the StoreView knows the order. It should pass us the *Category* sequence.
        // Let's assume input is `categoryOrder` string array.

        const layoutData: UserStoreLayout = {
            storeId,
            categoryOrder: itemOrder,
            lastUsed: Date.now(),
            visitCount: (myLayouts.find(l => l.storeId === storeId)?.visitCount || 0) + 1
        };

        const layoutRef = doc(db, "users", user.uid, "storeLayouts", storeId);
        await setDoc(layoutRef, layoutData);
    };

    // SOFT DELETE
    const deleteStore = async (storeId: string) => {
        if (!user) return;

        // 1. Mark global as deleted (if owner)
        const store = myStores.find(s => s.id === storeId);
        if (store && store.ownerId === user.uid) {
            await updateDoc(doc(db, "stores", storeId), {
                deletedAt: Date.now()
            });
        }

        // 2. Remove my personal layout (Forget this store)
        // actually, we might want to just delete the layout doc?
        // Let's keep the layout but maybe mark it hidden? 
        // For now, let's just NOT delete the layout so history is preserved, 
        // but Dashboard could filter it out.
        // userLayouts doesn't have a delete mechanism yet.
    };

    const forgetStore = async (storeId: string) => {
        // Just remove from my personal list
        if (!user) return;
        // logic to delete doc...
    };

    const getStore = async (storeId: string): Promise<Store | null> => {
        // Cached?
        const existing = myStores.find(s => s.id === storeId);
        if (existing) return existing;

        // Fetch
        const docRef = doc(db, "stores", storeId);
        const snap = await getDoc(docRef);
        if (snap.exists()) return { id: snap.id, ...snap.data() } as Store;
        return null;
    };

    return {
        myStores,
        allStores,
        myLayouts,
        loading,
        searchStores,
        createStore,
        updateMyLayout,
        deleteStore,
        getStore
    };
};

// Helper: Generate consistent HSL pastel color from string
const generatePastelColor = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const h = hash % 360;
    return `hsl(${h}, 70%, 85%)`;
};
