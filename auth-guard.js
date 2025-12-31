/**
 * Auth Guard - Sistema de proteção de rotas com Firebase Auth
 * Importe no início de cada página que precisa de autenticação
 */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import {
    getAuth,
    onAuthStateChanged,
    signOut
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

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
const auth = getAuth(app);

// ============================================
// FUNÇÕES DE CAMINHO
// ============================================

function getBasePath() {
    const currentPath = window.location.pathname;
    const pathParts = currentPath.split('/').filter(part => part);

    if (pathParts.length > 0) {
        const lastPart = pathParts[pathParts.length - 1];
        if (lastPart.includes('.html')) {
            pathParts.pop();
        }

        if (pathParts.length > 0) {
            return '/' + pathParts[0];
        }
    }

    return '';
}

function getLoginPath() {
    const currentPath = window.location.pathname;
    const basePath = getBasePath();

    console.log('🔍 Current path:', currentPath);
    console.log('🔍 Base path:', basePath);

    if (basePath) {
        return basePath + '/login/login.html';
    }

    if (currentPath.endsWith('/') || currentPath.endsWith('/index.html') || currentPath.endsWith('index.html')) {
        return 'login/login.html';
    }

    return '../login/login.html';
}

// ============================================
// VERIFICAR AUTENTICAÇÃO
// ============================================

let authCheckComplete = false;

function checkAuthentication() {
    return new Promise((resolve) => {
        // Se já completou a verificação, usar dados do localStorage
        if (authCheckComplete) {
            const isAuthenticated = localStorage.getItem('isAuthenticated');
            const user = localStorage.getItem('user');

            if (isAuthenticated === 'true' && user) {
                console.log('✅ Autenticação verificada (cache)');
                resolve(true);
            } else {
                console.warn('⚠️ Não autenticado (cache)');
                redirectToLogin();
                resolve(false);
            }
            return;
        }

        // Primeira verificação: usar Firebase Auth
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            unsubscribe(); // Desinscrever após primeira verificação
            authCheckComplete = true;

            if (user) {
                console.log('✅ Usuário autenticado:', user.email);

                // Atualizar localStorage
                const userData = {
                    uid: user.uid,
                    email: user.email,
                    displayName: user.displayName,
                    photoURL: user.photoURL,
                    emailVerified: user.emailVerified
                };

                localStorage.setItem('user', JSON.stringify(userData));
                localStorage.setItem('isAuthenticated', 'true');

                resolve(true);
            } else {
                console.warn('⚠️ Nenhum usuário autenticado');
                localStorage.removeItem('user');
                localStorage.removeItem('isAuthenticated');

                redirectToLogin();
                resolve(false);
            }
        });
    });
}

function redirectToLogin() {
    const currentPath = window.location.pathname;
    localStorage.setItem('redirectAfterLogin', currentPath);

    const loginPath = getLoginPath();
    console.log('↪️ Redirecionando para login:', loginPath);
    window.location.href = loginPath;
}

// ============================================
// OBTER USUÁRIO ATUAL
// ============================================

function getCurrentUser() {
    const user = localStorage.getItem('user');
    if (user) {
        try {
            return JSON.parse(user);
        } catch (error) {
            console.error('❌ Erro ao obter dados do usuário:', error);
            return null;
        }
    }
    return null;
}

// ============================================
// LOGOUT
// ============================================

async function logout() {
    const confirmLogout = confirm('Deseja realmente sair?');

    if (confirmLogout) {
        try {
            console.log('🔓 Realizando logout...');

            // Logout do Firebase
            await signOut(auth);

            // Limpar localStorage
            localStorage.removeItem('user');
            localStorage.removeItem('isAuthenticated');
            localStorage.removeItem('redirectAfterLogin');

            console.log('✅ Logout realizado com sucesso!');

            // Redirecionar para login
            const loginPath = getLoginPath();
            console.log('↪️ Redirecionando para:', loginPath);
            window.location.href = loginPath;

        } catch (error) {
            console.error('❌ Erro no logout:', error);
            alert('Erro ao fazer logout. Tente novamente.');
        }
    }
}

// ============================================
// VERIFICAR AUTENTICAÇÃO AO CARREGAR
// ============================================

console.log('🛡️ Auth Guard carregado');
await checkAuthentication();

// ============================================
// EXPORTAR PARA USO GLOBAL
// ============================================

window.authGuard = {
    checkAuth: checkAuthentication,
    getCurrentUser: getCurrentUser,
    logout: logout,
    auth: auth
};

console.log('✅ Auth Guard inicializado');