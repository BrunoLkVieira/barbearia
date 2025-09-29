// ===================================================================
// ARQUIVO JAVASCRIPT COMPLETO E CORRIGIDO
// ===================================================================

// --- Declaração de constantes dos modais ---
const editModal = document.getElementById('editModal');
const editWorkdayForm = document.getElementById('editWorkdayForm');
const vacationModal = document.getElementById('vacationModal');
const editVacationModal = document.getElementById('editVacationModal');
const createHolidayModal = document.getElementById('createHolidayModal');
const editHolidayModalEl = document.getElementById('editHolidayModal');
const editHolidayForm = document.getElementById('editHolidayForm');


// --- Lógica a ser executada quando a página carregar ---
document.addEventListener('DOMContentLoaded', function () {
    
    // Lógica do botão "Salvar Alterações" do modal de edição de disponibilidade
    if (editModal) {
        const saveButton = editModal.querySelector('.btn-primary');
        if (saveButton && editWorkdayForm) {
            saveButton.addEventListener('click', function() {
                editWorkdayForm.submit();
            });
        }
    }

    // Inicializa a aba "Manhã" como ativa por padrão
    document.querySelectorAll('.day-edit.afternoon').forEach(day => {
        day.style.display = 'none';
    });
    const morningSelector = document.querySelector('.barber-selector-item:first-child');
    if (morningSelector) {
        morningSelector.click();
    }

    // Lógica do modal de edição de feriados (código original preservado)
    if (editHolidayModalEl && editHolidayForm) {
        let currentEditingHolidayId = null;

        window.editHolidayModal = function(holidayId, name, date) {
            currentEditingHolidayId = holidayId;
            editHolidayModalEl.querySelector('input[name="name"]').value = name;
            editHolidayModalEl.querySelector('input[name="date"]').value = date;
            
            editHolidayModalEl.style.display = 'flex';
            document.body.style.overflow = 'hidden';
        };

        window.closeEditHolidayModal = function() {
            editHolidayModalEl.style.display = 'none';
            document.body.style.overflow = '';
        };

        editHolidayForm.addEventListener('submit', function(e) {
            e.preventDefault(); 
            
            const formData = new FormData(this); 
            formData.append('action', 'edit_holiday');
            formData.append('holiday_id', currentEditingHolidayId);

            fetch(window.location.href, {
                method: 'POST',
                body: formData,
                headers: {
                    'X-CSRFToken': this.querySelector('[name=csrfmiddlewaretoken]').value
                }
            }).then(response => {
                if (response.ok) {
                    window.location.reload(); 
                } else {
                    alert('Ocorreu um erro ao salvar o feriado.');
                }
            });
        });
    }
});


// ===================================================================
// BLOCO DE CÓDIGO DO MODAL "EDITAR DISPONIBILIDADE" (VERSÃO FINAL)
// ===================================================================

/**
 * Função Central: Atualiza o visual de um TURNO específico (manhã ou tarde).
 */
function updatePeriodVisuals(weekday, period, isAvailable) {
    const periodDiv = document.querySelector(`.day-edit[data-weekday="${weekday}"][data-period="${period}"]`);
    if (!periodDiv) return;

    const checkbox = periodDiv.querySelector('input[type="checkbox"]');
    if (checkbox) checkbox.checked = isAvailable;

    const timeInputs = periodDiv.querySelectorAll('.time-input');
    if (isAvailable) {
        periodDiv.classList.remove('off');
        periodDiv.classList.add('active');
        timeInputs.forEach(input => input.disabled = false);
    } else {
        periodDiv.classList.remove('active');
        periodDiv.classList.add('off');
        timeInputs.forEach(input => input.disabled = true);
    }
}

/**
 * Lida com o clique em qualquer checkbox de turno (manhã/tarde).
 */
