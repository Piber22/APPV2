// ============================================
// ADMIN PANEL - DOCE GESTÃO
// Sistema de Gerenciamento de Usuários
// ============================================

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import {
    getFirestore,
    collection,
    getDocs,
    doc,
    getDoc,
    setDoc,
    updateDoc,
    deleteDoc,
    onSnapshot,
    query,
    orderBy,
    serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// ============================================
// FIREBASE CONFIG
// ============================================

const firebaseConfig = {
    apiKey: "AIzaSyBLhKaigyOT9dCAd9iA1o5j18rFB4rQ5uo",
    authDomain: "doce-gestao-4b032.firebaseapp.com",
    projectId: "doce-gestao-4b032",
    storageBucket: "doce-gestao-4b032.firebasestorage.app",
    messagingSenderId: "318295225306",
    appId: "1:318295225306:web:3beaebbb5979edba6686e3"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ============================================
// LISTA DE ADMINS AUTORIZADOS
// ============================================

const AUTHORIZED_ADMINS = [
    'henriquevergili@gmail.com', // Adicione emails de admins aqui
];

// ============================================
// STATE
// ============================================

let currentAdmin = null;
let allUsers = [];
let filteredUsers = [];
let currentFilter = 'all';
let currentSort = 'createdAt-desc';
let searchTerm = '';
let editingUserId = null;
let deletingUserId = null;

// Paginação
const ITEMS_PER_PAGE = 20;
let currentPage = 1;
let totalPages = 1;

// ============================================
// VERIFICAR AUTORIZAÇÃO ADMIN
// ============================================

async function checkAdminAuthorization() {
    return new Promise((resolve, reject) => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            unsubscribe();

            if (!user) {
                console.error('❌ Nenhum usuário autenticado');
                reject(new Error('Não autenticado'));
                return;
            }

            currentAdmin = user;
            console.log('👤 Usuário:', user.email);

            // Verificar se é admin autorizado
            if (!AUTHORIZED_ADMINS.includes(user.email)) {
                console.error('❌ Acesso negado. Usuário não é admin.');
                reject(new Error('Acesso negado'));
                return;
            }

            console.log('✅ Admin autorizado:', user.email);
            resolve(user);
        });
    });
}

// ============================================
// CARREGAR USUÁRIOS
// ============================================

async function loadUsers() {
    try {
        console.log('📦 Carregando usuários...');
        showLoading();

        const usersRef = collection(db, 'users');
        const querySnapshot = await getDocs(usersRef);

        allUsers = [];

        for (const docSnap of querySnapshot.docs) {
            const userId = docSnap.id;
            const userData = docSnap.data();

            // Buscar dados de licença
            const licenseRef = doc(db, 'users', userId, 'config', 'license');
            const licenseSnap = await getDoc(licenseRef);
            const licenseData = licenseSnap.exists() ? licenseSnap.data() : {};

            allUsers.push({
                uid: userId,
                email: userData.email || '',
                displayName: userData.displayName || 'Sem nome',
                photoURL: userData.photoURL || null,
                createdAt: userData.createdAt?.toDate() || new Date(),
                // Dados de licença
                licenseType: licenseData.type || 'trial',
                licenseStatus: licenseData.status || 'trial',
                expirationDate: licenseData.expirationDate?.toDate() || null,
                autoRenew: licenseData.autoRenew || false,
                adminNotes: licenseData.adminNotes || ''
            });
        }

        console.log(`✅ ${allUsers.length} usuários carregados`);

        applyFiltersAndSort();
        updateStats();
        hideLoading();

    } catch (error) {
        console.error('❌ Erro ao carregar usuários:', error);
        hideLoading();
        showToast('Erro ao carregar usuários', 'error');
    }
}

// ============================================
// APLICAR FILTROS E ORDENAÇÃO
// ============================================

