// ============================================
// FIREBASE CONFIGURATION - CENTRALIZADO
// Coloque na raiz do projeto: /firebase-config.js
// ============================================

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// Configuração do Firebase
const firebaseConfig = {
    apiKey: "AIzaSyBLhKaigyOT9dCAd9iA1o5j18rFB4rQ5uo",
    authDomain: "doce-gestao-4b032.firebaseapp.com",
    projectId: "doce-gestao-4b032",
    storageBucket: "doce-gestao-4b032.firebasestorage.app",
    messagingSenderId: "318295225306",
    appId: "1:318295225306:web:3beaebbb5979edba6686e3"
};

// Inicializar Firebase (apenas uma vez)
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

console.log('🔥 Firebase inicializado:', {
    projectId: firebaseConfig.projectId,
    timestamp: new Date().toISOString()
});

// Exportar para uso global
export { app, auth, db };