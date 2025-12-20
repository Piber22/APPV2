// ============================================
// CALENDARIO DE ENCOMENDAS - FIREBASE
// ============================================

// State
let state = {
    orders: [],
    currentDate: new Date(),
    selectedDate: null,
    editingOrder: null,
    filters: {
        pendente: true,
        pronto: true,
        entregue: true
    }
};

// ============================================
// INITIALIZE
// ============================================

document.addEventListener('DOMContentLoaded', async function() {
    console.log('═══════════════════════════════════════');
    console.log('📅 CALENDÁRIO DE ENCOMENDAS - FIREBASE');
    console.log('═══════════════════════════════════════');

    initializeEventListeners();

    // Carregar encomendas inicialmente
    await loadInitialOrders();

    // Configurar sincronização em tempo real
    setupRealtimeSync();

    renderCalendar();
    renderOrdersList();
});

async function loadInitialOrders() {
    try {
        FirebaseOrders.showLoading('Carregando encomendas...');
        const orders = await FirebaseOrders.loadOrders();
        state.orders = orders;
        FirebaseOrders.hideLoading();
        console.log('✅ Encomendas carregadas:', orders.length);
    } catch (error) {
        FirebaseOrders.hideLoading();
        FirebaseOrders.showError('Erro ao carregar encomendas');
        console.error('❌ Erro:', error);
    }
}

function setupRealtimeSync() {
    console.log('🔄 Ativando sincronização em tempo real...');

    FirebaseOrders.setupRealtimeOrders((orders) => {
        console.log('🔔 Encomendas atualizadas:', orders.length);
        state.orders = orders;
        renderCalendar();
        renderOrdersList();
    });
}

// ============================================
// EVENT LISTENERS
// ============================================

function initializeEventListeners() {
    // Header button
    document.getElementById('btnNewOrder').addEventListener('click', openNewOrderForm);

    // FAB button
    document.getElementById('fabNewOrder').addEventListener('click', openNewOrderForm);

    // Calendar navigation
    document.getElementById('btnPrevMonth').addEventListener('click', prevMonth);
    document.getElementById('btnNextMonth').addEventListener('click', nextMonth);

    // Modal controls
    document.getElementById('btnCloseModal').addEventListener('click', closeModal);
    document.getElementById('btnDeleteOrder').addEventListener('click', deleteOrder);
    document.getElementById('orderForm').addEventListener('submit', handleSaveOrder);

    // Status filters
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', toggleFilter);
    });

    // Status options in modal
    document.querySelectorAll('.status-option').forEach(option => {
        option.addEventListener('click', selectStatus);
    });

    // Close modal on backdrop click
    document.getElementById('modalOrder').addEventListener('click', (e) => {
        if (e.target.id === 'modalOrder') closeModal();
    });
}

// ============================================
// CALENDAR FUNCTIONS
// ============================================

function renderCalendar() {
    const year = state.currentDate.getFullYear();
    const month = state.currentDate.getMonth();

    // Update month title
    const monthNames = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    document.getElementById('currentMonth').textContent = `${monthNames[month]} ${year}`;

    // Get first and last days
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const prevLastDay = new Date(year, month, 0);

    const firstDayOfWeek = firstDay.getDay();
    const lastDateOfMonth = lastDay.getDate();
    const prevLastDate = prevLastDay.getDate();

    const container = document.getElementById('calendarDays');
    container.innerHTML = '';

    // Previous month days
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
        const day = createDayElement(prevLastDate - i, true, month - 1, year);
        container.appendChild(day);
    }

    // Current month days
    for (let i = 1; i <= lastDateOfMonth; i++) {
        const day = createDayElement(i, false, month, year);
        container.appendChild(day);
    }

    // Next month days
    const remainingDays = 42 - container.children.length;
    for (let i = 1; i <= remainingDays; i++) {
        const day = createDayElement(i, true, month + 1, year);
        container.appendChild(day);
    }
}

