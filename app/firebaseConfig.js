import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { initializeAuth, getReactNativePersistence, browserLocalPersistence } from "firebase/auth";
import ReactNativeAsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

const firebaseConfig = {
  apiKey: "AIzaSyBR3KL-96QzVFzDZ8m94p32Ponqr4_J9f8",
  authDomain: "redinelirefi.firebaseapp.com",
  projectId: "redinelirefi",
  storageBucket: "redinelirefi.firebasestorage.app",
  messagingSenderId: "654207735088",
  appId: "1:654207735088:web:ea1f4e8fdae67c039724f5"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const storage = getStorage(app);

// Configuración inteligente: si es web usa el navegador, si es móvil usa el almacenamiento del cel
export const auth = initializeAuth(app, {
  persistence: Platform.OS === 'web' 
    ? browserLocalPersistence 
    : getReactNativePersistence(ReactNativeAsyncStorage)
});