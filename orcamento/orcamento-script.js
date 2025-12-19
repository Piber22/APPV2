// ============================================
// ORÇAMENTOS - SCRIPT PRINCIPAL
// Integrado com Firebase (tempo real)
// ============================================

// State será acessado via window.state (definido no orcamento-firebase.js)
function getState() {
    return window.state || { settings: {}, categories: [], menuItems: [] };
}

// State do orçamento atual
const budget = {
    clientName: '',
    deliveryFee: 0,
    selectedItems: [] // { itemId, name, price, quantity }
};

// ============================================
// ATUALIZAR INTERFACE
// ============================================

function updateUI() {
    console.log('🔄 Atualizando interface...');

    const state = getState();

    if (!state.menuItems || state.menuItems.length === 0) {
        console.log('⚠️ Nenhum item no cardápio ainda');
        showEmptyState();
        return;
    }

    renderItemsSelection();
    console.log('✅ Interface atualizada');
}

function showEmptyState() {
    const container = document.getElementById('itemsSelection');
    if (!container) return;

    container.innerHTML = `
        <div style="text-align: center; padding: 40px 20px; color: #666;">
            <i class="fas fa-cookie-bite" style="font-size: 48px; margin-bottom: 16px; opacity: 0.3;"></i>
            <p style="font-size: 16px; margin: 0;">Cardápio vazio ou carregando...</p>
            <p style="font-size: 14px; margin-top: 8px; opacity: 0.7;">Aguarde ou configure o cardápio primeiro.</p>
        </div>
    `;
}

// ============================================
// RENDERIZAR SELEÇÃO DE ITENS
// ============================================

function renderItemsSelection() {
    const container = document.getElementById('itemsSelection');
    if (!container) return;

    const state = getState();
    const { categories, menuItems } = state;

    container.innerHTML = '';

    // Filtrar apenas itens visíveis
    const visibleItems = menuItems.filter(item => item.visible !== false);

    if (visibleItems.length === 0) {
        showEmptyState();
        return;
    }

    categories.forEach(category => {
        const categoryItems = visibleItems.filter(item => item.categoryId === category.id);

        if (categoryItems.length === 0) return;

        // Categoria Header
        const categoryDiv = document.createElement('div');
        categoryDiv.className = 'category-section';

        const categoryTitle = document.createElement('h3');
        categoryTitle.className = 'category-section-title';
        categoryTitle.textContent = category.name;
        categoryDiv.appendChild(categoryTitle);

        // Items
        categoryItems.forEach(item => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'item-card';

            const itemInfo = document.createElement('div');
            itemInfo.className = 'item-info';

            const itemName = document.createElement('div');
            itemName.className = 'item-name';
            itemName.textContent = item.name;

            const itemPrice = document.createElement('div');
            itemPrice.className = 'item-price';
            itemPrice.textContent = `R$ ${item.price.toFixed(2).replace('.', ',')}`;

            itemInfo.appendChild(itemName);
            if (item.description) {
                const itemDesc = document.createElement('div');
                itemDesc.className = 'item-description';
                itemDesc.textContent = item.description;
                itemInfo.appendChild(itemDesc);
            }
            itemInfo.appendChild(itemPrice);

            // Controles de quantidade
            const controls = document.createElement('div');
            controls.className = 'item-controls';

            const btnMinus = document.createElement('button');
            btnMinus.className = 'btn-quantity';
            btnMinus.innerHTML = '<i class="fas fa-minus"></i>';
            btnMinus.onclick = () => decreaseQuantity(item.id);

            const quantityDisplay = document.createElement('span');
            quantityDisplay.className = 'quantity-display';
            quantityDisplay.id = `qty-${item.id}`;
            quantityDisplay.textContent = '0';

            const btnPlus = document.createElement('button');
            btnPlus.className = 'btn-quantity';
            btnPlus.innerHTML = '<i class="fas fa-plus"></i>';
            btnPlus.onclick = () => increaseQuantity(item.id);

            controls.appendChild(btnMinus);
            controls.appendChild(quantityDisplay);
            controls.appendChild(btnPlus);

            itemDiv.appendChild(itemInfo);
            itemDiv.appendChild(controls);
            categoryDiv.appendChild(itemDiv);
        });

        container.appendChild(categoryDiv);
    });
}

// ============================================
// CONTROLE DE QUANTIDADE
// ============================================

function increaseQuantity(itemId) {
    const state = getState();
    const item = state.menuItems.find(i => i.id === itemId);
    if (!item) return;

    const existing = budget.selectedItems.find(i => i.itemId === itemId);

    if (existing) {
        existing.quantity++;
    } else {
        budget.selectedItems.push({
            itemId: item.id,
            name: item.name,
            price: item.price,
            quantity: 1
        });
    }

    updateQuantityDisplay(itemId);
    updateSelectedItems();
    updateBudgetPreview();
}

