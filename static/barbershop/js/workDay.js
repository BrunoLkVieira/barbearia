let allDaysActive = false;
let globalTimeOptions = []; 

document.addEventListener('DOMContentLoaded', function () {
    const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 3500, timerProgressBar: true });

    function showValidationErrors(errors) {
        let errorHtml = '<ul style="text-align: left; list-style: disc; margin-left: 20px;">';
        errors.forEach(err => errorHtml += `<li>${err}</li>`);
        errorHtml += '</ul>';
        Swal.fire({ title: 'Erros Encontrados', html: errorHtml, icon: 'error', confirmButtonColor: '#7066e0' });
    }

    // Carrega opções de horário globais pro script
    const baseSelect = document.querySelector('.time-input.start-time');
    if(baseSelect) Array.from(baseSelect.options).forEach(opt => globalTimeOptions.push(opt.value));

    // REQUISIÇÕES AJAX CENTRALIZADAS
    const formsAjax = document.querySelectorAll('.holiday-form, #unitWorkdayForm');
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

    // VALIDAÇÃO DE FOLGAS
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

    // LÓGICA DE ABAS MANHÃ E TARDE
    const tabs = document.querySelectorAll('.barber-selector-item');
    tabs.forEach(item => {
        item.addEventListener('click', function() {
            tabs.forEach(i => i.classList.remove('active'));
            this.classList.add('active');
            activeTabPeriod = this.dataset.target;
            
            document.querySelectorAll('.day-edit.morning').forEach(d => d.style.display = (activeTabPeriod === 'morning') ? 'flex' : 'none');
            document.querySelectorAll('.day-edit.afternoon').forEach(d => d.style.display = (activeTabPeriod === 'afternoon') ? 'flex' : 'none');
            
            // Reseta botão Lote
            allDaysActive = false;
            const btn = document.getElementById('batchToggleBtn');
            if(btn) btn.innerHTML = '<i class="fas fa-check-double"></i> Ativar Todos';
            
            updateBatchSelectsLimits();
        });
    });
    if (tabs[0]) tabs[0].click(); 
});


// FUNÇÕES GLOBAIS DE GRADE DO BARBEIRO
function updatePeriodVisuals(weekday, period, isAvailable, isShopOpen, shopStart, shopEnd) {
    const periodDiv = document.querySelector(`.day-edit[data-weekday="${weekday}"][data-period="${period}"]`);
    if (!periodDiv) return;
    
    const checkbox = periodDiv.querySelector('.day-checkbox');
    const sSelect = periodDiv.querySelector('.start-time');
    const eSelect = periodDiv.querySelector('.end-time');
    const warningText = periodDiv.querySelector('.closed-warning');
    const inputGroup = periodDiv.querySelector('.time-input-group');

    if (!isShopOpen) {
        checkbox.checked = false; checkbox.disabled = true;
        periodDiv.classList.replace('active', 'off');
        inputGroup.style.display = 'none'; warningText.style.display = 'block';
        return;
    } else {
        checkbox.disabled = false;
        inputGroup.style.display = 'flex'; warningText.style.display = 'none';
    }

    // A mágica acontece aqui: Limitadores de string O(1)
    let periodStartLimit = shopStart;
    let periodEndLimit = shopEnd;
    
    if (period === 'morning') {
        periodEndLimit = ("15:00" < shopEnd) ? "15:00" : shopEnd;
    } else if (period === 'afternoon') {
        periodStartLimit = ("12:00" > shopStart) ? "12:00" : shopStart;
    }

    [sSelect, eSelect].forEach(input => {
        Array.from(input.options).forEach(opt => {
            opt.disabled = (opt.value < periodStartLimit || opt.value > periodEndLimit);
            opt.style.display = opt.disabled ? 'none' : 'block';
        });
    });

    if (checkbox) checkbox.checked = isAvailable;
    
    if (isAvailable) {
        periodDiv.classList.replace('off', 'active');
        sSelect.disabled = false; eSelect.disabled = false;
    } else {
        periodDiv.classList.replace('active', 'off');
        sSelect.disabled = true; eSelect.disabled = true;
    }
}

function updateBatchSelectsLimits() {
    const bStart = document.getElementById('batchStartTime');
    const bEnd = document.getElementById('batchEndTime');
    if(!bStart || !bEnd) return;

    bStart.innerHTML = ''; bEnd.innerHTML = '';
    
    let startLimit = (activeTabPeriod === 'morning') ? "00:00" : "12:00";
    let endLimit = (activeTabPeriod === 'morning') ? "15:00" : "23:30";

    globalTimeOptions.forEach(time => {
        if(time >= startLimit && time <= endLimit) {
            bStart.add(new Option(time, time));
            bEnd.add(new Option(time, time));
        }
    });
}

function toggleAllDaysInPeriod() {
    allDaysActive = !allDaysActive;
    const btn = document.getElementById('batchToggleBtn');
    if(btn) btn.innerHTML = allDaysActive ? '<i class="fas fa-times"></i> Desativar Todos' : '<i class="fas fa-check-double"></i> Ativar Todos';
    
    document.querySelectorAll(`.day-edit.${activeTabPeriod}`).forEach(dayDiv => {
        const toggle = dayDiv.querySelector('.day-checkbox');
        if (toggle && !toggle.disabled) { 
            toggle.checked = allDaysActive;
            handleToggleClick(toggle);
        }
    });
}

