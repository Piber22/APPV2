// ============================================
// ORÇAMENTOS - FIREBASE (COM DADOS POR USUÁRIO)
// Substitui o orcamento-firebase.js existente em /orcamento/
// Sincronização automática em tempo real
// ============================================

import { watchUserMenu } from '../user-data-service.js';
import { getCurrentUser } from '../auth-service.js';

// State global (será usado pelo orcamento-script.js)
window.state = {
    settings: {},
    categories: [],
    menuItems: []
};

let unsubscribe = null;

// ============================================
// SETUP SINCRONIZAÇÃO EM TEMPO REAL
// ============================================

function setupRealtimeMenu() {
    console.log('🔄 Configurando sincronização em tempo real...');

    const user = getCurrentUser();
    if (!user) {
        console.error('❌ Usuário não autenticado');
        showError('Você precisa fazer login para criar orçamentos');
        return;
    }

    console.log('👤 Carregando cardápio de:', user.email);

    unsubscribe = watchUserMenu((data) => {
        console.log('✅ Dados recebidos:', {
            usuário: user.email,
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
    });
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

    // Mostrar mensagem de erro
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: white;
        padding: 40px;
        border-radius: 20px;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
        text-align: center;
        z-index: 10000;
        max-width: 90%;
        width: 400px;
    `;
    errorDiv.innerHTML = `
        <i class="fas fa-exclamation-circle" style="font-size: 64px; color: #ef4444; margin-bottom: 20px;"></i>
        <h2 style="font-size: 24px; color: #1f2937; margin-bottom: 10px;">Ops!</h2>
        <p style="font-size: 16px; color: #6b7280; margin-bottom: 20px;">${message}</p>
        <button onclick="window.location.href='../login/login.html'" style="
            background: #ec4899;
            color: white;
            padding: 12px 24px;
            border: none;
            border-radius: 12px;
            font-weight: 600;
            cursor: pointer;
            font-size: 16px;
        ">Fazer Login</button>
    `;
    document.body.appendChild(errorDiv);

    // Mostrar o container principal com opacidade
    const mainContainer = document.querySelector('.main-container');
    if (mainContainer) {
        mainContainer.style.opacity = '0.3';
    }
}

// ============================================
// INICIALIZAÇÃO
// ============================================

async function initializeFirebase() {
    console.log('═══════════════════════════════════════');
    console.log('🍰 ORÇAMENTOS - FIREBASE');
    console.log('═══════════════════════════════════════');

    const user = getCurrentUser();

    console.log('📅 Data/Hora:', new Date().toLocaleString());
    console.log('🌐 Online:', navigator.onLine);
    console.log('👤 Usuário:', user ? user.email : 'Não autenticado');
    console.log('═══════════════════════════════════════');

    showLoading();

    try {
        // Verificar se está autenticado
        if (!user) {
            console.error('❌ Usuário não autenticado');
            showError('Você precisa fazer login para criar orçamentos');
            return;
        }

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

console.log('✅ Orçamento Firebase carregado (com dados por usuário)');