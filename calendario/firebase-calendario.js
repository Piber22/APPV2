// ============================================
// FIREBASE INTEGRATION - CALENDARIO
// ============================================

// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import {
    getFirestore,
    collection,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    getDocs,
    onSnapshot,
    query,
    orderBy,
    Timestamp
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// ============================================
// FIREBASE CONFIGURATION
// ⭐ USANDO O MESMO PROJETO QUE FUNCIONA
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
const db = getFirestore(app);
console.log('✅ Firebase inicializado com sucesso');

// ============================================
// FIREBASE ORDERS API
// ============================================

window.FirebaseOrders = {
    // Collection name
    COLLECTION: 'orders',

    // Load all orders from Firebase
    async loadOrders() {
        try {
            console.log('📦 Carregando encomendas do Firebase...');

            const q = query(
                collection(db, this.COLLECTION),
                orderBy('date', 'asc')
            );

            const querySnapshot = await getDocs(q);
            const orders = [];

            querySnapshot.forEach((doc) => {
                orders.push({
                    id: doc.id,
                    ...doc.data()
                });
            });

            console.log(`✅ ${orders.length} encomendas carregadas`);
            return orders;

        } catch (error) {
            console.error('❌ Erro ao carregar encomendas:', error);
            throw error;
        }
    },

    // Save order (create or update)
    async saveOrder(orderData) {
        try {
            if (orderData.id) {
                // Update existing order
                console.log('📝 Atualizando encomenda:', orderData.id);

                const orderRef = doc(db, this.COLLECTION, orderData.id);
                const { id, createdAt, ...dataToUpdate } = orderData;

                await updateDoc(orderRef, {
                    ...dataToUpdate,
                    updatedAt: Timestamp.now()
                });

                console.log('✅ Encomenda atualizada com sucesso');
                return orderData.id;

            } else {
                // Create new order
                console.log('➕ Criando nova encomenda');

                const docRef = await addDoc(collection(db, this.COLLECTION), {
                    ...orderData,
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

            await deleteDoc(doc(db, this.COLLECTION, orderId));

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

            const q = query(
                collection(db, this.COLLECTION),
                orderBy('date', 'asc')
            );

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