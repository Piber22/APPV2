// ============================================
// ORÇAMENTOS - FIREBASE (TEMPO REAL)
// Sincronização automática em tempo real
// ============================================

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
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
const db = getFirestore(app);

// Referência ao documento
const MENU_DOC_ID = 'default';
const menuDocRef = doc(db, 'menu', MENU_DOC_ID);

// State global (será usado pelo orcamento-script.js)
window.state = {
    settings: {},
    categories: [],
    menuItems: []
};

let unsubscribe = null;

// ============================================
// SETUP SINCRONIZAÇÃO EM TEMPO REA L
// ============================================

function setupRealtimeMenu() {
    console.log('🔄 Configurando sincronização em tempo real...');

    unsubscribe = onSnapshot(menuDocRef,
        (doc) => {
            if (doc.exists()) {
                const data = doc.data();

                console.log('✅ Dados recebidos:', {
                    categorias: data.categories?.length || 0,
                    itens: data.items?.length || 0,
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

    // Você pode adicionar uma UI de erro aqui se desejar
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
        // Configurar listener de tempo real
        setupRealtimeMenu();

        console.log('✨ Sistema iniciado com sucesso!');
        console.log('🔄 Sincronização em tempo real ATIVA');
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