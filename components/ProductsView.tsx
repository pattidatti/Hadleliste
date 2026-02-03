import React, { useState, useMemo } from 'react';
import { useCatalog } from '../hooks/useCatalog';
import { useCategories } from '../hooks/useCategories';
import { Product } from '../types';
import { useToast } from './Toast';

const ProductsView: React.FC = () => {
    const { products, updateProduct, deleteProduct, addOrUpdateProduct } = useCatalog();
    const { categories, addCategory, deleteCategory, renameCategory } = useCategories();
    const { addToast } = useToast();

    const [searchTerm, setSearchTerm] = useState('');
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [isAddingProduct, setIsAddingProduct] = useState(false);
    const [isManagingCategories, setIsManagingCategories] = useState(false);

    // Filter products
    const filteredProducts = useMemo(() => {
        const lower = searchTerm.toLowerCase();
        return products.filter(p =>
            p.name.toLowerCase().includes(lower) ||
            p.category.toLowerCase().includes(lower)
        );
    }, [products, searchTerm]);

    // Grouping
    const grouped = useMemo(() => {
        const groups: Record<string, Product[]> = {};
        filteredProducts.forEach(p => {
            const cat = p.category || 'Annet';
            if (!groups[cat]) groups[cat] = [];
            groups[cat].push(p);
        });
        return groups;
    }, [filteredProducts]);

    const sortedCategories = useMemo(() => {
        const cats = Object.keys(grouped).sort();
        // Keep 'Annet' at the end if it exists
        return cats.filter(c => c !== 'Annet').concat(cats.includes('Annet') ? ['Annet'] : []);
    }, [grouped]);

    const handleSaveProduct = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const name = formData.get('name') as string;
        const price = parseFloat(formData.get('price') as string) || 0;
        const category = formData.get('category') as string;

        if (!name.trim()) return;

        try {
            if (editingProduct) {
                await updateProduct(editingProduct.id, { name, price, category });
                addToast("Vare oppdatert", "success");
            } else {
                await addOrUpdateProduct(name, price, category);
                addToast("Vare lagt til", "success");
            }
            setEditingProduct(null);
            setIsAddingProduct(false);
        } catch (error) {
            addToast("Kunne ikke lagre", "error");
        }
    };

    return (
        <div className="flex flex-col gap-6 pb-32 animate-in fade-in slide-in-from-bottom-2">
            {/* Header / Search */}
            <div className="space-y-4">
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <input
                            type="text"
                            placeholder="Søk i varer eller kategorier..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-sm"
                        />
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
                        </svg>
                    </div>
                    <button
                        onClick={() => setIsManagingCategories(true)}
                        className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-600 hover:text-indigo-600 active:scale-95 transition-all shadow-sm"
                        title="Administrer kategorier"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" /></svg>
                    </button>
                </div>

                <button
                    onClick={() => setIsAddingProduct(true)}
                    className="w-full py-3.5 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 active:scale-[0.98] transition-all shadow-lg shadow-indigo-200"
                >
                    Legg til ny vare
                </button>
            </div>

            {/* List */}
            <div className="space-y-8">
                {sortedCategories.length === 0 ? (
                    <div className="py-20 text-center opacity-30">
                        <p className="font-black text-slate-400">Ingen varer funnet</p>
                    </div>
                ) : (
                    sortedCategories.map(cat => (
                        <div key={cat} className="space-y-3">
                            <h3 className="px-2 text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em]">{cat}</h3>
                            <div className="space-y-2">
                                {grouped[cat].map(product => (
                                    <div
                                        key={product.id}
                                        onClick={() => setEditingProduct(product)}
                                        className="bg-white p-3 px-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 group active:scale-[0.99] transition-all cursor-pointer hover:border-indigo-100"
                                    >
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-slate-800 truncate">{product.name}</p>
                                        </div>

                                        <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                                            <div className="relative group/input">
                                                <input
                                                    type="number"
                                                    inputMode="decimal"
                                                    step="0.1"
                                                    defaultValue={product.price || ''}
                                                    placeholder="0.00"
                                                    onBlur={(e) => {
                                                        const val = e.target.value.replace(',', '.');
                                                        const newPrice = parseFloat(val);
                                                        if (!isNaN(newPrice) && newPrice !== product.price) {
                                                            updateProduct(product.id, { price: newPrice });
                                                            addToast(`${product.name} oppdatert`, "success");
                                                        }
                                                    }}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            (e.target as HTMLInputElement).blur();
                                                        }
                                                    }}
                                                    className="w-20 px-2 py-1.5 bg-slate-50 border-2 border-transparent focus:border-indigo-400 focus:bg-white rounded-xl text-right text-xs font-black text-slate-700 outline-none transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                />
                                                <div className="absolute -bottom-1 left-0 right-0 h-0.5 bg-indigo-500 scale-x-0 group-focus-within/input:scale-x-100 transition-transform origin-center"></div>
                                            </div>
                                            <span className="text-[10px] font-black text-slate-300 uppercase tracking-tighter">kr</span>
                                        </div>

                                        <div className="flex items-center gap-1 shrink-0">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); deleteProduct(product.id); }}
                                                className="p-2 text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 outline-none"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>
                                            </button>
                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-slate-100 group-hover:text-slate-200 transition-colors"><path d="m9 18 6-6-6-6" /></svg>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Add/Edit Modal */}
            {(isAddingProduct || editingProduct) && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-8 duration-300">
                        <div className="px-6 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="text-lg font-black text-slate-900">
                                {editingProduct ? 'Rediger vare' : 'Ny vare'}
                            </h3>
                            <button onClick={() => { setEditingProduct(null); setIsAddingProduct(false); }} className="text-slate-400 p-1">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                            </button>
                        </div>
                        <form onSubmit={handleSaveProduct} className="p-6 space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Varenavn</label>
                                <input
                                    name="name"
                                    defaultValue={editingProduct?.name || ''}
                                    required
                                    autoFocus
                                    className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent focus:border-indigo-500 rounded-2xl outline-none font-bold transition-all"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Pris (kr)</label>
                                    <input
                                        name="price"
                                        type="number"
                                        step="0.01"
                                        defaultValue={editingProduct?.price || ''}
                                        className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent focus:border-indigo-500 rounded-2xl outline-none font-bold transition-all"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Kategori</label>
                                    <select
                                        name="category"
                                        defaultValue={editingProduct?.category || 'Annet'}
                                        className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent focus:border-indigo-500 rounded-2xl outline-none font-bold transition-all appearance-none"
                                    >
                                        {categories.map(cat => (
                                            <option key={cat} value={cat}>{cat}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <button type="submit" className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-indigo-100 mt-2">
                                {editingProduct ? 'Oppdater' : 'Legg til'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Categories Management Modal */}
            {isManagingCategories && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
                        <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="text-lg font-black text-slate-900">Kategorier</h3>
                            <button onClick={() => setIsManagingCategories(false)} className="text-slate-400 p-1">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-2">
                            {categories.map(cat => (
                                <div key={cat} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl group">
                                    <span className="font-bold text-slate-700">{cat}</span>
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => {
                                                const newName = window.prompt(`Endre navn for "${cat}":`, cat);
                                                if (newName) renameCategory(cat, newName);
                                            }}
                                            className="p-2 text-slate-400 hover:text-indigo-600 transition-colors"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" /></svg>
                                        </button>
                                        <button
                                            onClick={() => deleteCategory(cat)}
                                            className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /></svg>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="p-4 border-t border-slate-100 bg-slate-50">
                            <form onSubmit={(e) => {
                                e.preventDefault();
                                const input = (e.currentTarget.elements.namedItem('catName') as HTMLInputElement);
                                addCategory(input.value);
                                input.value = '';
                            }} className="flex gap-2">
                                <input
                                    name="catName"
                                    placeholder="Ny kategori..."
                                    className="flex-1 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                                <button type="submit" className="px-4 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest">
                                    Legg til
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProductsView;