function decreaseQuantity(itemId) {
    const existing = budget.selectedItems.find(i => i.itemId === itemId);
    if (!existing) return;

    existing.quantity--;

    if (existing.quantity <= 0) {
        budget.selectedItems = budget.selectedItems.filter(i => i.itemId !== itemId);
    }

    updateQuantityDisplay(itemId);
    updateSelectedItems();
    updateBudgetPreview();
}

function updateQuantityDisplay(itemId) {
    const display = document.getElementById(`qty-${itemId}`);
    if (!display) return;

    const item = budget.selectedItems.find(i => i.itemId === itemId);
    display.textContent = item ? item.quantity : '0';
}

// ============================================
// ITENS SELECIONADOS
// ============================================

function updateSelectedItems() {
    const card = document.getElementById('selectedItemsCard');
    const list = document.getElementById('selectedItemsList');

    if (budget.selectedItems.length === 0) {
        card.style.display = 'none';
        return;
    }

    card.style.display = 'block';
    list.innerHTML = '';

    budget.selectedItems.forEach(item => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'selected-item';

        const info = document.createElement('div');
        const name = document.createElement('div');
        name.className = 'selected-item-name';
        name.textContent = `${item.quantity}x ${item.name}`;

        const price = document.createElement('div');
        price.className = 'selected-item-price';
        price.textContent = `R$ ${(item.price * item.quantity).toFixed(2).replace('.', ',')}`;

        info.appendChild(name);
        info.appendChild(price);

        const btnRemove = document.createElement('button');
        btnRemove.className = 'btn-remove';
        btnRemove.innerHTML = '<i class="fas fa-times"></i>';
        btnRemove.onclick = () => removeItem(item.itemId);

        itemDiv.appendChild(info);
        itemDiv.appendChild(btnRemove);
        list.appendChild(itemDiv);
    });

    updateSummary();
}

function removeItem(itemId) {
    budget.selectedItems = budget.selectedItems.filter(i => i.itemId !== itemId);
    updateQuantityDisplay(itemId);
    updateSelectedItems();
    updateBudgetPreview();
}

function updateSummary() {
    const subtotal = budget.selectedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const delivery = budget.deliveryFee;
    const total = subtotal + delivery;

    document.getElementById('subtotalValue').textContent = `R$ ${subtotal.toFixed(2).replace('.', ',')}`;
    document.getElementById('deliveryValue').textContent = `R$ ${delivery.toFixed(2).replace('.', ',')}`;
    document.getElementById('totalValue').textContent = `R$ ${total.toFixed(2).replace('.', ',')}`;
}

// ============================================
// PREVIEW DO ORÇAMENTO
// ============================================

function updateBudgetPreview() {
    const preview = document.getElementById('budgetPreview');
    if (!preview) return;

    const state = getState();
    const { settings } = state;

    const clientName = budget.clientName || 'Cliente';
    const date = new Date().toLocaleDateString('pt-BR');

    if (budget.selectedItems.length === 0) {
        preview.innerHTML = `
            <div style="text-align: center; padding: 60px 20px; color: #999;">
                <i class="fas fa-file-invoice" style="font-size: 64px; margin-bottom: 20px;"></i>
                <p style="font-size: 18px; margin: 0;">Adicione itens para visualizar o orçamento</p>
            </div>
        `;
        return;
    }

    const subtotal = budget.selectedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const delivery = budget.deliveryFee;
    const total = subtotal + delivery;

    let html = `
        <div class="preview-header">
            <h2>${settings.title || 'Doce Gestão'}</h2>
            <p class="preview-date">${date}</p>
        </div>

        <div class="preview-client">
            <strong>Cliente:</strong> ${clientName}
        </div>

        <div class="preview-items">
            <h3>Itens do Pedido</h3>
    `;

    budget.selectedItems.forEach(item => {
        const itemTotal = item.price * item.quantity;
        html += `
            <div class="preview-item">
                <div class="preview-item-info">
                    <span class="preview-item-qty">${item.quantity}x</span>
                    <span class="preview-item-name">${item.name}</span>
                </div>
                <span class="preview-item-price">R$ ${itemTotal.toFixed(2).replace('.', ',')}</span>
            </div>
        `;
    });

    html += `
        </div>

        <div class="preview-summary">
            <div class="preview-summary-row">
                <span>Subtotal:</span>
                <span>R$ ${subtotal.toFixed(2).replace('.', ',')}</span>
            </div>
    `;

    if (delivery > 0) {
        html += `
            <div class="preview-summary-row">
                <span>Taxa de Entrega:</span>
                <span>R$ ${delivery.toFixed(2).replace('.', ',')}</span>
            </div>
        `;
    }

    html += `
            <div class="preview-summary-row preview-total">
                <span>Total:</span>
                <span>R$ ${total.toFixed(2).replace('.', ',')}</span>
            </div>
        </div>

        <div class="preview-footer">
            <p>${settings.subtitle || ''}</p>
            <p><strong>${settings.contact || ''}</strong></p>
        </div>
    `;

    preview.innerHTML = html;
}

