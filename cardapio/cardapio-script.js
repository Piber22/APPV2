// ============================================
// CARDÁPIO PÚBLICO - FIREBASE (COM DADOS POR USUÁRIO)
// Substitui o cardapio-script.js existente em /cardapio/
// Sincronização automática em tempo real
// ============================================

import { watchUserMenu } from '../user-data-service.js';
import { getCurrentUser } from '../auth-service.js';

// State
let menuData = {
    settings: {},
    categories: [],
    items: []
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
        showError('Você precisa fazer login para ver o cardápio');
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

        menuData.settings = data.settings || {};
        menuData.categories = data.categories || [];
        menuData.items = data.items || [];

        renderMenu();
        showMenu();

        console.log('🔔 Cardápio atualizado em tempo real!');
    });
}

// ============================================
// RENDERIZAR CARDÁPIO
// ============================================

function renderMenu() {
    const { settings, categories, items } = menuData;

    // Header
    document.getElementById('menuTitle').textContent = settings.title || 'Cardápio';
    document.getElementById('menuSubtitle').textContent = settings.subtitle || '';
    document.getElementById('contactNumber').textContent = settings.contact || '';

    // Aplicar tema
    const header = document.getElementById('header');
    header.className = 'header theme-' + (settings.themeColor || 'pink');

    // WhatsApp link
    const phone = settings.contact ? settings.contact.replace(/\D/g, '') : '';
    const message = encodeURIComponent(`Olá! Vi o cardápio e gostaria de fazer um pedido 😊`);
    document.getElementById('whatsappLink').href = `https://wa.me/55${phone}?text=${message}`;

    // Content
    const content = document.getElementById('menuContent');
    content.innerHTML = '';

    // Filtrar apenas itens visíveis
    const visibleItems = items.filter(item => item.visible !== false);

    if (visibleItems.length === 0) {
        content.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-cookie-bite"></i>
                <h3>Cardápio em breve!</h3>
                <p>Estamos preparando delícias especiais para você.</p>
            </div>
        `;
        return;
    }

    // Renderizar por categoria
    categories.forEach(category => {
        const categoryItems = visibleItems.filter(item => item.categoryId === category.id);

        if (categoryItems.length === 0) return;

        const categoryDiv = document.createElement('div');
        categoryDiv.className = 'category';

        const categoryTitle = document.createElement('h2');
        categoryTitle.className = 'category-title';
        categoryTitle.textContent = category.name;

        const itemsContainer = document.createElement('div');
        itemsContainer.className = 'category-items';

        categoryItems.forEach(item => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'item';

            const itemInfo = document.createElement('div');
            itemInfo.className = 'item-info';

            const itemHeader = document.createElement('div');
            itemHeader.className = 'item-header';

            const itemName = document.createElement('h3');
            itemName.className = 'item-name';
            itemName.textContent = item.name;

            itemHeader.appendChild(itemName);

            if (item.highlight) {
                const badge = document.createElement('span');
                badge.className = 'item-badge';
                badge.textContent = 'Novo';
                itemHeader.appendChild(badge);
            }

            itemInfo.appendChild(itemHeader);

            if (item.description) {
                const description = document.createElement('p');
                description.className = 'item-description';
                description.textContent = item.description;
                itemInfo.appendChild(description);
            }

            const priceContainer = document.createElement('div');
            const priceLabel = document.createElement('span');
            priceLabel.className = 'item-price-label';
            priceLabel.textContent = 'Preço';

            const price = document.createElement('div');
            price.className = 'item-price';
            price.textContent = `R$ ${item.price.toFixed(2).replace('.', ',')}`;

            priceContainer.appendChild(priceLabel);
            priceContainer.appendChild(price);

            itemDiv.appendChild(itemInfo);
            itemDiv.appendChild(priceContainer);

            itemsContainer.appendChild(itemDiv);
        });

        categoryDiv.appendChild(categoryTitle);
        categoryDiv.appendChild(itemsContainer);
        content.appendChild(categoryDiv);
    });
}

// ============================================
// MOSTRAR/OCULTAR SEÇÕES
// ============================================

function showLoading() {
    document.getElementById('loading').style.display = 'flex';
    document.getElementById('error').style.display = 'none';
    document.getElementById('cardapio').style.display = 'none';
}

function showError(message = 'Não conseguimos carregar o cardápio') {
    document.getElementById('loading').style.display = 'none';
    document.getElementById('error').style.display = 'flex';
    document.getElementById('cardapio').style.display = 'none';

    const errorTitle = document.querySelector('.error h2');
    if (errorTitle) {
        errorTitle.textContent = message;
    }
}

function showMenu() {
    document.getElementById('loading').style.display = 'none';
    document.getElementById('error').style.display = 'none';
    document.getElementById('cardapio').style.display = 'block';
}

// ============================================
// INICIALIZAR
// ============================================

async function init() {
    console.log('═══════════════════════════════════════');
    console.log('🍰 CARDÁPIO PÚBLICO - FIREBASE');
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
            showError('Você precisa fazer login para visualizar o cardápio');

            // Redirecionar para login após 2 segundos
            setTimeout(() => {
                window.location.href = '../login/login.html';
            }, 2000);
            return;
        }

        // Configurar listener de tempo real
        setupRealtimeMenu();

        console.log('✨ Cardápio iniciado com sucesso!');
        console.log('🔄 Sincronização em tempo real ATIVA');
        console.log('═══════════════════════════════════════');

    } catch (error) {
        console.error('❌ Erro ao inicializar:', error);
        showError('Erro ao carregar cardápio');
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

// Carregar ao abrir a página
document.addEventListener('DOMContentLoaded', init);

console.log('✅ Cardápio script carregado (com dados por usuário)');