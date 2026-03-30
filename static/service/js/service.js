const modal = document.getElementById('serviceModal');
const serviceForm = document.getElementById('serviceForm');
const modalTitle = document.querySelector('#serviceModal h2');
const modalAction = document.getElementById('modalAction');
const modalServiceId = document.getElementById('modalServiceId');

// --- CONTROLE DO MODAL ---

function openModal() {
    serviceForm.reset();
    
    // Limpa todos os barbeiros selecionados (permite selecionar vários depois)
    const checkboxes = document.querySelectorAll('.barber-checkbox');
    checkboxes.forEach(cb => cb.checked = false);

    modalTitle.innerHTML = '<i class="fas fa-scissors"></i> Novo Serviço';
    modalAction.value = 'create';
    modalServiceId.value = '';
    
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
}

// Fecha no X ou clicando fora
document.getElementById('closeModal').onclick = closeModal;
window.onclick = e => { if (e.target === modal) closeModal(); };

// --- FUNÇÕES CRUD ---

function editService(id, name, price, duration, employeeId, baseId) {
    modalTitle.innerHTML = '<i class="fas fa-edit"></i> Editar Serviço';
    modalAction.value = "update";
    modalServiceId.value = id;

    // Preenche campos básicos
    document.getElementById('serviceName').value = name;
    document.getElementById('servicePrice').value = price.replace('R$ ', '').replace(',', '.').trim();
    document.getElementById('serviceDuration').value = duration;
    document.getElementById('baseService').value = baseId;

    // Na EDIÇÃO, marca apenas o dono desse serviço específico
    const checkboxes = document.querySelectorAll('.barber-checkbox');
    checkboxes.forEach(cb => {
        cb.checked = (cb.value == employeeId);
    });

    modal.style.display = 'flex';
}

// --- LÓGICA DE SELEÇÃO ---

document.addEventListener('change', (e) => {
    if (e.target.classList.contains('barber-checkbox')) {
        // Se estiver EDITANDO, a gente força seleção única para não bugar o banco
        if (modalAction.value === 'update') {
            const checkboxes = document.querySelectorAll('.barber-checkbox');
            checkboxes.forEach(cb => {
                if (cb !== e.target) cb.checked = false;
            });
        }
        // Se estiver CRIANDO, não tem lógica nenhuma, pode marcar todos!
    }
});