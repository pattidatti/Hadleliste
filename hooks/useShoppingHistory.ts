import { useState, useEffect, useCallback, useMemo } from 'react';
import { ShoppingSession, ShoppingStats, RecurringItem, SharedList } from '../types';
import {
    db,
    collection,
    query,
    orderBy,
    onSnapshot,
    addDoc,
    serverTimestamp
} from '../services/firebase';
import type { User } from '../services/firebase';

interface UseShoppingHistoryReturn {
    sessions: ShoppingSession[];
    stats: ShoppingStats | null;
    loading: boolean;
    addSession: (listId: string, session: Omit<ShoppingSession, 'id'>) => Promise<void>;
    getFrequentItems: (limit?: number) => { name: string; count: number }[];
    getRecurringPatterns: () => RecurringItem[];
}

const calculateStats = (sessions: ShoppingSession[]): ShoppingStats | null => {
    if (sessions.length === 0) return null;

    const totalTrips = sessions.length;
    const totalSpent = sessions.reduce((sum, s) => sum + s.totalSpent, 0);
    const avgPerTrip = totalSpent / totalTrips;

    // Calculate frequent items
    const itemCountMap = new Map<string, number>();
    sessions.forEach(session => {
        session.items.forEach(item => {
            const current = itemCountMap.get(item.name) || 0;
            itemCountMap.set(item.name, current + item.quantity);
        });
    });
    const frequentItems = Array.from(itemCountMap.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 20);

    // Calculate monthly spend
    const monthlyMap = new Map<string, number>();
    sessions.forEach(session => {
        const date = new Date(session.completedAt);
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const current = monthlyMap.get(key) || 0;
        monthlyMap.set(key, current + session.totalSpent);
    });
    const monthlySpend = Array.from(monthlyMap.entries())
        .map(([month, amount]) => ({ month, amount }))
        .sort((a, b) => a.month.localeCompare(b.month));

    // Calculate preferred days and hours
    const dayCount = new Map<number, number>();
    const hourCount = new Map<number, number>();
    let totalDuration = 0;
    let durationCount = 0;

    sessions.forEach(session => {
        dayCount.set(session.dayOfWeek, (dayCount.get(session.dayOfWeek) || 0) + 1);
        hourCount.set(session.hourOfDay, (hourCount.get(session.hourOfDay) || 0) + 1);
        if (session.duration) {
            totalDuration += session.duration;
            durationCount++;
        }
    });

    const preferredDays = Array.from(dayCount.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([day]) => day);

    const preferredHours = Array.from(hourCount.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([hour]) => hour);

    const avgDuration = durationCount > 0 ? totalDuration / durationCount : undefined;

    return {
        totalTrips,
        totalSpent,
        avgPerTrip,
        frequentItems,
        monthlySpend,
        preferredDays,
        preferredHours,
        avgDuration
    };
};

