// ============================================
// FIREBASE INTEGRATION - DOCE GESTÃO
// Sincronização em tempo real com userId
// ============================================

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getFirestore, doc, setDoc, getDoc, onSnapshot } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// Configuração do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBLhKaigyOT9dCAd9iA1o5j18rFB4rQ5uo",
  authDomain: "doce-gestao-4b032.firebaseapp.com",
  projectId: "doce-gestao-4b032",
  storageBucket: "doce-gestao-4b032.firebasestorage.app",
  messagingSenderId: "318295225306",
  appId: "1:318295225306:web:3beaebbb5979edba6686e3"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

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
    lastLoaded: null,
    hasUnsavedChanges: false,
    saveTimeout: null,
    isInitialized: false
};

// ============================================
// OBTER USER ID
// ============================================

async function getUserId() {
    if (currentUserId) {
        return currentUserId;
    }

    return new Promise((resolve, reject) => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            unsubscribe();
            if (user) {
                currentUserId = user.uid;
                console.log('👤 UserId obtido:', currentUserId);
                resolve(currentUserId);
            } else {
                console.error('❌ Usuário não autenticado');
                reject(new Error('Usuário não autenticado'));
            }
        });
    });
}

// ============================================
// INICIALIZAR REFERÊNCIA DO DOCUMENTO
// ============================================

async function initMenuDocRef() {
    if (menuDocRef) {
        return menuDocRef;
    }

    try {
        const userId = await getUserId();
        // Nova estrutura: users/{userId}/menu/default
        menuDocRef = doc(db, 'users', userId, 'menu', 'default');
        console.log('📄 Referência do documento criada:', `users/${userId}/menu/default`);
        return menuDocRef;
    } catch (error) {
        console.error('❌ Erro ao criar referência:', error);
        throw error;
    }
}

// ============================================
// SALVAR DADOS NO FIREBASE
// ============================================

async function saveToFirebase() {
    if (syncStatus.isSyncing) {
        console.log('⏳ Já está salvando, aguardando...');
        return;
    }

    try {
        syncStatus.isSyncing = true;
        console.log('💾 Salvando no Firebase...');

        const docRef = await initMenuDocRef();

        const dataToSave = {
            settings: state.settings,
            categories: state.categories,
            items: state.items,
            userId: currentUserId,
            lastModified: new Date().toISOString(),
            version: 1
        };

        console.log('📤 Dados a serem salvos:', {
            categorias: dataToSave.categories.length,
            itens: dataToSave.items.length,
            userId: currentUserId,
            timestamp: dataToSave.lastModified
        });

        await setDoc(docRef, dataToSave);

        syncStatus.lastSaved = new Date();
        syncStatus.hasUnsavedChanges = false;

        console.log('✅ Dados salvos com sucesso às', syncStatus.lastSaved.toLocaleTimeString());

    } catch (error) {
        console.error('❌ Erro ao salvar no Firebase:', error);
        console.error('Stack trace:', error.stack);
        syncStatus.hasUnsavedChanges = true;

    } finally {
        syncStatus.isSyncing = false;
    }
}

// ============================================
// CARREGAR DADOS DO FIREBASE
// ============================================

async function loadFromFirebase() {
    console.log('☁️ Carregando dados do Firebase...');

    try {
        const docRef = await initMenuDocRef();
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();

            console.log('✅ Dados recebidos do Firebase:', {
                categorias: data.categories?.length || 0,
                itens: data.items?.length || 0,
                userId: data.userId,
                lastModified: data.lastModified
            });

            // Atualizar estado
            if (data.settings) state.settings = data.settings;
            if (data.categories) state.categories = data.categories;
            if (data.items) state.items = data.items;

            updateUI();
            syncStatus.lastLoaded = new Date();
            console.log('✅ Interface atualizada com sucesso');

        } else {
            console.log('ℹ️ Documento não existe ainda, criando com dados padrão...');

            // Usar dados padrão do state atual
            await saveToFirebase();
            console.log('✅ Dados iniciais salvos no Firebase');
        }

    } catch (error) {
        console.error('❌ Erro ao carregar do Firebase:', error);
        console.error('Stack trace:', error.stack);
        throw error;
    }
}

// ============================================
// SINCRONIZAÇÃO EM TEMPO REAL
// ============================================

async function setupRealtimeSync() {
    console.log('🔄 Configurando sincronização em tempo real...');

    try {
        const docRef = await initMenuDocRef();

        // Escutar mudanças no documento
        unsubscribeSnapshot = onSnapshot(docRef, (doc) => {
            // Ignorar a primeira chamada (que é o load inicial)
            if (!syncStatus.isInitialized) {
                syncStatus.isInitialized = true;
                console.log('✅ Listener de tempo real ativado');
                return;
            }

            // Ignorar se estamos salvando (para evitar loop)
            if (syncStatus.isSyncing) {
                console.log('⏭️ Ignorando update (salvando no momento)');
                return;
            }

            // Ignorar se temos mudanças não salvas
            if (syncStatus.hasUnsavedChanges) {
                console.log('⏭️ Ignorando update (há mudanças locais não salvas)');
                return;
            }

            if (doc.exists()) {
                const data = doc.data();

                console.log('🔔 Atualização recebida em tempo real!');
                console.log('📥 Novos dados:', {
                    categorias: data.categories?.length || 0,
                    itens: data.items?.length || 0,
                    userId: data.userId,
                    lastModified: data.lastModified
                });

                // Atualizar estado
                if (data.settings) state.settings = data.settings;
                if (data.categories) state.categories = data.categories;
                if (data.items) state.items = data.items;

                updateUI();
                console.log('✅ Interface atualizada com dados do servidor');
            }
        }, (error) => {
            console.error('❌ Erro no listener de tempo real:', error);
        });

    } catch (error) {
        console.error('❌ Erro ao configurar sincronização:', error);
        throw error;
    }
}

