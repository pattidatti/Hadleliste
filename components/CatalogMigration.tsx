import React, { useState } from 'react';
import { CATALOG } from '../constants/commonItems';
import { useCatalog } from '../hooks/useCatalog';

const CatalogMigration: React.FC = () => {
    const { addOrUpdateProduct, products } = useCatalog();
    const [isMigrating, setIsMigrating] = useState(false);
    const [progress, setProgress] = useState(0);

    const totalItems = CATALOG.reduce((acc, cat) => acc + cat.items.length, 0);

    const runMigration = async () => {
        if (!confirm(`Vil du laste opp ${totalItems} varer til databasen? Dette bør bare gjøres én gang.`)) return;

        setIsMigrating(true);
        let count = 0;

        for (const cat of CATALOG) {
            for (const itemName of cat.items) {
                // Check if exists to avoid overwriting existing data (like prices) if we re-run
                const exists = products.some(p => p.id === itemName.trim().toLowerCase());

                if (!exists) {
                    await addOrUpdateProduct(itemName, 0, cat.name);
                }

                count++;
                setProgress(Math.round((count / totalItems) * 100));
                // Small delay to not nuke Firestore
                await new Promise(r => setTimeout(r, 50));
            }
        }

        setIsMigrating(false);
        alert("Migrering ferdig!");
    };

    if (products.length > 100) {
        return null; // Hide automatically if we have data
    }

    return (
        <div className="p-4 m-4 bg-yellow-50 border border-yellow-200 rounded-xl">
            <h3 className="font-bold text-yellow-800 mb-2">System Migrering</h3>
            <p className="text-sm text-yellow-700 mb-4">
                Databasen ser tom ut. importer {totalItems} standardvarer?
            </p>

            {isMigrating ? (
                <div className="w-full bg-yellow-200 rounded-full h-4 overflow-hidden">
                    <div
                        className="bg-yellow-500 h-full transition-all duration-300"
                        style={{ width: `${progress}%` }}
                    />
                </div>
            ) : (
                <button
                    onClick={runMigration}
                    className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-4 rounded-lg w-full"
                >
                    Start Import
                </button>
            )}
        </div>
    );
};

export default CatalogMigration;
