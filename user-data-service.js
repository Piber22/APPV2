// ============================================
// USER DATA SERVICE - GERENCIAMENTO DE DADOS POR USUÁRIO
// Coloque na raiz: /user-data-service.js
// ============================================

import { db } from './firebase-config.js';
import { getCurrentUser } from './auth-service.js';
import {
    doc,
    getDoc,
    setDoc,
    updateDoc,
    onSnapshot,
    collection,
    query,
    where,
    getDocs,
    addDoc,
    deleteDoc,
    serverTimestamp,
    orderBy
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// ============================================
// ESTRUTURA DE DADOS POR USUÁRIO
// ============================================

/*
Firestore Structure:

users/
  └── {uid}/
      ├── nome
      ├── email
      ├── plano
      ├── status
      ├── validade
      ├── criadoEm
      └── dados/
          ├── menu/
          │   └── default/
          │       ├── settings
          │       ├── categories
          │       └── items
          └── orders/
              └── {orderId}/
                  ├── client
                  ├── product
                  ├── date
                  ├── value
                  ├── status
                  └── notes
*/

// ============================================
// FUNÇÕES DE MENU (CARDÁPIO)
// ============================================

/**
 * Carrega o menu do usuário atual
 */
async function loadUserMenu() {
    const user = getCurrentUser();
    if (!user) throw new Error('Usuário não autenticado');

    try {
        const menuRef = doc(db, `users/${user.uid}/dados/menu`, 'default');
        const menuSnap = await getDoc(menuRef);

        if (menuSnap.exists()) {
            const data = menuSnap.data();
            console.log('✅ Menu carregado:', {
                categorias: data.categories?.length || 0,
                itens: data.items?.length || 0
            });
            return data;
        } else {
            console.log('ℹ️ Menu não existe, retornando dados padrão');
            return getDefaultMenuData();
        }
    } catch (error) {
        console.error('❌ Erro ao carregar menu:', error);
        throw error;
    }
}

/**
 * Salva o menu do usuário atual
 */
async function saveUserMenu(menuData) {
    const user = getCurrentUser();
    if (!user) throw new Error('Usuário não autenticado');

    try {
        const menuRef = doc(db, `users/${user.uid}/dados/menu`, 'default');

        await setDoc(menuRef, {
            ...menuData,
            lastModified: new Date().toISOString(),
            updatedAt: serverTimestamp()
        });

        console.log('✅ Menu salvo com sucesso');
    } catch (error) {
        console.error('❌ Erro ao salvar menu:', error);
        throw error;
    }
}

/**
 * Observa mudanças em tempo real no menu do usuário
 */
function watchUserMenu(callback) {
    const user = getCurrentUser();
    if (!user) throw new Error('Usuário não autenticado');

    const menuRef = doc(db, `users/${user.uid}/dados/menu`, 'default');

    return onSnapshot(menuRef,
        (doc) => {
            if (doc.exists()) {
                const data = doc.data();
                console.log('🔔 Menu atualizado em tempo real');
                callback(data);
            } else {
                console.log('ℹ️ Menu não existe ainda');
                callback(getDefaultMenuData());
            }
        },
        (error) => {
            console.error('❌ Erro ao observar menu:', error);
        }
    );
}

/**
 * Retorna dados padrão do menu
 */
function getDefaultMenuData() {
    return {
        settings: {
            title: 'Doces da Ana',
            subtitle: 'Confeitaria Artesanal & Afeto',
            contact: '(11) 99999-9999',
            themeColor: 'pink'
        },
        categories: [
            { id: '1', name: 'Bolos & Tortas' },
            { id: '2', name: 'Docinhos & Brigadeiros' },
            { id: '3', name: 'Bebidas & Cafés' },
            { id: '4', name: 'Especiais & Sazonais' }
        ],
        items: []
    };
}

// ============================================
// FUNÇÕES DE ENCOMENDAS (ORDERS)
// ============================================

/**
 * Carrega todas as encomendas do usuário atual
 */
async function loadUserOrders() {
    const user = getCurrentUser();
    if (!user) throw new Error('Usuário não autenticado');

    try {
        const ordersRef = collection(db, `users/${user.uid}/dados/orders`);
        const q = query(ordersRef, orderBy('date', 'asc'));
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

/**
 * Salva uma encomenda do usuário atual
 */
async function saveUserOrder(orderData) {
    const user = getCurrentUser();
    if (!user) throw new Error('Usuário não autenticado');

    try {
        const ordersRef = collection(db, `users/${user.uid}/dados/orders`);

        if (orderData.id) {
            // Atualizar encomenda existente
            const orderRef = doc(db, `users/${user.uid}/dados/orders`, orderData.id);
            const { id, createdAt, ...dataToUpdate } = orderData;

            await updateDoc(orderRef, {
                ...dataToUpdate,
                updatedAt: serverTimestamp()
            });

            console.log('✅ Encomenda atualizada:', orderData.id);
            return orderData.id;
        } else {
            // Criar nova encomenda
            const docRef = await addDoc(ordersRef, {
                ...orderData,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });

            console.log('✅ Encomenda criada:', docRef.id);
            return docRef.id;
        }
    } catch (error) {
        console.error('❌ Erro ao salvar encomenda:', error);
        throw error;
    }
}

/**
 * Remove uma encomenda do usuário atual
 */
async function deleteUserOrder(orderId) {
    const user = getCurrentUser();
    if (!user) throw new Error('Usuário não autenticado');

    try {
        const orderRef = doc(db, `users/${user.uid}/dados/orders`, orderId);
        await deleteDoc(orderRef);
        console.log('✅ Encomenda excluída:', orderId);
    } catch (error) {
        console.error('❌ Erro ao excluir encomenda:', error);
        throw error;
    }
}

/**
 * Observa mudanças em tempo real nas encomendas do usuário
 */
function watchUserOrders(callback) {
    const user = getCurrentUser();
    if (!user) throw new Error('Usuário não autenticado');

    const ordersRef = collection(db, `users/${user.uid}/dados/orders`);
    const q = query(ordersRef, orderBy('date', 'asc'));

    return onSnapshot(q,
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
            console.error('❌ Erro ao observar encomendas:', error);
        }
    );
}

// ============================================
// MIGRAÇÃO DE DADOS (OPCIONAL)
// ============================================

/**
 * Migra dados do formato antigo para o novo formato por usuário
 * Execute apenas uma vez se houver dados antigos
 */
async function migrateOldData() {
    const user = getCurrentUser();
    if (!user) throw new Error('Usuário não autenticado');

    try {
        console.log('🔄 Iniciando migração de dados...');

        // Verificar se já existe dados no novo formato
        const menuRef = doc(db, `users/${user.uid}/dados/menu`, 'default');
        const menuSnap = await getDoc(menuRef);

        if (menuSnap.exists()) {
            console.log('ℹ️ Dados já migrados ou já existem');
            return;
        }

        // Tentar buscar dados antigos (formato global)
        const oldMenuRef = doc(db, 'menu', 'default');
        const oldMenuSnap = await getDoc(oldMenuRef);

        if (oldMenuSnap.exists()) {
            const oldData = oldMenuSnap.data();
            console.log('📦 Dados antigos encontrados, migrando...');

            // Salvar no novo formato
            await saveUserMenu(oldData);

            console.log('✅ Migração concluída com sucesso!');
        } else {
            console.log('ℹ️ Nenhum dado antigo encontrado');
        }
    } catch (error) {
        console.error('❌ Erro na migração:', error);
    }
}

// ============================================
// EXPORTAR
// ============================================

export {
    loadUserMenu,
    saveUserMenu,
    watchUserMenu,
    loadUserOrders,
    saveUserOrder,
    deleteUserOrder,
    watchUserOrders,
    migrateOldData
};