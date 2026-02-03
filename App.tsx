import React, { useState, useEffect } from 'react';
import { AppMode } from './types';
import PlanningView from './components/PlanningView';
import StoreView from './components/StoreView';
import LoginScreen from './components/LoginScreen';
import ShareModal from './components/ShareModal';
import ListsView from './components/ListsView';
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

  const [mode, setMode] = useState<AppMode>(AppMode.LISTS);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isListsSheetOpen, setIsListsSheetOpen] = useState(false);

  // Auto-create logic removed to prevent "zombie lists" on delete.
  // Users can create lists manually in the ListsView.

  if (loading) return <LoadingSpinner />;
  if (!user) return <LoginScreen onSignIn={signIn} />;

  return (
    <div className="min-h-screen flex flex-col max-w-md mx-auto bg-slate-50 shadow-xl overflow-hidden relative">
      {/* 3-Tab Navigation Header */}
      <header className="bg-white px-2 pt-4 pb-2 border-b border-slate-100 sticky top-0 z-20 shadow-sm">
        <div className="flex p-1 bg-slate-100 rounded-xl relative">
          <button
            onClick={() => setMode(AppMode.LISTS)}
            className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wide rounded-lg transition-all duration-200 z-10 ${mode === AppMode.LISTS ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'
              }`}
          >
            Lister
          </button>
          <button
            onClick={() => setMode(AppMode.PLANNING)}
            className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wide rounded-lg transition-all duration-200 z-10 ${mode === AppMode.PLANNING ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'
              }`}
          >
            Planlegg
          </button>
          <button
            onClick={() => setMode(AppMode.STORE)}
            className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wide rounded-lg transition-all duration-200 z-10 ${mode === AppMode.STORE ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'
              }`}
          >
            Handle
          </button>
        </div>
      </header>

      {/* Share Modal (Global) */}
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

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-slate-50">
        {mode === AppMode.LISTS && (
          <ListsView
            lists={lists}
            currentListId={currentListId}
            onSelectList={(id) => {
              setCurrentListId(id);
              setMode(AppMode.PLANNING);
            }}
            onCreateList={createList}
            onRenameList={renameList}
            onDeleteList={deleteList}
            onToggleVisibility={toggleListVisibility}
            onLeaveList={leaveList}
            isOwner={isOwner}
            userEmail={user?.email || ''}
            onShareList={(id) => {
              setCurrentListId(id);
              setIsShareModalOpen(true);
            }}
          />
        )}

        {mode === AppMode.PLANNING && (
          <div className="px-4 py-6">
            {/* Context Header for Planning Mode */}
            <div className="flex justify-between items-end mb-6">
              <div>
                <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-1">Aktiv Liste</p>
                <h2 className="text-2xl font-black text-slate-900 truncate max-w-[200px]">{currentListName}</h2>
              </div>
              <button
                onClick={() => setIsShareModalOpen(true)}
                className="w-10 h-10 flex items-center justify-center bg-white border border-slate-100 rounded-full shadow-sm text-indigo-600 active:scale-95 transition-all"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" x2="15.42" y1="13.51" y2="17.49" /><line x1="15.41" x2="8.59" y1="6.51" y2="10.49" /></svg>
              </button>
            </div>
            <PlanningView items={items} setItems={updateItems} />
          </div>
        )}

        {mode === AppMode.STORE && (
          <div className="px-4 py-6">
            <StoreView items={items} setItems={updateItems} />
          </div>
        )}
      </main>

      {/* Footer Status Bar */}
      <footer className="bg-white border-t border-slate-100 py-3 flex justify-center">
        <div className="flex items-center gap-1.5 opacity-60">
          <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
          <span className="text-[9px] text-slate-500 uppercase tracking-widest font-black">Sanntid</span>
        </div>
      </footer>
    </div>
  );
};

export default App;
