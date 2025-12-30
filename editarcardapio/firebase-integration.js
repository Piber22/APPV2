// ============================================
// FIREBASE INTEGRATION - DOCE GESTÃO (COM DADOS POR USUÁRIO)
// Substitui o firebase-integration.js existente em /editarcardapio/
// ============================================

import {
    loadUserMenu,
    saveUserMenu,
    watchUserMenu,
    migrateOldData
} from '../user-data-service.js';
import { getCurrentUser } from '../auth-service.js';

// Estado de sincronização
let syncStatus = {
    isSyncing: false,
    lastSaved: null,
    lastLoaded: null,
    hasUnsavedChanges: false,
    saveTimeout: null,
    isInitialized: false
};

// Listener de sincronização em tempo real
let unsubscribeSnapshot = null;

// ============================================
// SALVAR DADOS NO FIREBASE
// ============================================

async function saveToFirebase() {
    if (syncStatus.isSyncing) {
        console.log('⏳ Já está salvando, aguardando...');
        return;
    }

    const user = getCurrentUser();
    if (!user) {
        console.error('❌ Usuário não autenticado');
        return;
    }

    try {
        syncStatus.isSyncing = true;
        console.log('💾 Salvando no Firebase...');

        const dataToSave = {
            settings: state.settings,
            categories: state.categories,
            items: state.items
        };

        console.log('📤 Dados a serem salvos:', {
            usuário: user.email,
            categorias: dataToSave.categories.length,
            itens: dataToSave.items.length,
            timestamp: new Date().toISOString()
        });

        await saveUserMenu(dataToSave);

        syncStatus.lastSaved = new Date();
        syncStatus.hasUnsavedChanges = false;

        console.log('✅ Dados salvos com sucesso às', syncStatus.lastSaved.toLocaleTimeString());

    } catch (error) {
        console.error('❌ Erro ao salvar no Firebase:', error);
        syncStatus.hasUnsavedChanges = true;

        // Mostrar mensagem de erro ao usuário
        showError('Erro ao salvar. Suas alterações não foram salvas.');

    } finally {
        syncStatus.isSyncing = false;
    }
}

// ============================================
// CARREGAR DADOS DO FIREBASE
// ============================================

async function loadFromFirebase() {
    console.log('☁️ Carregando dados do Firebase...');

    const user = getCurrentUser();
    if (!user) {
        console.error('❌ Usuário não autenticado');
        return;
    }

    try {
        const data = await loadUserMenu();

        console.log('✅ Dados recebidos do Firebase:', {
            usuário: user.email,
            categorias: data.categories?.length || 0,
            itens: data.items?.length || 0,
            lastModified: data.lastModified
        });

        // Atualizar estado
        if (data.settings) state.settings = data.settings;
        if (data.categories) state.categories = data.categories;
        if (data.items) state.items = data.items;

        updateUI();
        syncStatus.lastLoaded = new Date();
        console.log('✅ Interface atualizada com sucesso');

    } catch (error) {
        console.error('❌ Erro ao carregar do Firebase:', error);
        throw error;
    }
}

// ============================================
// SINCRONIZAÇÃO EM TEMPO REAL
// ============================================

function setupRealtimeSync() {
    console.log('🔄 Configurando sincronização em tempo real...');

    const user = getCurrentUser();
    if (!user) {
        console.error('❌ Usuário não autenticado');
        return;
    }

    // Escutar mudanças no menu do usuário
    unsubscribeSnapshot = watchUserMenu((data) => {
        // Ignorar a primeira chamada (que é o load inicial)
        if (!syncStatus.isInitialized) {
            syncStatus.isInitialized = true;
            console.log('✅ Listener de tempo real ativado para:', user.email);
            return;
        }

        // Ignorar se estamos salvando (para evitar loop)
        if (syncStatus.isSyncing) {
            console.log('⭐ Ignorando update (salvando no momento)');
            return;
        }

        // Ignorar se temos mudanças não salvas
        if (syncStatus.hasUnsavedChanges) {
            console.log('⭐ Ignorando update (há mudanças locais não salvas)');
            return;
        }

        console.log('🔔 Atualização recebida em tempo real!');
        console.log('📥 Novos dados:', {
            categorias: data.categories?.length || 0,
            itens: data.items?.length || 0,
            lastModified: data.lastModified
        });

        // Atualizar estado
        if (data.settings) state.settings = data.settings;
        if (data.categories) state.categories = data.categories;
        if (data.items) state.items = data.items;

        updateUI();
        console.log('✅ Interface atualizada com dados do servidor');
    });
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

function showError(message) {
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: #ef4444;
        color: white;
        padding: 16px 24px;
        border-radius: 12px;
        font-weight: 600;
        z-index: 10000;
        box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
        animation: slideDown 0.3s;
    `;
    toast.textContent = message;

    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'slideDown 0.3s reverse';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ============================================
// INICIALIZAÇÃO
// ============================================

async function initializeFirebaseIntegration() {
    console.log('═══════════════════════════════════════');
    console.log('🚀 INICIANDO DOCE GESTÃO - FIREBASE');
    console.log('═══════════════════════════════════════');

    const user = getCurrentUser();
    if (!user) {
        console.error('❌ Usuário não autenticado');
        window.location.href = '../login/login.html';
        return;
    }

    console.log('👤 Usuário:', user.email);
    console.log('📅 Data/Hora:', new Date().toLocaleString());
    console.log('🌐 Online:', navigator.onLine);
    console.log('═══════════════════════════════════════');

    showLoading();

    try {
        // Tentar migrar dados antigos (se houver)
        await migrateOldData();

        // Carregar dados do Firebase
        console.log('☁️ Carregando dados do Firebase...');
        await loadFromFirebase();
        console.log('✅ Dados carregados com sucesso');

        // Configurar sincronização em tempo real
        setupRealtimeSync();

        // Configurar event listeners
        console.log('⚙️ Configurando event listeners...');
        setupEventListeners();
        overrideOriginalFunctions();

        hideLoading();

        console.log('═══════════════════════════════════════');
        console.log('✨ SISTEMA INICIALIZADO COM SUCESSO');
        console.log('🔄 Sincronização em tempo real ATIVA');
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
                showError('Erro ao carregar dados. Tente recarregar a página.');
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
                console.log('🖊️ Campo alterado:', id);
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