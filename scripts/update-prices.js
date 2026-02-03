import admin from "firebase-admin";
import dotenv from "dotenv";
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load env vars from parent directory
dotenv.config({ path: join(__dirname, '../.env') });

const serviceAccountPath = join(__dirname, '../service-account.json');

if (!fs.existsSync(serviceAccountPath)) {
    console.error("service-account.json missing at:", serviceAccountPath);
    process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

console.log("Initializing Firebase Admin with Service Account...");

try {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
    console.log("Firebase Admin initialized successfully.");
} catch (e) {
    console.error("Failed to initialize Firebase Admin:", e);
    process.exit(1);
}

const db = admin.firestore();
db.settings({ ignoreUndefinedProperties: true });

const rawData = `
| Produkt                | Pris pr |
| :--------------------: | :-----: |
| Banan                  | 12,95   |
| Agurk                  | 25,9    |
| Melk                   | 34,8    |
| avakado                | 49      |
| brelett                | 38,9    |
| meierismør             | 67,9    |
| Ruccula                | 19,9    |
| Rømme                  | 19,8    |
| Creme fresh            | 27,9    |
| kremfløte              | 49,9    |
| Cottage Cheese         | 50      |
| Yuggurt                | 45,4    |
| purreløk               | 16      |
| paprika                | 27      |
| rød chilli             | 20      |
| nypoteter              | 49,9    |
| løk                    | 24,9    |
| rød løk                | 24,9    |
| hvitløk                | 16,9    |
| gullerøtter            | 32,9    |
| frosne asparges bønner | 50      |
| brokkoli               | 29,9    |
| tomatporre             | 20      |
| fullkornpasta          | 25,9    |
| Kaffe                  | 50      |
| Kakao                  | 50      |
| Jarlsberg              | 127     |
| Brunost                | 114     |
| Revet ost              | 56,9    |
| Kremost naturel        | 50      |
| Parmasan               | 29,9    |
| Kjøttdeig              | 63,9    |
| kyllingkjøttdeig       | 64,4    |
| Svinekjøtt             | 50      |
| Middagspølse           | 82,9    |
| Salatkinke             | 49,6    |
| Egg                    | 61,4    |
| Kyllingfillet          | 195     |
| Laks                   | 74,8    |
| Baconpakke             | 44,9    |
| Selskapsdressing       | 36      |
| Salami                 | 40,9    |
| Kristine pålegg        | 30      |
| Kalkunpålegg           | 23,9    |
| Brød                   | 43,9    |
| Mel                    | 19,9    |
| Speltmel               | 20      |
| Gjær                   | 19,9    |
| Pizzasaus              | 17,9    |
| Mørk sjokolade         | 19      |
| Havregryn              | 24,9    |
| Wok                    | 46,9    |
| Nudler                 | 14,4    |
| Tere-ya-ki saus        | 50      |
| Salsa                  | 15      |
| Tacolefse              | 29,9    |
| Smålefser              | 13,9    |
| Tacochips              | 16,9    |
| Tacokrydder            | 3,9     |
| Seuratcha              | 25      |
| Leverpostei            | 24,9    |
| hakkede tomater        | 21,9    |
| Makrell                | 33,9    |
| Bleier                 | 59,9    |
| Våtservietter          | 100     |
| Grøt                   | 47,9    |
| bosspose               | 15,9    |
| Bleiepose              | 9,9     |
| dopapir                | 69,9    |
| tørkepapir             | 100     |
`;

async function updatePrices() {
    const lines = rawData.trim().split('\n');
    const items = [];

    for (const line of lines) {
        if (line.includes('| Produkt') || line.includes('| :---')) continue;

        const parts = line.split('|').filter(p => p.trim() !== '');
        if (parts.length < 2) continue;

        const name = parts[0].trim();
        const priceStr = parts[1].trim().replace(',', '.');

        if (priceStr && !isNaN(parseFloat(priceStr))) {
            items.push({
                name,
                price: parseFloat(priceStr)
            });
        }
    }

    console.log(`Found ${items.length} items with prices.`);

    const batch = db.batch();
    for (const item of items) {
        const id = item.name.toLowerCase().trim();
        const docRef = db.collection("products").doc(id);
        const docSnap = await docRef.get();

        if (docSnap.exists) {
            console.log(`Updating ${item.name}: ${item.price}`);
            batch.update(docRef, {
                price: item.price,
                lastUpdated: Date.now()
            });
        } else {
            console.log(`Adding new item: ${item.name}: ${item.price}`);
            batch.set(docRef, {
                id,
                name: item.name,
                price: item.price,
                category: "Annet",
                unit: 'stk',
                lastUpdated: Date.now(),
                count: 1
            });
        }
    }

    await batch.commit();
    console.log("Price update complete!");
    process.exit(0);
}

updatePrices().catch(err => {
    console.error("Error during update:", err);
    process.exit(1);
});
