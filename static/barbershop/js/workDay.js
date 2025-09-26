
// Quando a página estiver pronta
document.addEventListener('DOMContentLoaded', function () {
    setupEditModalEvents();
    setupVacationModalEvents();
});

// ========== MODAL DE EDIÇÃO ==========
const editModal = document.getElementById('editModal');

function openEditModal() {
    editModal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function closeEditModal() {
    editModal.style.display = 'none';
    document.body.style.overflow = '';
}

// Alternar entre dias ativos/inativos
function toggleDay(checkbox) {
    const dayEdit = checkbox.closest('.day-edit');
    const timeInputs = dayEdit.querySelectorAll('.time-input');
    
    if (checkbox.checked) {
        dayEdit.classList.remove('off');
        dayEdit.classList.add('active');
        timeInputs.forEach(input => input.disabled = false);
    } else {
        dayEdit.classList.remove('active');
        dayEdit.classList.add('off');
        timeInputs.forEach(input => input.disabled = true);
    }
}


// Alternar entre os períodos (Manhã/Tarde)
document.querySelectorAll('.barber-selector-item').forEach(item => {
    item.addEventListener('click', function() {
        document.querySelectorAll('.barber-selector-item').forEach(i => i.classList.remove('active'));
        this.classList.add('active');
        
        // Determinar qual período está ativo
        const isMorning = this.textContent.includes('Manhã');
        
        // Esconder todos os períodos primeiro
        document.querySelectorAll('.day-edit').forEach(day => {
            day.style.display = 'none';
        });
        
        // Mostrar apenas o período ativo
        if (isMorning) {
            document.querySelectorAll('.day-edit.morning').forEach(day => {
                day.style.display = 'flex';
            });
        } else {
            document.querySelectorAll('.day-edit.afternoon').forEach(day => {
                day.style.display = 'flex';
            });
        }
    });
});

// Inicializar mostrando apenas o período da manhã
document.querySelectorAll('.day-edit.afternoon').forEach(day => {
    day.style.display = 'none';
});



// ========== MODAL DE FÉRIAS ==========
const vacationModal = document.getElementById('vacationModal');

function openVacationModal() {
    vacationModal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function closeVacationModal() {
    vacationModal.style.display = 'none';
    document.body.style.overflow = '';
}

// ========== EDITAR MODAL DE FÉRIAS ==========
const editVacationModal = document.getElementById('editVacationModal');

function openEditVacationModal() {
    editVacationModal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function closeEditVacationModal() {
    editVacationModal.style.display = 'none';
    document.body.style.overflow = '';
}


// ========== MODAL DE FERIADO DA BARBEARIA ==========

function openHolidayModal() {
    document.getElementById('createHolidayModal').style.display = 'flex';
}

function closeHolidayModal() {
    document.getElementById('createHolidayModal').style.display = 'none';
}


// ========== EDITAR MODAL DE FERIADO DA BARBEARIA ==========

// ===================================================================
// CÓDIGO CORRIGIDO PARA EDITAR "DIAS DE NÃO FUNCIONAMENTO"
// Cole este bloco no final do seu arquivo workDay.js
// ===================================================================
document.addEventListener('DOMContentLoaded', function() {
    const editHolidayModalEl = document.getElementById('editHolidayModal');
    const editHolidayForm = document.getElementById('editHolidayForm');
    
    // Verifica se os elementos do modal existem antes de adicionar os listeners
    if (editHolidayModalEl && editHolidayForm) {
        let currentEditingHolidayId = null;

        // Função para ABRIR e POPULAR o modal de editar feriado
        window.editHolidayModal = function(holidayId, name, date) {
            currentEditingHolidayId = holidayId;
            editHolidayModalEl.querySelector('input[name="name"]').value = name;
            editHolidayModalEl.querySelector('input[name="date"]').value = date;
            
            editHolidayModalEl.style.display = 'flex';
            document.body.style.overflow = 'hidden';
        };

        // Função para FECHAR o modal de editar feriado
        window.closeEditHolidayModal = function() {
            editHolidayModalEl.style.display = 'none';
            document.body.style.overflow = '';
        };

        // Função para ENVIAR o formulário de edição
        editHolidayForm.addEventListener('submit', function(e) {
            e.preventDefault(); // Impede o envio padrão do formulário
            
            const formData = new FormData(this); // Pega os dados do formulário (name, date)
            formData.append('action', 'edit_holiday');
            formData.append('holiday_id', currentEditingHolidayId);

            fetch(window.location.href, {
                method: 'POST',
                body: formData,
                headers: {
                    // O CSRF token é pego do input no formulário
                    'X-CSRFToken': this.querySelector('[name=csrfmiddlewaretoken]').value
                }
            }).then(response => {
                if (response.ok) {
                    window.location.reload(); // Recarrega a página se deu tudo certo
                } else {
                    alert('Ocorreu um erro ao salvar o feriado.');
                }
            });
        });
    }
});