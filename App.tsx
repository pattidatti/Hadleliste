import React, { useState, useEffect } from 'react';
import { AppMode } from './types';
import PlanningView from './components/PlanningView';
import StoreView from './components/StoreView';
import LoginScreen from './components/LoginScreen';
import ShareModal from './components/ShareModal';
import ListsSheet from './components/ListsSheet';
import LoadingSpinner from './components/LoadingSpinner';
import { useAuth } from './hooks/useAuth';
import { useShoppingList } from './hooks/useShoppingList';

const App: React.FC = () => {
  const { user, loading, signIn, logOut } = useAuth();
  const {
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
  } = useShoppingList(user);

  const [mode, setMode] = useState<AppMode>(AppMode.PLANNING);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isListsSheetOpen, setIsListsSheetOpen] = useState(false);

  // Auto-create first list for new users
  useEffect(() => {
    if (user && lists.length === 0 && !currentListId) {
      createList("Min Handleliste");
    }
  }, [user, lists.length, currentListId, createList]);

  if (loading) return <LoadingSpinner />;
  if (!user) return <LoginScreen onSignIn={signIn} />;

  return (
    <div className="min-h-screen flex flex-col max-w-md mx-auto bg-slate-50 shadow-xl overflow-hidden relative">
      {/* Header */}
      <header className="bg-white px-6 pt-8 pb-4 border-b border-slate-100 sticky top-0 z-20 shadow-sm">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 group">
              <select
                value={currentListId || ''}
                onChange={(e) => {
                  if (e.target.value === "__manage__") {
                    setIsListsSheetOpen(true);
                  } else {
                    setCurrentListId(e.target.value);
                  }
                }}
                className="text-xl font-black text-slate-900 bg-transparent border-none p-0 focus:ring-0 cursor-pointer appearance-none max-w-[200px] truncate"
              >
                {lists.map(l => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
                <option value="__manage__">⚙️ Administrer lister</option>
              </select>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-slate-300 group-hover:text-indigo-500 transition-colors">
                <path d="m6 9 6 6 6-6" />
              </svg>
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
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <line x1="19" x2="19" y1="8" y2="14" />
                <line x1="22" x2="16" y1="11" y2="11" />
              </svg>
            </button>
            <button
              onClick={logOut}
              className="bg-slate-50 p-2.5 rounded-xl text-slate-400 hover:bg-slate-100 active:scale-95 transition-all shadow-sm"
              title="Logg ut"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" x2="9" y1="12" y2="12" />
              </svg>
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
      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        onShare={inviteCollaborator}
        listName={currentListName}
        collaborators={lists.find(l => l.id === currentListId)?.collaborators}
        ownerEmail={lists.find(l => l.id === currentListId)?.ownerEmail}
        onRemoveCollaborator={(email) => currentListId ? removeCollaborator(currentListId, email) : Promise.resolve(false)}
        isOwner={currentListId ? isOwner(currentListId) : false}
      />

      {/* Lists Management Sheet */}
      <ListsSheet
        isOpen={isListsSheetOpen}
        onClose={() => setIsListsSheetOpen(false)}
        lists={lists}
        currentListId={currentListId}
        onSelectList={setCurrentListId}
        onCreateList={createList}
        onRenameList={renameList}
        onDeleteList={deleteList}
        onToggleVisibility={toggleListVisibility}
        onLeaveList={leaveList}
        isOwner={isOwner}
        userEmail={user?.email || ''}
      />

      {/* Main Content */}
      <main className="flex-1 px-4 py-6 overflow-y-auto">
        {mode === AppMode.PLANNING ? (
          <PlanningView items={items} setItems={updateItems} />
        ) : (
          <StoreView items={items} setItems={updateItems} />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-100 py-4 flex flex-col items-center gap-1">
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-[10px] text-slate-400 uppercase tracking-[0.2em] font-black">Sanntidstilkoblet</span>
        </div>
        <div className="flex -space-x-1.5 mt-1">
          {user?.photoURL && (
            <img src={user.photoURL} className="w-5 h-5 rounded-full border border-white" title={user.displayName || ''} />
          )}
          <div className="w-5 h-5 rounded-full bg-slate-100 border border-white flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <line x1="19" x2="19" y1="8" y2="14" />
              <line x1="22" x2="16" y1="11" y2="11" />
            </svg>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
