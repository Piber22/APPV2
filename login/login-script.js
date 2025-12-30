// ============================================
// LOGIN SCRIPT - COM AUTENTICAÇÃO REAL
// Substitui o login-script.js existente
// ============================================

import { loginWithGoogle, onAuthChanged } from '../auth-service.js';

// ============================================
// ELEMENTOS DOM
// ============================================

const loginBtn = document.getElementById('google-login-btn');
const btnText = loginBtn.querySelector('span');
const spinner = loginBtn.querySelector('.spinner');
const googleIcon = loginBtn.querySelector('.google-icon');

// ============================================
// FUNÇÕES DE NAVEGAÇÃO
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
// FUNÇÕES DE UI
// ============================================

function showLoading() {
    loginBtn.disabled = true;
    loginBtn.classList.add('loading');
    googleIcon.style.display = 'none';
    spinner.style.display = 'block';
    btnText.textContent = 'Entrando...';
}

function hideLoading() {
    loginBtn.disabled = false;
    loginBtn.classList.remove('loading');
    googleIcon.style.display = 'block';
    spinner.style.display = 'none';
    btnText.textContent = 'Continuar com Google';
}

function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: #fee2e2;
        border: 2px solid #ef4444;
        color: #991b1b;
        padding: 16px 24px;
        border-radius: 12px;
        font-weight: 600;
        z-index: 10000;
        box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
        animation: slideDown 0.3s ease;
        max-width: 90%;
        text-align: center;
    `;
    errorDiv.innerHTML = `
        <i class="fas fa-exclamation-circle" style="margin-right: 8px;"></i>
        ${message}
    `;

    document.body.appendChild(errorDiv);

    setTimeout(() => {
        errorDiv.style.animation = 'slideUp 0.3s ease';
        setTimeout(() => errorDiv.remove(), 300);
    }, 5000);
}

function showSuccess(message) {
    const successDiv = document.createElement('div');
    successDiv.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: #d1fae5;
        border: 2px solid #10b981;
        color: #065f46;
        padding: 16px 24px;
        border-radius: 12px;
        font-weight: 600;
        z-index: 10000;
        box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
        animation: slideDown 0.3s ease;
        max-width: 90%;
        text-align: center;
    `;
    successDiv.innerHTML = `
        <i class="fas fa-check-circle" style="margin-right: 8px;"></i>
        ${message}
    `;

    document.body.appendChild(successDiv);

    setTimeout(() => successDiv.remove(), 2000);
}

// ============================================
// FUNÇÃO DE LOGIN
// ============================================

async function handleLogin() {
    showLoading();

    try {
        const result = await loginWithGoogle();

        console.log('✅ Login bem-sucedido:', result.user);

        showSuccess(`Bem-vindo(a), ${result.user.nome}! 🎉`);

        // Aguardar um pouco para mostrar a mensagem
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Verificar se há uma página para redirecionar após login
        const redirectPath = localStorage.getItem('redirectAfterLogin');
        localStorage.removeItem('redirectAfterLogin');

        if (redirectPath && !redirectPath.includes('/login/login.html')) {
            window.location.href = redirectPath;
        } else {
            window.location.href = getIndexPath();
        }

    } catch (error) {
        console.error('❌ Erro no login:', error);
        hideLoading();

        let errorMessage = 'Erro ao fazer login. Tente novamente.';

        // Mensagens de erro específicas
        if (error.code === 'auth/popup-closed-by-user') {
            errorMessage = 'Login cancelado. Tente novamente.';
        } else if (error.code === 'auth/network-request-failed') {
            errorMessage = 'Erro de conexão. Verifique sua internet.';
        } else if (error.code === 'auth/unauthorized-domain') {
            errorMessage = 'Domínio não autorizado. Configure o Firebase.';
        } else if (error.message.includes('expirou') || error.message.includes('bloqueada')) {
            errorMessage = error.message;
        } else if (error.message) {
            errorMessage = error.message;
        }

        showError(errorMessage);
    }
}

// ============================================
// VERIFICAR SE JÁ ESTÁ LOGADO
// ============================================

function checkIfUserIsLoggedIn() {
    showLoading();
    btnText.textContent = 'Verificando...';

    // Observar mudanças na autenticação
    onAuthChanged(({ authenticated, user, error }) => {
        if (authenticated && user) {
            console.log('✅ Usuário já autenticado:', user.email);

            showSuccess(`Bem-vindo de volta, ${user.nome}! 🎉`);

            setTimeout(() => {
                const indexPath = getIndexPath();
                console.log('Redirecionando para:', indexPath);
                window.location.href = indexPath;
            }, 1000);

        } else if (error) {
            console.error('❌ Erro ao verificar autenticação:', error);
            hideLoading();

            if (error.message) {
                showError(error.message);
            }
        } else {
            console.log('ℹ️ Usuário não autenticado');
            hideLoading();
        }
    });
}

// ============================================
// ADICIONAR ANIMAÇÕES CSS
// ============================================

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

    @keyframes slideUp {
        from {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
        }
        to {
            opacity: 0;
            transform: translateX(-50%) translateY(-20px);
        }
    }
`;
document.head.appendChild(style);

// ============================================
// EVENT LISTENERS
// ============================================

loginBtn.addEventListener('click', handleLogin);

// ============================================
// INICIALIZAR
// ============================================

window.addEventListener('load', checkIfUserIsLoggedIn);

console.log('✅ Login script carregado (com autenticação real)');