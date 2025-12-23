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
            emailVerified: user.emailVerified
        };

        localStorage.setItem('user', JSON.stringify(userData));

        console.log('Login realizado com sucesso!', userData);

        // Redirecionar para o hub
        window.location.href = 'index.html';
        */

        // ====== SIMULAÇÃO (REMOVER EM PRODUÇÃO) ======
        console.log('Login simulado com sucesso!');
        alert('Login realizado! (Modo simulação)\n\nQuando integrar com Firebase, você será redirecionado automaticamente.');

        // Salvar usuário simulado
        const mockUser = {
            uid: 'mock-uid-12345',
            email: 'usuario@exemplo.com',
            displayName: 'Usuário Teste',
            photoURL: 'https://via.placeholder.com/150',
            emailVerified: true
        };
        localStorage.setItem('user', JSON.stringify(mockUser));

        // Descomentar para testar redirecionamento:
        // window.location.href = 'index.html';

    } catch (error) {
        console.error('Erro no login:', error);

        // Tratamento de erros específicos do Firebase
        let errorMessage = 'Erro ao fazer login. Tente novamente.';

        if (error.code === 'auth/popup-closed-by-user') {
            errorMessage = 'Login cancelado. Por favor, tente novamente.';
        } else if (error.code === 'auth/network-request-failed') {
            errorMessage = 'Erro de conexão. Verifique sua internet.';
        }

        alert(errorMessage);

    } finally {
        loginBtn.classList.remove('loading');
    }
}

// Função para verificar se usuário já está logado
function checkIfUserIsLoggedIn() {
    const user = localStorage.getItem('user');

    if (user) {
        try {
            const userData = JSON.parse(user);
            console.log('Usuário já logado:', userData);

            // Redirecionar para o hub se já estiver logado
            // window.location.href = 'index.html';

        } catch (error) {
            console.error('Erro ao ler dados do usuário:', error);
            localStorage.removeItem('user');
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
    console.log('Logout realizado!');
    window.location.reload();
};

// Para testar logout, abra o console e digite: logout()