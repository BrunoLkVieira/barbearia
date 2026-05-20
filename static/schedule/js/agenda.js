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

    // ==========================================
    // CASCATA DE SELECTS (UNIDADE -> BARBEIRO -> SERVIÇO)
    // ==========================================
    const unitSelect = document.getElementById('unitSelect');
    const barberSelect = document.getElementById('barberSelect');
    const serviceSelect = document.getElementById('serviceSelect');

    if(unitSelect) {
        unitSelect.addEventListener('change', async (e) => {
            resetSelects([barberSelect, serviceSelect]);
            if (!e.target.value) return;

            try {
                // Utiliza a variável definida no HTML (resolvida pelo Django)
                const response = await fetch(`${API_EMPLOYEES_URL}?unit_id=${e.target.value}`);
                const data = await response.json();
                
                if(data.employees && data.employees.length > 0) {
                    populateSelect(barberSelect, data.employees, 'Selecione um barbeiro');
                    barberSelect.disabled = false;
                } else {
                    console.warn("Nenhum barbeiro encontrado para esta unidade.");
                }
            } catch (error) {
                console.error("Erro ao buscar barbeiros:", error);
            }
        });
    }

    if(barberSelect) {
        barberSelect.addEventListener('change', async (e) => {
            resetSelects([serviceSelect]);
            if (!e.target.value) return;

            try {
                // Utiliza a variável definida no HTML (resolvida pelo Django)
                const response = await fetch(`${API_SERVICES_URL}?employee_id=${e.target.value}`);
                const data = await response.json();
                
                if(data.services && data.services.length > 0) {
                    populateSelect(serviceSelect, data.services, 'Selecione um serviço');
                    serviceSelect.disabled = false;
                } else {
                    console.warn("Nenhum serviço encontrado para este barbeiro.");
                }
            } catch (error) {
                console.error("Erro ao buscar serviços:", error);
            }
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
        
        // Mantem bloqueado e resetado ao abrir novo form
        const barberSelect = document.getElementById('barberSelect');
        const serviceSelect = document.getElementById('serviceSelect');
        if(barberSelect && serviceSelect) {
            resetSelects([barberSelect, serviceSelect]);
        }

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

// Funções Utilitárias para o Select
function resetSelects(elements) {
    elements.forEach(el => {
        el.innerHTML = '<option value="">Selecione...</option>';
        el.disabled = true;
    });
}

function populateSelect(selectEl, items, placeholder) {
    selectEl.innerHTML = `<option value="">${placeholder}</option>`;
    items.forEach(item => {
        const option = document.createElement('option');
        option.value = item.id;
        // Se houver preço (no caso de serviço) ele formata, senão coloca só o nome
        option.textContent = item.name + (item.price !== undefined ? ` - R$ ${item.price.toFixed(2)}` : '');
        selectEl.appendChild(option);
    });
}