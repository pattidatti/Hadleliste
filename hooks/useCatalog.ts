import { useState, useEffect, useCallback } from 'react';
import { db, doc, onSnapshot, setDoc, updateDoc, collection, query } from '../services/firebase';
import { Product } from '../types';

export const useCatalog = () => {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const q = query(collection(db, "products"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedProducts = snapshot.docs.map(doc => doc.data() as Product);
            setProducts(fetchedProducts);
            setLoading(false);
        });

        return unsubscribe;
    }, []);

    const addOrUpdateProduct = useCallback(async (name: string, price?: number, category?: string) => {
        const id = name.trim().toLowerCase();
        const existingProduct = products.find(p => p.id === id);

        const now = Date.now();

        if (existingProduct) {
            // Update existing
            const updates: Partial<Product> = {
                lastUpdated: now,
                count: (existingProduct.count || 0) + 1
            };
            if (price !== undefined) updates.price = price;
            if (category !== undefined) updates.category = category;

            // Should properly use updateDoc but we need reference, which we know is 'products/id'
            await updateDoc(doc(db, "products", id), updates);
        } else {
            // Create new
            const newProduct: Product = {
                id,
                name: name.trim(), // Keep original easing
                category: category || "Annet",
                price: price || 0,
                unit: 'stk',
                lastUpdated: now,
                count: 1
            };
            await setDoc(doc(db, "products", id), newProduct);
        }
    }, [products]);

    const getProduct = useCallback((name: string) => {
        return products.find(p => p.id === name.trim().toLowerCase());
    }, [products]);

    const searchProducts = useCallback((searchTerm: string) => {
        const lower = searchTerm.toLowerCase();
        return products.filter(p => p.name.toLowerCase().includes(lower) || p.id.includes(lower));
    }, [products]);

    return {
        products,
        loading,
        addOrUpdateProduct,
        getProduct,
        searchProducts
    };
};