function createDayElement(dayNum, isOtherMonth, month, year) {
    const div = document.createElement('div');
    div.className = 'calendar-day';

    if (isOtherMonth) {
        div.classList.add('other-month');
    }

    // Adjust month for previous/next month
    let adjustedMonth = month;
    let adjustedYear = year;

    if (month < 0) {
        adjustedMonth = 11;
        adjustedYear = year - 1;
    } else if (month > 11) {
        adjustedMonth = 0;
        adjustedYear = year + 1;
    }

    const dateStr = `${adjustedYear}-${String(adjustedMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;

    // Check if today
    const today = new Date();
    if (!isOtherMonth &&
        dayNum === today.getDate() &&
        adjustedMonth === today.getMonth() &&
        adjustedYear === today.getFullYear()) {
        div.classList.add('today');
    }

    // Check if selected
    if (state.selectedDate === dateStr) {
        div.classList.add('selected');
    }

    // Get orders for this day
    const dayOrders = state.orders.filter(order => order.date === dateStr);

    if (dayOrders.length > 0 && !isOtherMonth) {
        div.classList.add('has-orders');
    }

    // Render day content
    div.innerHTML = `
        <div class="day-number">${dayNum}</div>
        <div class="day-orders">
            ${dayOrders.slice(0, 3).map(order => `
                <div class="order-dot ${order.status}"></div>
            `).join('')}
            ${dayOrders.length > 3 ? `<div class="order-dot" style="background: #9ca3af;"></div>` : ''}
        </div>
    `;

    if (!isOtherMonth) {
        div.addEventListener('click', () => selectDay(dateStr));
    }

    return div;
}

function selectDay(dateStr) {
    state.selectedDate = dateStr;
    renderCalendar();
    openNewOrderForm(dateStr);
}

function prevMonth() {
    state.currentDate.setMonth(state.currentDate.getMonth() - 1);
    renderCalendar();
}

function nextMonth() {
    state.currentDate.setMonth(state.currentDate.getMonth() + 1);
    renderCalendar();
}

// ============================================
// ORDERS LIST
// ============================================

function renderOrdersList() {
    const container = document.getElementById('ordersList');

    // Filter orders
    let filteredOrders = state.orders.filter(order => {
        return state.filters[order.status];
    });

    // Sort by date (closest first)
    filteredOrders.sort((a, b) => new Date(a.date) - new Date(b.date));

    // Show only next 10 orders
    filteredOrders = filteredOrders.slice(0, 10);

    if (filteredOrders.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-calendar-times"></i>
                <p>Nenhuma encomenda encontrada com os filtros selecionados</p>
            </div>
        `;
        return;
    }

    container.innerHTML = filteredOrders.map(order => {
        const date = new Date(order.date + 'T00:00:00');
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const diffTime = date - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        let dateText = date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
        let dateClass = '';

        if (diffDays === 0) {
            dateText = 'Hoje';
            dateClass = 'urgent';
        } else if (diffDays === 1) {
            dateText = 'Amanhã';
            dateClass = 'soon';
        } else if (diffDays === -1) {
            dateText = 'Ontem';
        } else if (diffDays > 1 && diffDays <= 7) {
            dateText = `Em ${diffDays} dias`;
        } else if (diffDays < -1) {
            dateText = `${Math.abs(diffDays)} dias atrás`;
        }

        const statusText = {
            pendente: 'Pendente',
            pronto: 'Pronto',
            entregue: 'Entregue'
        };

        return `
            <div class="order-card ${order.status}" onclick="editOrder('${order.id}')">
                <div class="order-header">
                    <div class="order-client">${order.client}</div>
                    <div class="order-status ${order.status}">${statusText[order.status]}</div>
                </div>
                <div class="order-product">${order.product}</div>
                <div class="order-footer">
                    <div class="order-date ${dateClass}">
                        <i class="fas fa-calendar"></i> ${dateText}
                    </div>
                    <div class="order-value">R$ ${order.value.toFixed(2).replace('.', ',')}</div>
                </div>
            </div>
        `;
    }).join('');
}

// ============================================
// FILTER FUNCTIONS
// ============================================

function toggleFilter(e) {
    const btn = e.currentTarget;
    const status = btn.dataset.status;

    state.filters[status] = !state.filters[status];
    btn.classList.toggle('active');

    renderOrdersList();
    renderCalendar();
}

// ============================================
// MODAL FUNCTIONS
// ============================================

function openNewOrderForm(dateStr = null) {
    state.editingOrder = null;

    document.getElementById('modalTitle').textContent = 'Nova Encomenda';
    document.getElementById('orderForm').reset();
    document.getElementById('btnDeleteOrder').style.display = 'none';

    // Select pendente status by default
    document.querySelectorAll('.status-option').forEach(opt => {
        opt.classList.toggle('selected', opt.dataset.status === 'pendente');
    });

    // Set date if provided
    if (dateStr && typeof dateStr === 'string') {
        document.getElementById('orderDate').value = dateStr;
    } else {
        // Set today's date
        const today = new Date();
        const dateString = today.toISOString().split('T')[0];
        document.getElementById('orderDate').value = dateString;
    }

    document.getElementById('modalOrder').classList.add('active');

    // Prevent body scroll on mobile
    document.body.style.overflow = 'hidden';
}