function handleToggleClick(checkboxElement) {
    const dayDiv = checkboxElement.closest('.day-edit');
    if (!dayDiv) return;

    const weekday = dayDiv.getAttribute('data-weekday');
    const period = dayDiv.getAttribute('data-period');
    const isNowAvailable = checkboxElement.checked;
    
    // Atualiza o visual do período que foi clicado
    updatePeriodVisuals(weekday, period, isNowAvailable);

    // Encontra o checkbox principal (o que é enviado no formulário, com o 'name')
    const mainCheckbox = document.querySelector(`input[name="is_active_${weekday}"]`);
    if (mainCheckbox) {
        // Encontra o outro turno para saber se o dia inteiro está inativo
        const otherPeriod = (period === 'morning') ? 'afternoon' : 'morning';
        const otherDiv = document.querySelector(`.day-edit[data-weekday="${weekday}"][data-period="${otherPeriod}"]`);
        const otherCheckbox = otherDiv ? otherDiv.querySelector('input[type="checkbox"]') : null;

        // O dia só é "inativo" no geral se AMBOS os turnos estiverem desativados.
        if (!isNowAvailable && otherCheckbox && !otherCheckbox.checked) {
            mainCheckbox.checked = false;
        } else {
            mainCheckbox.checked = true;
        }
    }
}


/**
 * Função Principal: Abre o modal e o preenche com os dados corretos do banco de dados.
 */
function openEditModal(employeeId) {
    if (!editWorkdayForm || typeof workdaysData === 'undefined') {
        console.error("Formulário ou dados de horários não encontrados!");
        return;
    }

    document.getElementById('formEmployeeId').value = employeeId;
    const employeeWorkdays = workdaysData[employeeId];

    for (let i = 0; i < 7; i++) {
        const dayData = employeeWorkdays ? employeeWorkdays[i] : null;
        
        const morningDiv = document.querySelector(`.day-edit[data-weekday="${i}"][data-period="morning"]`);
        const afternoonDiv = document.querySelector(`.day-edit[data-weekday="${i}"][data-period="afternoon"]`);
        
        if (dayData) {
            // Usa a lógica granular para ativar/desativar cada turno independentemente
            updatePeriodVisuals(i, 'morning', dayData.morning_available);
            updatePeriodVisuals(i, 'afternoon', dayData.afternoon_available);
            
            // Preenche os horários corretos para cada turno
            if (morningDiv) {
                morningDiv.querySelector('[name^="start_morning_work"]').value = dayData.start_morning_work || '';
                morningDiv.querySelector('[name^="end_morning_work"]').value = dayData.end_morning_work || '';
            }
            if (afternoonDiv) {
                afternoonDiv.querySelector('[name^="start_afternoon_work"]').value = dayData.start_afternoon_work || '';
                afternoonDiv.querySelector('[name^="end_afternoon_work"]').value = dayData.end_afternoon_work || '';
            }
        } else {
            // Se, por algum motivo, não houver dados, desativa ambos os turnos
            updatePeriodVisuals(i, 'morning', false);
            updatePeriodVisuals(i, 'afternoon', false);
        }
    }
    
    editModal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function closeEditModal() {
    if(editModal) {
        editModal.style.display = 'none';
        document.body.style.overflow = '';
    }
}

// Lógica para alternar entre as abas "Manhã" e "Tarde" (código original)
document.querySelectorAll('.barber-selector-item').forEach(item => {
    item.addEventListener('click', function() {
        document.querySelectorAll('.barber-selector-item').forEach(i => i.classList.remove('active'));
        this.classList.add('active');
        
        const isMorning = this.textContent.includes('Manhã');
        
        document.querySelectorAll('.day-edit').forEach(day => {
            day.style.display = 'none';
        });
        
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


// ============================================================
// CÓDIGO ORIGINAL PARA OS OUTROS MODAIS (PRESERVADO)
// ============================================================

// ========== MODAL DE FÉRIAS ==========
function openVacationModal() {
    if (vacationModal) {
        vacationModal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
}

function closeVacationModal() {
    if (vacationModal) {
        vacationModal.style.display = 'none';
        document.body.style.overflow = '';
    }
}

// ========== EDITAR MODAL DE FÉRIAS ==========
function openEditVacationModal() {
    if (editVacationModal) {
        editVacationModal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
}

function closeEditVacationModal() {
    if (editVacationModal) {
        editVacationModal.style.display = 'none';
        document.body.style.overflow = '';
    }
}

// ========== MODAL DE FERIADO DA BARBEARIA ==========
function openHolidayModal() {
    if (createHolidayModal) {
        createHolidayModal.style.display = 'flex';
    }
}

function closeHolidayModal() {
    if (createHolidayModal) {
        createHolidayModal.style.display = 'none';
    }
}