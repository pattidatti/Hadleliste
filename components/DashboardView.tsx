import React from 'react';
import { ShoppingSession, ShoppingStats, RecurringItem } from '../types';
import { useStores } from '../hooks/useStores';
import { useAuth } from '../hooks/useAuth';

interface DashboardViewProps {
    sessions: ShoppingSession[];
    stats: ShoppingStats | null;
    loading: boolean;
    frequentItems: { name: string; count: number }[];
    recurringPatterns: RecurringItem[];
}

// Format number as Norwegian currency
const formatKr = (n: number) => `${Math.round(n).toLocaleString('nb-NO')} kr`;

// Get day name in Norwegian
const getDayName = (day: number) => ['Søn', 'Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lør'][day];

const DashboardView: React.FC<DashboardViewProps> = ({
    sessions,
    stats,
    loading,
    frequentItems,
    recurringPatterns
}) => {
    const { myStores, loading: myStoresLoading, createStore } = useStores();
    const { user } = useAuth();

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="w-8 h-8 border-4 border-accent-primary/30 border-t-accent-primary rounded-full animate-spin" />
            </div>
        );
    }

    const overdueItems = recurringPatterns.filter(
        item => item.daysSinceLastPurchase > item.avgIntervalDays
    );

    return (
        <div className="space-y-6 pb-12 animate-in fade-in slide-in-from-bottom-2">
            {/* Stats Cards */}
            {stats && (
                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl p-4 text-white shadow-lg shadow-violet-500/20">
                        <div className="text-xs font-bold uppercase tracking-wider opacity-80">Totalt brukt</div>
                        <div className="text-2xl font-black mt-1">{formatKr(stats.totalSpent)}</div>
                    </div>
                    <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-4 text-white shadow-lg shadow-emerald-500/20">
                        <div className="text-xs font-bold uppercase tracking-wider opacity-80">Handleture</div>
                        <div className="text-2xl font-black mt-1">{stats.totalTrips}</div>
                    </div>
                    <div className="bg-surface border-2 border-primary rounded-2xl p-4">
                        <div className="text-xs font-bold uppercase tracking-wider text-secondary">Snitt / tur</div>
                        <div className="text-xl font-black text-primary mt-1">{formatKr(stats.avgPerTrip)}</div>
                    </div>
                    <div className="bg-surface border-2 border-primary rounded-2xl p-4">
                        <div className="text-xs font-bold uppercase tracking-wider text-secondary">Favorittdag</div>
                        <div className="text-xl font-black text-primary mt-1">
                            {stats.preferredDays.length > 0 ? getDayName(stats.preferredDays[0]) : '–'}
                        </div>
                    </div>
                </div>
            )}

            {/* Overdue Items Alert */}
            {overdueItems.length > 0 && (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-2xl p-4">
                    <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-bold text-sm mb-3">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                        </svg>
                        Burde vært kjøpt
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {overdueItems.slice(0, 5).map(item => (
                            <span key={item.name} className="px-3 py-1.5 bg-amber-100 dark:bg-amber-800/30 text-amber-800 dark:text-amber-300 rounded-full text-xs font-bold">
                                {item.name}
                                <span className="ml-1 opacity-60">({item.daysSinceLastPurchase}d)</span>
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* Frequent Items */}
            {frequentItems.length > 0 && (
                <div>
                    <h3 className="text-xs font-black text-secondary uppercase tracking-widest mb-3">Oftest kjøpt</h3>
                    <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
                        {frequentItems.slice(0, 10).map((item, i) => (
                            <div
                                key={item.name}
                                className={`flex-shrink-0 px-4 py-2.5 rounded-xl border-2 ${i === 0
                                    ? 'bg-accent-primary/10 border-accent-primary text-accent-primary'
                                    : 'bg-surface border-primary text-primary'
                                    }`}
                            >
                                <div className="text-sm font-bold">{item.name}</div>
                                <div className="text-[10px] font-black opacity-60">{item.count}x</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* My Stores Grid */}
            <div>
                <h3 className="text-xs font-black text-secondary uppercase tracking-widest mb-3">Mine Butikker</h3>
                {myStoresLoading ? (
                    <div className="flex gap-2">
                        {[1, 2, 3].map(i => <div key={i} className="w-32 h-20 bg-surface/50 animate-pulse rounded-xl" />)}
                    </div>
                ) : myStores.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {myStores.map(store => (
                            <div key={store.id} className="group relative bg-surface border border-primary hover:border-accent-primary/50 transition-colors rounded-xl p-4 overflow-hidden">
                                <div className="absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    {/* Action menu could go here */}
                                </div>

                                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black mb-3 text-primary shadow-sm" style={{ backgroundColor: store.color || '#e2e8f0' }}>
                                    {store.name.slice(0, 1).toUpperCase()}
                                </div>
                                <div className="font-bold text-sm text-primary truncate">{store.name}</div>
                                <div className="text-[10px] text-secondary mt-1">
                                    {store.ownerId === user?.uid ? 'Du eier denne' : 'Delt butikk'}
                                </div>
                            </div>
                        ))}
                        <button className="flex flex-col items-center justify-center gap-2 bg-surface/30 border border-dashed border-primary/50 rounded-xl p-4 hover:bg-surface hover:border-accent-primary/50 transition-all group">
                            <div className="w-8 h-8 rounded-full bg-accent-primary/10 flex items-center justify-center text-accent-primary group-active:scale-90 transition-transform">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                            </div>
                            <span className="text-xs font-bold text-secondary group-hover:text-primary">Ny butikk</span>
                        </button>
                    </div>
                ) : (
                    <div className="bg-surface border border-dashed border-primary rounded-xl p-6 text-center">
                        <p className="text-xs text-secondary font-medium">Du har ikke lagret noen butikker ennå.</p>
                        <p className="text-[10px] text-secondary/60 mt-1">Butikker lagres automatisk når du handler.</p>
                    </div>
                )}
            </div>

            {/* Recent Sessions Timeline */}
            {sessions.length > 0 && (
                <div>
                    <h3 className="text-xs font-black text-secondary uppercase tracking-widest mb-3">Siste handler</h3>
                    <div className="space-y-3">
                        {sessions.slice(0, 10).map(session => {
                            const date = new Date(session.completedAt);
                            const timeStr = `${date.toLocaleDateString('nb-NO', { day: 'numeric', month: 'short' })} kl ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;

                            return (
                                <div key={session.id} className="bg-surface border border-primary rounded-xl p-4">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className="font-bold text-primary">{session.listName}</div>
                                            <div className="text-xs text-secondary mt-0.5">{timeStr}</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-black text-primary">{formatKr(session.totalSpent)}</div>
                                            <div className="text-xs text-secondary">{session.items.length} varer</div>
                                        </div>
                                    </div>
                                    {session.storeName && (
                                        <div className="mt-2 text-xs text-accent-primary font-bold">📍 {session.storeName}</div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Empty State */}
            {sessions.length === 0 && !loading && (
                <div className="text-center py-16 opacity-50">
                    <div className="text-5xl mb-4">📊</div>
                    <p className="text-secondary font-medium">Ingen handlehistorikk ennå</p>
                    <p className="text-sm text-secondary/60 mt-1">Fullfør en handel for å se statistikk</p>
                </div>
            )}
        </div>
    );
};

export default DashboardView;
