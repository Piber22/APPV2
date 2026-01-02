// ============================================
// FIREBASE INTEGRATION - DOCE GESTÃO
// Versão simplificada usando helpers globais
// ============================================

import { firebaseAuth, firebaseDb } from '../firebase-helpers.js';
import { doc, setDoc, getDoc, onSnapshot } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// ============================================
// VARIÁVEIS GLOBAIS
// ============================================

let currentUserId = null;
let menuDocRef = null;
let unsubscribeSnapshot = null;

// Estado de sincronização
let syncStatus = {
    isSyncing: false,
    lastSaved: null,
    hasUnsavedChanges: false,
    saveTimeout: null,
    isInitialized: false
};

// ============================================
// OBTER USER ID
// ============================================

function waitForAuth() {
    return new Promise((resolve, reject) => {
        // Se já está autenticado
        if (firebaseAuth.currentUser) {
            currentUserId = firebaseAuth.currentUser.uid;
            resolve(currentUserId);
            return;
        }

        // Aguardar autenticação
        const unsubscribe = firebaseAuth.onAuthStateChanged((user) => {
            unsubscribe();
            if (user) {
                currentUserId = user.uid;
                resolve(currentUserId);
            } else {
                reject(new Error('Usuário não autenticado'));
            }
        });

        // Timeout de 10 segundos
        setTimeout(() => {
            unsubscribe();
            reject(new Error('Timeout ao aguardar autenticação'));
        }, 10000);
    });
}

// ============================================
// INICIALIZAR REFERÊNCIA
// ============================================

async function initMenuDocRef() {
    if (menuDocRef && currentUserId) {
        return menuDocRef;
    }

    const userId = await waitForAuth();
    menuDocRef = doc(firebaseDb, 'users', userId, 'menu', 'default');
    console.log('📄 Doc ref:', `users/${userId}/menu/default`);
    return menuDocRef;
}

// ============================================
// SALVAR
// ============================================

async function saveToFirebase() {
    if (syncStatus.isSyncing) return;

    try {
        syncStatus.isSyncing = true;
        console.log('💾 Salvando...');

        const docRef = await initMenuDocRef();
        const dataToSave = {
            settings: state.settings,
            categories: state.categories,
            items: state.items,
            userId: currentUserId,
            lastModified: new Date().toISOString(),
            version: 1
        };

        await setDoc(docRef, dataToSave);
        syncStatus.lastSaved = new Date();
        syncStatus.hasUnsavedChanges = false;
        console.log('✅ Salvo às', syncStatus.lastSaved.toLocaleTimeString());

    } catch (error) {
        console.error('❌ Erro ao salvar:', error.message);
        syncStatus.hasUnsavedChanges = true;
    } finally {
        syncStatus.isSyncing = false;
    }
}

// ============================================
// CARREGAR
// ============================================

async function loadFromFirebase() {
    console.log('☁️ Carregando...');

    try {
        const docRef = await initMenuDocRef();
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            console.log('✅ Dados recebidos:', data.items?.length || 0, 'itens');

            if (data.settings) state.settings = data.settings;
            if (data.categories) state.categories = data.categories;
            if (data.items) state.items = data.items;

            updateUI();
        } else {
            console.log('ℹ️ Sem dados, usando padrão');
            await saveToFirebase();
        }

    } catch (error) {
        console.error('❌ Erro ao carregar:', error.message);

        // Se for erro de rede, usar dados padrão
        if (error.message.includes('offline') || error.message.includes('network')) {
            console.warn('⚠️ Modo offline - usando dados padrão');
            updateUI();
        } else {
            throw error;
        }
    }
}

// ============================================
// SYNC TEMPO REAL
// ============================================

async function setupRealtimeSync() {
    console.log('🔄 Ativando sync tempo real...');

    try {
        const docRef = await initMenuDocRef();

        unsubscribeSnapshot = onSnapshot(
            docRef,
            (doc) => {
                if (!syncStatus.isInitialized) {
                    syncStatus.isInitialized = true;
                    console.log('✅ Listener ativado');
                    return;
                }

                if (syncStatus.isSyncing || syncStatus.hasUnsavedChanges) {
                    return;
                }

                if (doc.exists()) {
                    const data = doc.data();
                    console.log('🔔 Update recebido');

                    if (data.settings) state.settings = data.settings;
                    if (data.categories) state.categories = data.categories;
                    if (data.items) state.items = data.items;

                    updateUI();
                }
            },
            (error) => {
                console.error('❌ Erro no listener:', error.message);
            }
        );

    } catch (error) {
        console.error('❌ Erro ao configurar sync:', error.message);
    }
}

