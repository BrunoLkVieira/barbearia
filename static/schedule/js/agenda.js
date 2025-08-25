// Ativar cards de barbeiros ao clicar
document.querySelectorAll('.barber-card').forEach(card => {
    card.addEventListener('click', function() {
        document.querySelectorAll('.barber-card').forEach(c => {
            c.classList.remove('active');
        });
        this.classList.add('active');
        
        // Atualizar o nome do barbeiro no título da agenda
        const barberName = this.querySelector('.barber-name').textContent;
        document.querySelector('.agenda-barber-name').textContent = `${barberName}`;
    });
});


// ====== MODAL FINALIZAR SERVIÇO ======
const endServiceModal = document.querySelector('.endServiceModal-overlay');

function openModal() {
    endServiceModal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

// Fechar modal
function closeModal() {
    endServiceModal.style.display = 'none';
    document.body.style.overflow = '';
}

function cancelModal(){
    endServiceModal.style.display = 'none';
    document.body.style.overflow = '';
}

window.addEventListener('click', function (e) {
    if (e.target === endServiceModal) {
        closeModal();
    }
});



// Eidtar Servico
const editServiceModal = document.getElementById('editServiceContainer');

function EditModal() {
    editServiceModal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

// Fechar modal
function closeEditModal() {
    editServiceModal.style.display = 'none';
    document.body.style.overflow = '';
}

function cancelEidtModal(){
    editServiceModal.style.display = 'none';
    document.body.style.overflow = '';
}

window.addEventListener('click', function (e) {
    if (e.target === editServiceModal) {
        closeEditModal();
    }
});


// Carregar o modal de novo agendamento
const modalContainer = document.getElementById('appointmentModalContainer');
const newAppointmentBtn = document.getElementById('newAppointmentBtn');
const closeBtn = modalContainer.querySelector('.close-btn');
const cancelBtn = modalContainer.querySelector('#cancelAppointmentBtn');

// Função para abrir o modal
function openAppointmentModal() {
    modalContainer.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

// Função para fechar o modal
function closeAppointmentModal() {
    modalContainer.style.display = 'none';
    document.body.style.overflow = 'auto';
}

// Abrir o modal ao clicar no botão
newAppointmentBtn.addEventListener('click', openAppointmentModal);

// Fechar ao clicar no "X"
closeBtn.addEventListener('click', closeAppointmentModal);

// Fechar ao clicar em "Cancelar"
cancelBtn.addEventListener('click', closeAppointmentModal);

// Fechar ao clicar fora do conteúdo do modal
modalContainer.addEventListener('click', function (e) {
    if (e.target === modalContainer) {
        closeAppointmentModal();
    }
});

