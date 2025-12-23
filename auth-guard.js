/**
 * Auth Guard - Sistema de proteção de rotas
 * Coloque este arquivo na raiz do projeto (/)
 * Importe no início de cada página que precisa de autenticação
 *
 * Funciona tanto localmente quanto no GitHub Pages
 */

// Função para obter o caminho base (para GitHub Pages)
function getBasePath() {
    const currentPath = window.location.pathname;

    // Detectar se está no GitHub Pages
    // Ex: /APPV2/index.html → base = /APPV2
    const pathParts = currentPath.split('/').filter(part => part);

    // Se tiver partes no caminho e não for apenas um arquivo
    if (pathParts.length > 0) {
        // Remover o último item se for um arquivo
        const lastPart = pathParts[pathParts.length - 1];
        if (lastPart.includes('.html')) {
            pathParts.pop();
        }

        // Reconstruir o base path
        if (pathParts.length > 0) {
            return '/' + pathParts[0];
        }
    }

    return '';
}

// Função para obter o caminho correto do login baseado na página atual
function getLoginPath() {
    const currentPath = window.location.pathname;
    const basePath = getBasePath();

    console.log('Current path:', currentPath);
    console.log('Base path:', basePath);

    // Se estiver no GitHub Pages
    if (basePath) {
        // Se estiver na raiz ou no index.html
        if (currentPath.endsWith('/') ||
            currentPath.endsWith('/index.html') ||
            currentPath === basePath + '/' ||
            currentPath === basePath + '/index.html') {
            return basePath + '/login/login.html';
        }

        // Se estiver em uma subpasta
        return basePath + '/login/login.html';
    }

    // Se estiver local (file://)
    // Se estiver na raiz ou no index.html
    if (currentPath.endsWith('/') || currentPath.endsWith('/index.html') || currentPath.endsWith('index.html')) {
        return 'login/login.html';
    }

    // Se estiver em uma subpasta
    return '../login/login.html';
}

// Função para verificar autenticação
function checkAuthentication() {
    const isAuthenticated = localStorage.getItem('isAuthenticated');
    const user = localStorage.getItem('user');

    // Se não estiver autenticado, redireciona para login
    if (isAuthenticated !== 'true' || !user) {
        console.warn('Usuário não autenticado. Redirecionando para login...');

        // Salvar a página atual para redirecionar após login
        const currentPath = window.location.pathname;
        localStorage.setItem('redirectAfterLogin', currentPath);

        // Redirecionar para login com caminho correto
        const loginPath = getLoginPath();
        console.log('Redirecionando para:', loginPath);
        window.location.href = loginPath;
        return false;
    }

    try {
        const userData = JSON.parse(user);
        console.log('Usuário autenticado:', userData.displayName || userData.email);
        return true;
    } catch (error) {
        console.error('Erro ao verificar autenticação:', error);
        localStorage.removeItem('user');
        localStorage.removeItem('isAuthenticated');
        window.location.href = getLoginPath();
        return false;
    }
}

// Função para obter dados do usuário atual
function getCurrentUser() {
    const user = localStorage.getItem('user');
    if (user) {
        try {
            return JSON.parse(user);
        } catch (error) {
            console.error('Erro ao obter dados do usuário:', error);
            return null;
        }
    }
    return null;
}

// Função para fazer logout
function logout() {
    const confirmLogout = confirm('Deseja realmente sair?');

    if (confirmLogout) {
        localStorage.removeItem('user');
        localStorage.removeItem('isAuthenticated');
        localStorage.removeItem('redirectAfterLogin');

        console.log('Logout realizado com sucesso!');

        // Redirecionar para login com caminho correto
        const loginPath = getLoginPath();
        console.log('Logout - Redirecionando para:', loginPath);
        window.location.href = loginPath;
    }
}

// Verificar autenticação ao carregar a página
checkAuthentication();

// Exportar funções para uso global
window.authGuard = {
    checkAuth: checkAuthentication,
    getCurrentUser: getCurrentUser,
    logout: logout
};