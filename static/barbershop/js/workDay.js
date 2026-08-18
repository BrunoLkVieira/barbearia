let allDaysActive = false;

document.addEventListener('DOMContentLoaded', function () {
    const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 3500, timerProgressBar: true });

    function showValidationErrors(errors) {
        let errorHtml = '<ul style="text-align: left; list-style: disc; margin-left: 20px;">';
        errors.forEach(err => errorHtml += `<li>${err}</li>`);
        errorHtml += '</ul>';
        Swal.fire({ title: 'Erros Encontrados', html: errorHtml, icon: 'error', confirmButtonColor: '#7066e0' });
    }

    const formsAjax = document.querySelectorAll('.holiday-form');
    formsAjax.forEach(form => {
        form.addEventListener('submit', async function(e) {
            e.preventDefault(); 
            const formData = new FormData(this);
            const csrfToken = this.querySelector('[name=csrfmiddlewaretoken]').value;
            try {
                const response = await fetch(window.location.href, { method: 'POST', headers: { 'X-CSRFToken': csrfToken }, body: formData });
                const data = await response.json();
                if (response.ok && data.status === 'success') {
                    Toast.fire({ icon: 'success', title: data.message });
                    setTimeout(() => window.location.reload(), 1500);
                } else { showValidationErrors(data.errors || ['Erro ao processar dados.']); }
            } catch (error) { showValidationErrors(['Erro de comunicação com o servidor.']); }
        });
    });

    const unitWorkdayForm = document.getElementById('unitWorkdayForm');
    if (unitWorkdayForm) {
        unitWorkdayForm.addEventListener('submit', function(e) {
            e.preventDefault();
            Swal.fire({
                title: 'Confirmar Ajuste?',
                text: 'Mudar o expediente da barbearia irá reajustar automaticamente a disponibilidade dos barbeiros para se adequarem às novas horas. Deseja continuar?',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#FF7A00',
                cancelButtonColor: '#a0aec0',
                confirmButtonText: 'Sim, atualizar tudo!',
                cancelButtonText: 'Cancelar'
            }).then(async (result) => {
                if (result.isConfirmed) {
                    closeUnitWorkdayModal();
                    
                    Swal.fire({
                        title: 'Processando...',
                        text: 'Ajustando agendas dos profissionais.',
                        allowOutsideClick: false,
                        didOpen: () => { Swal.showLoading(); }
                    });

                    const formData = new FormData(unitWorkdayForm);
                    const csrfToken = unitWorkdayForm.querySelector('[name=csrfmiddlewaretoken]').value;
                    try {
                        const response = await fetch(window.location.href, { method: 'POST', headers: { 'X-CSRFToken': csrfToken }, body: formData });
                        const data = await response.json();
                        if (response.ok && data.status === 'success') {
                            Swal.fire({ icon: 'success', title: data.message, showConfirmButton: false, timer: 1500 });
                            setTimeout(() => window.location.reload(), 1500);
                        } else { showValidationErrors(data.errors || ['Erro ao processar dados.']); }
                    } catch (error) { showValidationErrors(['Erro de comunicação com o servidor.']); }
                }
            });
        });
    }

    const absenceForm = document.querySelector('.absence-form');
    if (absenceForm) {
        absenceForm.addEventListener('submit', function (e) {
            const startVal = document.getElementById('vacationStart').value;
            const endVal = document.getElementById('vacationEnd').value;
            if (!startVal || !endVal) return;
            const today = new Date(); today.setHours(0, 0, 0, 0);
            const startDate = new Date(startVal + 'T00:00:00');
            const endDate = new Date(endVal + 'T00:00:00');
            let errors = [];
            if (endDate < today) errors.push("A folga não pode terminar no passado.");
            if (endDate < startDate) errors.push("A data de término não pode ser anterior ao início.");
            if (errors.length > 0) { e.preventDefault(); e.stopImmediatePropagation(); showValidationErrors(errors); }
        });
    }
});

function checkGlobalView(actionText) {
    if (typeof isGlobalView !== 'undefined' && isGlobalView) {
        Swal.fire({
            icon: 'warning',
            title: 'Ação Restrita',
            text: `Para ${actionText}, selecione uma Unidade específica no filtro localizado no topo da página.`,
            confirmButtonColor: '#ED8936'
        });
        return true;
    }
    return false;
}