function applyFiltersAndSort() {
    // Filtrar
    filteredUsers = allUsers.filter(user => {
        // Filtro de busca
        if (searchTerm) {
            const search = searchTerm.toLowerCase();
            const matchName = user.displayName.toLowerCase().includes(search);
            const matchEmail = user.email.toLowerCase().includes(search);
            if (!matchName && !matchEmail) return false;
        }

        // Filtro de status
        if (currentFilter === 'all') return true;
        return user.licenseStatus === currentFilter;
    });

    // Ordenar
    const [field, direction] = currentSort.split('-');
    filteredUsers.sort((a, b) => {
        let aVal = a[field];
        let bVal = b[field];

        if (field === 'createdAt' || field === 'expirationDate') {
            aVal = aVal?.getTime() || 0;
            bVal = bVal?.getTime() || 0;
        } else if (typeof aVal === 'string') {
            aVal = aVal.toLowerCase();
            bVal = bVal.toLowerCase();
        }

        if (direction === 'asc') {
            return aVal > bVal ? 1 : -1;
        } else {
            return aVal < bVal ? 1 : -1;
        }
    });

    // Paginação
    totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE);
    currentPage = Math.min(currentPage, Math.max(1, totalPages));

    renderUsersTable();
    updatePagination();
}

// ============================================
// RENDERIZAR TABELA
// ============================================

