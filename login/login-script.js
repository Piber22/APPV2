// ============================================
// LOGIN COM GOOGLE - FIREBASE AUTH
// ============================================

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import {
    getAuth,
    GoogleAuthProvider,
    signInWithPopup,
    onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

// Configuração do Firebase (mesma do resto do app)
const firebaseConfig = {
    apiKey: "AIzaSyBLhKaigyOT9dCAd9iA1o5j18rFB4rQ5uo",
    authDomain: "doce-gestao-4b032.firebaseapp.com",
    projectId: "doce-gestao-4b032",
    storageBucket: "doce-gestao-4b032.firebasestorage.app",
    messagingSenderId: "318295225306",
    appId: "1:318295225306:web:3beaebbb5979edba6686e3"
};

// Inicializar Firebase
console.log('🔥 Inicializando Firebase Auth...');
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// Elementos DOM
const loginBtn = document.getElementById('google-login-btn');

// ============================================
// FUNÇÃO PARA OBTER CAMINHO CORRETO
// ============================================

function getBasePath() {
    const currentPath = window.location.pathname;

    if (currentPath.includes('/login/login.html')) {
        return currentPath.replace('/login/login.html', '');
    }

    return '';
}

function getIndexPath() {
    const basePath = getBasePath();

    if (basePath) {
        return basePath + '/index.html';
    }

    return '../index.html';
}

// ============================================
// LOGIN COM GOOGLE
// ============================================

async function loginWithGoogle() {
    try {
        console.log('🔐 Iniciando login com Google...');
        loginBtn.classList.add('loading');

        // Popup de login do Google
        const result = await signInWithPopup(auth, provider);
        const user = result.user;

        console.log('✅ Login realizado com sucesso!');
        console.log('👤 Usuário:', user.displayName);
        console.log('📧 Email:', user.email);
        console.log('🆔 UID:', user.uid);

        // Salvar dados do usuário no localStorage
        const userData = {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
            emailVerified: user.emailVerified,
            loginTime: new Date().toISOString()
        };

        localStorage.setItem('user', JSON.stringify(userData));
        localStorage.setItem('isAuthenticated', 'true');

        console.log('💾 Dados salvos no localStorage');

        // Verificar se há uma página para redirecionar após login
        const redirectPath = localStorage.getItem('redirectAfterLogin');
        localStorage.removeItem('redirectAfterLogin');

        // Redirecionar
        if (redirectPath && redirectPath !== '/login/login.html' && !redirectPath.includes('/login/login.html')) {
            console.log('↪️ Redirecionando para:', redirectPath);
            window.location.href = redirectPath;
        } else {
            const indexPath = getIndexPath();
            console.log('🏠 Redirecionando para home:', indexPath);
            window.location.href = indexPath;
        }

    } catch (error) {
        console.error('❌ Erro no login:', error);

        // Tratamento de erros específicos
        let errorMessage = 'Erro ao fazer login. Tente novamente.';

        if (error.code === 'auth/popup-closed-by-user') {
            errorMessage = 'Login cancelado. Por favor, tente novamente.';
        } else if (error.code === 'auth/network-request-failed') {
            errorMessage = 'Erro de conexão. Verifique sua internet.';
        } else if (error.code === 'auth/unauthorized-domain') {
            errorMessage = 'Domínio não autorizado. Configure o Firebase corretamente.';
        } else if (error.code === 'auth/popup-blocked') {
            errorMessage = 'Pop-up bloqueado. Permita pop-ups para fazer login.';
        }

        alert(errorMessage);

    } finally {
        loginBtn.classList.remove('loading');
    }
}

// ============================================
// VERIFICAR SE JÁ ESTÁ LOGADO
// ============================================

function checkIfUserIsLoggedIn() {
    const isAuthenticated = localStorage.getItem('isAuthenticated');
    const user = localStorage.getItem('user');

    if (isAuthenticated === 'true' && user) {
        try {
            const userData = JSON.parse(user);
            console.log('✅ Usuário já logado:', userData.displayName);

            // Redirecionar para o hub
            const indexPath = getIndexPath();
            console.log('↪️ Redirecionando para:', indexPath);
            window.location.href = indexPath;

        } catch (error) {
            console.error('❌ Erro ao ler dados do usuário:', error);
            localStorage.removeItem('user');
            localStorage.removeItem('isAuthenticated');
        }
    }
}

// ============================================
// LISTENER DE ESTADO DE AUTH
// ============================================

onAuthStateChanged(auth, (user) => {
    if (user) {
        console.log('🔐 Estado de autenticação:', user.email);
    } else {
        console.log('🔓 Nenhum usuário autenticado');
    }
});

// ============================================
// EVENT LISTENERS
// ============================================

loginBtn.addEventListener('click', loginWithGoogle);

// ============================================
// INICIALIZAÇÃO
// ============================================

window.addEventListener('load', () => {
    console.log('═══════════════════════════════════════');
    console.log('🔐 LOGIN - DOCE GESTÃO');
    console.log('═══════════════════════════════════════');

    checkIfUserIsLoggedIn();
});

// ============================================
// FUNÇÃO GLOBAL PARA LOGOUT (PARA TESTES)
// ============================================

window.logout = function() {
    auth.signOut().then(() => {
        localStorage.removeItem('user');
        localStorage.removeItem('isAuthenticated');
        console.log('✅ Logout realizado!');
        alert('Você foi desconectado!');
        window.location.reload();
    }).catch((error) => {
        console.error('❌ Erro no logout:', error);
    });
};

console.log('✅ Login script carregado com Firebase Auth');