import { useState, useEffect, useCallback, useRef } from 'react';
import { ShoppingItem, SharedList, ShoppingSession, SessionItem } from '../types';
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
    setDoc,
    or,
    writeBatch
} from '../services/firebase';
import type { User } from '../services/firebase';

const STORAGE_KEY = 'handleliste_current_list_id';

export interface UseShoppingListReturn {
    lists: SharedList[];
    currentListId: string | null;
    setCurrentListId: (id: string | null) => void;
    items: ShoppingItem[];
    updateItems: (items: ShoppingItem[]) => Promise<void>; // Deprecated
    createList: (name: string) => Promise<string | null>;
    inviteCollaborator: (email: string) => Promise<boolean>;
    currentListName: string;
    renameList: (id: string, newName: string) => Promise<boolean>;
    deleteList: (id: string) => Promise<boolean>;
    deleteLists: (ids: string[]) => Promise<boolean>;
    toggleListVisibility: (id: string) => Promise<boolean>;
    removeCollaborator: (listId: string, email: string) => Promise<boolean>;
    leaveList: (id: string) => Promise<boolean>;
    isOwner: (listId: string) => boolean;
    addItem: (item: Omit<ShoppingItem, 'id' | 'createdAt' | 'sortOrder'>, targetListId?: string) => Promise<void>;
    updateItem: (id: string, updates: Partial<ShoppingItem>) => Promise<void>;
    reorderItems: (orderedIds: string[]) => Promise<void>;
    removeItem: (id: string) => Promise<void>;
    resetBoughtItems: (archive?: boolean) => Promise<boolean>;
    startStoreSession: () => void;
    completeShoppingTrip: (storeName?: string) => CompleteTripResult;
    setActiveStore: (storeId: string) => Promise<void>;
    archiveList: (id: string) => Promise<boolean>;
    unarchiveList: (id: string) => Promise<boolean>;
    syncItemsWithCatalog: (catalog: any[]) => Promise<void>;
}

export interface CompleteTripResult {
    success: boolean;
    missedItems: ShoppingItem[];
    session?: Omit<ShoppingSession, 'id'>;
}

