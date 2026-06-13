import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js';
import { getAuth, GoogleAuthProvider } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js';
import { getDatabase } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js';

export const firebaseConfig = {
  apiKey: "AIzaSyCxh3rewmFVWrj4AqNDV75FXky7LDclDgk",
  authDomain: "reservae-5874f.firebaseapp.com",
  databaseURL: "https://reservae-5874f-default-rtdb.firebaseio.com",
  projectId: "reservae-5874f",
  storageBucket: "reservae-5874f.firebasestorage.app",
  messagingSenderId: "886961990703",
  appId: "1:886961990703:web:e97088df9b89a77711eada",
  measurementId: "G-Z3PTTNXGFC"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const database = getDatabase(app, firebaseConfig.databaseURL);
export const googleProvider = new GoogleAuthProvider();
export const firebaseDatabaseUrl = firebaseConfig.databaseURL;