// ============================================
// UI
// ============================================

function updateUI() {
    console.log('🎨 Atualizando UI...');
    renderCategories();
    renderItemsList();
    renderPreview();

    document.getElementById('inputTitle').value = state.settings.title;
    document.getElementById('inputSubtitle').value = state.settings.subtitle;
    document.getElementById('inputContact').value = state.settings.contact;

    document.querySelectorAll('.color-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.color === state.settings.themeColor);
    });
}

function showLoading() {
    document.getElementById('loadingScreen')?.classList.remove('hidden');
}

function hideLoading() {
    const loading = document.getElementById('loadingScreen');
    const main = document.querySelector('.main-container');

    loading?.classList.add('hidden');
    if (main) {
        main.style.opacity = '1';
        main.style.transition = 'opacity 0.5s ease';
    }
}

// ============================================
// AUTO-SAVE
// ============================================

function scheduleAutoSave() {
    syncStatus.hasUnsavedChanges = true;
    clearTimeout(syncStatus.saveTimeout);

    console.log('⏱️ Auto-save em 2s...');
    syncStatus.saveTimeout = setTimeout(() => saveToFirebase(), 2000);
}

// ============================================
// INICIALIZAÇÃO
// ============================================

async function initializeFirebaseIntegration() {
    console.log('═══════════════════════════════════════');
    console.log('🚀 DOCE GESTÃO - FIREBASE');
    console.log('═══════════════════════════════════════');

    showLoading();

    try {
        console.log('🔐 Aguardando autenticação...');
        await waitForAuth();
        console.log('✅ Autenticado:', currentUserId);

        await loadFromFirebase();
        await setupRealtimeSync();
        setupEventListeners();
        overrideOriginalFunctions();

        hideLoading();
        console.log('✨ Sistema pronto!');

    } catch (error) {
        console.error('❌ Erro na inicialização:', error.message);

        // Continuar com dados padrão
        updateUI();
        hideLoading();

        if (error.message !== 'offline' && error.message !== 'network') {
            alert('⚠️ Erro ao conectar. Verifique sua conexão.');
        }
    }
}

// ============================================
// EVENT LISTENERS
// ============================================

function setupEventListeners() {
    ['inputTitle', 'inputSubtitle', 'inputContact'].forEach(id => {
        document.getElementById(id)?.addEventListener('input', scheduleAutoSave);
    });

    document.querySelectorAll('.color-btn').forEach(btn => {
        btn.addEventListener('click', scheduleAutoSave);
    });
}

function overrideOriginalFunctions() {
    const original = {
        addCategory: window.addCategory,
        updateCategory: window.updateCategory,
        removeCategory: window.removeCategory,
        removeItem: window.removeItem,
        handleSaveItem: window.handleSaveItem,
        toggleVisibility: window.toggleVisibility
    };

    window.addCategory = function() {
        original.addCategory();
        scheduleAutoSave();
    };

    window.updateCategory = function(id, name) {
        original.updateCategory(id, name);
        scheduleAutoSave();
    };

    window.removeCategory = function(id) {
        original.removeCategory(id);
        scheduleAutoSave();
    };

    window.removeItem = function(id) {
        original.removeItem(id);
        scheduleAutoSave();
    };

    window.handleSaveItem = function(e) {
        original.handleSaveItem(e);
        scheduleAutoSave();
    };

    window.toggleVisibility = function(id) {
        original.toggleVisibility(id);
        scheduleAutoSave();
    };
}

// ============================================
// CLEANUP
// ============================================

window.addEventListener('beforeunload', () => {
    if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
    }
});

// ============================================
// INICIAR
// ============================================

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(initializeFirebaseIntegration, 100);
    });
} else {
    setTimeout(initializeFirebaseIntegration, 100);
}

window.scheduleAutoSave = scheduleAutoSave;