// Firebase será configurado aqui
// import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
// import { getAuth, GoogleAuthProvider, signInWithPopup } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

// Configuração do Firebase (adicione suas credenciais)
/*
const firebaseConfig = {
    apiKey: "SUA_API_KEY",
    authDomain: "SEU_AUTH_DOMAIN",
    projectId: "SEU_PROJECT_ID",
    storageBucket: "SEU_STORAGE_BUCKET",
    messagingSenderId: "SEU_MESSAGING_SENDER_ID",
    appId: "SEU_APP_ID"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
*/

// Elementos DOM
const loginBtn = document.getElementById('google-login-btn');

// Função de login com Google
async function loginWithGoogle() {
    try {
        loginBtn.classList.add('loading');

        // Simulação do login (remova isso quando integrar com Firebase)
        await new Promise(resolve => setTimeout(resolve, 2000));

        // ====== INTEGRAÇÃO REAL COM FIREBASE ======
        // Descomente o código abaixo quando configurar o Firebase:
        /*
        const provider = new GoogleAuthProvider();
        const result = await signInWithPopup(auth, provider);
        const user = result.user;

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

        console.log('Login realizado com sucesso!', userData);

        // Verificar se há uma página para redirecionar após login
        const redirectPath = localStorage.getItem('redirectAfterLogin');
        localStorage.removeItem('redirectAfterLogin');

        // Redirecionar para o hub ou página anterior
        if (redirectPath && redirectPath !== '/login/login.html') {
            window.location.href = '..' + redirectPath;
        } else {
            window.location.href = '../index.html';
        }
        */

        // ====== SIMULAÇÃO (REMOVER EM PRODUÇÃO) ======
        console.log('Login simulado com sucesso!');

        // Salvar usuário simulado
        const mockUser = {
            uid: 'mock-uid-12345',
            email: 'usuario@exemplo.com',
            displayName: 'Usuário Teste',
            photoURL: 'https://via.placeholder.com/150',
            emailVerified: true,
            loginTime: new Date().toISOString()
        };

        localStorage.setItem('user', JSON.stringify(mockUser));
        localStorage.setItem('isAuthenticated', 'true');

        alert('Login realizado! (Modo simulação)\n\nVocê será redirecionado para o hub.');

        // Verificar se há uma página para redirecionar após login
        const redirectPath = localStorage.getItem('redirectAfterLogin');
        localStorage.removeItem('redirectAfterLogin');

        // Redirecionar para o hub ou página anterior
        setTimeout(() => {
            if (redirectPath && redirectPath !== '/login/login.html') {
                window.location.href = '..' + redirectPath;
            } else {
                window.location.href = '../index.html';
            }
        }, 1000);

    } catch (error) {
        console.error('Erro no login:', error);

        // Tratamento de erros específicos do Firebase
        let errorMessage = 'Erro ao fazer login. Tente novamente.';

        if (error.code === 'auth/popup-closed-by-user') {
            errorMessage = 'Login cancelado. Por favor, tente novamente.';
        } else if (error.code === 'auth/network-request-failed') {
            errorMessage = 'Erro de conexão. Verifique sua internet.';
        } else if (error.code === 'auth/unauthorized-domain') {
            errorMessage = 'Domínio não autorizado. Configure o Firebase corretamente.';
        }

        alert(errorMessage);

    } finally {
        loginBtn.classList.remove('loading');
    }
}

// Função para verificar se usuário já está logado
function checkIfUserIsLoggedIn() {
    const isAuthenticated = localStorage.getItem('isAuthenticated');
    const user = localStorage.getItem('user');

    if (isAuthenticated === 'true' && user) {
        try {
            const userData = JSON.parse(user);
            console.log('Usuário já logado:', userData);

            // Redirecionar para o hub se já estiver logado
            window.location.href = '../index.html';

        } catch (error) {
            console.error('Erro ao ler dados do usuário:', error);
            localStorage.removeItem('user');
            localStorage.removeItem('isAuthenticated');
        }
    }
}

// Event Listeners
loginBtn.addEventListener('click', loginWithGoogle);

// Verificar login ao carregar a página
window.addEventListener('load', checkIfUserIsLoggedIn);

// Função para logout (útil para testes)
window.logout = function() {
    localStorage.removeItem('user');
    localStorage.removeItem('isAuthenticated');
    console.log('Logout realizado!');
    alert('Você foi desconectado!');
    window.location.reload();
};

// Para testar logout, abra o console e digite: logout()