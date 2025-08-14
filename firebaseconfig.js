// Firebase configuration and initialization
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js';
import { getFirestore, connectFirestoreEmulator } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';
import { getStorage, connectStorageEmulator } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-storage.js';

// Firebase configuration object - replace with your actual config
const firebaseConfig = {
  apiKey: "demo",
    authDomain: "demo",
    databaseURL: "demo",
    projectId: "demo",
    storageBucket: "demo",
    messagingSenderId: "demo",
    appId: "demo",
    measurementId: "demo"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
export const db = getFirestore(app);

// Initialize Storage
export const storage = getStorage(app);

// Export app for other modules
export { app };

// Global Firebase initialization status
window.firebaseInitialized = true;
