// ===================================================================
// ARQUIVO UNIFICADO: DISPONIBILIDADE + FERIADOS (CREATE/EDIT) + FOLGAS
// ===================================================================

document.addEventListener('DOMContentLoaded', function () {
    
    // --- 1. Configuração Global de Notificações (Toasts) ---
    const Toast = Swal.mixin({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3500,
        timerProgressBar: true
    });

    // --- 2. Função Auxiliar para Erros (Estilo "Erros Encontrados") ---
    function showValidationErrors(errors) {
        let errorHtml = '<ul style="text-align: left; list-style: disc; margin-left: 20px;">';
        errors.forEach(err => errorHtml += `<li>${err}</li>`);
        errorHtml += '</ul>';

        Swal.fire({
            title: 'Erros Encontrados',
            html: errorHtml,
            icon: 'error',
            confirmButtonText: 'OK',
            confirmButtonColor: '#7066e0'
        });
    }

    // --- 3. Lógica Unificada para Feriados / DNF (Criação e Edição) ---
    // Isso impede a "tela branca" com JSON
    const holidayForms = document.querySelectorAll('.holiday-form');
    holidayForms.forEach(form => {
        form.addEventListener('submit', async function(e) {
            e.preventDefault(); 
            
            const formData = new FormData(this);
            const csrfToken = this.querySelector('[name=csrfmiddlewaretoken]').value;

            try {
                const response = await fetch(window.location.href, {
                    method: 'POST',
                    headers: { 'X-CSRFToken': csrfToken },
                    body: formData
                });

                const data = await response.json();

                if (response.ok && data.status === 'success') {
                    // Fecha qualquer um dos dois modais
                    closeHolidayModal();
                    closeEditHolidayModal();
                    
                    Toast.fire({ icon: 'success', title: data.message });
                    setTimeout(() => window.location.reload(), 1500);
                } else {
                    // Captura o erro 400 da View e exibe no SweetAlert
                    showValidationErrors(data.errors || ['Erro ao processar dados.']);
                }
            } catch (error) {
                showValidationErrors(['Erro de comunicação com o servidor.']);
            }
        });
    });

    // --- 4. Validação: Folga (Absence) ---
    const absenceForm = document.querySelector('.absence-form');
    if (absenceForm) {
        absenceForm.addEventListener('submit', function (e) {
            const startVal = document.getElementById('vacationStart').value;
            const endVal = document.getElementById('vacationEnd').value;
            if (!startVal || !endVal) return;
            
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const startDate = new Date(startVal + 'T00:00:00');
            const endDate = new Date(endVal + 'T00:00:00');

            let errors = [];
            if (endDate < today) errors.push("Data Fim: A folga não pode terminar no passado.");
            if (endDate < startDate) errors.push("Período: A data de término não pode ser anterior ao início.");

            if (errors.length > 0) {
                e.preventDefault();
                e.stopImmediatePropagation();
                showValidationErrors(errors);
            }
        });
    }

    // --- 5. Lógica de Abas (Manhã / Tarde) ---
    const tabs = document.querySelectorAll('.barber-selector-item');
    tabs.forEach(item => {
        item.addEventListener('click', function() {
            tabs.forEach(i => i.classList.remove('active'));
            this.classList.add('active');
            const isMorning = this.textContent.trim() === 'Manhã';
            document.querySelectorAll('.day-edit.morning').forEach(d => d.style.display = isMorning ? 'flex' : 'none');
            document.querySelectorAll('.day-edit.afternoon').forEach(d => d.style.display = isMorning ? 'none' : 'flex');
        });
    });
    if (tabs[0]) tabs[0].click();

    // --- 6. Salvamento de Disponibilidade (Barbeiros) ---
    const editWorkdayForm = document.getElementById('editWorkdayForm');
    if (editWorkdayForm) {
        const saveBtn = document.querySelector('#editModal .btn-primary');
        if (saveBtn) {
            saveBtn.addEventListener('click', function() {
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
                        Toast.fire({ icon: 'success', title: data.message });
                        setTimeout(() => window.location.reload(), 1500);
                    } else {
                        showValidationErrors(data.errors);
                    }
                })
                .catch(() => showValidationErrors(['Erro de conexão com o servidor.']));
            });
        }
    }
});

// --- 7. Funções Globais de Controle de Modal (Escopo Global) ---

function editHolidayModal(holidayId, name, date) {
    const modal = document.getElementById('editHolidayModal');
    const idField = document.getElementById('editHolidayId');
    if (!modal) return;

    if(idField) idField.value = holidayId;
    modal.querySelector('input[name="name"]').value = name;
    modal.querySelector('input[name="date"]').value = date;
    
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

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
    if (dayDiv) updatePeriodVisuals(dayDiv.dataset.weekday, dayDiv.dataset.period, checkboxElement.checked);
}

function openEditModal(employeeId) {
    const formEmpId = document.getElementById('formEmployeeId');
    if (!formEmpId || typeof workdaysData === 'undefined') return;
    formEmpId.value = employeeId;
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
    document.getElementById('editModal').style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function closeEditModal() { document.getElementById('editModal').style.display = 'none'; document.body.style.overflow = ''; }
function closeEditHolidayModal() { document.getElementById('editHolidayModal').style.display = 'none'; document.body.style.overflow = ''; }
function openHolidayModal() { document.getElementById('createHolidayModal').style.display = 'flex'; document.body.style.overflow = 'hidden'; }
function closeHolidayModal() { document.getElementById('createHolidayModal').style.display = 'none'; document.body.style.overflow = ''; }
function openVacationModal() { document.getElementById('vacationModal').style.display = 'flex'; document.body.style.overflow = 'hidden'; }
function closeVacationModal() { document.getElementById('vacationModal').style.display = 'none'; document.body.style.overflow = ''; }