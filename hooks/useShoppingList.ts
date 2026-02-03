import { useState, useEffect, useCallback, useRef } from 'react';
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
    deleteDoc,
    orderBy,
    serverTimestamp,
    setDoc
} from '../services/firebase';
import type { User } from '../services/firebase';

const STORAGE_KEY = 'handleliste_current_list_id';

export interface UseShoppingListReturn {
    lists: SharedList[];
    currentListId: string | null;
    setCurrentListId: (id: string | null) => void;
    items: ShoppingItem[];
    updateItems: (items: ShoppingItem[]) => Promise<void>; // Deprecated
    createList: (name: string) => Promise<void>;
    inviteCollaborator: (email: string) => Promise<boolean>;
    currentListName: string;
    renameList: (id: string, newName: string) => Promise<boolean>;
    deleteList: (id: string) => Promise<boolean>;
    toggleListVisibility: (id: string) => Promise<boolean>;
    removeCollaborator: (listId: string, email: string) => Promise<boolean>;
    leaveList: (id: string) => Promise<boolean>;
    isOwner: (listId: string) => boolean;
    addItem: (item: Omit<ShoppingItem, 'id' | 'createdAt'>) => Promise<void>;
    updateItem: (id: string, updates: Partial<ShoppingItem>) => Promise<void>;
    removeItem: (id: string) => Promise<void>;
}

