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
    const [myStores, setMyStores] = useState<Store[]>([]);
    const [loading, setLoading] = useState(true);

    // 1. Subscribe to My Personal Layouts
    useEffect(() => {
        if (!user) {
            setMyLayouts([]);
            setMyStores([]);
            setLoading(false);
            return;
        }

        const q = query(collection(db, "users", user.uid, "storeLayouts"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const layouts = snapshot.docs.map(d => d.data() as UserStoreLayout);
            setMyLayouts(layouts);

            // Trigger fetch of store details for these layouts
            fetchStoreDetails(layouts.map(l => l.storeId));
        });

        return unsubscribe;
    }, [user]);

    // 2. Fetch details for stores I use
    const fetchStoreDetails = async (storeIds: string[]) => {
        if (storeIds.length === 0) {
            setMyStores([]);
            setLoading(false);
            return;
        }

        try {
            // Firestore 'in' query supports max 10/30 items. 
            // For robustness, we'll just fetch unique IDs that we don't have yet or refresh all.
            // Since this is "My Stores", the list is usually small (<20).
            const uniqueIds = [...new Set(storeIds)];
            const storesData: Store[] = [];

            // We could optimize this with 'in' query if needed, but parallel gets are fine for now
            // or we could subscribe to them if we want real-time updates on names.
            // For now, let's fetch once.
            for (const id of uniqueIds) {
                const docRef = doc(db, "stores", id);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const store = { id: docSnap.id, ...docSnap.data() } as Store;
                    if (!store.deletedAt) {
                        storesData.push(store);
                    }
                }
            }

            // Sort by lastUsed from layout
            const sortedStores = storesData.sort((a, b) => {
                const layoutA = myLayouts.find(l => l.storeId === a.id);
                const layoutB = myLayouts.find(l => l.storeId === b.id);
                return (layoutB?.lastUsed || 0) - (layoutA?.lastUsed || 0);
            });

            setMyStores(sortedStores);
        } catch (error) {
            console.error("Error fetching store details:", error);
        } finally {
            setLoading(false);
        }
    };

    // SEARCH: Find global stores
    const searchStores = async (searchTerm: string): Promise<Store[]> => {
        if (!searchTerm || searchTerm.length < 2) return [];

        // Simple client-side filtering isn't efficient for Global, but Firestore text search is limited.
        // We'll fetch a reasonable batch or use an index. 
        // For MVP: Fetch all valid stores (if small) or use a "name" where query.
        // Firestore doesn't do "contains". We can rely on exact match or prefix if we had `keywords`.
        // Let's assume we pull a subset or have a separate search index later.
        // FALLBACK FOR MVP: Query all stores that are NOT deleted.
        // NOTE: In production with thousands of stores, we'd need Meilisearch/Algolia.
        // Here we'll query collection "stores" and filter client side for the prototype (assuming <100 stores).

        try {
            const q = query(collection(db, "stores"), where("deletedAt", "==", null));
            const snapshot = await getDocs(q);
            const allStores = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Store));

            const lowerTerm = searchTerm.toLowerCase();
            return allStores.filter(s => s.name.toLowerCase().includes(lowerTerm));
        } catch (e) {
            console.error("Search failed:", e);
            return [];
        }
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