// ============================================
// AÇÕES DO ORÇAMENTO
// ============================================

function copyTextToClipboard() {
    if (budget.selectedItems.length === 0) {
        alert('Adicione itens ao orçamento primeiro!');
        return;
    }

    const state = getState();
    const { settings } = state;
    const clientName = budget.clientName || 'Cliente';
    const date = new Date().toLocaleDateString('pt-BR');

    let text = `*${settings.title || 'Doce Gestão'}*\n`;
    text += `📅 ${date}\n`;
    text += `👤 Cliente: ${clientName}\n\n`;
    text += `📋 *ORÇAMENTO*\n`;
    text += `${'─'.repeat(30)}\n\n`;

    budget.selectedItems.forEach(item => {
        const itemTotal = item.price * item.quantity;
        text += `${item.quantity}x ${item.name}\n`;
        text += `   R$ ${itemTotal.toFixed(2).replace('.', ',')}\n\n`;
    });

    const subtotal = budget.selectedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const delivery = budget.deliveryFee;
    const total = subtotal + delivery;

    text += `${'─'.repeat(30)}\n`;
    text += `Subtotal: R$ ${subtotal.toFixed(2).replace('.', ',')}\n`;

    if (delivery > 0) {
        text += `Taxa de Entrega: R$ ${delivery.toFixed(2).replace('.', ',')}\n`;
    }

    text += `\n*TOTAL: R$ ${total.toFixed(2).replace('.', ',')}*\n\n`;
    text += `${settings.contact || ''}`;

    navigator.clipboard.writeText(text).then(() => {
        showNotification('Texto copiado! Cole no WhatsApp 📱');
    });
}

async function exportAsImage() {
    if (budget.selectedItems.length === 0) {
        alert('Adicione itens ao orçamento primeiro!');
        return;
    }

    const preview = document.getElementById('budgetPreview');

    try {
        const canvas = await html2canvas(preview, {
            backgroundColor: '#ffffff',
            scale: 2
        });

        canvas.toBlob((blob) => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `orcamento_${Date.now()}.png`;
            a.click();
            URL.revokeObjectURL(url);
            showNotification('Imagem baixada com sucesso! 🖼️');
        });
    } catch (error) {
        console.error('Erro ao gerar imagem:', error);
        alert('Erro ao gerar imagem');
    }
}

function clearBudget() {
    if (budget.selectedItems.length === 0) return;

    if (confirm('Deseja limpar o orçamento atual?')) {
        budget.clientName = '';
        budget.deliveryFee = 0;
        budget.selectedItems = [];

        document.getElementById('inputClientName').value = '';
        document.getElementById('inputDeliveryFee').value = '0';

        // Atualizar todos os displays de quantidade
        const state = getState();
        state.menuItems.forEach(item => {
            updateQuantityDisplay(item.id);
        });

        updateSelectedItems();
        updateBudgetPreview();
        showNotification('Orçamento limpo! 🗑️');
    }
}

function showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => notification.classList.add('show'), 10);
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// ============================================
// EVENT LISTENERS
// ============================================

document.getElementById('inputClientName')?.addEventListener('input', (e) => {
    budget.clientName = e.target.value;
    updateBudgetPreview();
});

document.getElementById('inputDeliveryFee')?.addEventListener('input', (e) => {
    budget.deliveryFee = parseFloat(e.target.value) || 0;
    updateSummary();
    updateBudgetPreview();
});

document.getElementById('btnNewBudget')?.addEventListener('click', clearBudget);
document.getElementById('btnCopyText')?.addEventListener('click', copyTextToClipboard);
document.getElementById('btnExportImage')?.addEventListener('click', exportAsImage);
document.getElementById('btnClearBudget')?.addEventListener('click', clearBudget);

// ============================================
// CALLBACK DO FIREBASE
// ============================================

// Esta função será chamada quando o Firebase carregar/atualizar os dados
window.onMenuDataLoaded = function() {
    console.log('📦 Dados do menu recebidos, atualizando UI...');
    updateUI();

    // Esconder loading se ainda estiver visível
    if (window.hideLoading) {
        setTimeout(window.hideLoading, 500);
    }
};

// ============================================
// INICIALIZAÇÃO
// ============================================

console.log('✅ orcamento-script.js carregado');

// Tentar atualizar UI imediatamente (caso o Firebase já tenha carregado)
setTimeout(() => {
    if (getState().menuItems.length > 0) {
        updateUI();
    }
}, 100);