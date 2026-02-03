import { useState, useEffect, useCallback } from 'react';
import { ShoppingItem, SharedList } from '../types';
import {
    db,
    collection,
    doc,
    query,
    where,
    onSnapshot,
    updateDoc,
    addDoc,
    arrayUnion
} from '../services/firebase';
import type { User } from '../services/firebase';

export interface UseShoppingListReturn {
    lists: SharedList[];
    currentListId: string | null;
    setCurrentListId: (id: string | null) => void;
    items: ShoppingItem[];
    updateItems: (items: ShoppingItem[]) => Promise<void>;
    createList: (name: string) => Promise<void>;
    inviteCollaborator: (email: string) => Promise<boolean>;
    currentListName: string;
}

export const useShoppingList = (user: User | null): UseShoppingListReturn => {
    const [lists, setLists] = useState<SharedList[]>([]);
    const [currentListId, setCurrentListId] = useState<string | null>(null);
    const [items, setItems] = useState<ShoppingItem[]>([]);

    // Fetch lists user has access to
    useEffect(() => {
        if (!user) {
            setLists([]);
            setItems([]);
            return;
        }

        const q = query(
            collection(db, "lists"),
            where("collaborators", "array-contains", user.email)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedLists = snapshot.docs.map(d => ({
                id: d.id,
                ...d.data()
            } as SharedList));
            setLists(fetchedLists);

            // Auto-select first list or create new one
            if (fetchedLists.length > 0 && !currentListId) {
                setCurrentListId(fetchedLists[0].id);
            } else if (fetchedLists.length === 0 && !currentListId && user) {
                // Will be handled by createList call from component
            }
        });

        return unsubscribe;
    }, [user, currentListId]);

    // Sync current list items
    useEffect(() => {
        if (!currentListId) {
            setItems([]);
            return;
        }

        const unsubscribe = onSnapshot(doc(db, "lists", currentListId), (docSnap) => {
            if (docSnap.exists()) {
                setItems(docSnap.data().items || []);
            }
        });

        return unsubscribe;
    }, [currentListId]);

    const createList = useCallback(async (name: string) => {
        if (!user) return;

        const newList = {
            name,
            ownerId: user.uid,
            ownerEmail: user.email,
            collaborators: [user.email],
            items: [],
            updatedAt: Date.now()
        };

        const docRef = await addDoc(collection(db, "lists"), newList);
        setCurrentListId(docRef.id);
    }, [user]);

    const updateItems = useCallback(async (newItems: ShoppingItem[]) => {
        if (!currentListId) return;

        await updateDoc(doc(db, "lists", currentListId), {
            items: newItems,
            updatedAt: Date.now()
        });
    }, [currentListId]);

    const inviteCollaborator = useCallback(async (email: string): Promise<boolean> => {
        if (!currentListId || !email.trim()) return false;

        try {
            await updateDoc(doc(db, "lists", currentListId), {
                collaborators: arrayUnion(email.trim().toLowerCase())
            });
            return true;
        } catch (e) {
            console.error("Failed to invite collaborator:", e);
            return false;
        }
    }, [currentListId]);

    const currentListName = lists.find(l => l.id === currentListId)?.name || "Laster...";

    return {
        lists,
        currentListId,
        setCurrentListId,
        items,
        updateItems,
        createList,
        inviteCollaborator,
        currentListName
    };
};

export default useShoppingList;
