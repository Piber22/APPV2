// ============================================
// ORÇAMENTOS - FIREBASE (TEMPO REAL)
// Sincronização automática em tempo real com userId
// ============================================

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getFirestore, doc, onSnapshot } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// Configuração do Firebase (mesma do cardápio)
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
let unsubscribe = null;

// State global (será usado pelo orcamento-script.js)
window.state = {
    settings: {},
    categories: [],
    menuItems: []
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
// SETUP SINCRONIZAÇÃO EM TEMPO REAL
// ============================================

async function setupRealtimeMenu() {
    console.log('🔄 Configurando sincronização em tempo real...');

    try {
        const userId = await getUserId();

        // Nova estrutura: users/{userId}/menu/default
        menuDocRef = doc(db, 'users', userId, 'menu', 'default');
        console.log('📄 Referência do documento:', `users/${userId}/menu/default`);

        unsubscribe = onSnapshot(menuDocRef,
            (doc) => {
                if (doc.exists()) {
                    const data = doc.data();

                    console.log('✅ Dados recebidos:', {
                        categorias: data.categories?.length || 0,
                        itens: data.items?.length || 0,
                        userId: data.userId,
                        lastModified: data.lastModified
                    });

                    window.state.settings = data.settings || {};
                    window.state.categories = data.categories || [];
                    window.state.menuItems = data.items || [];

                    // Notificar que os dados foram atualizados
                    if (typeof window.onMenuDataLoaded === 'function') {
                        window.onMenuDataLoaded();
                    }

                    console.log('🔔 Cardápio atualizado em tempo real!');
                } else {
                    console.warn('⚠️ Documento não existe ainda');
                    showError('Cardápio ainda não foi configurado');
                }
            },
            (error) => {
                console.error('❌ Erro na sincronização:', error);
                showError('Erro ao carregar cardápio');
            }
        );

    } catch (error) {
        console.error('❌ Erro ao configurar sincronização:', error);
        throw error;
    }
}

// ============================================
// MOSTRAR/ESCONDER LOADING
// ============================================

function showLoading() {
    const loadingScreen = document.getElementById('loadingScreen');
    if (loadingScreen) {
        loadingScreen.classList.remove('hidden');
    }
}

function hideLoading() {
    const loadingScreen = document.getElementById('loadingScreen');
    const mainContainer = document.querySelector('.main-container');

    if (loadingScreen) {
        loadingScreen.classList.add('hidden');
    }

    if (mainContainer) {
        mainContainer.style.opacity = '1';
        mainContainer.style.transition = 'opacity 0.5s ease';
    }
}

function showError(message) {
    console.error('❌', message);
    hideLoading();

    const mainContainer = document.querySelector('.main-container');
    if (mainContainer) {
        mainContainer.style.opacity = '1';
    }
}

// ============================================
// INICIALIZAÇÃO
// ============================================

async function initializeFirebase() {
    console.log('═══════════════════════════════════════');
    console.log('🍰 ORÇAMENTOS - FIREBASE');
    console.log('═══════════════════════════════════════');
    console.log('📅 Data/Hora:', new Date().toLocaleString());
    console.log('🌐 Online:', navigator.onLine);
    console.log('═══════════════════════════════════════');

    showLoading();

    try {
        // Aguardar autenticação e obter userId
        console.log('🔐 Aguardando autenticação...');
        await getUserId();
        console.log('✅ Usuário autenticado:', currentUserId);

        // Configurar listener de tempo real
        await setupRealtimeMenu();

        console.log('✨ Sistema iniciado com sucesso!');
        console.log('🔄 Sincronização em tempo real ATIVA');
        console.log('👤 UserId:', currentUserId);
        console.log('═══════════════════════════════════════');

    } catch (error) {
        console.error('❌ Erro ao inicializar:', error);
        showError('Erro ao conectar com Firebase');
    }
}

// ============================================
// CLEANUP
// ============================================

window.addEventListener('beforeunload', () => {
    if (unsubscribe) {
        unsubscribe();
        console.log('🔌 Sincronização desconectada');
    }
});

// ============================================
// EXPORTAR FUNÇÕES
// ============================================

window.initializeFirebase = initializeFirebase;
window.hideLoading = hideLoading;

// Iniciar automaticamente
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeFirebase);
} else {
    initializeFirebase();
}