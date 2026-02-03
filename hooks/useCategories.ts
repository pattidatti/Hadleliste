import { useState, useEffect, useCallback } from 'react';
import { db, doc, onSnapshot, setDoc, updateDoc, collection, query, getDocs, writeBatch } from '../services/firebase';
import { CATEGORIES as DEFAULT_CATEGORIES } from '../constants/commonItems';

export const useCategories = () => {
    const [categories, setCategories] = useState<string[]>([]);
    const [archivedCategories, setArchivedCategories] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const configDoc = doc(db, "configuration", "global");
        const unsubscribe = onSnapshot(configDoc, (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.data();
                setCategories(data.categories || []);
                setArchivedCategories(data.archivedCategories || []);
            } else {
                // Seed with defaults
                setCategories(DEFAULT_CATEGORIES);
                setArchivedCategories([]);
                setDoc(configDoc, { categories: DEFAULT_CATEGORIES, archivedCategories: [] });
            }
            setLoading(false);
        });

        return unsubscribe;
    }, []);

    const addCategory = useCallback(async (name: string) => {
        const trimmed = name.trim();
        if (!trimmed || categories.includes(trimmed)) return;

        // If it was archived, remove it from archived
        const newArchived = archivedCategories.filter(c => c !== trimmed);
        const newCategories = [...categories, trimmed];

        await updateDoc(doc(db, "configuration", "global"), {
            categories: newCategories,
            archivedCategories: newArchived
        });
    }, [categories, archivedCategories]);

    const deleteCategory = useCallback(async (name: string) => {
        if (!window.confirm(`Vil du arkivere kategorien "${name}"? Alle varer i denne kategorien vil bli flyttet til "Annet".`)) return;

        const newCategories = categories.filter(c => c !== name);
        const newArchived = Array.from(new Set([...archivedCategories, name]));
        const batch = writeBatch(db);

        // 1. Update the category lists
        batch.update(doc(db, "configuration", "global"), {
            categories: newCategories,
            archivedCategories: newArchived
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
    }, [categories, archivedCategories]);

    const restoreCategory = useCallback(async (name: string) => {
        const newArchived = archivedCategories.filter(c => c !== name);
        const newCategories = [...categories, name];

        await updateDoc(doc(db, "configuration", "global"), {
            categories: newCategories,
            archivedCategories: newArchived
        });
    }, [categories, archivedCategories]);

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
        archivedCategories,
        loading,
        addCategory,
        deleteCategory,
        restoreCategory,
        renameCategory
    };
};
