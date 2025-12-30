// ============================================
// AUTH GUARD - PROTEÇÃO DE ROTAS (COM FIREBASE AUTH)
// Substitui o auth-guard.js existente
// ============================================

import { onAuthChanged } from './auth-service.js';

// ============================================
// FUNÇÕES DE NAVEGAÇÃO
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

    console.log('Current path:', currentPath);
    console.log('Base path:', basePath);

    if (basePath) {
        return basePath + '/login/login.html';
    }

    if (currentPath.endsWith('/') || currentPath.endsWith('/index.html') || currentPath.endsWith('index.html')) {
        return 'login/login.html';
    }

    return '../login/login.html';
}

// ============================================
// VERIFICAÇÃO DE AUTENTICAÇÃO
// ============================================

let authCheckInProgress = false;

function checkAuthentication() {
    if (authCheckInProgress) {
        console.log('⏳ Verificação de autenticação já em andamento...');
        return;
    }

    authCheckInProgress = true;

    console.log('🔐 Verificando autenticação...');

    // Mostrar loading
    showAuthLoading();

    // Observar estado de autenticação
    onAuthChanged(({ authenticated, user, error }) => {
        authCheckInProgress = false;
        hideAuthLoading();

        if (authenticated && user) {
            console.log('✅ Usuário autenticado:', user.email);
            console.log('📋 Plano:', user.plano);
            console.log('📅 Validade:', user.validade);
            console.log('🟢 Status:', user.status);

            // Atualizar informações do usuário na interface (se houver)
            updateUserUI(user);

        } else if (error) {
            console.error('❌ Erro na autenticação:', error);
            redirectToLogin('Erro ao verificar autenticação');

        } else {
            console.warn('⚠️ Usuário não autenticado');
            redirectToLogin('Você precisa fazer login');
        }
    });
}

function redirectToLogin(message) {
    console.warn('🔄 Redirecionando para login:', message);

    // Salvar a página atual para redirecionar após login
    const currentPath = window.location.pathname;
    localStorage.setItem('redirectAfterLogin', currentPath);

    // Redirecionar para login
    const loginPath = getLoginPath();
    console.log('➡️ Redirecionando para:', loginPath);
    window.location.href = loginPath;
}

// ============================================
// UI DE LOADING
// ============================================

function showAuthLoading() {
    if (document.getElementById('authLoadingOverlay')) return;

    const overlay = document.createElement('div');
    overlay.id = 'authLoadingOverlay';
    overlay.style.cssText = `
        position: fixed;
        inset: 0;
        background: rgba(255, 245, 247, 0.95);
        backdrop-filter: blur(8px);
        z-index: 999999;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        animation: fadeIn 0.3s ease;
    `;

    overlay.innerHTML = `
        <div style="text-align: center;">
            <div style="
                width: 50px;
                height: 50px;
                border: 4px solid #fce7f3;
                border-top-color: #ec4899;
                border-radius: 50%;
                margin: 0 auto 20px;
                animation: spin 1s linear infinite;
            "></div>
            <p style="
                font-family: 'Nunito', sans-serif;
                font-size: 16px;
                font-weight: 600;
                color: #ec4899;
                margin: 0;
            ">Verificando autenticação...</p>
        </div>
    `;

    // Adicionar animações
    const style = document.createElement('style');
    style.textContent = `
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
    `;
    overlay.appendChild(style);

    document.body.appendChild(overlay);
}

function hideAuthLoading() {
    const overlay = document.getElementById('authLoadingOverlay');
    if (overlay) {
        overlay.style.animation = 'fadeOut 0.3s ease';
        setTimeout(() => overlay.remove(), 300);
    }
}

// ============================================
// ATUALIZAR INFORMAÇÕES DO USUÁRIO NA UI
// ============================================

function updateUserUI(user) {
    // Atualizar nome do usuário (se houver elemento)
    const userNameElement = document.getElementById('user-name');
    if (userNameElement) {
        userNameElement.textContent = user.nome || user.email;
    }

    // Atualizar avatar (se houver elemento)
    const userAvatarElement = document.getElementById('user-avatar');
    if (userAvatarElement && user.photoURL) {
        userAvatarElement.src = user.photoURL;
    }

    // Mostrar informações do usuário (se houver container)
    const userInfoContainer = document.getElementById('user-info');
    if (userInfoContainer) {
        userInfoContainer.style.display = 'block';
    }

    // Mostrar badge do plano (se trial)
    if (user.plano === 'trial') {
        showTrialBadge(user.validade);
    }
}

function showTrialBadge(validade) {
    const validadeDate = new Date(validade);
    const now = new Date();
    const daysRemaining = Math.ceil((validadeDate - now) / (1000 * 60 * 60 * 24));

    if (daysRemaining <= 0) return;

    const badge = document.createElement('div');
    badge.style.cssText = `
        position: fixed;
        top: 70px;
        right: 20px;
        background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
        color: #92400e;
        padding: 8px 16px;
        border-radius: 50px;
        font-size: 12px;
        font-weight: 700;
        box-shadow: 0 4px 12px rgba(251, 191, 36, 0.3);
        z-index: 1000;
        animation: slideIn 0.5s ease;
    `;
    badge.innerHTML = `
        <i class="fas fa-clock" style="margin-right: 6px;"></i>
        Trial: ${daysRemaining} ${daysRemaining === 1 ? 'dia' : 'dias'} restantes
    `;

    document.body.appendChild(badge);
}

// ============================================
// FUNÇÃO DE LOGOUT
// ============================================

async function logout() {
    const confirmLogout = confirm('Deseja realmente sair?');

    if (confirmLogout) {
        try {
            // Importar dinamicamente para evitar erro se não estiver disponível
            const { logout: firebaseLogout } = await import('./auth-service.js');
            await firebaseLogout();

            console.log('✅ Logout realizado com sucesso!');

            // Redirecionar para login
            const loginPath = getLoginPath();
            console.log('Logout - Redirecionando para:', loginPath);
            window.location.href = loginPath;

        } catch (error) {
            console.error('❌ Erro no logout:', error);
            alert('Erro ao fazer logout. Tente novamente.');
        }
    }
}

// ============================================
// EXPORTAR FUNÇÕES PARA USO GLOBAL
// ============================================

window.authGuard = {
    checkAuth: checkAuthentication,
    logout: logout
};

// ============================================
// INICIALIZAR
// ============================================

// Verificar autenticação ao carregar a página
checkAuthentication();

console.log('✅ Auth Guard carregado (com Firebase Auth)');