function renderUsersTable() {
    const tbody = document.getElementById('usersTableBody');
    const emptyState = document.getElementById('emptyState');

    if (filteredUsers.length === 0) {
        tbody.innerHTML = '';
        emptyState.style.display = 'block';
        return;
    }

    emptyState.style.display = 'none';

    // Paginação
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, filteredUsers.length);
    const pageUsers = filteredUsers.slice(startIndex, endIndex);

    tbody.innerHTML = pageUsers.map(user => {
        const initial = user.displayName ? user.displayName[0].toUpperCase() : '?';
        const avatarHTML = user.photoURL
            ? `<img src="${user.photoURL}" alt="${user.displayName}">`
            : initial;

        const statusClass = user.licenseStatus || 'trial';
        const statusText = {
            active: 'Ativa',
            trial: 'Trial',
            expired: 'Expirada',
            cancelled: 'Cancelada'
        }[statusClass] || 'Trial';

        const licenseText = {
            trial: 'Trial',
            monthly: 'Mensal',
            quarterly: 'Trimestral',
            annual: 'Anual',
            lifetime: 'Vitalícia'
        }[user.licenseType] || 'Trial';

        const expirationText = user.expirationDate
            ? formatDate(user.expirationDate)
            : '-';

        const createdText = formatDate(user.createdAt);

        return `
            <tr>
                <td>
                    <div class="user-cell">
                        <div class="user-avatar">${avatarHTML}</div>
                        <div class="user-info">
                            <div class="user-name">${user.displayName}</div>
                            <div class="user-uid">${user.uid.substring(0, 12)}...</div>
                        </div>
                    </div>
                </td>
                <td>${user.email}</td>
                <td>
                    <span class="status-badge ${statusClass}">${statusText}</span>
                </td>
                <td>
                    <span class="license-badge">${licenseText}</span>
                </td>
                <td class="date-cell">${expirationText}</td>
                <td class="date-cell">${createdText}</td>
                <td>
                    <div class="actions-cell">
                        <button class="btn-icon edit" onclick="openEditModal('${user.uid}')" title="Editar">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-icon delete" onclick="openDeleteModal('${user.uid}')" title="Excluir">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// ============================================
// ATUALIZAR ESTATÍSTICAS
// ============================================

function updateStats() {
    const total = allUsers.length;
    const active = allUsers.filter(u => u.licenseStatus === 'active').length;
    const trial = allUsers.filter(u => u.licenseStatus === 'trial').length;
    const expired = allUsers.filter(u => u.licenseStatus === 'expired').length;

    document.getElementById('totalUsers').textContent = total;
    document.getElementById('activeUsers').textContent = active;
    document.getElementById('trialUsers').textContent = trial;
    document.getElementById('expiredUsers').textContent = expired;
}

// ============================================
// PAGINAÇÃO
// ============================================

function updatePagination() {
    const pagination = document.getElementById('pagination');
    const paginationInfo = document.getElementById('paginationInfo');
    const btnPrev = document.getElementById('btnPrevPage');
    const btnNext = document.getElementById('btnNextPage');

    if (totalPages <= 1) {
        pagination.style.display = 'none';
        return;
    }

    pagination.style.display = 'flex';
    paginationInfo.textContent = `Página ${currentPage} de ${totalPages}`;
    btnPrev.disabled = currentPage === 1;
    btnNext.disabled = currentPage === totalPages;
}

// ============================================
// MODAL DE EDIÇÃO
// ============================================

function openEditModal(userId) {
    const user = allUsers.find(u => u.uid === userId);
    if (!user) return;

    editingUserId = userId;

    // Preencher dados do usuário
    document.getElementById('modalUserName').textContent = user.displayName;
    document.getElementById('modalUserEmail').textContent = user.email;
    document.getElementById('modalUserId').textContent = user.uid.substring(0, 20) + '...';

    const avatar = document.getElementById('modalUserAvatar');
    if (user.photoURL) {
        avatar.innerHTML = `<img src="${user.photoURL}" alt="${user.displayName}">`;
    } else {
        const initial = user.displayName[0].toUpperCase();
        avatar.innerHTML = initial;
    }

    // Preencher formulário
    document.getElementById('licenseType').value = user.licenseType || 'trial';
    document.getElementById('licenseStatus').value = user.licenseStatus || 'trial';
    document.getElementById('autoRenew').checked = user.autoRenew || false;
    document.getElementById('adminNotes').value = user.adminNotes || '';

    // Data de expiração
    if (user.expirationDate) {
        const dateStr = user.expirationDate.toISOString().split('T')[0];
        document.getElementById('expirationDate').value = dateStr;
    } else {
        // Definir para 7 dias a partir de hoje se não tiver
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 7);
        document.getElementById('expirationDate').value = futureDate.toISOString().split('T')[0];
    }

    document.getElementById('modalEditUser').classList.add('active');
}

function closeModal() {
    document.getElementById('modalEditUser').classList.remove('active');
    editingUserId = null;
}

// ============================================
// SALVAR ALTERAÇÕES
// ============================================

async function saveUserChanges(e) {
    e.preventDefault();

    if (!editingUserId) return;

    try {
        const licenseType = document.getElementById('licenseType').value;
        const licenseStatus = document.getElementById('licenseStatus').value;
        const expirationDate = new Date(document.getElementById('expirationDate').value);
        const autoRenew = document.getElementById('autoRenew').checked;
        const adminNotes = document.getElementById('adminNotes').value.trim();

        console.log('💾 Salvando alterações do usuário:', editingUserId);

        // Atualizar no Firebase
        const licenseRef = doc(db, 'users', editingUserId, 'config', 'license');

        await setDoc(licenseRef, {
            type: licenseType,
            status: licenseStatus,
            expirationDate: expirationDate,
            autoRenew: autoRenew,
            adminNotes: adminNotes,
            lastModified: serverTimestamp(),
            modifiedBy: currentAdmin.uid
        }, { merge: true });

        console.log('✅ Alterações salvas com sucesso');
        showToast('Usuário atualizado com sucesso!', 'success');

        closeModal();
        await loadUsers();

    } catch (error) {
        console.error('❌ Erro ao salvar alterações:', error);
        showToast('Erro ao salvar alterações', 'error');
    }
}

// ============================================
// MODAL DE EXCLUSÃO
// ============================================

function openDeleteModal(userId) {
    const user = allUsers.find(u => u.uid === userId);
    if (!user) return;

    deletingUserId = userId;

    document.getElementById('deleteUserName').textContent = user.displayName;
    document.getElementById('deleteUserEmail').textContent = user.email;

    document.getElementById('modalConfirmDelete').classList.add('active');
}

function closeDeleteModal() {
    document.getElementById('modalConfirmDelete').classList.remove('active');
    deletingUserId = null;
}

async function confirmDelete() {
    if (!deletingUserId) return;

    try {
        console.log('🗑️ Excluindo usuário:', deletingUserId);

        // Excluir documento do usuário
        await deleteDoc(doc(db, 'users', deletingUserId));

        console.log('✅ Usuário excluído com sucesso');
        showToast('Usuário excluído com sucesso', 'success');

        closeDeleteModal();
        await loadUsers();

    } catch (error) {
        console.error('❌ Erro ao excluir usuário:', error);
        showToast('Erro ao excluir usuário', 'error');
    }
}

// ============================================
// EXPORTAR CSV
// ============================================

function exportUsers() {
    console.log('📥 Exportando usuários para CSV...');

    const headers = ['Nome', 'Email', 'UID', 'Status', 'Tipo de Licença', 'Vencimento', 'Cadastro'];

    const rows = filteredUsers.map(user => [
        user.displayName,
        user.email,
        user.uid,
        user.licenseStatus,
        user.licenseType,
        user.expirationDate ? formatDate(user.expirationDate) : '-',
        formatDate(user.createdAt)
    ]);

    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `usuarios_doce_gestao_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    showToast('CSV exportado com sucesso!', 'success');
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function formatDate(date) {
    if (!date) return '-';
    return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    }).format(date);
}

