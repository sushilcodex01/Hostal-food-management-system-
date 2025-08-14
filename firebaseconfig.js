// Firebase configuration and initialization
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js';
import { getFirestore, connectFirestoreEmulator } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';
import { getStorage, connectStorageEmulator } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-storage.js';

// Firebase configuration object - replace with your actual config
const firebaseConfig = {
  apiKey: "AIzaSyDA6duS8SJ5Wr26qNxzBoge01Leestj-9o",
    authDomain: "animal-planet-73497.firebaseapp.com",
    databaseURL: "https://animal-planet-73497-default-rtdb.firebaseio.com",
    projectId: "animal-planet-73497",
    storageBucket: "animal-planet-73497.appspot.com",
    messagingSenderId: "15025745338",
    appId: "1:15025745338:web:f2d2e2644d822afea00183",
    measurementId: "G-KP9582LMC3"
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
