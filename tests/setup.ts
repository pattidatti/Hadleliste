import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock Firebase
vi.mock('./services/firebase', () => ({
    auth: {},
    db: {},
    signIn: vi.fn(),
    logOut: vi.fn(),
    onAuthStateChanged: vi.fn((auth, callback) => {
        callback(null);
        return vi.fn();
    }),
    collection: vi.fn(),
    doc: vi.fn(),
    onSnapshot: vi.fn(),
    updateDoc: vi.fn(),
    addDoc: vi.fn(),
    arrayUnion: vi.fn(),
    query: vi.fn(),
    where: vi.fn(),
    deleteDoc: vi.fn(),
}));

// Mock process.env
vi.stubGlobal('process', {
    env: {
        FIREBASE_API_KEY: 'test-key',
        FIREBASE_AUTH_DOMAIN: 'test.firebaseapp.com',
        FIREBASE_PROJECT_ID: 'test',
        FIREBASE_STORAGE_BUCKET: 'test.appspot.com',
        FIREBASE_MESSAGING_SENDER_ID: '123',
        FIREBASE_APP_ID: '1:123:web:abc',
        GEMINI_API_KEY: 'test-gemini-key'
    }
});
