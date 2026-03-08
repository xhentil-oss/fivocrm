import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBB-0a_cx8NPVXv0BxPg7wtbTehYRlJ2CM",
  authDomain: "fivocrm.firebaseapp.com",
  projectId: "fivocrm",
  storageBucket: "fivocrm.firebasestorage.app",
  messagingSenderId: "401964353855",
  appId: "1:401964353855:web:7715d6d58d36f216022b8a"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

export default app;
