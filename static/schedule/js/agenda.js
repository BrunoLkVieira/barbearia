document.addEventListener('DOMContentLoaded', function() {
    console.log("JS da Agenda carregado com sucesso!");

    // ==========================================
    // 1. FILTRO DE BARBEIROS EM TEMPO REAL
    // ==========================================
    const barberCards = document.querySelectorAll('.barber-card');
    const timeSlots = document.querySelectorAll('.time-slot');
    const agendaTitleName = document.querySelector('.agenda-barber-name');

    barberCards.forEach(card => {
        card.addEventListener('click', function() {
            // Alterna classe ativa nos cards
            barberCards.forEach(c => c.classList.remove('active'));
            this.classList.add('active');
            
            // Atualiza nome no topo
            const barberName = this.querySelector('.barber-name').textContent;
            if (agendaTitleName) agendaTitleName.textContent = barberName;

            // Filtra os agendamentos pelo ID do barbeiro
            const selectedBarberId = this.getAttribute('data-barber-id');
            console.log("Filtrando pelo barbeiro ID:", selectedBarberId);

            timeSlots.forEach(slot => {
                if (selectedBarberId === 'all') {
                    slot.style.display = 'flex';
                } else {
                    const slotBarberId = slot.getAttribute('data-barber');
                    if (slotBarberId === selectedBarberId) {
                        slot.style.display = 'flex';
                    } else {
                        slot.style.display = 'none';
                    }
                }
            });
        });
    });

    // ==========================================
    // 2. FILTRO DE DATA (MUDAR DIA RECARREGA PÁGINA)
    // ==========================================
    const dateInput = document.getElementById('agendaDateFilter');
    if (dateInput) {
        dateInput.addEventListener('change', function() {
            console.log("Mudando data para:", this.value);
            window.location.href = `?date=${this.value}`;
        });
    }
});

// ==========================================
// 3. FUNÇÕES DOS MODAIS (ESCOPO GLOBAL)
// ==========================================

// --- Modal Novo Agendamento ---
const appointmentModal = document.getElementById('appointmentModalContainer');
function openNewAppointmentModal() {
    if (appointmentModal) {
        const form = document.getElementById('appointmentForm');
        if (form) form.reset();
        appointmentModal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
}
function closeNewAppointmentModal() {
    if (appointmentModal) {
        appointmentModal.style.display = 'none';
        document.body.style.overflow = '';
    }
}

// --- Modal Finalizar Serviço ---
const finishModal = document.getElementById('finishModal');
function openFinishModal(appointmentId, clientName) {
    if (finishModal) {
        const idInput = document.getElementById('finishAppointmentId');
        const nameSpan = document.getElementById('finishClientName');
        
        if (idInput) idInput.value = appointmentId;
        if (nameSpan) nameSpan.textContent = clientName;

        finishModal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
}
function closeFinishModal() {
    if (finishModal) {
        finishModal.style.display = 'none';
        document.body.style.overflow = '';
    }
}

// --- Modal Editar Agendamento ---
const editModal = document.getElementById('editServiceContainer');
function openEditAppointmentModal(appointmentId) {
    if (editModal) {
        console.log("Abrindo edição do agendamento:", appointmentId);
        editModal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
}
function closeEditModal() {
    if (editModal) {
        editModal.style.display = 'none';
        document.body.style.overflow = '';
    }
}