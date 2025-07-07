import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDtgKP7AW8xC69_tAPSm5NeHpq4YwT9qkA",
  authDomain: "dmaterial-84cb4.firebaseapp.com",
  projectId: "dmaterial-84cb4",
  storageBucket: "dmaterial-84cb4.firebasestorage.app",
  messagingSenderId: "854980496990",
  appId: "1:854980496990:web:e5282187674e153e212ecf",
  measurementId: "G-15TDQK9LY4"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app); 