export const useShoppingList = (user: User | null): UseShoppingListReturn => {
    const [lists, setLists] = useState<SharedList[]>([]);
    const [currentListId, setCurrentListId] = useState<string | null>(() => {
        // Try to restore from localStorage on initial load
        return localStorage.getItem(STORAGE_KEY);
    });
    const [items, setItems] = useState<ShoppingItem[]>([]);
    const [currentListItemsFetched, setCurrentListItemsFetched] = useState(false);

    // Save currentListId to localStorage whenever it changes
    useEffect(() => {
        if (currentListId) {
            localStorage.setItem(STORAGE_KEY, currentListId);
        } else {
            localStorage.removeItem(STORAGE_KEY);
        }
    }, [currentListId]);

    // Fetch lists user has access to
    useEffect(() => {
        if (!user || !user.email) {
            setLists([]);
            setItems([]);
            return;
        }

        const userEmail = user.email.toLowerCase();

        // Query lists where user is a collaborator
        const q = query(
            collection(db, "lists"),
            where("collaborators", "array-contains", userEmail)
            // orderBy removed to avoid requiring composite index and ensure instant subscription
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedLists = snapshot.docs
                .map(d => ({
                    id: d.id,
                    ...d.data()
                } as SharedList))
                .filter(list => !list.deletedAt)
                .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)); // Client-side sort

            setLists(fetchedLists);

            // Auto-select logic:
            // 1. If we have a stored ID and it exists in fetched lists, keep it.
            // 2. Otherwise, if lists exist, select the most recently updated one.
            if (fetchedLists.length > 0) {
                const stillExists = currentListId && fetchedLists.some(l => l.id === currentListId);
                if (!stillExists) {
                    setCurrentListId(fetchedLists[0].id);
                }
            } else {
                setCurrentListId(null);
            }
        }, (error) => {
            console.error("Error fetching lists:", error);
        });

        return unsubscribe;
    }, [user?.email]); // Re-run if user email changes (e.g. login/logout)

    // Sync current list items (from subcollection)
    useEffect(() => {
        if (!currentListId) {
            setItems([]);
            setCurrentListItemsFetched(false);
            return;
        }

        // Subscribe to items subcollection
        const itemsQuery = collection(db, "lists", currentListId, "items");
        const unsubscribe = onSnapshot(itemsQuery, (snapshot) => {
            const fetchedItems = snapshot.docs.map(d => ({
                id: d.id,
                ...d.data()
            } as ShoppingItem));

            // Client-side sort by createdAt descending
            setItems(fetchedItems.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)));
            setCurrentListItemsFetched(true);
        }, (error) => {
            console.error("Error fetching list items:", error);
        });

        return unsubscribe;
    }, [currentListId]);

    // Handle Migration: Move items from array to subcollection
    useEffect(() => {
        if (!currentListId || !currentListItemsFetched) return;

        const legacyList = lists.find(l => l.id === currentListId) as any;
        // Check if the legacy "items" array exists and has data
        if (legacyList && legacyList.items && Array.isArray(legacyList.items) && legacyList.items.length > 0) {
            console.log(`Migrating ${legacyList.items.length} items to subcollection for list ${currentListId}`);

            const migrate = async () => {
                for (const item of legacyList.items) {
                    const itemRef = doc(db, "lists", currentListId, "items", item.id || crypto.randomUUID());
                    await setDoc(itemRef, {
                        ...item,
                        createdAt: item.createdAt || Date.now()
                    });
                }

                // Clear the legacy array and update timestamp
                await updateDoc(doc(db, "lists", currentListId), {
                    items: [], // Clear array
                    updatedAt: serverTimestamp()
                });
            };

            migrate().catch(err => console.error("Migration failed:", err));
        }
    }, [currentListId, currentListItemsFetched, lists]);

    const createList = useCallback(async (name: string) => {
        if (!user || !user.email) return;

        try {
            const userEmail = user.email.toLowerCase();
            const newList = {
                name,
                ownerId: user.uid,
                ownerEmail: userEmail,
                collaborators: [userEmail],
                // items: [], // No longer needed as it's a subcollection
                updatedAt: serverTimestamp(),
                isPrivate: true
            };

            const docRef = await addDoc(collection(db, "lists"), newList);
            setCurrentListId(docRef.id);
        } catch (e) {
            console.error("Failed to create list:", e);
        }
    }, [user]);

    const addItem = useCallback(async (item: Omit<ShoppingItem, 'id' | 'createdAt'>) => {
        if (!currentListId) return;
        const id = crypto.randomUUID();
        await setDoc(doc(db, "lists", currentListId, "items", id), {
            ...item,
            id,
            createdAt: Date.now() // Local time for initial sort, will be stable
        });

        // Update parent updatedAt
        await updateDoc(doc(db, "lists", currentListId), {
            updatedAt: serverTimestamp()
        });
    }, [currentListId]);

    const updateItem = useCallback(async (id: string, updates: Partial<ShoppingItem>) => {
        if (!currentListId) return;
        await updateDoc(doc(db, "lists", currentListId, "items", id), updates);

        // Update parent updatedAt
        await updateDoc(doc(db, "lists", currentListId), {
            updatedAt: serverTimestamp()
        });
    }, [currentListId]);

    const removeItem = useCallback(async (id: string) => {
        if (!currentListId) return;
        await deleteDoc(doc(db, "lists", currentListId, "items", id));

        // Update parent updatedAt
        await updateDoc(doc(db, "lists", currentListId), {
            updatedAt: serverTimestamp()
        });
    }, [currentListId]);

    // Legacy updateItems (kept for compatibility during transition if needed, 
    // but we should phase it out)
    const updateItems = useCallback(async (newItems: ShoppingItem[]) => {
        console.warn("useShoppingList: updateItems is deprecated. Use granular methods.");
        // We'll just update the parent timestamp to trigger migration if needed
        if (!currentListId) return;
        await updateDoc(doc(db, "lists", currentListId), {
            updatedAt: serverTimestamp()
        });
    }, [currentListId]);

    const inviteCollaborator = useCallback(async (email: string): Promise<boolean> => {
        if (!currentListId || !email.trim()) return false;

        try {
            await updateDoc(doc(db, "lists", currentListId), {
                collaborators: arrayUnion(email.trim().toLowerCase()),
                isPrivate: false,
                updatedAt: serverTimestamp()
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
                updatedAt: serverTimestamp()
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
                deletedAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });

            if (currentListId === id) {
                // The useEffect will handle fallback to the next available list
                localStorage.removeItem(STORAGE_KEY);
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
                updatedAt: serverTimestamp()
            });
            return true;
        } catch (e) {
            console.error("Failed to toggle visibility:", e);
            return false;
        }
    }, [lists]);

    const removeCollaborator = useCallback(async (listId: string, email: string): Promise<boolean> => {
        try {
            const lowerEmail = email.toLowerCase();
            await updateDoc(doc(db, "lists", listId), {
                collaborators: arrayRemove(lowerEmail),
                updatedAt: serverTimestamp()
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
            const userEmail = user.email.toLowerCase();
            await updateDoc(doc(db, "lists", id), {
                collaborators: arrayRemove(userEmail),
                updatedAt: serverTimestamp()
            });
            if (currentListId === id) {
                localStorage.removeItem(STORAGE_KEY);
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
        updateItems, // Deprecated
        addItem,
        updateItem,
        removeItem,
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
