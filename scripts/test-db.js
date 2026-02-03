import admin from "firebase-admin";
import dotenv from "dotenv";
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env') });

admin.initializeApp({
    projectId: process.env.FIREBASE_PROJECT_ID
});

const db = admin.firestore();

async function test() {
    try {
        console.log("Testing Firestore connection...");
        const collections = await db.listCollections();
        console.log("Found collections:", collections.map(c => c.id));
    } catch (e) {
        console.error("Firestore test failed:", e);
    }
}

test();