function showLoading() {
    document.getElementById('loadingScreen').classList.remove('hidden');
}

function hideLoading() {
    document.getElementById('loadingScreen').classList.add('hidden');
}

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');

    toastMessage.textContent = message;
    toast.classList.add('show');

    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

function logout() {
    if (confirm('Deseja realmente sair do painel administrativo?')) {
        auth.signOut().then(() => {
            window.location.href = '../login/login.html';
        });
    }
}

// ============================================
// EVENT LISTENERS
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
    console.log('═══════════════════════════════════════');
    console.log('🛡️ ADMIN PANEL - DOCE GESTÃO');
    console.log('═══════════════════════════════════════');

    try {
        // Verificar autorização
        const admin = await checkAdminAuthorization();
        document.getElementById('adminName').textContent = admin.displayName || admin.email;

        // Carregar usuários
        await loadUsers();

        // Event Listeners
        setupEventListeners();

        console.log('✅ Painel administrativo iniciado com sucesso');

    } catch (error) {
        console.error('❌ Erro ao inicializar:', error);
        alert('⛔ Acesso Negado\n\nVocê não tem permissão para acessar o painel administrativo.');
        window.location.href = '../index.html';
    }
});

function setupEventListeners() {
    // Busca
    document.getElementById('searchInput').addEventListener('input', (e) => {
        searchTerm = e.target.value;
        currentPage = 1;
        applyFiltersAndSort();
    });

    // Filtros
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            e.currentTarget.classList.add('active');
            currentFilter = e.currentTarget.dataset.filter;
            currentPage = 1;
            applyFiltersAndSort();
        });
    });

    // Ordenação
    document.getElementById('sortSelect').addEventListener('change', (e) => {
        currentSort = e.target.value;
        applyFiltersAndSort();
    });

    // Paginação
    document.getElementById('btnPrevPage').addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            applyFiltersAndSort();
        }
    });

    document.getElementById('btnNextPage').addEventListener('click', () => {
        if (currentPage < totalPages) {
            currentPage++;
            applyFiltersAndSort();
        }
    });

    // Formulário de edição
    document.getElementById('editUserForm').addEventListener('submit', saveUserChanges);
}

// ============================================
// GLOBAL FUNCTIONS
// ============================================

window.openEditModal = openEditModal;
window.closeModal = closeModal;
window.openDeleteModal = openDeleteModal;
window.closeDeleteModal = closeDeleteModal;
window.confirmDelete = confirmDelete;
window.exportUsers = exportUsers;
window.logout = logout;