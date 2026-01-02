// ============================================
// FIREBASE HELPERS - FUNÇÕES GLOBAIS
// Coloque na raiz do projeto: /firebase-helpers.js
// ============================================

import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// ============================================
// CONFIGURAÇÃO DO FIREBASE (SINGLETON GLOBAL)
// ============================================

export const firebaseConfig = {
    apiKey: "AIzaSyBLhKaigyOT9dCAd9iA1o5j18rFB4rQ5uo",
    authDomain: "doce-gestao-4b032.firebaseapp.com",
    projectId: "doce-gestao-4b032",
    storageBucket: "doce-gestao-4b032.firebasestorage.app",
    messagingSenderId: "318295225306",
    appId: "1:318295225306:web:3beaebbb5979edba6686e3"
};

// Variáveis globais (singleton)
let firebaseApp = null;
let firebaseAuth = null;
let firebaseDb = null;
let isInitialized = false;

/**
 * Inicializa o Firebase apenas uma vez (singleton)
 * @returns {object} { app, auth, db }
 */
export function initializeFirebase() {
    if (isInitialized && firebaseApp) {
        console.log('✅ Firebase já inicializado (usando cache)');
        return { app: firebaseApp, auth: firebaseAuth, db: firebaseDb };
    }

    try {
        // Verificar se já existe uma instância
        const existingApps = getApps();

        if (existingApps.length > 0) {
            console.log('✅ Firebase já inicializado (usando instância existente)');
            firebaseApp = existingApps[0];
        } else {
            console.log('🔥 Inicializando Firebase pela primeira vez...');
            firebaseApp = initializeApp(firebaseConfig);
        }

        firebaseAuth = getAuth(firebaseApp);
        firebaseDb = getFirestore(firebaseApp);
        isInitialized = true;

        console.log('✅ Firebase pronto para uso');
        return { app: firebaseApp, auth: firebaseAuth, db: firebaseDb };

    } catch (error) {
        console.error('❌ Erro ao inicializar Firebase:', error);
        throw error;
    }
}

// Auto-inicializar
const firebase = initializeFirebase();

// Exportar instâncias
export { firebaseApp, firebaseAuth, firebaseDb };
export { firebase };

// ============================================
// OBTER USER ID
// ============================================

/**
 * Obtém o userId do usuário autenticado
 * @returns {Promise<string>} userId ou null se não autenticado
 */
export function getCurrentUserId() {
    return new Promise((resolve, reject) => {
        const auth = getAuth();

        // Se já está autenticado, retorna imediatamente
        if (auth.currentUser) {
            console.log('👤 UserId (cache):', auth.currentUser.uid);
            resolve(auth.currentUser.uid);
            return;
        }

        // Se não, aguarda autenticação
        console.log('⏳ Aguardando autenticação...');
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            unsubscribe();
            if (user) {
                console.log('👤 UserId (auth):', user.uid);
                resolve(user.uid);
            } else {
                console.warn('⚠️ Nenhum usuário autenticado');
                reject(new Error('Usuário não autenticado'));
            }
        });
    });
}

/**
 * Obtém o userId de forma síncrona (use apenas se tiver certeza que está autenticado)
 * @returns {string|null} userId ou null
 */
export function getCurrentUserIdSync() {
    const auth = getAuth();
    const userId = auth.currentUser?.uid || null;

    if (!userId) {
        console.error('❌ getCurrentUserIdSync: Nenhum usuário autenticado');
    }

    return userId;
}

/**
 * Obtém dados completos do usuário atual
 * @returns {Promise<object>} dados do usuário
 */
export async function getCurrentUserData() {
    const auth = getAuth();

    return new Promise((resolve, reject) => {
        if (auth.currentUser) {
            const userData = {
                uid: auth.currentUser.uid,
                email: auth.currentUser.email,
                displayName: auth.currentUser.displayName,
                photoURL: auth.currentUser.photoURL,
                emailVerified: auth.currentUser.emailVerified
            };
            console.log('👤 Dados do usuário:', userData);
            resolve(userData);
            return;
        }

        const unsubscribe = onAuthStateChanged(auth, (user) => {
            unsubscribe();
            if (user) {
                const userData = {
                    uid: user.uid,
                    email: user.email,
                    displayName: user.displayName,
                    photoURL: user.photoURL,
                    emailVerified: user.emailVerified
                };
                console.log('👤 Dados do usuário:', userData);
                resolve(userData);
            } else {
                reject(new Error('Usuário não autenticado'));
            }
        });
    });
}

// ============================================
// VALIDAÇÕES
// ============================================

/**
 * Verifica se o usuário está autenticado
 * @returns {Promise<boolean>}
 */
export async function isUserAuthenticated() {
    try {
        await getCurrentUserId();
        return true;
    } catch (error) {
        return false;
    }
}

/**
 * Valida se um userId é válido (não vazio e string)
 * @param {string} userId
 * @returns {boolean}
 */
export function isValidUserId(userId) {
    return typeof userId === 'string' && userId.length > 0;
}

// ============================================
// PATHS DO FIRESTORE
// ============================================

/**
 * Gera o caminho do documento de menu do usuário
 * @param {string} userId
 * @returns {string} ex: "users/abc123/menu"
 */
export function getMenuPath(userId) {
    if (!isValidUserId(userId)) {
        throw new Error('userId inválido');
    }
    return `users/${userId}/menu`;
}

/**
 * Gera o caminho da collection de orders do usuário
 * @param {string} userId
 * @returns {string} ex: "users/abc123/orders"
 */
export function getOrdersPath(userId) {
    if (!isValidUserId(userId)) {
        throw new Error('userId inválido');
    }
    return `users/${userId}/orders`;
}

// ============================================
// LOGS E DEBUG
// ============================================

/**
 * Log padronizado para operações de Firestore
 * @param {string} operation - Ex: "SAVE", "LOAD", "DELETE"
 * @param {string} collection - Ex: "menu", "orders"
 * @param {object} data - Dados relacionados
 */
export function logFirestoreOperation(operation, collection, data = {}) {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`[${timestamp}] 🔥 ${operation} ${collection}`, data);
}

// ============================================
// EXPORT TUDO PARA window (para scripts não-module)
// ============================================

if (typeof window !== 'undefined') {
    window.FirebaseHelpers = {
        getCurrentUserId,
        getCurrentUserIdSync,
        getCurrentUserData,
        isUserAuthenticated,
        isValidUserId,
        getMenuPath,
        getOrdersPath,
        logFirestoreOperation,
        firebaseAuth,
        firebaseDb
    };
    console.log('✅ FirebaseHelpers disponível globalmente');
}

console.log('✅ firebase-helpers.js carregado');