// ============================================
// FIREBASE INTEGRATION - CALENDARIO (CORRIGIDO)
// Substitui o firebase-calendario.js existente em /calendario/
// ============================================

import {
    loadUserOrders,
    saveUserOrder,
    deleteUserOrder,
    watchUserOrders
} from '../user-data-service.js';
import { getCurrentUser } from '../auth-service.js';

// ============================================
// AGUARDAR AUTENTICAÇÃO ESTAR PRONTA
// ============================================

async function waitForAuth() {
    if (window.authReady) {
        await window.authReady;
    }
}

// ============================================
// FIREBASE ORDERS API
// ============================================

window.FirebaseOrders = {
    COLLECTION: 'orders',

    // Load all orders
    async loadOrders() {
        try {
            // ✅ AGUARDAR AUTENTICAÇÃO
            await waitForAuth();

            console.log('📦 Carregando encomendas do usuário...');

            const user = getCurrentUser();
            if (!user) {
                throw new Error('Usuário não autenticado');
            }

            const orders = await loadUserOrders();

            console.log(`✅ ${orders.length} encomendas carregadas para ${user.email}`);
            return orders;

        } catch (error) {
            console.error('❌ Erro ao carregar encomendas:', error);
            throw error;
        }
    },

    // Save order
    async saveOrder(orderData) {
        try {
            // ✅ AGUARDAR AUTENTICAÇÃO
            await waitForAuth();

            const user = getCurrentUser();
            if (!user) {
                throw new Error('Usuário não autenticado');
            }

            if (orderData.id) {
                console.log('📝 Atualizando encomenda:', orderData.id);
                const orderId = await saveUserOrder(orderData);
                console.log('✅ Encomenda atualizada com sucesso');
                return orderId;
            } else {
                console.log('➕ Criando nova encomenda');
                const orderId = await saveUserOrder(orderData);
                console.log('✅ Encomenda criada com sucesso:', orderId);
                return orderId;
            }

        } catch (error) {
            console.error('❌ Erro ao salvar encomenda:', error);
            throw error;
        }
    },

    // Remove order
    async removeOrder(orderId) {
        try {
            // ✅ AGUARDAR AUTENTICAÇÃO
            await waitForAuth();

            const user = getCurrentUser();
            if (!user) {
                throw new Error('Usuário não autenticado');
            }

            console.log('🗑️ Excluindo encomenda:', orderId);
            await deleteUserOrder(orderId);
            console.log('✅ Encomenda excluída');

        } catch (error) {
            console.error('❌ Erro ao excluir encomenda:', error);
            throw error;
        }
    },

    // Setup realtime listener
    async setupRealtimeOrders(callback) {
        try {
            // ✅ AGUARDAR AUTENTICAÇÃO
            await waitForAuth();

            const user = getCurrentUser();
            if (!user) {
                throw new Error('Usuário não autenticado');
            }

            console.log('🔄 Configurando sincronização em tempo real...');
            console.log('👤 Usuário:', user.email);

            const unsubscribe = watchUserOrders((orders) => {
                console.log('🔔 Dados atualizados em tempo real:', orders.length, 'encomendas');
                callback(orders);
            });

            console.log('✅ Sincronização em tempo real ativada');
            return unsubscribe;

        } catch (error) {
            console.error('❌ Erro ao configurar sincronização:', error);
            throw error;
        }
    },

    // UI Helper: Show loading overlay
    showLoading(message = 'Carregando...') {
        let overlay = document.getElementById('loadingOverlay');

        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'loadingOverlay';
            overlay.style.cssText = `
                position: fixed;
                inset: 0;
                background: rgba(0, 0, 0, 0.7);
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                z-index: 9999;
                backdrop-filter: blur(4px);
            `;

            overlay.innerHTML = `
                <div style="
                    background: white;
                    padding: 32px;
                    border-radius: 20px;
                    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
                    text-align: center;
                    min-width: 200px;
                ">
                    <div style="
                        width: 50px;
                        height: 50px;
                        border: 4px solid #fce7f3;
                        border-top-color: #ec4899;
                        border-radius: 50%;
                        margin: 0 auto 16px;
                        animation: spin 1s linear infinite;
                    "></div>
                    <div id="loadingMessage" style="
                        color: #374151;
                        font-weight: 600;
                        font-size: 16px;
                    ">${message}</div>
                </div>
            `;

            const style = document.createElement('style');
            style.textContent = `
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
            `;
            overlay.appendChild(style);

            document.body.appendChild(overlay);
        } else {
            document.getElementById('loadingMessage').textContent = message;
            overlay.style.display = 'flex';
        }
    },

    hideLoading() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.style.display = 'none';
        }
    },

    showError(message) {
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

        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideDown {
                from {
                    opacity: 0;
                    transform: translateX(-50%) translateY(-20px);
                }
                to {
                    opacity: 1;
                    transform: translateX(-50%) translateY(0);
                }
            }
        `;
        document.head.appendChild(style);

        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'slideDown 0.3s reverse';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
};

console.log('✅ FirebaseOrders API disponível globalmente (com dados por usuário)');