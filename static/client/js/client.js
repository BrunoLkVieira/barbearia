/* --- client.js --- */

const modal = document.querySelector('.modal-overlay');
const clientForm = document.getElementById('clientForm');
const modalTitle = document.querySelector('.modal-header h2');
const modalAction = document.getElementById('modalAction');
const modalClientId = document.getElementById('modalClientId');

// --- CONTROLE DE ABERTURA/FECHAMENTO ---

function openModal() {
    // Reseta o formulário para garantir que não apareçam dados de um cliente anterior
    clientForm.reset();
    
    // Configura para o modo de CRIAÇÃO
    modalTitle.innerHTML = '<i class="fas fa-user-plus"></i> Novo Cliente';
    modalAction.value = 'create';
    modalClientId.value = '';

    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    modal.style.display = 'none';
    document.body.style.overflow = '';
}

// Atalho para o botão cancelar
document.getElementById('closeModalBtn').onclick = closeModal;

// Fecha ao clicar fora do conteúdo branco
window.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
});

// --- FUNÇÕES DE AÇÃO (CRUD) ---

// Função chamada pelos botões de edição na tabela
function editClient(id, firstName, lastName, phone, email) {
    // Configura o modal para o modo de EDIÇÃO
    modalTitle.innerHTML = '<i class="fas fa-user-edit"></i> Editar Cliente';
    modalAction.value = 'update';
    modalClientId.value = id;

    // Preenche os campos com os dados recebidos da linha da tabela
    document.getElementById('firstName').value = firstName;
    document.getElementById('lastName').value = lastName;
    document.getElementById('clientPhone').value = phone;
    document.getElementById('clientEmail').value = email;

    // Abre o modal
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

// Função para exclusão (apenas confirmação por enquanto)
function deleteClient(clientId) {
    if (confirm('Tem certeza que deseja excluir este cliente?')) {
        // Aqui você pode submeter um formulário oculto ou fazer um fetch
        console.log('Excluindo cliente ID:', clientId);
    }
}