function applyBatchTimes() {
    const startTime = document.getElementById('batchStartTime').value;
    const endTime = document.getElementById('batchEndTime').value;
    
    document.querySelectorAll(`.day-edit.${activeTabPeriod}`).forEach(dayDiv => {
        const toggle = dayDiv.querySelector('.day-checkbox');
        if (toggle && toggle.checked && !toggle.disabled) {
            const sSelect = dayDiv.querySelector('.start-time');
            const eSelect = dayDiv.querySelector('.end-time');
            
            // Só aplica se o valor não violar as restrições da barbearia
            if (sSelect.querySelector(`option[value="${startTime}"]`) && !sSelect.querySelector(`option[value="${startTime}"]`).disabled) sSelect.value = startTime;
            if (eSelect.querySelector(`option[value="${endTime}"]`) && !eSelect.querySelector(`option[value="${endTime}"]`).disabled) eSelect.value = endTime;
        }
    });
}

function handleToggleClick(checkboxElement) {
    const dayDiv = checkboxElement.closest('.day-edit');
    if (!dayDiv) return;
    
    const dataEl = document.getElementById('unit-workdays-data');
    const unitData = dataEl ? JSON.parse(dataEl.textContent) : null;
    const wIndex = dayDiv.dataset.weekday;
    
    let isShopOpen = true; let shopStart = "00:00"; let shopEnd = "23:30";
    if (unitData) {
        const uDay = unitData[wIndex] || unitData[String(wIndex)];
        if (uDay) { isShopOpen = uDay.is_open; shopStart = uDay.open_time; shopEnd = uDay.close_time; }
    }
    
    updatePeriodVisuals(wIndex, dayDiv.dataset.period, checkboxElement.checked, isShopOpen, shopStart, shopEnd);
}

function openEditModal(employeeId) {
    const formEmpId = document.getElementById('formEmployeeId');
    const dataEl = document.getElementById('unit-workdays-data');
    if (!formEmpId || typeof workdaysData === 'undefined' || !dataEl) return;
    
    const unitData = JSON.parse(dataEl.textContent);
    formEmpId.value = employeeId;
    const employeeWorkdays = workdaysData[employeeId];

    for (let i = 0; i < 7; i++) {
        const dayData = employeeWorkdays ? employeeWorkdays[i] : null;
        const uDay = unitData[i] || unitData[String(i)];
        let isShopOpen = true; let shopStart = "00:00"; let shopEnd = "23:30";
        if (uDay) { isShopOpen = uDay.is_open; shopStart = uDay.open_time; shopEnd = uDay.close_time; }

        ['morning', 'afternoon'].forEach(p => {
            const div = document.querySelector(`.day-edit[data-weekday="${i}"][data-period="${p}"]`);
            const isAvail = dayData ? dayData[`${p}_available`] : false; 
            
            updatePeriodVisuals(i, p, isAvail, isShopOpen, shopStart, shopEnd);
            
            if (div && dayData && isShopOpen) {
                const sSelect = div.querySelector(`[name^="start_${p}_work"]`);
                const eSelect = div.querySelector(`[name^="end_${p}_work"]`);
                
                // Se existe no BD, joga pro select. Se não, faz fallback pras horas físicas
                sSelect.value = dayData[`start_${p}_work`] || shopStart.substring(0,5);
                eSelect.value = dayData[`end_${p}_work`] || shopEnd.substring(0,5);
                
                // Correção visual se a barbearia alterou o expediente físico recentemente
                if (sSelect.value < shopStart) sSelect.value = shopStart.substring(0,5);
                if (eSelect.value > shopEnd) eSelect.value = shopEnd.substring(0,5);
            }
        });
    }
    document.getElementById('editModal').style.display = 'flex'; document.body.style.overflow = 'hidden';
}

function closeEditModal() { document.getElementById('editModal').style.display = 'none'; document.body.style.overflow = ''; }

function submitBarberAgenda() {
    const editWorkdayForm = document.getElementById('editWorkdayForm');
    const formData = new FormData(editWorkdayForm);
    const csrfToken = editWorkdayForm.querySelector('[name=csrfmiddlewaretoken]').value;
    const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 3500 });

    fetch(window.location.href, { method: 'POST', body: formData, headers: { 'X-CSRFToken': csrfToken } })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            closeEditModal(); Toast.fire({ icon: 'success', title: data.message });
            setTimeout(() => window.location.reload(), 1500);
        } else { Swal.fire({ title: 'Atenção', text: data.errors[0], icon: 'warning', confirmButtonColor: '#7066e0' }); }
    }).catch(() => Swal.fire('Erro', 'Conexão falhou', 'error'));
}

// RESTANTE DOS MODAIS: FERIADOS E EXPEDIENTE FÍSICO
function editHolidayModal(holidayId, name, date) {
    const m = document.getElementById('editHolidayModal');
    if (!m) return;
    document.getElementById('editHolidayId').value = holidayId;
    m.querySelector('input[name="name"]').value = name;
    m.querySelector('input[name="date"]').value = date;
    m.style.display = 'flex'; document.body.style.overflow = 'hidden';
}

function closeEditHolidayModal() { document.getElementById('editHolidayModal').style.display = 'none'; document.body.style.overflow = ''; }
function openHolidayModal() { document.getElementById('createHolidayModal').style.display = 'flex'; document.body.style.overflow = 'hidden'; }
function closeHolidayModal() { document.getElementById('createHolidayModal').style.display = 'none'; document.body.style.overflow = ''; }
function openVacationModal() { document.getElementById('vacationModal').style.display = 'flex'; document.body.style.overflow = 'hidden'; }
function closeVacationModal() { document.getElementById('vacationModal').style.display = 'none'; document.body.style.overflow = ''; }

function openUnitWorkdayModal() {
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