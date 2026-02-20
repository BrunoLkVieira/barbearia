// Seleção de elementos
const modal = document.getElementById('serviceModal');
const serviceForm = document.getElementById('serviceForm');
const saveServiceBtn = document.getElementById('saveServiceBtn');
const baseServiceSelect = document.getElementById('baseService');
const serviceNameInput = document.getElementById('serviceName');

// --- CONTROLE DO MODAL ---

function openModal() {
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function cancelModal() {
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
    serviceForm.reset(); // Limpa o form ao fechar
}

// Fecha o modal ao clicar no "x"
const closeBtn = modal.querySelector('.close-btn');
if (closeBtn) {
    closeBtn.addEventListener('click', cancelModal);
}

// Fecha o modal ao clicar fora dele
window.addEventListener('click', e => {
    if (e.target === modal) {
        cancelModal();
    }
});

// --- LÓGICA DINÂMICA DO FORMULÁRIO ---

// Preenche o nome do serviço automaticamente ao selecionar o BaseService (Admin)
if (baseServiceSelect && serviceNameInput) {
    baseServiceSelect.addEventListener('change', function() {
        const selectedText = this.options[this.selectedIndex].text;
        // Só preenche se o campo Nome estiver vazio para não sobrescrever o que o usuário escreveu
        if (this.value !== "" && !serviceNameInput.value) {
            serviceNameInput.value = selectedText;
        }
    });
}

// Gatilho para o botão de salvar (que está fora da tag <form>)
if (saveServiceBtn && serviceForm) {
    saveServiceBtn.addEventListener('click', () => {
        // Verifica as validações do HTML5 (required, min, etc)
        if (serviceForm.checkValidity()) {
            serviceForm.submit();
        } else {
            serviceForm.reportValidity(); // Mostra os balões de erro do navegador
        }
    });
}

// --- FUNÇÕES DE AÇÃO (CRUD) ---

// Função de exclusão com confirmação
function deleteService(serviceId) {
    if (confirm('Tem certeza que deseja excluir este serviço?')) {
        // Cria um form dinâmico para enviar o DELETE via POST (segurança do Django)
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = ''; // Envia para a mesma URL atual

        const csrfInput = document.createElement('input');
        csrfInput.type = 'hidden';
        csrfInput.name = 'csrfmiddlewaretoken';
        csrfInput.value = document.querySelector('[name=csrfmiddlewaretoken]').value;

        const idInput = document.createElement('input');
        idInput.type = 'hidden';
        idInput.name = 'service_id';
        idInput.value = serviceId;

        const actionInput = document.createElement('input');
        actionInput.type = 'hidden';
        actionInput.name = 'action';
        actionInput.value = 'delete';

        form.appendChild(csrfInput);
        form.appendChild(idInput);
        form.appendChild(actionInput);
        document.body.appendChild(form);
        form.submit();
    }
}

// Função para preparar o modal para edição
function editService(serviceId) {
    // Aqui você implementaria a lógica para buscar os dados via AJAX 
    // ou capturar da linha da tabela e preencher o modal antes de abrir.
    console.log('Editando serviço:', serviceId);
    openModal();
    // Você precisaria mudar o título do modal para "Editar Serviço"
}