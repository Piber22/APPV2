/**
 * Auth Guard - Sistema de proteção de rotas
 * Coloque este arquivo na raiz do projeto (/)
 * Importe no início de cada página que precisa de autenticação
 */

// Função para obter o caminho correto do login baseado na página atual
function getLoginPath() {
    const currentPath = window.location.pathname;

    // Se estiver na raiz ou no index.html
    if (currentPath.endsWith('/') || currentPath.endsWith('/index.html') || currentPath.endsWith('index.html')) {
        return 'login/login.html';
    }

    // Se estiver em uma subpasta (calendario, cardapio, etc)
    return '../login/login.html';
}

// Função para verificar autenticação
function checkAuthentication() {
    const isAuthenticated = localStorage.getItem('isAuthenticated');
    const user = localStorage.getItem('user');

    // Se não estiver autenticado, redireciona para login
    if (isAuthenticated !== 'true' || !user) {
        console.warn('Usuário não autenticado. Redirecionando para login...');

        // Salvar a página atual para redirecionar após login (opcional)
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