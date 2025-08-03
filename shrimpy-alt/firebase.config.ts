import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyCKI8O6Ed-BsXEXHXogUhSiugqvgxG7N9Q",
  authDomain: "shrimpy-alt-weak-ties.firebaseapp.com",
  projectId: "shrimpy-alt-weak-ties",
  storageBucket: "shrimpy-alt-weak-ties.firebasestorage.app",
  messagingSenderId: "52954137892",
  appId: "1:52954137892:web:42ced7d29e5a01085e5fb1"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app; 