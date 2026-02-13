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


// ===================================================================
// NOVA FUNCIONALIDADE: HORÁRIOS DA UNIDADE
// ===================================================================

function openUnitWorkdayModal() {
    const modal = document.getElementById('unitWorkdayModal');
    const dataEl = document.getElementById('unit-workdays-data');

    // Se o modal existe mas os dados estão vazios, avisamos
    if (!modal || !dataEl || dataEl.textContent === '{}') {
        Swal.fire({
            icon: 'info',
            title: 'Aviso',
            text: 'Selecione uma unidade específica no filtro para ajustar os horários.',
            confirmButtonColor: '#7066e0'
        });
        return;
    }

    try {
        const unitData = JSON.parse(dataEl.textContent);

        // O Django envia chaves como String ("0", "1"...), então percorremos de 0 a 6
        for (let i = 0; i < 7; i++) {
            const day = unitData[i] || unitData[String(i)];
            
            if (day) {
                // Selecionamos os elementos pelo nome que o Django gera no loop
                const checkbox = document.querySelector(`input[name="unit_open_${i}"]`);
                const startSelect = document.querySelector(`select[name="unit_start_${i}"]`);
                const endSelect = document.querySelector(`select[name="unit_end_${i}"]`);

                if (checkbox) {
                    checkbox.checked = day.is_open;
                    
                    // substring(0, 5) remove os segundos (ex: 09:00:00 vira 09:00)
                    if (startSelect && day.open_time) startSelect.value = day.open_time.substring(0, 5);
                    if (endSelect && day.close_time) endSelect.value = day.close_time.substring(0, 5);
                    
                    // Chama a função visual para desabilitar selects se estiver fechado
                    toggleUnitTimeInputs(checkbox);
                }
            }
        }
        
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    } catch (e) {
        console.error("Erro ao preencher modal da unidade:", e);
    }
}

function closeUnitWorkdayModal() {
    const modal = document.getElementById('unitWorkdayModal');
    if (modal) modal.style.display = 'none';
    document.body.style.overflow = '';
}

function toggleUnitTimeInputs(checkbox) {
    const row = checkbox.closest('.unit-day-row');
    if (!row) return;
    
    const selects = row.querySelectorAll('select');
    selects.forEach(s => {
        s.disabled = !checkbox.checked;
    });
    
    // Deixa os selects "apagadinhos" se o dia estiver fechado
    const inputArea = row.querySelector('.unit-time-inputs');
    if (inputArea) inputArea.style.opacity = checkbox.checked ? "1" : "0.3";
}

// Interceptar o envio do formulário via AJAX (Resolve o problema da Foto 2)
document.addEventListener('DOMContentLoaded', function() {
    const unitForm = document.getElementById('unitWorkdayForm');
    if (unitForm) {
        unitForm.addEventListener('submit', async function(e) {
            e.preventDefault(); // Impede a tela preta com JSON
            
            const formData = new FormData(this);
            const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]').value;

            try {
                const response = await fetch(window.location.href, {
                    method: 'POST',
                    body: formData,
                    headers: { 'X-CSRFToken': csrfToken }
                });
                const data = await response.json();

                if (data.status === 'success') {
                    // Usamos o seu Toast já configurado
                    Toast.fire({ icon: 'success', title: data.message });
                    setTimeout(() => window.location.reload(), 1500);
                } else {
                    Swal.fire('Erro', 'Houve um problema ao salvar.', 'error');
                }
            } catch (err) {
                Swal.fire('Erro', 'Erro de comunicação com o servidor.', 'error');
            }
        });
    }
});