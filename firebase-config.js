import { initializeApp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-storage.js";
import { getAuth, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyD0hf26NRMBhOFLIXbzgki0d-8OJ0UKQkg",
  authDomain: "marino-web-e6a86.firebaseapp.com",
  projectId: "marino-web-e6a86",
  storageBucket: "marino-web-e6a86.firebasestorage.app",
  messagingSenderId: "240139537315",
  appId: "1:240139537315:web:ecd091e8d2cdd635f76816"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