function updateDayVisuals(dayDiv, isAvailable, isShopOpen, shopStart, shopEnd) {
    if (!dayDiv) return;
    const checkbox = dayDiv.querySelector('.day-checkbox');
    const inputGroup = dayDiv.querySelector('.time-input-group');
    const warningText = dayDiv.querySelector('.closed-warning');
    
    const sWork = dayDiv.querySelector('.start-time');
    const eWork = dayDiv.querySelector('.end-time');
    const sBreak = dayDiv.querySelector('.break-start-time');
    const eBreak = dayDiv.querySelector('.break-end-time');

    if (!isShopOpen) {
        checkbox.checked = false; checkbox.disabled = true;
        dayDiv.classList.remove('active');
        dayDiv.classList.add('off');
        dayDiv.style.borderLeft = "5px solid #e53e3e";
        dayDiv.style.opacity = "0.65";
        
        inputGroup.style.display = 'none'; 
        warningText.style.display = 'block';
        return;
    } else {
        checkbox.disabled = false;
        inputGroup.style.display = 'flex'; 
        warningText.style.display = 'none';
    }

    [sWork, eWork, sBreak, eBreak].forEach(input => {
        if(!input) return;
        Array.from(input.options).forEach(opt => {
            opt.disabled = (opt.value < shopStart || opt.value > shopEnd);
            opt.style.display = opt.disabled ? 'none' : 'block';
        });
    });

    if (checkbox) checkbox.checked = isAvailable;
    
    if (isAvailable) {
        dayDiv.classList.remove('off');
        dayDiv.classList.add('active');
        dayDiv.style.borderLeft = "5px solid #27ae60";
        dayDiv.style.opacity = "1";
        [sWork, eWork, sBreak, eBreak].forEach(i => i.disabled = false);
    } else {
        dayDiv.classList.remove('active');
        dayDiv.classList.add('off');
        dayDiv.style.borderLeft = "5px solid #e53e3e";
        dayDiv.style.opacity = "0.65";
        [sWork, eWork, sBreak, eBreak].forEach(i => i.disabled = true);
    }
}

function applyBatchTimes() {
    const sWork = document.getElementById('batchStartWork').value;
    const eWork = document.getElementById('batchEndWork').value;
    const sBreak = document.getElementById('batchStartBreak').value;
    const eBreak = document.getElementById('batchEndBreak').value;

    if (sWork >= eWork) {
        Swal.fire({ title: 'Atenção', text: 'O horário de término do expediente deve ser maior que o início.', icon: 'warning', confirmButtonColor: '#FF7A00' });
        return;
    }
    if (sBreak >= eBreak && sBreak !== eBreak) {
        Swal.fire({ title: 'Atenção', text: 'A pausa está configurada incorretamente (Término menor que o Início).', icon: 'warning', confirmButtonColor: '#FF7A00' });
        return;
    }

    document.querySelectorAll('.day-edit-card.active').forEach(dayDiv => {
        const sWorkSel = dayDiv.querySelector('.start-time');
        const eWorkSel = dayDiv.querySelector('.end-time');
        const sBreakSel = dayDiv.querySelector('.break-start-time');
        const eBreakSel = dayDiv.querySelector('.break-end-time');

        if (sWorkSel && !sWorkSel.querySelector(`option[value="${sWork}"]`).disabled) sWorkSel.value = sWork;
        if (eWorkSel && !eWorkSel.querySelector(`option[value="${eWork}"]`).disabled) eWorkSel.value = eWork;
        if (sBreakSel && !sBreakSel.querySelector(`option[value="${sBreak}"]`).disabled) sBreakSel.value = sBreak;
        if (eBreakSel && !eBreakSel.querySelector(`option[value="${eBreak}"]`).disabled) eBreakSel.value = eBreak;
    });

    const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 });
    Toast.fire({ icon: 'success', title: 'Horários replicados para todos os dias que estão ativos (ON)!' });
}

