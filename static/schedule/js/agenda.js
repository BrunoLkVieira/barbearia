document.addEventListener('DOMContentLoaded', function() {
    console.log("JS da Agenda carregado com sucesso!");

    initBarberFilter();

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

function initBarberFilter() {
    const barberCards = document.querySelectorAll(".barber-card");
    const timeSlots = document.querySelectorAll(".time-slot");
    const titleName = document.querySelector(".agenda-barber-name");

    barberCards.forEach(card => {
        card.addEventListener("click", () => {
            // 1. Muda a cor do card selecionado
            barberCards.forEach(c => c.classList.remove("active"));
            card.classList.add("active");

            // 2. Atualiza o título na tela (opcional)
            if (titleName) {
                titleName.innerText = card.querySelector(".barber-name").innerText;
            }

            // 3. Pega o ID do barbeiro clicado
            const clickedBarberId = card.getAttribute("data-barber-id");

            // 4. Mostra ou Esconde os cards SEM QUEBRAR O CSS
            timeSlots.forEach(slot => {
                const slotBarberId = slot.getAttribute("data-barber");
                
                if (clickedBarberId === "all" || slotBarberId === clickedBarberId) {
                    slot.style.display = ""; // Devolve o controle pro seu arquivo CSS (flexbox)
                } else {
                    slot.style.display = "none"; // Esconde quem não é o barbeiro clicado
                }
            });
        });
    });
}

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