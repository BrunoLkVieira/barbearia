// Seleção de elementos
const modal = document.getElementById('serviceModal');
const serviceForm = document.getElementById('serviceForm');
const saveServiceBtn = document.getElementById('saveServiceBtn');
const baseServiceSelect = document.getElementById('baseService');
const serviceNameInput = document.getElementById('serviceName');

// Campos ocultos e Título para controle de Estado (Adicione no HTML se não tiver)
const modalTitle = document.querySelector('#serviceModal h2');
const modalAction = document.getElementById('modalAction'); // Campo hidden no HTML
const modalServiceId = document.getElementById('modalServiceId'); // Campo hidden no HTML

// --- CONTROLE DO MODAL ---

// Função para abrir como "Novo"
function openModal() {
    serviceForm.reset();
    if (modalTitle) modalTitle.innerHTML = '<i class="fas fa-scissors"></i> Novo Serviço';
    if (modalAction) modalAction.value = 'create';
    
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function cancelModal() {
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
    serviceForm.reset();
}

// Fecha o modal ao clicar no "x" ou fora dele
const closeBtn = document.getElementById('closeModal');
if (closeBtn) closeBtn.addEventListener('click', cancelModal);

window.addEventListener('click', e => {
    if (e.target === modal) cancelModal();
});

// --- LÓGICA DO FORMULÁRIO ---

if (baseServiceSelect && serviceNameInput) {
    baseServiceSelect.addEventListener('change', function() {
        const selectedText = this.options[this.selectedIndex].text;
        if (this.value !== "" && !serviceNameInput.value) {
            serviceNameInput.value = selectedText;
        }
    });
}

if (saveServiceBtn && serviceForm) {
    saveServiceBtn.addEventListener('click', () => {
        if (serviceForm.checkValidity()) {
            serviceForm.submit();
        } else {
            serviceForm.reportValidity();
        }
    });
}

// --- FUNÇÕES CRUD (EDIÇÃO E EXCLUSÃO) ---

function editService(id, name, price, duration, employeeId, baseId) {
    // 1. Muda o estado do modal para Edição
    if (modalTitle) modalTitle.innerText = "Editar Serviço";
    if (modalAction) modalAction.value = "update";
    if (modalServiceId) modalServiceId.value = id;

    // 2. Preenche os campos com os dados atuais
    document.getElementById('serviceName').value = name;
    // Converte vírgula para ponto caso o preço venha formatado do Django
    document.getElementById('servicePrice').value = price.replace(',', '.');
    document.getElementById('serviceDuration').value = duration;
    document.getElementById('serviceEmployee').value = employeeId;
    document.getElementById('baseService').value = baseId;

    // 3. Abre o modal
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function deleteService(serviceId) {
    if (confirm('Tem certeza que deseja excluir este serviço?')) {
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = ''; 

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