
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

// ========== MODAL DE FÉRIAS ==========