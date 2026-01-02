// ============================================
// FIREBASE INTEGRATION - CALENDARIO
// Com suporte a múltiplos usuários
// ============================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import {
    getFirestore,
    collection,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    query,
    where,
    orderBy,
    onSnapshot,
    Timestamp
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// ============================================
// FIREBASE CONFIGURATION
// ============================================

const firebaseConfig = {
    apiKey: "AIzaSyBLhKaigyOT9dCAd9iA1o5j18rFB4rQ5uo",
    authDomain: "doce-gestao-4b032.firebaseapp.com",
    projectId: "doce-gestao-4b032",
    storageBucket: "doce-gestao-4b032.firebasestorage.app",
    messagingSenderId: "318295225306",
    appId: "1:318295225306:web:3beaebbb5979edba6686e3"
};

// Initialize Firebase
console.log('🔥 Inicializando Firebase...');
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
console.log('✅ Firebase inicializado com sucesso');

// ============================================
// VARIÁVEIS GLOBAIS
// ============================================

let currentUserId = null;

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
// FIREBASE ORDERS API
// ============================================

window.FirebaseOrders = {
    // Load all orders from Firebase (filtered by userId)
    async loadOrders() {
        try {
            console.log('📦 Carregando encomendas do Firebase...');

            const userId = await getUserId();

            // Nova estrutura: users/{userId}/orders
            const ordersRef = collection(db, 'users', userId, 'orders');
            const q = query(ordersRef, orderBy('date', 'asc'));

            // Usar getDocs diretamente do Firestore
            const { getDocs } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");
            const querySnapshot = await getDocs(q);

            const orders = [];

            querySnapshot.forEach((doc) => {
                orders.push({
                    id: doc.id,
                    ...doc.data()
                });
            });

            console.log(`✅ ${orders.length} encomendas carregadas do usuário ${userId}`);
            return orders;

        } catch (error) {
            console.error('❌ Erro ao carregar encomendas:', error);
            throw error;
        }
    },

    // Save order (create or update)
    async saveOrder(orderData) {
        try {
            const userId = await getUserId();

            if (orderData.id) {
                // Update existing order
                console.log('📝 Atualizando encomenda:', orderData.id);

                const orderRef = doc(db, 'users', userId, 'orders', orderData.id);
                const { id, createdAt, ...dataToUpdate } = orderData;

                await updateDoc(orderRef, {
                    ...dataToUpdate,
                    userId: userId, // Garantir que userId está sempre presente
                    updatedAt: Timestamp.now()
                });

                console.log('✅ Encomenda atualizada com sucesso');
                return orderData.id;

            } else {
                // Create new order
                console.log('➕ Criando nova encomenda');

                const ordersRef = collection(db, 'users', userId, 'orders');

                const docRef = await addDoc(ordersRef, {
                    ...orderData,
                    userId: userId, // Sempre incluir userId
                    createdAt: Timestamp.now(),
                    updatedAt: Timestamp.now()
                });

                console.log('✅ Encomenda criada com sucesso:', docRef.id);
                return docRef.id;
            }

        } catch (error) {
            console.error('❌ Erro ao salvar encomenda:', error);
            throw error;
        }
    },

    // Remove order
    async removeOrder(orderId) {
        try {
            console.log('🗑️ Excluindo encomenda:', orderId);

            const userId = await getUserId();
            await deleteDoc(doc(db, 'users', userId, 'orders', orderId));

            console.log('✅ Encomenda excluída');

        } catch (error) {
            console.error('❌ Erro ao excluir encomenda:', error);
            throw error;
        }
    },

    // Setup realtime listener
    setupRealtimeOrders(callback) {
        try {
            console.log('🔄 Configurando sincronização em tempo real...');

            // Primeiro obter userId, depois configurar listener
            getUserId().then(userId => {
                const ordersRef = collection(db, 'users', userId, 'orders');
                const q = query(ordersRef, orderBy('date', 'asc'));

                const unsubscribe = onSnapshot(q,
                    (snapshot) => {
                        const orders = [];

                        snapshot.forEach((doc) => {
                            orders.push({
                                id: doc.id,
                                ...doc.data()
                            });
                        });

                        console.log('🔔 Dados atualizados em tempo real:', orders.length, 'encomendas');
                        callback(orders);
                    },
                    (error) => {
                        console.error('❌ Erro na sincronização:', error);
                    }
                );

                console.log('✅ Sincronização em tempo real ativada');
                return unsubscribe;
            }).catch(error => {
                console.error('❌ Erro ao configurar sincronização:', error);
            });

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

            // Add spin animation
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

    // UI Helper: Hide loading overlay
    hideLoading() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.style.display = 'none';
        }
    },

    // UI Helper: Show error message
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

        // Add animation
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

console.log('✅ FirebaseOrders API disponível globalmente');