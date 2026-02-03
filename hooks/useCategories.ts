import { useState, useEffect, useCallback } from 'react';
import { db, doc, onSnapshot, setDoc, updateDoc, collection, query, getDocs, writeBatch } from '../services/firebase';
import { CATEGORIES as DEFAULT_CATEGORIES } from '../constants/commonItems';

export const useCategories = () => {
    const [categories, setCategories] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const configDoc = doc(db, "configuration", "global");
        const unsubscribe = onSnapshot(configDoc, (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.data();
                setCategories(data.categories || []);
            } else {
                // Seed with defaults
                setCategories(DEFAULT_CATEGORIES);
                setDoc(configDoc, { categories: DEFAULT_CATEGORIES });
            }
            setLoading(false);
        });

        return unsubscribe;
    }, []);

    const addCategory = useCallback(async (name: string) => {
        const trimmed = name.trim();
        if (!trimmed || categories.includes(trimmed)) return;

        const newCategories = [...categories, trimmed];
        await updateDoc(doc(db, "configuration", "global"), {
            categories: newCategories
        });
    }, [categories]);

    const deleteCategory = useCallback(async (name: string) => {
        if (!window.confirm(`Er du sikker på at du vil slette kategorien "${name}"? Alle varer i denne kategorien vil bli flyttet til "Annet".`)) return;

        const newCategories = categories.filter(c => c !== name);
        const batch = writeBatch(db);

        // 1. Update the category list
        batch.update(doc(db, "configuration", "global"), {
            categories: newCategories
        });

        // 2. Move products to "Annet"
        const productsRef = collection(db, "products");
        const q = query(productsRef);
        const snapshot = await getDocs(q);

        snapshot.forEach((productDoc) => {
            if (productDoc.data().category === name) {
                batch.update(productDoc.ref, { category: 'Annet' });
            }
        });

        await batch.commit();
    }, [categories]);

    const renameCategory = useCallback(async (oldName: string, newName: string) => {
        const trimmedNew = newName.trim();
        if (!trimmedNew || categories.includes(trimmedNew) || oldName === trimmedNew) return;

        const newCategories = categories.map(c => c === oldName ? trimmedNew : c);
        const batch = writeBatch(db);

        // 1. Update the category list
        batch.update(doc(db, "configuration", "global"), {
            categories: newCategories
        });

        // 2. Update all products in this category
        const productsRef = collection(db, "products");
        const q = query(productsRef);
        const snapshot = await getDocs(q);

        snapshot.forEach((productDoc) => {
            if (productDoc.data().category === oldName) {
                batch.update(productDoc.ref, { category: trimmedNew });
            }
        });

        await batch.commit();
    }, [categories]);

    return {
        categories,
        loading,
        addCategory,
        deleteCategory,
        renameCategory
    };
};