// ============================================
// ATUALIZAR INTERFACE
// ============================================

function updateUI() {
    console.log('🎨 Atualizando interface...');

    renderCategories();
    renderItemsList();
    renderPreview();

    document.getElementById('inputTitle').value = state.settings.title;
    document.getElementById('inputSubtitle').value = state.settings.subtitle;
    document.getElementById('inputContact').value = state.settings.contact;

    document.querySelectorAll('.color-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.color === state.settings.themeColor);
    });

    console.log('✅ Interface atualizada');
}

// ============================================
// AUTO-SAVE
// ============================================

function scheduleAutoSave() {
    syncStatus.hasUnsavedChanges = true;

    if (syncStatus.saveTimeout) {
        clearTimeout(syncStatus.saveTimeout);
    }

    console.log('⏱️ Auto-save agendado para 2 segundos...');

    syncStatus.saveTimeout = setTimeout(() => {
        saveToFirebase();
    }, 2000);
}

// ============================================
// MOSTRAR/ESCONDER LOADING
// ============================================

function showLoading() {
    const loadingScreen = document.getElementById('loadingScreen');
    if (loadingScreen) {
        loadingScreen.classList.remove('hidden');
        console.log('⏳ Loading screen exibido');
    }
}

function hideLoading() {
    const loadingScreen = document.getElementById('loadingScreen');
    const mainContainer = document.querySelector('.main-container');

    if (loadingScreen) {
        loadingScreen.classList.add('hidden');
        console.log('✅ Loading screen ocultado');
    }

    if (mainContainer) {
        mainContainer.style.opacity = '1';
        mainContainer.style.transition = 'opacity 0.5s ease';
    }
}

// ============================================
// INICIALIZAÇÃO
// ============================================

async function initializeFirebaseIntegration() {
    console.log('═══════════════════════════════════════');
    console.log('🚀 INICIANDO DOCE GESTÃO - FIREBASE');
    console.log('═══════════════════════════════════════');
    console.log('📅 Data/Hora:', new Date().toLocaleString());
    console.log('🌐 Online:', navigator.onLine);
    console.log('📱 User Agent:', navigator.userAgent);
    console.log('═══════════════════════════════════════');

    showLoading();

    try {
        // Aguardar autenticação e obter userId
        console.log('🔐 Aguardando autenticação...');
        await getUserId();
        console.log('✅ Usuário autenticado:', currentUserId);

        // Carregar dados do Firebase
        console.log('☁️ Carregando dados do Firebase...');
        await loadFromFirebase();
        console.log('✅ Dados carregados com sucesso');

        // Configurar sincronização em tempo real
        await setupRealtimeSync();

        // Configurar event listeners
        console.log('⚙️ Configurando event listeners...');
        setupEventListeners();
        overrideOriginalFunctions();

        hideLoading();

        console.log('═══════════════════════════════════════');
        console.log('✨ SISTEMA INICIALIZADO COM SUCESSO');
        console.log('🔄 Sincronização em tempo real ATIVA');
        console.log('👤 UserId:', currentUserId);
        console.log('═══════════════════════════════════════');

    } catch (error) {
        console.error('═══════════════════════════════════════');
        console.error('❌ FALHA CRÍTICA NA INICIALIZAÇÃO');
        console.error('═══════════════════════════════════════');
        console.error('Erro:', error.message);
        console.error('Stack:', error.stack);
        console.error('═══════════════════════════════════════');

        // Usar dados padrão se falhar
        console.warn('⚠️ Usando dados padrão do sistema');
        updateUI();
        hideLoading();

        if (navigator.onLine) {
            setTimeout(() => {
                alert('⚠️ Não foi possível conectar ao Firebase.\n\nVerifique sua conexão e recarregue a página.');
            }, 500);
        }
    }
}

// ============================================
// EVENT LISTENERS E OVERRIDES
// ============================================

function setupEventListeners() {
    ['inputTitle', 'inputSubtitle', 'inputContact'].forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('input', () => {
                console.log('📝 Campo alterado:', id);
                scheduleAutoSave();
            });
        }
    });

    document.querySelectorAll('.color-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            console.log('🎨 Cor alterada para:', btn.dataset.color);
            scheduleAutoSave();
        });
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
        console.log('➕ Categoria adicionada');
        original.addCategory();
        scheduleAutoSave();
    };

    window.updateCategory = function(id, name) {
        console.log('✏️ Categoria atualizada:', id, name);
        original.updateCategory(id, name);
        scheduleAutoSave();
    };

    window.removeCategory = function(id) {
        console.log('🗑️ Categoria removida:', id);
        original.removeCategory(id);
        scheduleAutoSave();
    };

    window.removeItem = function(id) {
        console.log('🗑️ Item removido:', id);
        original.removeItem(id);
        scheduleAutoSave();
    };

    window.handleSaveItem = function(e) {
        console.log('💾 Item salvo/editado');
        original.handleSaveItem(e);
        scheduleAutoSave();
    };

    window.toggleVisibility = function(id) {
        console.log('👁️ Visibilidade alterada:', id);
        original.toggleVisibility(id);
        scheduleAutoSave();
    };
}

// ============================================
// CLEANUP AO SAIR
// ============================================

window.addEventListener('beforeunload', () => {
    if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
        console.log('🔌 Listener de tempo real desconectado');
    }
});

// ============================================
// INICIAR QUANDO DOM CARREGAR
// ============================================

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(initializeFirebaseIntegration, 100);
    });
} else {
    setTimeout(initializeFirebaseIntegration, 100);
}

// Exportar funções para uso global
window.scheduleAutoSave = scheduleAutoSave;