// ============================================
// AUTH SERVICE - GERENCIAMENTO DE AUTENTICAÇÃO
// Coloque na raiz: /auth-service.js
// ============================================

import { auth, db } from './firebase-config.js';
import {
    GoogleAuthProvider,
    signInWithPopup,
    signOut,
    onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import {
    doc,
    getDoc,
    setDoc,
    updateDoc,
    serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// ============================================
// ESTRUTURA DE DADOS DO USUÁRIO
// ============================================

const USER_STATUS = {
    ACTIVE: 'ativo',
    BLOCKED: 'bloqueado',
    TRIAL_EXPIRED: 'trial_expirado'
};

const USER_PLAN = {
    TRIAL: 'trial',
    MONTHLY: 'mensal',
    CANCELED: 'cancelado'
};

// ============================================
// FUNÇÕES DE AUTENTICAÇÃO
// ============================================

/**
 * Faz login com Google
 */
async function loginWithGoogle() {
    try {
        const provider = new GoogleAuthProvider();
        const result = await signInWithPopup(auth, provider);
        const user = result.user;

        console.log('✅ Login bem-sucedido:', user.email);

        // Verificar/criar usuário no Firestore
        await ensureUserExists(user);

        // Verificar status do usuário
        const userData = await getUserData(user.uid);

        if (userData.status !== USER_STATUS.ACTIVE) {
            await logout();
            throw new Error('Sua conta está bloqueada ou expirada. Entre em contato com o suporte.');
        }

        return { success: true, user: userData };

    } catch (error) {
        console.error('❌ Erro no login:', error);
        throw error;
    }
}

/**
 * Verifica se o usuário existe no Firestore, se não, cria com trial de 7 dias
 */
async function ensureUserExists(user) {
    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
        console.log('📝 Criando novo usuário no Firestore...');

        const trialDays = 7;
        const validadeDate = new Date();
        validadeDate.setDate(validadeDate.getDate() + trialDays);

        const newUser = {
            uid: user.uid,
            nome: user.displayName || 'Usuário',
            email: user.email,
            photoURL: user.photoURL || null,
            plano: USER_PLAN.TRIAL,
            status: USER_STATUS.ACTIVE,
            validade: validadeDate.toISOString(),
            criadoEm: new Date().toISOString(),
            ultimoAcesso: serverTimestamp()
        };

        await setDoc(userRef, newUser);
        console.log('✅ Usuário criado com trial de', trialDays, 'dias');

        return newUser;
    } else {
        // Atualizar último acesso
        await updateDoc(userRef, {
            ultimoAcesso: serverTimestamp()
        });

        const userData = userSnap.data();
        console.log('✅ Usuário existente encontrado:', userData.email);

        // Verificar validade do plano
        await checkPlanValidity(user.uid, userData);

        return userData;
    }
}

/**
 * Verifica se o plano do usuário ainda é válido
 */
async function checkPlanValidity(uid, userData) {
    const now = new Date();
    const validade = new Date(userData.validade);

    if (now > validade && userData.plano === USER_PLAN.TRIAL) {
        console.warn('⚠️ Trial expirado para:', userData.email);

        await updateDoc(doc(db, 'users', uid), {
            status: USER_STATUS.TRIAL_EXPIRED
        });

        throw new Error('Seu período de teste expirou. Assine um plano para continuar.');
    }

    if (now > validade && userData.plano === USER_PLAN.MONTHLY) {
        console.warn('⚠️ Plano mensal expirado para:', userData.email);

        await updateDoc(doc(db, 'users', uid), {
            status: USER_STATUS.BLOCKED
        });

        throw new Error('Seu plano expirou. Renove para continuar.');
    }
}

/**
 * Busca dados do usuário no Firestore
 */
async function getUserData(uid) {
    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
        throw new Error('Usuário não encontrado no banco de dados');
    }

    return { uid, ...userSnap.data() };
}

/**
 * Faz logout
 */
async function logout() {
    try {
        await signOut(auth);
        console.log('✅ Logout realizado');
    } catch (error) {
        console.error('❌ Erro no logout:', error);
        throw error;
    }
}

/**
 * Observa mudanças no estado de autenticação
 */
function onAuthChanged(callback) {
    return onAuthStateChanged(auth, async (user) => {
        if (user) {
            try {
                const userData = await getUserData(user.uid);
                callback({ authenticated: true, user: userData });
            } catch (error) {
                console.error('❌ Erro ao buscar dados do usuário:', error);
                callback({ authenticated: false, user: null, error });
            }
        } else {
            callback({ authenticated: false, user: null });
        }
    });
}

/**
 * Pega o usuário atual autenticado
 */
function getCurrentUser() {
    return auth.currentUser;
}

/**
 * Verifica se está autenticado
 */
function isAuthenticated() {
    return auth.currentUser !== null;
}

// ============================================
// FUNÇÕES ADMINISTRATIVAS
// ============================================

/**
 * Atualiza o plano do usuário (admin)
 */
async function updateUserPlan(uid, newPlan, daysToAdd = 30) {
    const validadeDate = new Date();
    validadeDate.setDate(validadeDate.getDate() + daysToAdd);

    await updateDoc(doc(db, 'users', uid), {
        plano: newPlan,
        status: USER_STATUS.ACTIVE,
        validade: validadeDate.toISOString(),
        atualizadoEm: serverTimestamp()
    });

    console.log('✅ Plano atualizado:', { uid, newPlan, validade: validadeDate });
}

/**
 * Bloqueia um usuário (admin)
 */
async function blockUser(uid, reason = '') {
    await updateDoc(doc(db, 'users', uid), {
        status: USER_STATUS.BLOCKED,
        motivoBloqueio: reason,
        bloqueadoEm: serverTimestamp()
    });

    console.log('🚫 Usuário bloqueado:', uid);
}

/**
 * Desbloqueia um usuário (admin)
 */
async function unblockUser(uid) {
    await updateDoc(doc(db, 'users', uid), {
        status: USER_STATUS.ACTIVE,
        motivoBloqueio: null,
        desbloqueadoEm: serverTimestamp()
    });

    console.log('✅ Usuário desbloqueado:', uid);
}

// ============================================
// EXPORTAR
// ============================================

export {
    loginWithGoogle,
    logout,
    onAuthChanged,
    getCurrentUser,
    isAuthenticated,
    getUserData,
    updateUserPlan,
    blockUser,
    unblockUser,
    USER_STATUS,
    USER_PLAN
};