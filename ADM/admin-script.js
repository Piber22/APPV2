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
    'contato.adrissonpiber@gmail.com', // Adicione emails de admins aqui
    'adrissonpiber22@gmail.com'
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

        console.log(`🔍 Encontrados ${querySnapshot.size} documentos na collection 'users'`);

        for (const docSnap of querySnapshot.docs) {
            const userId = docSnap.id;
            const userData = docSnap.data();

            console.log(`👤 Processando usuário: ${userId}`);
            console.log(`   - Email: ${userData.email}`);
            console.log(`   - Nome: ${userData.displayName}`);

            // Buscar dados de licença
            const licenseRef = doc(db, 'users', userId, 'config', 'license');
            const licenseSnap = await getDoc(licenseRef);

            if (licenseSnap.exists()) {
                console.log(`   ✅ Licença encontrada para ${userId}`);
                console.log(`   📄 Dados da licença:`, licenseSnap.data());
            } else {
                console.log(`   ⚠️ Licença NÃO encontrada para ${userId} - usando valores padrão`);
            }

            const licenseData = licenseSnap.exists() ? licenseSnap.data() : {};

            // Converter Timestamp para Date se necessário
            let expirationDate = null;
            if (licenseData.expirationDate) {
                if (licenseData.expirationDate.toDate) {
                    expirationDate = licenseData.expirationDate.toDate();
                } else if (licenseData.expirationDate instanceof Date) {
                    expirationDate = licenseData.expirationDate;
                } else {
                    expirationDate = new Date(licenseData.expirationDate);
                }
            }

            allUsers.push({
                uid: userId,
                email: userData.email || '',
                displayName: userData.displayName || 'Sem nome',
                photoURL: userData.photoURL || null,
                createdAt: userData.createdAt?.toDate() || new Date(),
                // Dados de licença
                licenseType: licenseData.type || 'trial',
                licenseStatus: licenseData.status || 'trial',
                expirationDate: expirationDate,
                autoRenew: licenseData.autoRenew || false,
                adminNotes: licenseData.adminNotes || '',
                // Dados de auditoria
                lastModified: licenseData.lastModified?.toDate() || null,
                modifiedBy: licenseData.modifiedBy || null,
                modifiedByEmail: licenseData.modifiedByEmail || null
            });
        }

        console.log(`✅ ${allUsers.length} usuários carregados`);
        console.log('📊 Resumo dos usuários:', allUsers.map(u => ({
            email: u.email,
            status: u.licenseStatus,
            type: u.licenseType
        })));

        applyFiltersAndSort();
        updateStats();
        hideLoading();

    } catch (error) {
        console.error('❌ Erro ao carregar usuários:', error);
        console.error('📋 Detalhes do erro:', error.message);
        hideLoading();
        showToast('Erro ao carregar usuários: ' + error.message, 'error');
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
        const expirationDateStr = document.getElementById('expirationDate').value;
        const autoRenew = document.getElementById('autoRenew').checked;
        const adminNotes = document.getElementById('adminNotes').value.trim();

        console.log('💾 Salvando alterações do usuário:', editingUserId);
        console.log('📋 Dados a salvar:', {
            type: licenseType,
            status: licenseStatus,
            expirationDate: expirationDateStr,
            autoRenew: autoRenew,
            adminNotes: adminNotes
        });

        // Converter data para Timestamp do Firebase
        const expirationDate = new Date(expirationDateStr);
        expirationDate.setHours(23, 59, 59, 999); // Fim do dia

        // Referência do documento de licença
        const licenseRef = doc(db, 'users', editingUserId, 'config', 'license');

        // Dados a salvar
        const licenseData = {
            type: licenseType,
            status: licenseStatus,
            expirationDate: expirationDate,
            autoRenew: autoRenew,
            adminNotes: adminNotes,
            lastModified: serverTimestamp(),
            modifiedBy: currentAdmin.uid,
            modifiedByEmail: currentAdmin.email
        };

        // Salvar no Firebase (setDoc com merge cria o documento se não existir)
        await setDoc(licenseRef, licenseData, { merge: true });

        console.log('✅ Documento salvo em: users/' + editingUserId + '/config/license');
        console.log('📄 Dados salvos:', licenseData);

        // Verificar se realmente salvou
        const verifySnap = await getDoc(licenseRef);
        if (verifySnap.exists()) {
            console.log('✅ VERIFICAÇÃO: Documento existe no Firebase!');
            console.log('📊 Dados confirmados:', verifySnap.data());
        } else {
            console.warn('⚠️ ATENÇÃO: Documento não foi encontrado após salvar!');
        }

        showToast('Usuário atualizado com sucesso!', 'success');

        closeModal();

        // Aguardar 500ms antes de recarregar para dar tempo do Firebase sincronizar
        setTimeout(async () => {
            await loadUsers();
        }, 500);

    } catch (error) {
        console.error('❌ Erro ao salvar alterações:', error);
        console.error('📋 Detalhes do erro:', error.message);
        showToast('Erro ao salvar: ' + error.message, 'error');
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

// ============================================
// DEBUG: TESTAR CONEXÃO FIREBASE
// ============================================

window.testFirebaseConnection = async function() {
    console.log('═══════════════════════════════════════');
    console.log('🔬 TESTE DE CONEXÃO FIREBASE');
    console.log('═══════════════════════════════════════');

    try {
        // Pegar primeiro usuário para teste
        if (allUsers.length === 0) {
            alert('❌ Nenhum usuário carregado. Recarregue a página primeiro.');
            return;
        }

        const testUser = allUsers[0];
        console.log('👤 Usuário de teste:', testUser.email);
        console.log('🆔 UID:', testUser.uid);

        // Testar leitura
        console.log('\n📖 TESTE 1: Lendo documento de licença...');
        const licenseRef = doc(db, 'users', testUser.uid, 'config', 'license');
        const licenseSnap = await getDoc(licenseRef);

        if (licenseSnap.exists()) {
            console.log('✅ Documento existe!');
            console.log('📄 Dados atuais:', licenseSnap.data());
        } else {
            console.log('⚠️ Documento não existe. Será criado no próximo teste.');
        }

        // Testar escrita
        console.log('\n✍️ TESTE 2: Tentando escrever...');
        const testData = {
            type: 'trial',
            status: 'active',
            expirationDate: new Date('2025-12-31'),
            autoRenew: false,
            adminNotes: 'Teste de conexão - ' + new Date().toISOString(),
            lastModified: serverTimestamp(),
            modifiedBy: currentAdmin.uid,
            modifiedByEmail: currentAdmin.email,
            testMode: true
        };

        await setDoc(licenseRef, testData, { merge: true });
        console.log('✅ Escrita bem-sucedida!');

        // Verificar se escreveu
        console.log('\n🔍 TESTE 3: Verificando escrita...');
        const verifySnap = await getDoc(licenseRef);

        if (verifySnap.exists()) {
            const data = verifySnap.data();
            console.log('✅ Dados confirmados no Firebase:');
            console.log(data);

            if (data.testMode) {
                console.log('✅ Campo de teste encontrado! Conexão OK!');
                alert('✅ TESTE PASSOU!\n\nConexão com Firebase está funcionando.\nVerifique o console (F12) para mais detalhes.');
            } else {
                console.warn('⚠️ Campo de teste não encontrado. Dados podem não estar sendo salvos.');
                alert('⚠️ Atenção!\n\nEscrita funcionou mas dados podem estar incompletos.\nVerifique o console (F12).');
            }
        } else {
            console.error('❌ Documento não foi encontrado após escrita!');
            alert('❌ ERRO!\n\nDados não estão sendo salvos no Firebase.\nVerifique as regras de segurança.');
        }

    } catch (error) {
        console.error('❌ ERRO NO TESTE:', error);
        console.error('📋 Mensagem:', error.message);
        alert('❌ ERRO!\n\n' + error.message + '\n\nVerifique o console (F12) para mais detalhes.');
    }

    console.log('═══════════════════════════════════════');
};