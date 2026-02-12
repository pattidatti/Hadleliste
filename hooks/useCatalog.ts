import { useState, useEffect, useCallback } from 'react';
import { db, doc, onSnapshot, setDoc, updateDoc, collection, query, writeBatch, collectionGroup, where, getDocs } from '../services/firebase';
import { Product, PriceHistoryRecord } from '../types';
import { useAuth } from './useAuth';

const capitalizeFirstLetter = (str: string) => {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
};

export const useCatalog = () => {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const { user } = useAuth();

    const syncProductToAllLists = useCallback(async (productName: string, updates: { category?: string, price?: number }) => {
        if (!updates.category && updates.price === undefined) return;

        try {
            // Find all items in any list matching the name (case-insensitive search would be better, but we use normalized name)
            const q = query(collectionGroup(db, "items"), where("name", "==", productName));
            const snapshot = await getDocs(q);

            if (snapshot.empty) return;

            // Update in chunks to avoid batch limit (500)
            const docs = snapshot.docs;
            for (let i = 0; i < docs.length; i += 500) {
                const batch = writeBatch(db);
                const chunk = docs.slice(i, i + 500);

                chunk.forEach(itemDoc => {
                    batch.update(itemDoc.ref, updates);
                });

                await batch.commit();
            }
            console.log(`Synced ${docs.length} instances of ${productName}`);
        } catch (error) {
            console.error("Failed to sync product to lists:", error);
        }
    }, []);

    useEffect(() => {
        const q = query(collection(db, "products"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedProducts = snapshot.docs.map(doc => doc.data() as Product);
            setProducts(fetchedProducts);
            setLoading(false);
        });

        return unsubscribe;
    }, []);

    const recordPriceHistory = useCallback(async (productId: string, oldPrice: number, newPrice: number) => {
        if (oldPrice === newPrice) return;

        const historyRef = doc(collection(db, "products", productId, "history"));
        const historyEntry: PriceHistoryRecord = {
            oldPrice,
            newPrice,
            updatedAt: Date.now(),
            updatedBy: user?.email || 'unknown'
        };

        await setDoc(historyRef, historyEntry);
    }, [user]);

    const addOrUpdateProduct = useCallback(async (name: string, price?: number, category?: string) => {
        const trimmedName = name.trim();
        const capitalizedName = capitalizeFirstLetter(trimmedName);
        const id = capitalizedName.toLowerCase();
        const existingProduct = products.find(p => p.id === id);
        const now = Date.now();
        const batch = writeBatch(db);

        if (existingProduct) {
            const updates: Partial<Product> = {
                lastUpdated: now,
                count: (existingProduct.count || 0) + 1,
                deleted: false // Ensure it's not deleted if being re-added/updated
            };
            if (price !== undefined) updates.price = price;
            if (category !== undefined) updates.category = category;

            batch.update(doc(db, "products", id), updates);

            // Record history if price changed
            if (price !== undefined && price !== existingProduct.price) {
                const historyRef = doc(collection(db, "products", id, "history"));
                batch.set(historyRef, {
                    oldPrice: existingProduct.price,
                    newPrice: price,
                    updatedAt: now,
                    updatedBy: user?.email || 'unknown'
                });
            }
        } else {
            const newProduct: Product = {
                id,
                name: capitalizedName,
                category: category || "Annet",
                price: price || 0,
                unit: 'stk',
                lastUpdated: now,
                count: 1
            };
            batch.set(doc(db, "products", id), newProduct);

            // Initial history entry
            if (price !== undefined && price > 0) {
                const historyRef = doc(collection(db, "products", id, "history"));
                batch.set(historyRef, {
                    oldPrice: 0,
                    newPrice: price,
                    updatedAt: now,
                    updatedBy: user?.email || 'unknown'
                });
            }
        }
        await batch.commit();

        // Sync updates to all active lists if category or price changed
        if (existingProduct) {
            const syncUpdates: any = {};
            if (category !== undefined && category !== existingProduct.category) syncUpdates.category = category;
            if (price !== undefined && price !== existingProduct.price) syncUpdates.price = price;

            if (Object.keys(syncUpdates).length > 0) {
                await syncProductToAllLists(existingProduct.name, syncUpdates);
            }
        }
    }, [products, user, syncProductToAllLists]);

    const updateProduct = useCallback(async (productId: string, updates: Partial<Product>) => {
        const existing = products.find(p => p.id === productId);
        const now = Date.now();
        const batch = writeBatch(db);

        batch.update(doc(db, "products", productId), {
            ...updates,
            lastUpdated: now
        });

        if (updates.price !== undefined && existing && updates.price !== existing.price) {
            const historyRef = doc(collection(db, "products", productId, "history"));
            batch.set(historyRef, {
                oldPrice: existing.price,
                newPrice: updates.price,
                updatedAt: now,
                updatedBy: user?.email || 'unknown'
            });
        }

        await batch.commit();

        // Sync updates to all active lists
        if (existing && (updates.category !== undefined || updates.price !== undefined)) {
            const syncUpdates: any = {};
            if (updates.category !== undefined && updates.category !== existing.category) syncUpdates.category = updates.category;
            if (updates.price !== undefined && updates.price !== existing.price) syncUpdates.price = updates.price;

            if (Object.keys(syncUpdates).length > 0) {
                await syncProductToAllLists(existing.name, syncUpdates);
            }
        }
    }, [products, user, syncProductToAllLists]);

    const deleteProduct = useCallback(async (productId: string) => {
        if (!window.confirm("Vil du arkivere denne varen? Den kan gjenopprettes senere.")) return;

        await updateDoc(doc(db, "products", productId), {
            deleted: true,
            deletedAt: Date.now(),
            deletedBy: user?.email || 'unknown'
        });
    }, [user]);

    const restoreProduct = useCallback(async (productId: string) => {
        await updateDoc(doc(db, "products", productId), {
            deleted: false,
            deletedAt: null,
            deletedBy: null
        });
    }, []);

    const getProduct = useCallback((name: string) => {
        return products.find(p => p.id === name.trim().toLowerCase());
    }, [products]);

    const searchProducts = useCallback((searchTerm: string) => {
        const lower = searchTerm.toLowerCase();
        return products.filter(p => !p.deleted && (p.name.toLowerCase().includes(lower) || p.id.includes(lower)));
    }, [products]);

    return {
        products,
        loading,
        addOrUpdateProduct,
        updateProduct,
        deleteProduct,
        restoreProduct,
        getProduct,
        searchProducts
    };
};
