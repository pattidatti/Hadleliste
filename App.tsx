import React, { useState } from 'react';
import { AppMode } from './types';
import PlanningView from './components/PlanningView';
import StoreView from './components/StoreView';
import LoginScreen from './components/LoginScreen';
import ShareModal from './components/ShareModal';
import ListsView from './components/ListsView';
import LoadingSpinner from './components/LoadingSpinner';
import { useAuth } from './hooks/useAuth';
import { useShoppingList } from './hooks/useShoppingList';
import ProductsView from './components/ProductsView';
import { useTheme } from './hooks/useTheme';

const App: React.FC = () => {
  const { user, loading, signIn, logOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const {
    lists,
    currentListId,
    setCurrentListId,
    items,
    addItem,
    updateItem,
    removeItem,
    createList,
    inviteCollaborator,
    currentListName,
    renameList,
    deleteList,
    deleteLists,
    resetBoughtItems,
    toggleListVisibility,
    removeCollaborator,
    leaveList,
    isOwner,
    reorderItems
  } = useShoppingList(user);

  const currentList = lists.find(l => l.id === currentListId);

  const [mode, setMode] = useState<AppMode>(AppMode.LISTS);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  if (loading) return <LoadingSpinner />;
  if (!user) return <LoginScreen onSignIn={signIn} />;

  return (
    <div className="min-h-screen flex flex-col max-w-md mx-auto bg-primary text-primary shadow-xl overflow-hidden relative selection:bg-accent-primary/20">
      {/* 3-Tab Navigation Header */}
      <header className="bg-surface px-2 pt-4 pb-2 border-b border-primary sticky top-0 z-20 shadow-sm transition-colors duration-300">
        <div className="flex justify-between items-center mb-2">
          <div className="flex p-1 bg-primary/50 rounded-xl relative flex-1 mr-2">
            <button
              onClick={() => setMode(AppMode.LISTS)}
              className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wide rounded-lg transition-all duration-300 z-10 ${mode === AppMode.LISTS ? 'bg-surface text-accent-primary shadow-sm' : 'text-secondary hover:text-primary'
                }`}
            >
              Lister
            </button>
            <button
              onClick={() => setMode(AppMode.PLANNING)}
              className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wide rounded-lg transition-all duration-300 z-10 ${mode === AppMode.PLANNING ? 'bg-surface text-accent-primary shadow-sm' : 'text-secondary hover:text-primary'
                }`}
            >
              Planlegg
            </button>
            <button
              onClick={() => setMode(AppMode.STORE)}
              className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wide rounded-lg transition-all duration-300 z-10 ${mode === AppMode.STORE ? 'bg-surface text-accent-primary shadow-sm' : 'text-secondary hover:text-primary'
                }`}
            >
              Handle
            </button>
            <button
              onClick={() => setMode(AppMode.REGISTER)}
              className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wide rounded-lg transition-all duration-300 z-10 ${mode === AppMode.REGISTER ? 'bg-surface text-accent-primary shadow-sm' : 'text-secondary hover:text-primary'
                }`}
            >
              Varer
            </button>
          </div>
          <button
            onClick={toggleTheme}
            className="w-10 h-10 flex items-center justify-center bg-surface border border-primary rounded-full shadow-sm text-secondary active:scale-95 transition-all duration-300"
            aria-label="Toggle theme"
          >
            {theme === 'light' ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" /></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4" /><path d="M12 2v2" /><path d="M12 20v2" /><path d="m4.93 4.93 1.41 1.41" /><path d="m17.66 17.66 1.41 1.41" /><path d="M2 12h2" /><path d="M20 12h2" /><path d="m6.34 17.66-1.41 1.41" /><path d="m19.07 4.93-1.41 1.41" /></svg>
            )}
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
      <main className="flex-1 overflow-y-auto bg-primary transition-colors duration-300">
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
            onDeleteLists={deleteLists}
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
            <div className="flex justify-between items-end mb-6">
              <div>
                <p className="text-[10px] font-black text-accent-primary uppercase tracking-widest mb-1">Aktiv Liste</p>
                <h2 className="text-2xl font-black text-primary truncate max-w-[200px]">{currentListName}</h2>
              </div>
              <button
                onClick={() => setIsShareModalOpen(true)}
                className="w-10 h-10 flex items-center justify-center bg-surface border border-primary rounded-full shadow-sm text-accent-primary active:scale-95 transition-all"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" x2="15.42" y1="13.51" y2="17.49" /><line x1="15.41" x2="8.59" y1="6.51" y2="10.49" /></svg>
              </button>
            </div>
            <PlanningView
              items={items}
              addItem={addItem}
              updateItem={updateItem}
              removeItem={removeItem}
              reorderItems={reorderItems}
            />
          </div>
        )}

        {mode === AppMode.STORE && (
          <div className="px-4 py-6">
            <StoreView
              items={items}
              updateItem={updateItem}
              removeItem={removeItem}
              onReset={resetBoughtItems}
              categoryOrder={currentList?.categoryOrder}
              lastShopperEmail={currentList?.lastShopperEmail}
            />
          </div>
        )}

        {mode === AppMode.REGISTER && (
          <div className="px-4 py-6">
            <div className="mb-6">
              <p className="text-[10px] font-black text-accent-primary uppercase tracking-widest mb-1">Produktregister</p>
              <h2 className="text-2xl font-black text-primary">Alle varer</h2>
            </div>
            <ProductsView />
          </div>
        )}
      </main>

      {/* Footer Status Bar with Debug Info */}
      <footer className="bg-surface border-t border-primary py-4 flex flex-col items-center gap-1.5 transition-colors duration-300">
        <div className="flex items-center gap-1.5 opacity-60">
          <div className={`w-1.5 h-1.5 rounded-full ${lists.length > 0 ? 'bg-green-500' : 'bg-amber-500'}`}></div>
          <span className="text-[9px] text-secondary uppercase tracking-widest font-black">
            {lists.length > 0 ? 'Sanntid aktiv' : 'Laster...'}
          </span>
        </div>
        <div className="text-[8px] text-secondary font-mono flex gap-3 opacity-50">
          <span>EMAIL: {user?.email}</span>
        </div>
      </footer>
    </div>
  );
};

export default App;
