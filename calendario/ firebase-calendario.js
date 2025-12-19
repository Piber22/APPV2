// ============================================
// FIREBASE INTEGRATION - CALENDÁRIO
// Sincronização em tempo real para encomendas
// ============================================

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getFirestore, collection, doc, setDoc, getDoc, getDocs, deleteDoc, onSnapshot, query, orderBy } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

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
const db = getFirestore(app);

// Referência à coleção de encomendas
const ordersCollection = collection(db, 'orders');

let unsubscribe = null;

// ============================================
// CARREGAR TODAS AS ENCOMENDAS
// ============================================

async function loadOrders() {
    console.log('📦 Carregando encomendas do Firebase...');

    try {
        const q = query(ordersCollection, orderBy('date', 'asc'));
        const querySnapshot = await getDocs(q);

        const orders = [];
        querySnapshot.forEach((doc) => {
            orders.push({
                id: doc.id,
                ...doc.data()
            });
        });

        console.log('✅ Encomendas carregadas:', orders.length);
        return orders;

    } catch (error) {
        console.error('❌ Erro ao carregar encomendas:', error);
        throw error;
    }
}

// ============================================
// SINCRONIZAÇÃO EM TEMPO REAL
// ============================================

function setupRealtimeOrders(callback) {
    console.log('🔄 Configurando sincronização em tempo real...');

    const q = query(ordersCollection, orderBy('date', 'asc'));

    unsubscribe = onSnapshot(q,
        (snapshot) => {
            const orders = [];
            snapshot.forEach((doc) => {
                orders.push({
                    id: doc.id,
                    ...doc.data()
                });
            });

            console.log('🔔 Encomendas atualizadas em tempo real:', orders.length);
            callback(orders);
        },
        (error) => {
            console.error('❌ Erro na sincronização:', error);
            showError('Erro ao sincronizar encomendas');
        }
    );

    console.log('✅ Sincronização em tempo real ativada');
}

// ============================================
// SALVAR ENCOMENDA (CRIAR OU ATUALIZAR)
// ============================================

async function saveOrder(orderData) {
    console.log('💾 Salvando encomenda...', orderData);

    try {
        // Se não tem ID ou ID é timestamp, criar novo
        if (!orderData.id || orderData.id.length < 15) {
            orderData.id = Date.now().toString();
        }

        const orderRef = doc(ordersCollection, orderData.id);

        await setDoc(orderRef, {
            client: orderData.client,
            product: orderData.product,
            date: orderData.date,
            value: parseFloat(orderData.value),
            status: orderData.status,
            notes: orderData.notes || '',
            lastModified: new Date().toISOString()
        });

        console.log('✅ Encomenda salva com sucesso');
        return { id: orderData.id, ...orderData };

    } catch (error) {
        console.error('❌ Erro ao salvar encomenda:', error);
        throw error;
    }
}

// ============================================
// REMOVER ENCOMENDA
// ============================================

async function removeOrder(orderId) {
    console.log('🗑️ Removendo encomenda:', orderId);

    try {
        const orderRef = doc(ordersCollection, orderId);
        await deleteDoc(orderRef);

        console.log('✅ Encomenda removida com sucesso');
        return true;

    } catch (error) {
        console.error('❌ Erro ao remover encomenda:', error);
        throw error;
    }
}

// ============================================
// UI HELPERS
// ============================================

function showLoading(message = 'Carregando...') {
    let overlay = document.getElementById('loadingOverlay');

    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'loadingOverlay';
        overlay.innerHTML = `
            <div class="loading-content">
                <div class="loading-spinner"></div>
                <p class="loading-message">${message}</p>
            </div>
        `;
        document.body.appendChild(overlay);

        // Adiciona CSS se ainda não existe
        if (!document.getElementById('loadingStyles')) {
            const style = document.createElement('style');
            style.id = 'loadingStyles';
            style.textContent = `
                #loadingOverlay {
                    position: fixed;
                    inset: 0;
                    background: rgba(0, 0, 0, 0.6);
                    backdrop-filter: blur(4px);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 9999;
                }
                .loading-content {
                    background: white;
                    padding: 32px;
                    border-radius: 20px;
                    text-align: center;
                    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
                }
                .loading-spinner {
                    width: 48px;
                    height: 48px;
                    border: 4px solid #fce7f3;
                    border-top-color: #ec4899;
                    border-radius: 50%;
                    animation: spin 0.8s linear infinite;
                    margin: 0 auto 16px;
                }
                .loading-message {
                    color: #374151;
                    font-weight: 600;
                    font-size: 16px;
                    margin: 0;
                }
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
            `;
            document.head.appendChild(style);
        }
    } else {
        overlay.querySelector('.loading-message').textContent = message;
    }

    overlay.style.display = 'flex';
}

function hideLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.style.display = 'none';
    }
}

function showError(message) {
    const errorToast = document.createElement('div');
    errorToast.style.cssText = `
        position: fixed;
        bottom: 90px;
        left: 50%;
        transform: translateX(-50%);
        background: #ef4444;
        color: white;
        padding: 16px 24px;
        border-radius: 12px;
        font-weight: 600;
        z-index: 10000;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        animation: fadeIn 0.3s;
        max-width: 90%;
        text-align: center;
    `;
    errorToast.innerHTML = `
        <i class="fas fa-exclamation-circle" style="margin-right: 8px;"></i>
        ${message}
    `;
    document.body.appendChild(errorToast);

    setTimeout(() => {
        errorToast.style.animation = 'fadeOut 0.3s';
        setTimeout(() => errorToast.remove(), 300);
    }, 4000);
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
// EXPORTAR API
// ============================================

window.FirebaseOrders = {
    loadOrders,
    saveOrder,
    removeOrder,
    setupRealtimeOrders,
    showLoading,
    hideLoading,
    showError
};