function toggleAllDays() {
    allDaysActive = !allDaysActive;
    const btn = document.getElementById('batchToggleBtn');
    if(btn) btn.innerHTML = allDaysActive ? '<i class="fas fa-times"></i> Desativar Todos' : '<i class="fas fa-check-double"></i> Ativar Todos';
    
    document.querySelectorAll(`.day-edit-card`).forEach(dayDiv => {
        const toggle = dayDiv.querySelector('.day-checkbox');
        if (toggle && !toggle.disabled) { 
            toggle.checked = allDaysActive;
            handleToggleClick(toggle);
        }
    });
}

function handleToggleClick(checkboxElement) {
    const dayDiv = checkboxElement.closest('.day-edit-card');
    if (!dayDiv) return;
    
    const dataEl = document.getElementById('unit-workdays-data');
    const unitData = dataEl ? JSON.parse(dataEl.textContent) : null;
    const wIndex = dayDiv.dataset.weekday;
    
    let isShopOpen = true; let shopStart = "00:00"; let shopEnd = "23:30";
    if (unitData) {
        const uDay = unitData[wIndex] || unitData[String(wIndex)];
        if (uDay) { isShopOpen = uDay.is_open; shopStart = uDay.open_time; shopEnd = uDay.close_time; }
    }
    
    updateDayVisuals(dayDiv, checkboxElement.checked, isShopOpen, shopStart, shopEnd);
}

function openEditModal(employeeId) {
    if (checkGlobalView('editar a disponibilidade do barbeiro')) return;

    const formEmpId = document.getElementById('formEmployeeId');
    const dataEl = document.getElementById('unit-workdays-data');
    if (!formEmpId || typeof workdaysData === 'undefined' || !dataEl) return;
    
    const unitData = JSON.parse(dataEl.textContent);
    formEmpId.value = employeeId;
    const employeeWorkdays = workdaysData[employeeId];

    const bStart = document.getElementById('batchStartWork');
    if (bStart) {
        bStart.value = "09:00";
        document.getElementById('batchEndWork').value = "19:00";
        document.getElementById('batchStartBreak').value = "12:00";
        document.getElementById('batchEndBreak').value = "13:00";
    }

    for (let i = 0; i < 7; i++) {
        const dayData = employeeWorkdays ? employeeWorkdays[i] : null;
        const uDay = unitData[i] || unitData[String(i)];
        let isShopOpen = true; let shopStart = "00:00"; let shopEnd = "23:30";
        if (uDay) { isShopOpen = uDay.is_open; shopStart = uDay.open_time; shopEnd = uDay.close_time; }

        const div = document.querySelector(`.day-edit-card[data-weekday="${i}"]`);
        if(!div) continue;

        const isAvail = dayData ? (dayData.morning_available || dayData.afternoon_available) : false; 
        updateDayVisuals(div, isAvail, isShopOpen, shopStart, shopEnd);
        
        if (div && isShopOpen) {
            const sWork = div.querySelector('.start-time');
            const sBreak = div.querySelector('.break-start-time');
            const eBreak = div.querySelector('.break-end-time');
            const eWork = div.querySelector('.end-time');
            
            let valSWork = (dayData && dayData.start_morning_work) ? dayData.start_morning_work : shopStart.substring(0,5);
            let valSBreak = (dayData && dayData.end_morning_work) ? dayData.end_morning_work : "12:00";
            let valEBreak = (dayData && dayData.start_afternoon_work) ? dayData.start_afternoon_work : "13:00";
            let valEWork = (dayData && dayData.end_afternoon_work) ? dayData.end_afternoon_work : shopEnd.substring(0,5);
            
            if (valSWork < shopStart) valSWork = shopStart.substring(0,5);
            if (valEWork > shopEnd) valEWork = shopEnd.substring(0,5);
            if (valSBreak < shopStart) valSBreak = shopStart.substring(0,5);
            if (valEBreak > shopEnd) valEBreak = shopEnd.substring(0,5);
            
            if(sWork) sWork.value = valSWork;
            if(sBreak) sBreak.value = valSBreak;
            if(eBreak) eBreak.value = valEBreak;
            if(eWork) eWork.value = valEWork;
        }
    }
    
    document.getElementById('editModal').style.display = 'flex'; document.body.style.overflow = 'hidden';
}