function editOrder(id) {
    const order = state.orders.find(o => o.id === id);
    if (!order) return;

    state.editingOrder = order;

    document.getElementById('modalTitle').textContent = 'Editar Encomenda';
    document.getElementById('orderClient').value = order.client;
    document.getElementById('orderProduct').value = order.product;
    document.getElementById('orderDate').value = order.date;
    document.getElementById('orderValue').value = order.value.toFixed(2);
    document.getElementById('orderNotes').value = order.notes || '';

    // Select current status
    document.querySelectorAll('.status-option').forEach(opt => {
        opt.classList.toggle('selected', opt.dataset.status === order.status);
    });

    document.getElementById('btnDeleteOrder').style.display = 'block';
    document.getElementById('modalOrder').classList.add('active');

    // Prevent body scroll on mobile
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    document.getElementById('modalOrder').classList.remove('active');
    state.editingOrder = null;
    state.selectedDate = null;
    renderCalendar();

    // Restore body scroll
    document.body.style.overflow = '';
}

function selectStatus(e) {
    const option = e.currentTarget;
    document.querySelectorAll('.status-option').forEach(opt => {
        opt.classList.remove('selected');
    });
    option.classList.add('selected');
}

async function handleSaveOrder(e) {
    e.preventDefault();

    const client = document.getElementById('orderClient').value.trim();
    const product = document.getElementById('orderProduct').value.trim();
    const date = document.getElementById('orderDate').value;
    const value = parseFloat(document.getElementById('orderValue').value);
    const notes = document.getElementById('orderNotes').value.trim();
    const status = document.querySelector('.status-option.selected').dataset.status;

    if (!client || !product || !date || !value) {
        alert('Por favor, preencha todos os campos obrigatórios');
        return;
    }

    // Salvar no Firebase
    try {
        FirebaseOrders.showLoading('Salvando...');

        const orderData = {
            client,
            product,
            date,
            value,
            status,
            notes
        };

        // ⭐ CORREÇÃO: Se está editando, incluir o ID
        if (state.editingOrder && state.editingOrder.id) {
            orderData.id = state.editingOrder.id;
            console.log('📝 Editando encomenda existente:', orderData.id);
        } else {
            console.log('➕ Criando nova encomenda');
        }

        await FirebaseOrders.saveOrder(orderData);

        FirebaseOrders.hideLoading();
        closeModal();

        showToast(state.editingOrder ? 'Encomenda atualizada!' : 'Encomenda adicionada!');

        console.log('✅ Encomenda salva com sucesso');

    } catch (error) {
        FirebaseOrders.hideLoading();
        FirebaseOrders.showError('Erro ao salvar encomenda');
        console.error('❌ Erro:', error);
    }
}

async function deleteOrder() {
    if (!state.editingOrder) return;

    if (confirm('Tem certeza que deseja excluir esta encomenda?')) {
        try {
            FirebaseOrders.showLoading('Excluindo...');

            await FirebaseOrders.removeOrder(state.editingOrder.id);

            FirebaseOrders.hideLoading();
            closeModal();

            showToast('Encomenda excluída!');

            console.log('✅ Encomenda excluída com sucesso');

        } catch (error) {
            FirebaseOrders.hideLoading();
            FirebaseOrders.showError('Erro ao excluir encomenda');
            console.error('❌ Erro:', error);
        }
    }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function showToast(message) {
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed;
        bottom: 90px;
        left: 50%;
        transform: translateX(-50%);
        background: #10b981;
        color: white;
        padding: 12px 24px;
        border-radius: 50px;
        font-weight: 600;
        z-index: 100;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        animation: fadeIn 0.3s;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'fadeOut 0.3s';
        setTimeout(() => toast.remove(), 300);
    }, 2000);
}

// Add CSS for toast animations
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeIn {
        from { opacity: 0; transform: translateX(-50%) translateY(20px); }
        to { opacity: 1; transform: translateX(-50%) translateY(0); }
    }
    @keyframes fadeOut {
        from { opacity: 1; transform: translateX(-50%) translateY(0); }
        to { opacity: 0; transform: translateX(-50%) translateY(20px); }
    }
`;
document.head.appendChild(style);

// Make editOrder global for onclick
window.editOrder = editOrder;