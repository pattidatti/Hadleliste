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
    arrayUnion,
    arrayRemove,
    deleteDoc
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
    renameList: (id: string, newName: string) => Promise<boolean>;
    deleteList: (id: string) => Promise<boolean>;
    toggleListVisibility: (id: string) => Promise<boolean>;
    removeCollaborator: (listId: string, email: string) => Promise<boolean>;
    leaveList: (id: string) => Promise<boolean>;
    isOwner: (listId: string) => boolean;
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
            const fetchedLists = snapshot.docs
                .map(d => ({
                    id: d.id,
                    ...d.data()
                } as SharedList))
                .filter(list => !list.deletedAt);
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
            updatedAt: Date.now(),
            isPrivate: true
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
                collaborators: arrayUnion(email.trim().toLowerCase()),
                isPrivate: false
            });
            return true;
        } catch (e) {
            console.error("Failed to invite collaborator:", e);
            return false;
        }
    }, [currentListId]);

    const renameList = useCallback(async (id: string, newName: string): Promise<boolean> => {
        if (!newName.trim()) return false;
        try {
            await updateDoc(doc(db, "lists", id), {
                name: newName.trim(),
                updatedAt: Date.now()
            });
            return true;
        } catch (e) {
            console.error("Failed to rename list:", e);
            return false;
        }
    }, []);

    const deleteList = useCallback(async (id: string): Promise<boolean> => {
        try {
            // Soft delete: Mark as deleted instead of removing document
            await updateDoc(doc(db, "lists", id), {
                deletedAt: Date.now(),
                updatedAt: Date.now()
            });

            if (currentListId === id) {
                setCurrentListId(null);
            }
            return true;
        } catch (e) {
            console.error("Failed to delete list:", e);
            return false;
        }
    }, [currentListId]);

    const toggleListVisibility = useCallback(async (id: string): Promise<boolean> => {
        const list = lists.find(l => l.id === id);
        if (!list) return false;
        try {
            await updateDoc(doc(db, "lists", id), {
                isPrivate: !list.isPrivate,
                updatedAt: Date.now()
            });
            return true;
        } catch (e) {
            console.error("Failed to toggle visibility:", e);
            return false;
        }
    }, [lists]);

    const removeCollaborator = useCallback(async (listId: string, email: string): Promise<boolean> => {
        try {
            await updateDoc(doc(db, "lists", listId), {
                collaborators: arrayRemove(email),
                updatedAt: Date.now()
            });
            return true;
        } catch (e) {
            console.error("Failed to remove collaborator:", e);
            return false;
        }
    }, []);

    const leaveList = useCallback(async (id: string): Promise<boolean> => {
        if (!user?.email) return false;
        try {
            await updateDoc(doc(db, "lists", id), {
                collaborators: arrayRemove(user.email),
                updatedAt: Date.now()
            });
            if (currentListId === id) {
                setCurrentListId(null);
            }
            return true;
        } catch (e) {
            console.error("Failed to leave list:", e);
            return false;
        }
    }, [user?.email, currentListId]);

    const isOwner = useCallback((listId: string) => {
        const list = lists.find(l => l.id === listId);
        return list?.ownerId === user?.uid;
    }, [lists, user?.uid]);

    const currentListName = lists.find(l => l.id === currentListId)?.name || "Laster...";

    return {
        lists,
        currentListId,
        setCurrentListId,
        items,
        updateItems,
        createList,
        inviteCollaborator,
        currentListName,
        renameList,
        deleteList,
        toggleListVisibility,
        removeCollaborator,
        leaveList,
        isOwner
    };
};

export default useShoppingList;