function closeEditModal() { document.getElementById('editModal').style.display = 'none'; document.body.style.overflow = ''; }

function submitBarberAgenda() {
    const editWorkdayForm = document.getElementById('editWorkdayForm');
    const formData = new FormData(editWorkdayForm);
    const csrfToken = editWorkdayForm.querySelector('[name=csrfmiddlewaretoken]').value;
    const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 3500 });

    closeEditModal();
    Swal.fire({
        title: 'Salvando...',
        allowOutsideClick: false,
        didOpen: () => { Swal.showLoading(); }
    });

    fetch(window.location.href, { method: 'POST', body: formData, headers: { 'X-CSRFToken': csrfToken } })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            Swal.fire({ icon: 'success', title: data.message, showConfirmButton: false, timer: 1500 });
            setTimeout(() => window.location.reload(), 1500);
        } else { Swal.fire({ title: 'Atenção', text: data.errors[0], icon: 'warning', confirmButtonColor: '#7066e0' }); }
    }).catch(() => Swal.fire('Erro', 'Conexão falhou', 'error'));
}

function editHolidayModal(holidayId, name, date) {
    if (checkGlobalView('editar este feriado')) return;
    const m = document.getElementById('editHolidayModal');
    if (!m) return;
    document.getElementById('editHolidayId').value = holidayId;
    m.querySelector('input[name="name"]').value = name;
    m.querySelector('input[name="date"]').value = date;
    m.style.display = 'flex'; document.body.style.overflow = 'hidden';
}

function closeEditHolidayModal() { document.getElementById('editHolidayModal').style.display = 'none'; document.body.style.overflow = ''; }

function openHolidayModal() { 
    if (checkGlobalView('adicionar um feriado ou fechamento na agenda')) return;
    document.getElementById('createHolidayModal').style.display = 'flex'; document.body.style.overflow = 'hidden'; 
}

function closeHolidayModal() { document.getElementById('createHolidayModal').style.display = 'none'; document.body.style.overflow = ''; }

function openVacationModal() { 
    if (checkGlobalView('agendar uma folga para a equipe')) return;
    document.getElementById('vacationModal').style.display = 'flex'; document.body.style.overflow = 'hidden'; 
}

function closeVacationModal() { document.getElementById('vacationModal').style.display = 'none'; document.body.style.overflow = ''; }

function openUnitWorkdayModal() {
    if (checkGlobalView('configurar o horário de funcionamento físico da barbearia')) return;
    
    const modal = document.getElementById('unitWorkdayModal');
    const dataEl = document.getElementById('unit-workdays-data');
    if (!modal || !dataEl || dataEl.textContent === '{}') return;
    try {
        const unitData = JSON.parse(dataEl.textContent);
        for (let i = 0; i < 7; i++) {
            const day = unitData[i] || unitData[String(i)];
            if (day) {
                const checkbox = document.querySelector(`input[name="unit_open_${i}"]`);
                const startSelect = document.querySelector(`select[name="unit_start_${i}"]`);
                const endSelect = document.querySelector(`select[name="unit_end_${i}"]`);
                if (checkbox) {
                    checkbox.checked = day.is_open;
                    if (startSelect && day.open_time) startSelect.value = day.open_time.substring(0, 5);
                    if (endSelect && day.close_time) endSelect.value = day.close_time.substring(0, 5);
                    toggleUnitTimeInputs(checkbox);
                }
            }
        }
        modal.style.display = 'flex'; document.body.style.overflow = 'hidden';
    } catch (e) { console.error(e); }
}

function closeUnitWorkdayModal() { document.getElementById('unitWorkdayModal').style.display = 'none'; document.body.style.overflow = ''; }

function toggleUnitTimeInputs(checkbox) {
    const row = checkbox.closest('.unit-day-row');
    if (!row) return;
    row.querySelectorAll('select').forEach(s => s.disabled = !checkbox.checked);
    const inputArea = row.querySelector('.unit-time-inputs');
    if (inputArea) inputArea.style.opacity = checkbox.checked ? "1" : "0.3";
}