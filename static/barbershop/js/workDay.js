// ===================================================================
// ARQUIVO UNIFICADO E CORRIGIDO (MERGE FRONT + FEATURE)
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
    
    // 1. Configuração do SweetAlert2 (Toasts)
    const Toast = Swal.mixin({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3500,
        timerProgressBar: true,
        didOpen: (toast) => {
            toast.addEventListener('mouseenter', Swal.stopTimer)
            toast.addEventListener('mouseleave', Swal.resumeTimer)
        }
    });

    // 2. Lógica de salvar Disponibilidade (via FETCH para suportar o Toast)
    if (editModal && editWorkdayForm) {
        const saveButton = editModal.querySelector('.edit-modal-footer .btn-primary') || editModal.querySelector('.btn-primary');
        
        if (saveButton) {
            saveButton.addEventListener('click', function() {
                const formData = new FormData(editWorkdayForm);
                const csrfToken = editWorkdayForm.querySelector('[name=csrfmiddlewaretoken]').value;

                fetch(window.location.href, { 
                    method: 'POST',
                    body: formData,
                    headers: { 'X-CSRFToken': csrfToken }
                })
                .then(response => response.json()) 
                .then(data => {
                    if (data.status === 'success') {
                        closeEditModal();
                        requestAnimationFrame(() => {
                            setTimeout(() => {
                                Toast.fire({ icon: 'success', title: data.message || 'Disponibilidade atualizada!' });
                                setTimeout(() => window.location.reload(), 1500);
                            }, 1); 
                        });
                    } else {
                        // Trata erros de validação do servidor
                        let errorHtml = '<ul style="text-align: left;">';
                        if (data.errors) data.errors.forEach(err => errorHtml += `<li>${err}</li>`);
                        else errorHtml += '<li>Erro desconhecido</li>';
                        errorHtml += '</ul>';

                        Swal.fire({ icon: 'error', title: 'Erro ao Salvar', html: errorHtml });
                    }
                })
                .catch(err => {
                    Swal.fire({ icon: 'error', title: 'Erro de conexão', text: 'Não foi possível salvar os dados.' });
                });
            });
        }
    }

    // 3. Inicializa a aba "Manhã" como ativa
    const morningSelector = document.querySelector('.barber-selector-item:first-child');
    if (morningSelector) {
        morningSelector.click();
    }

    // 4. Lógica de Edição de Feriado (AJAX + Validação)
    if (editHolidayModalEl && editHolidayForm) {
        window.editHolidayModal = function(holidayId, name, date) {
            const idField = document.getElementById('editHolidayId');
            if(idField) idField.value = holidayId;
            editHolidayModalEl.querySelector('input[name="name"]').value = name;
            editHolidayModalEl.querySelector('input[name="date"]').value = date;
            editHolidayModalEl.style.display = 'flex';
            document.body.style.overflow = 'hidden';
        };

        editHolidayForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const formData = new FormData(this);
            const csrfToken = this.querySelector('[name=csrfmiddlewaretoken]').value;

            try {
                const response = await fetch(window.location.href, {
                    method: 'POST',
                    headers: { 'X-CSRFToken': csrfToken },
                    body: formData
                });

                if (response.ok) {
                    closeEditHolidayModal();
                    Toast.fire({ icon: 'success', title: 'Dia atualizado!' });
                    setTimeout(() => window.location.reload(), 1500);
                } else {
                    const data = await response.json();
                    Swal.fire({ icon: 'error', title: 'Erro', text: data.errors ? data.errors[0] : 'Erro ao salvar.' });
                }
            } catch (error) {
                Swal.fire({ icon: 'error', title: 'Erro de rede', text: error.message });
            }
        });
    }

    // 5. Validações de Datas Retroativas (Recuperado do Front)
    const holidayForm = document.querySelector('.holiday-form');
    if (holidayForm) {
        holidayForm.addEventListener('submit', function(event) {
            const holidayDate = document.getElementById('holidayDate');
            const [y, m, d] = holidayDate.value.split('-').map(Number);
            const selected = new Date(y, m - 1, d);
            const today = new Date();
            today.setHours(0,0,0,0);

            if (selected < today) {
                event.preventDefault();
                alert('A data não pode ser anterior à data atual.');
            }
        });
    }
});

// --- Funções Globais de Controle de Modal ---

function updatePeriodVisuals(weekday, period, isAvailable) {
    const periodDiv = document.querySelector(`.day-edit[data-weekday="${weekday}"][data-period="${period}"]`);
    if (!periodDiv) return;

    const checkbox = periodDiv.querySelector('input[type="checkbox"]');
    if (checkbox) checkbox.checked = isAvailable;

    const timeInputs = periodDiv.querySelectorAll('.time-input');
    if (isAvailable) {
        periodDiv.classList.replace('off', 'active');
        timeInputs.forEach(input => input.disabled = false);
    } else {
        periodDiv.classList.replace('active', 'off');
        timeInputs.forEach(input => input.disabled = true);
    }
}

function handleToggleClick(checkboxElement) {
    const dayDiv = checkboxElement.closest('.day-edit');
    if (dayDiv) {
        updatePeriodVisuals(dayDiv.dataset.weekday, dayDiv.dataset.period, checkboxElement.checked);
    }
}

function openEditModal(employeeId) {
    if (!editWorkdayForm || typeof workdaysData === 'undefined') return;
    document.getElementById('formEmployeeId').value = employeeId;
    const employeeWorkdays = workdaysData[employeeId];

    for (let i = 0; i < 7; i++) {
        const dayData = employeeWorkdays ? employeeWorkdays[i] : null;
        ['morning', 'afternoon'].forEach(p => {
            const div = document.querySelector(`.day-edit[data-weekday="${i}"][data-period="${p}"]`);
            const isAvail = dayData ? dayData[`${p}_available`] : false;
            updatePeriodVisuals(i, p, isAvail);
            if (div && dayData) {
                div.querySelector(`[name^="start_${p}_work"]`).value = dayData[`start_${p}_work`] || '';
                div.querySelector(`[name^="end_${p}_work"]`).value = dayData[`end_${p}_work`] || '';
            }
        });
    }
    editModal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function closeEditModal() {
    if(editModal) { editModal.style.display = 'none'; document.body.style.overflow = ''; }
}

function closeEditHolidayModal() {
    if(editHolidayModalEl) { editHolidayModalEl.style.display = 'none'; document.body.style.overflow = ''; }
}

// Lógica de abas (Manhã/Tarde)
document.querySelectorAll('.barber-selector-item').forEach(item => {
    item.addEventListener('click', function() {
        document.querySelectorAll('.barber-selector-item').forEach(i => i.classList.remove('active'));
        this.classList.add('active');
        const isMorning = this.textContent.trim() === 'Manhã';
        document.querySelectorAll('.day-edit.morning').forEach(d => d.style.display = isMorning ? 'flex' : 'none');
        document.querySelectorAll('.day-edit.afternoon').forEach(d => d.style.display = isMorning ? 'none' : 'flex');
    });
});

// Modais Simples (Férias e Feriados)
function openVacationModal() { vacationModal.style.display = 'flex'; document.body.style.overflow = 'hidden'; }
function closeVacationModal() { vacationModal.style.display = 'none'; document.body.style.overflow = ''; }
function openHolidayModal() { createHolidayModal.style.display = 'flex'; document.body.style.overflow = 'hidden'; }
function closeHolidayModal() { createHolidayModal.style.display = 'none'; document.body.style.overflow = ''; }