export const useShoppingHistory = (
    user: User | null,
    lists: SharedList[]
): UseShoppingHistoryReturn => {
    const [sessions, setSessions] = useState<ShoppingSession[]>([]);
    const [loading, setLoading] = useState(true);

    // Subscribe to shoppingHistory from all accessible lists
    useEffect(() => {
        if (!user?.email || lists.length === 0) {
            setSessions([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        const unsubscribes: (() => void)[] = [];
        const allSessions = new Map<string, ShoppingSession[]>();

        lists.forEach(list => {
            const q = query(
                collection(db, 'lists', list.id, 'shoppingHistory'),
                orderBy('completedAt', 'desc')
            );

            const unsub = onSnapshot(q, (snapshot) => {
                const listSessions = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                } as ShoppingSession));

                allSessions.set(list.id, listSessions);

                // Merge and sort all sessions
                const merged = Array.from(allSessions.values())
                    .flat()
                    .sort((a, b) => b.completedAt - a.completedAt);

                setSessions(merged);
                setLoading(false);
            }, (error) => {
                console.error(`Error fetching history for list ${list.id}:`, error);
            });

            unsubscribes.push(unsub);
        });

        return () => unsubscribes.forEach(fn => fn());
    }, [user?.email, lists]);

    // Calculate stats from sessions
    const stats = useMemo(() => calculateStats(sessions), [sessions]);

    // Add a new session to a specific list's history
    const addSession = useCallback(async (
        listId: string,
        session: Omit<ShoppingSession, 'id'>
    ): Promise<void> => {
        if (!user?.uid) return;

        try {
            await addDoc(collection(db, 'lists', listId, 'shoppingHistory'), {
                ...session,
                createdAt: serverTimestamp()
            });
        } catch (error) {
            console.error('Failed to save session:', error);
            throw error;
        }
    }, [user?.uid]);

    // Get most frequent items across all history
    const getFrequentItems = useCallback((limit = 10): { name: string; count: number }[] => {
        if (!stats) return [];
        return stats.frequentItems.slice(0, limit);
    }, [stats]);

    // Detect recurring purchase patterns
    const getRecurringPatterns = useCallback((): RecurringItem[] => {
        if (sessions.length < 3) return []; // Need at least 3 sessions for patterns

        // Track purchase dates per item
        const itemPurchases = new Map<string, number[]>();

        sessions.forEach(session => {
            session.items.forEach(item => {
                const purchases = itemPurchases.get(item.name) || [];
                purchases.push(session.completedAt);
                itemPurchases.set(item.name, purchases);
            });
        });

        const patterns: RecurringItem[] = [];
        const now = Date.now();

        itemPurchases.forEach((timestamps, name) => {
            if (timestamps.length < 2) return; // Need at least 2 purchases

            // Sort timestamps descending (most recent first)
            timestamps.sort((a, b) => b - a);

            // Calculate intervals between purchases
            const intervals: number[] = [];
            for (let i = 0; i < timestamps.length - 1; i++) {
                const intervalMs = timestamps[i] - timestamps[i + 1];
                const intervalDays = intervalMs / (1000 * 60 * 60 * 24);
                intervals.push(intervalDays);
            }

            if (intervals.length === 0) return;

            const avgIntervalDays = intervals.reduce((a, b) => a + b, 0) / intervals.length;
            const lastPurchased = timestamps[0];
            const daysSinceLastPurchase = (now - lastPurchased) / (1000 * 60 * 60 * 24);

            // Calculate confidence based on regularity (lower std dev = higher confidence)
            const variance = intervals.reduce((sum, i) => sum + Math.pow(i - avgIntervalDays, 2), 0) / intervals.length;
            const stdDev = Math.sqrt(variance);
            const confidence = Math.max(0, Math.min(1, 1 - (stdDev / avgIntervalDays)));

            // Only include items with reasonable patterns (7-90 day cycles, confidence > 0.3)
            if (avgIntervalDays >= 7 && avgIntervalDays <= 90 && confidence > 0.3) {
                patterns.push({
                    name,
                    avgIntervalDays: Math.round(avgIntervalDays),
                    lastPurchased,
                    confidence: Math.round(confidence * 100) / 100,
                    suggestedNextPurchase: lastPurchased + avgIntervalDays * 24 * 60 * 60 * 1000,
                    daysSinceLastPurchase: Math.round(daysSinceLastPurchase)
                });
            }
        });

        // Sort by how overdue they are (daysSince - avgInterval)
        return patterns.sort((a, b) => {
            const overdueA = a.daysSinceLastPurchase - a.avgIntervalDays;
            const overdueB = b.daysSinceLastPurchase - b.avgIntervalDays;
            return overdueB - overdueA;
        });
    }, [sessions]);

    return {
        sessions,
        stats,
        loading,
        addSession,
        getFrequentItems,
        getRecurringPatterns
    };
};

export default useShoppingHistory;
