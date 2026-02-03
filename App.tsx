
import React, { useState, useEffect } from 'react';
import { ShoppingItem, AppMode, SharedList } from './types';
import PlanningView from './components/PlanningView';
import StoreView from './components/StoreView';
import {
  auth,
  db,
  signIn,
  logOut,
  onAuthStateChanged,
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  addDoc,
  arrayUnion,
  deleteDoc
} from './services/firebase';
import type { User } from './services/firebase';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [mode, setMode] = useState<AppMode>(AppMode.PLANNING);
  const [lists, setLists] = useState<SharedList[]>([]);
  const [currentListId, setCurrentListId] = useState<string | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareEmail, setShareEmail] = useState('');

  // 1. Auth Listener
  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
  }, []);

  // 2. Fetch Lists user has access to
  useEffect(() => {
    if (!user) {
      setLists([]);
      return;
    }

    const q = query(
      collection(db, "lists"),
      where("collaborators", "array-contains", user.email)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedLists = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as SharedList));
      setLists(fetchedLists);

      // Select first list if none selected
      if (fetchedLists.length > 0 && !currentListId) {
        setCurrentListId(fetchedLists[0].id);
      } else if (fetchedLists.length === 0 && !currentListId) {
        createNewList("Min Handleliste");
      }
    });

    return unsubscribe;
  }, [user]);

  // 3. Sync Current List Items
  useEffect(() => {
    if (!currentListId) return;

    const unsubscribe = onSnapshot(doc(db, "lists", currentListId), (doc) => {
      if (doc.exists()) {
        setItems(doc.data().items || []);
      }
    });

    return unsubscribe;
  }, [currentListId]);

  const createNewList = async (name: string) => {
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
  };

  const updateRemoteItems = async (newItems: ShoppingItem[]) => {
    if (!currentListId) return;
    await updateDoc(doc(db, "lists", currentListId), {
      items: newItems,
      updatedAt: Date.now()
    });
  };

  const inviteCollaborator = async () => {
    if (!currentListId || !shareEmail.trim()) return;
    try {
      await updateDoc(doc(db, "lists", currentListId), {
        collaborators: arrayUnion(shareEmail.trim().toLowerCase())
      });
      setShareEmail('');
      setIsShareModalOpen(false);
      alert(`${shareEmail} er lagt til i listen!`);
    } catch (e) {
      alert("Kunne ikke legge til person. Sjekk tilgangen din.");
    }
  };

  const clearList = async () => {
    if (items.length === 0) return;
    const confirmed = window.confirm("Er du sikker på at du vil slette alle varer i denne listen?");
    if (confirmed) {
      updateRemoteItems([]);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
    </div>
  );

  if (!user) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6">
      <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl w-full max-w-sm text-center space-y-8 border border-slate-100">
        <div className="w-20 h-20 bg-indigo-600 rounded-3xl mx-auto flex items-center justify-center shadow-indigo-200 shadow-2xl rotate-3">
          <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" /><path d="M3 6h18" /><path d="M16 10a4 4 0 0 1-8 0" /></svg>
        </div>
        <div>
          <h1 className="text-2xl font-black text-slate-900 mb-2">Smart Handleliste</h1>
          <p className="text-slate-500 text-sm">Planlegg, handle og del med familien i sanntid.</p>
        </div>
        <button
          onClick={signIn}
          className="w-full flex items-center justify-center gap-3 bg-white border-2 border-slate-100 py-4 px-6 rounded-2xl font-bold text-slate-700 hover:bg-slate-50 active:scale-95 transition-all shadow-sm"
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" />
          Logg inn med Google
        </button>
      </div>
    </div>
  );

  const currentListName = lists.find(l => l.id === currentListId)?.name || "Laster...";

  return (
    <div className="min-h-screen flex flex-col max-w-md mx-auto bg-slate-50 shadow-xl overflow-hidden relative">
      {/* Header */}
      <header className="bg-white px-6 pt-8 pb-4 border-b border-slate-100 sticky top-0 z-20 shadow-sm">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 group">
              <select
                value={currentListId || ''}
                onChange={(e) => setCurrentListId(e.target.value)}
                className="text-xl font-black text-slate-900 bg-transparent border-none p-0 focus:ring-0 cursor-pointer appearance-none max-w-[200px] truncate"
              >
                {lists.map(l => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-slate-300 group-hover:text-indigo-500 transition-colors"><path d="m6 9 6 6 6-6" /></svg>
            </div>
            <p className="text-indigo-600 text-[10px] font-black uppercase tracking-widest mt-0.5">
              {mode === AppMode.PLANNING ? 'Planleggingsfase' : 'Handlingsfase'}
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setIsShareModalOpen(true)}
              className="bg-indigo-50 p-2.5 rounded-xl text-indigo-600 hover:bg-indigo-100 active:scale-95 transition-all shadow-sm"
              aria-label="Del liste"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><line x1="19" x2="19" y1="8" y2="14" /><line x1="22" x2="16" y1="11" y2="11" /></svg>
            </button>
            <button
              onClick={logOut}
              className="bg-slate-50 p-2.5 rounded-xl text-slate-400 hover:bg-slate-100 active:scale-95 transition-all shadow-sm"
              title="Logg ut"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" x2="9" y1="12" y2="12" /></svg>
            </button>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex p-1 bg-slate-100 rounded-xl relative">
          <button
            onClick={() => setMode(AppMode.PLANNING)}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all duration-200 z-10 ${mode === AppMode.PLANNING ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'
              }`}
          >
            Planlegg
          </button>
          <button
            onClick={() => setMode(AppMode.STORE)}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all duration-200 z-10 ${mode === AppMode.STORE ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'
              }`}
          >
            Handle
          </button>
        </div>
      </header>

      {/* Share Modal */}
      {isShareModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-8 w-full max-w-xs shadow-2xl space-y-6 animate-in zoom-in-95">
            <div className="text-center">
              <h3 className="text-lg font-black text-slate-900">Del denne listen</h3>
              <p className="text-xs text-slate-500 mt-1">Legg til e-posten til den du vil dele med.</p>
            </div>
            <input
              type="email"
              placeholder="navn@epost.no"
              value={shareEmail}
              onChange={(e) => setShareEmail(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setIsShareModalOpen(false)}
                className="flex-1 py-3 text-slate-500 font-bold text-sm"
              >Avbryt</button>
              <button
                onClick={inviteCollaborator}
                className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm shadow-indigo-100 shadow-lg"
              >Del</button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 px-4 py-6 overflow-y-auto">
        {mode === AppMode.PLANNING ? (
          <PlanningView items={items} setItems={updateRemoteItems} />
        ) : (
          <StoreView items={items} setItems={updateRemoteItems} />
        )}
      </main>

      {/* Persistence Info */}
      <footer className="bg-white border-t border-slate-100 py-4 flex flex-col items-center gap-1">
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-[10px] text-slate-400 uppercase tracking-[0.2em] font-black">Sanntidstilkoblet</span>
        </div>
        <div className="flex -space-x-1.5 mt-1">
          {user?.photoURL && <img src={user.photoURL} className="w-5 h-5 rounded-full border border-white" title={user.displayName || ''} />}
          {/* Placeholder for other collaborators */}
          <div className="w-5 h-5 rounded-full bg-slate-100 border border-white flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><line x1="19" x2="19" y1="8" y2="14" /><line x1="22" x2="16" y1="11" y2="11" /></svg>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
