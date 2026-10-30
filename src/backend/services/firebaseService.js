/**
 * ============================================================================
 * Camada de Serviço: Conexão e Inicialização do Firebase
 * Arquitetura MVC - Backend / Services
 * ============================================================================
 * Responsabilidade:
 * - Centralizar a inicialização do Firebase App, Cloud Firestore e Authentication.
 * - Gerenciar credenciais de forma desacoplada e segura.
 * - Prover suporte a modo de demonstração/offline (Mock Fallback).
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { 
  getFirestore, 
  collection, 
  doc, 
  addDoc, 
  getDocs, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  onSnapshot, 
  serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

// Credenciais do Firebase configuradas (dashboard-manutencao-71e43)
export const firebaseConfig = {
  apiKey: "AIzaSyCmNTwmlB6Qt8ONv1y544rxkpTXqvzMhTU",
  authDomain: "dashboard-manutencao-71e43.firebaseapp.com",
  projectId: "dashboard-manutencao-71e43",
  storageBucket: "dashboard-manutencao-71e43.firebasestorage.app",
  messagingSenderId: "354144288785",
  appId: "1:354144288785:web:78e0a7236947bf9ab171b0"
};

/**
 * Valida se a aplicação possui credenciais ativas do Firebase ou opera em modo de demonstração.
 * @returns {boolean}
 */
export const isConfigured = () => {
  return Boolean(
    firebaseConfig.apiKey && 
    firebaseConfig.apiKey !== "SUA_API_KEY_AQUI" &&
    !firebaseConfig.authDomain.includes("instituicao-cliente-manutencao")
  );
};

// Inicialização controlada dos serviços
let app = null;
let db = null;
let auth = null;

try {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  auth = getAuth(app);
} catch (error) {
  console.warn("[FirebaseService] Inicializado em modo desacoplado / offline:", error.message);
}

export {
  app,
  db,
  auth,
  collection,
  doc,
  addDoc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
};