export const useShoppingList = (user: User | null): UseShoppingListReturn => {
    const [lists, setLists] = useState<SharedList[]>([]);
    const [currentListId, setCurrentListId] = useState<string | null>(() => {
        // Try to restore from localStorage on initial load
        return localStorage.getItem(STORAGE_KEY);
    });
    const [items, setItems] = useState<ShoppingItem[]>([]);
    const [currentListItemsFetched, setCurrentListItemsFetched] = useState(false);
    const [storeSessionStart, setStoreSessionStart] = useState<number | null>(null);

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

        const userEmail = user.email.trim().toLowerCase();

        // Query lists where user is either the owner OR a collaborator
        const q = query(
            collection(db, "lists"),
            or(
                where("ownerId", "==", user.uid),
                where("collaborators", "array-contains", userEmail)
            )
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedLists = snapshot.docs
                .map(d => ({
                    id: d.id,
                    ...d.data()
                } as SharedList))
                .filter(list => !list.deletedAt)
                .sort((a, b) => {
                    const timeA = (a.updatedAt as any)?.toMillis?.() || a.updatedAt || 0;
                    const timeB = (b.updatedAt as any)?.toMillis?.() || b.updatedAt || 0;
                    return timeB - timeA;
                }); // Client-side sort

            setLists(fetchedLists);

            // Auto-select logic:
            // 1. Favor active lists. If the current list gets archived, jump to another active list.
            const activeLists = fetchedLists.filter(l => !l.completedAt);
            if (activeLists.length > 0) {
                const currentIsStillActive = currentListId && activeLists.some(l => l.id === currentListId);
                if (!currentIsStillActive) {
                    setCurrentListId(activeLists[0].id);
                }
            } else {
                // No active lists left
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

            // Client-side sort by sortOrder ascending, then createdAt descending
            setItems(fetchedItems.sort((a, b) => {
                if ((a.sortOrder || 0) !== (b.sortOrder || 0)) {
                    return (a.sortOrder || 0) - (b.sortOrder || 0);
                }
                return (b.createdAt || 0) - (a.createdAt || 0);
            }));
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

    const createList = useCallback(async (name: string): Promise<string | null> => {
        if (!user || !user.email) return null;

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
            return docRef.id;
        } catch (e) {
            console.error("Failed to create list:", e);
            return null;
        }
    }, [user]);

    const addItem = useCallback(async (item: Omit<ShoppingItem, 'id' | 'createdAt' | 'sortOrder'>, targetListId?: string) => {
        const listToUse = targetListId || currentListId;
        if (!listToUse) return;
        const id = crypto.randomUUID();
        // Calculate next sortOrder (approximate if targeting external list)
        const maxSortOrder = (items.length > 0 && listToUse === currentListId)
            ? Math.max(...items.map(i => i.sortOrder || 0))
            : 0;

        await setDoc(doc(db, "lists", listToUse, "items", id), {
            ...item,
            id,
            createdAt: Date.now(),
            sortOrder: maxSortOrder + 1
        });

        // Update parent updatedAt
        await updateDoc(doc(db, "lists", listToUse), {
            updatedAt: serverTimestamp()
        });
    }, [currentListId, items]);

    const updateItem = useCallback(async (id: string, updates: Partial<ShoppingItem>) => {
        if (!currentListId) return;

        // Shadow Learner: Capture check timestamp when marking as bought
        const enhancedUpdates = { ...updates };
        if (updates.isBought === true) {
            enhancedUpdates.checkedAt = Date.now();
        } else if (updates.isBought === false) {
            enhancedUpdates.checkedAt = undefined; // Clear when unchecking
        }

        await updateDoc(doc(db, "lists", currentListId, "items", id), enhancedUpdates);

        // Update parent updatedAt
        await updateDoc(doc(db, "lists", currentListId), {
            updatedAt: serverTimestamp()
        });
    }, [currentListId]);

    const reorderItems = useCallback(async (orderedIds: string[]) => {
        if (!currentListId) return;

        try {
            const batch = writeBatch(db);
            orderedIds.forEach((id, index) => {
                const itemRef = doc(db, "lists", currentListId, "items", id);
                batch.update(itemRef, { sortOrder: index });
            });

            await batch.commit();
        } catch (e) {
            console.error("Failed to reorder items:", e);
        }
    }, [currentListId]);

    const removeItem = useCallback(async (id: string) => {
        if (!currentListId) return;
        await deleteDoc(doc(db, "lists", currentListId, "items", id));

        // Update parent updatedAt
        await updateDoc(doc(db, "lists", currentListId), {
            updatedAt: serverTimestamp()
        });
    }, [currentListId]);

    const resetBoughtItems = useCallback(async (archive = false): Promise<boolean> => {
        if (!currentListId || !user?.email) return false;

        try {
            const boughtItems = items.filter(i => i.isBought);
            if (boughtItems.length === 0) return true;

            // Shadow Learner: Calculate category order from check sequence
            const itemsWithCheckTime = boughtItems
                .filter(i => i.checkedAt) // Only items with check timestamps
                .sort((a, b) => (a.checkedAt || 0) - (b.checkedAt || 0));

            // Extract unique category sequence from the check order
            const learnedCategoryOrder: string[] = [];
            itemsWithCheckTime.forEach(item => {
                if (!learnedCategoryOrder.includes(item.category)) {
                    learnedCategoryOrder.push(item.category);
                }
            });

            const batch = writeBatch(db);
            const now = serverTimestamp();

            // Reset items
            boughtItems.forEach(item => {
                const docRef = doc(db, "lists", currentListId, "items", item.id);
                batch.update(docRef, { isBought: false, checkedAt: null });
            });

            // Update list with learned category order and last shopper
            if (learnedCategoryOrder.length > 0) {
                batch.update(doc(db, "lists", currentListId), {
                    updatedAt: now,
                    categoryOrder: learnedCategoryOrder,
                    lastShopperEmail: user.email.toLowerCase()
                });
            } else {
                batch.update(doc(db, "lists", currentListId), { updatedAt: now });
            }

            // Optional: Archive the list
            if (archive) {
                batch.update(doc(db, "lists", currentListId), {
                    completedAt: Date.now(),
                    updatedAt: now
                });

                // Auto-nav logic: If we archive the current list, the useEffect will stay on it
                // unless we manually trigger a change or the snapshot filters it.
                // We want to KEEP it in the lists array (for history), so we don't change snapshot filtering.
            }

            await batch.commit();
            return true;
        } catch (e) {
            console.error("Failed to reset items:", e);
            return false;
        }
    }, [currentListId, items]);

    // Start timing when user enters Store mode
    const startStoreSession = useCallback(() => {
        setStoreSessionStart(Date.now());
    }, []);

    // Complete a shopping trip and prepare session data
    const completeShoppingTrip = useCallback((storeName?: string): CompleteTripResult => {
        if (!currentListId || !user?.email) {
            return { success: false, missedItems: [] };
        }

        const now = Date.now();
        const boughtItems = items.filter(i => i.isBought);
        const missedItems = items.filter(i => !i.isBought);
        const listName = lists.find(l => l.id === currentListId)?.name || 'Ukjent liste';

        const sessionItems: SessionItem[] = boughtItems.map(i => ({
            name: i.name,
            quantity: i.quantity,
            price: i.price,
            category: i.category
        }));

        const session: Omit<ShoppingSession, 'id'> = {
            listId: currentListId,
            listName,
            completedAt: now,
            completedBy: user.email.toLowerCase(),
            items: sessionItems,
            totalSpent: boughtItems.reduce((sum, i) => sum + (i.price * i.quantity), 0),
            missedItems: missedItems.map(i => i.name),
            startedAt: storeSessionStart || now,
            duration: storeSessionStart ? now - storeSessionStart : undefined,
            dayOfWeek: new Date(now).getDay(),
            hourOfDay: new Date(now).getHours(),
            storeName
        };

        return { success: true, missedItems, session };
    }, [currentListId, lists, items, user?.email, storeSessionStart]);

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

        const cleanEmail = email.trim().toLowerCase();
        // Don't invite yourself
        if (user?.email && cleanEmail === user.email.toLowerCase()) return false;

        try {
            const batch = writeBatch(db);
            const listRef = doc(db, "lists", currentListId);

            // 1. Add to collaborators list
            batch.update(listRef, {
                collaborators: arrayUnion(cleanEmail),
                isPrivate: false,
                updatedAt: serverTimestamp()
            });

            // 2. Queue email notification
            const mailRef = doc(collection(db, "mail"));
            const currentList = lists.find(l => l.id === currentListId);
            const listName = currentList?.name || "en handleliste";

            batch.set(mailRef, {
                to: [cleanEmail],
                message: {
                    subject: `Invitasjon til handleliste: ${listName}`,
                    html: `
                        <div style="font-family: sans-serif; padding: 20px; color: #333;">
                            <h2>Du har blitt invitert!</h2>
                            <p>${user?.email || 'En bruker'} har invitert deg til å samarbeide på handlelisten <strong>${listName}</strong>.</p>
                            <p>Åpne appen for å se listen:</p>
                            <a href="https://handleliste.haaland.de" style="display: inline-block; background: #000; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Åpne Handleliste</a>
                        </div>
                    `,
                },
                createdAt: serverTimestamp()
            });

            await batch.commit();
            return true;
        } catch (e) {
            console.error("Failed to invite collaborator:", e);
            return false;
        }
    }, [currentListId, lists, user]);

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

    const deleteLists = useCallback(async (ids: string[]): Promise<boolean> => {
        if (ids.length === 0) return true;
        try {
            const batch = writeBatch(db);
            const now = serverTimestamp();

            ids.forEach(id => {
                const docRef = doc(db, "lists", id);
                batch.update(docRef, {
                    deletedAt: now,
                    updatedAt: now
                });
            });

            await batch.commit();

            if (currentListId && ids.includes(currentListId)) {
                localStorage.removeItem(STORAGE_KEY);
            }
            return true;
        } catch (e) {
            console.error("Failed to delete lists:", e);
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

    const setActiveStore = useCallback(async (storeId: string) => {
        if (!currentListId) return;
        try {
            await updateDoc(doc(db, "lists", currentListId), {
                activeStoreId: storeId,
                updatedAt: serverTimestamp()
            });
        } catch (e) {
            console.error("Failed to set active store:", e);
        }
    }, [currentListId]);

    return {
        lists,
        currentListId,
        setCurrentListId,
        items,
        updateItems, // Deprecated
        addItem,
        updateItem,
        reorderItems,
        removeItem,
        resetBoughtItems,
        startStoreSession,
        completeShoppingTrip,
        createList,
        inviteCollaborator,
        currentListName,
        renameList,
        deleteList,
        deleteLists,
        toggleListVisibility,
        removeCollaborator,
        leaveList,
        isOwner,
        setActiveStore,
        archiveList: useCallback(async (id: string) => {
            try {
                await updateDoc(doc(db, "lists", id), {
                    completedAt: Date.now(),
                    updatedAt: serverTimestamp()
                });
                return true;
            } catch (e) {
                console.error("Failed to archive list:", e);
                return false;
            }
        }, []),
        unarchiveList: useCallback(async (id: string) => {
            try {
                await updateDoc(doc(db, "lists", id), {
                    completedAt: null,
                    updatedAt: serverTimestamp()
                });
                return true;
            } catch (e) {
                console.error("Failed to unarchive list:", e);
                return false;
            }
        }, []),
        syncItemsWithCatalog: useCallback(async (catalog: any[]) => {
            if (!currentListId || items.length === 0 || catalog.length === 0) return;

            // Create a Map for O(1) lookups
            const catalogMap = new Map(catalog.map(p => [p.id, p]));
            const updates: { id: string, data: any }[] = [];

            items.forEach(item => {
                const product = catalogMap.get(item.name.toLowerCase());
                if (product) {
                    const needsUpdate = (product.category && item.category !== product.category) ||
                        (product.price !== undefined && item.price !== product.price);

                    if (needsUpdate) {
                        updates.push({
                            id: item.id,
                            data: {
                                category: product.category,
                                price: product.price
                            }
                        });
                    }
                }
            });

            if (updates.length === 0) return;

            console.log(`Auto-syncing ${updates.length} items with catalog for list ${currentListId}`);

            try {
                // Batch update in chunks of 500
                for (let i = 0; i < updates.length; i += 500) {
                    const batch = writeBatch(db);
                    const chunk = updates.slice(i, i + 500);
                    chunk.forEach(u => {
                        const itemRef = doc(db, "lists", currentListId, "items", u.id);
                        batch.update(itemRef, u.data);
                    });
                    await batch.commit();
                }
            } catch (e) {
                console.error("Failed to sync items with catalog:", e);
            }
        }, [currentListId, items])
    };
};

export default useShoppingList;
