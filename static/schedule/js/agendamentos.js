document.addEventListener('DOMContentLoaded', function() {
    const unitSelectFilter = document.getElementById('unitSelectFilter');
    if (unitSelectFilter) {
        unitSelectFilter.addEventListener('change', function() {
            const unitSlug = this.value;
            if (unitSlug === "geral") {
                window.location.href = URL_HISTORY_GENERAL; 
            } else {
                window.location.href = URL_HISTORY_GENERAL.replace('/historico/agendamentos/', `/${unitSlug}/historico/agendamentos/`);
            }
        });
    }

    const unitSelect = document.getElementById('unitSelect');
    const hiddenBarberId = document.getElementById('hiddenBarberId');

    if (unitSelect) {
        unitSelect.addEventListener('change', async (e) => {
            if(document.getElementById('barberVisualGrid')){
                await loadBarbersVisual(e.target.value, 'barberVisualGrid', 'hiddenBarberId');
                document.getElementById('serviceCheckboxGrid').innerHTML = '';
                resetTimeSelect('appointmentTime');
            }
        });
    }
    if (hiddenBarberId) {
        hiddenBarberId.addEventListener('change', async (e) => {
            if(e.target.value && e.target.value !== 'null') {
                await loadServicesCheckboxes(e.target.value, 'serviceCheckboxGrid');
                triggerSlotFetch();
            }
        });
    }

    const editUnitSelect = document.getElementById('editUnitSelect');
    const editHiddenBarberId = document.getElementById('editHiddenBarberId');

    if (editUnitSelect) {
        editUnitSelect.addEventListener('change', async (e) => {
            if(document.getElementById('editBarberVisualGrid')) {
                await loadBarbersVisual(e.target.value, 'editBarberVisualGrid', 'editHiddenBarberId');
                document.getElementById('editServiceCheckboxGrid').innerHTML = '';
                resetTimeSelect('editAppointmentTime');
            }
        });
    }
    if (editHiddenBarberId) {
        editHiddenBarberId.addEventListener('change', async (e) => {
            if(e.target.value && e.target.value !== 'null') {
                await loadServicesCheckboxes(e.target.value, 'editServiceCheckboxGrid', [], true);
                triggerEditSlotFetch();
            }
        });
    }
    
    const newDateInput = document.getElementById('appointmentDate');
    const newTimeInput = document.getElementById('appointmentTime');
    if (newDateInput) newDateInput.addEventListener('change', () => enforcePastStatusRule('appointmentDate', 'appointmentTime', 'newStatusSelect'));
    if (newTimeInput) newTimeInput.addEventListener('change', () => enforcePastStatusRule('appointmentDate', 'appointmentTime', 'newStatusSelect'));

    const editDateInput = document.getElementById('editAppointmentDate');
    const editTimeInput = document.getElementById('editAppointmentTime');
    const editStatusSelect = document.getElementById('editStatusSelect');
    
    if (editDateInput) editDateInput.addEventListener('change', () => enforcePastStatusRule('editAppointmentDate', 'editAppointmentTime', 'editStatusSelect'));
    if (editTimeInput) editTimeInput.addEventListener('change', () => enforcePastStatusRule('editAppointmentDate', 'editAppointmentTime', 'editStatusSelect'));
    
    // Mostra/Oculta o Forma de Pagamento no Editar quando o status é Finalizado
    if (editStatusSelect) {
        editStatusSelect.addEventListener('change', function() {
            const paymentGroup = document.getElementById('editPaymentGroup');
            if(this.value === 'completed') {
                paymentGroup.style.display = 'block';
                document.getElementById('editPaymentSelect').required = true;
            } else {
                paymentGroup.style.display = 'none';
                document.getElementById('editPaymentSelect').required = false;
            }
        });
    }
});

function filterHistoryTable() {
    const input = document.getElementById('historyClientSearch').value.toLowerCase();
    const rows = document.querySelectorAll('.history-table tbody tr');

    rows.forEach(row => {
        // A coluna 1 é a do Cliente na tabela (0: Data, 1: Cliente, 2: Serviço)
        const clientCell = row.cells[1];
        if (clientCell) {
            const textContent = clientCell.textContent.toLowerCase();
            row.style.display = textContent.includes(input) ? '' : 'none';
        }
    });
}

function enforcePastStatusRule(dateId, timeId, statusId) {
    const dateVal = document.getElementById(dateId).value;
    const timeVal = document.getElementById(timeId).value;
    const statusSel = document.getElementById(statusId);
    
    if(!dateVal || !timeVal || !statusSel) return;
    
    const now = new Date();
    const selectedDate = new Date(`${dateVal}T${timeVal}:00`);
    const isPast = selectedDate < now;
    
    Array.from(statusSel.options).forEach(opt => {
        if(opt.value === 'scheduled') {
            opt.disabled = isPast;
            if(isPast) opt.text = "⏱️ Agendado (Bloqueado no passado)";
            else opt.text = "⏱️ Agendado (Na Fila)";
        }
    });
    
    if (isPast && statusSel.value === 'scheduled') {
        statusSel.value = 'completed'; 
        statusSel.dispatchEvent(new Event('change')); // Força a exibição do Input Forma de Pagamento
    }
}

function changePage(pageNum) {
    document.getElementById('pageInput').value = pageNum;
    document.getElementById('filterForm').submit();
}

function resetTimeSelect(selectId) {
    const sel = document.getElementById(selectId);
    if(sel) {
        sel.innerHTML = '<option value="">Preencha Barbeiro, Data e Serviço antes</option>';
        sel.classList.add('disabled-look');
    }
}

async function loadBarbersVisual(unitId, containerId, inputId, preSelectedId = null) {
    const container = document.getElementById(containerId);
    if (!container || !unitId) return;
    container.innerHTML = '<p style="color:#7f8c8d; font-size:0.9rem; padding: 10px;"><i class="fas fa-spinner fa-spin"></i> Buscando barbeiros da unidade...</p>';
    
    try {
        const response = await fetch(`${API_EMPLOYEES_URL}?unit_id=${unitId}`);
        const data = await response.json();
        container.innerHTML = '';
        
        if (data.employees && data.employees.length > 0) {
            data.employees.forEach(emp => {
                const initials = emp.name.substring(0, 2).toUpperCase();
                const crown = emp.is_owner ? '<i class="fas fa-crown" style="position:absolute; top:-6px; right:-6px; color:#e74c3c; background:#fff; border-radius:50%; padding:3px; font-size:0.9rem; box-shadow: 0 2px 4px rgba(0,0,0,0.1);"></i>' : '';
                const div = document.createElement('div');
                div.className = `saas-barber-card ${preSelectedId == emp.id ? 'active' : ''}`;
                div.innerHTML = `
                    <div class="saas-barber-avatar" style="position:relative;">${initials}${crown}</div>
                    <div class="saas-barber-info">
                        <div class="saas-barber-name">${emp.name}</div>
                        <div class="saas-select-badge">${preSelectedId == emp.id ? 'Selecionado' : 'Selecionar'}</div>
                    </div>
                `;
                div.onclick = () => {
                    document.querySelectorAll(`#${containerId} .saas-barber-card`).forEach(c => {
                        c.classList.remove('active');
                        c.querySelector('.saas-select-badge').innerText = 'Selecionar';
                    });
                    div.classList.add('active');
                    div.querySelector('.saas-select-badge').innerText = 'Selecionado';
                    
                    const hidden = document.getElementById(inputId);
                    hidden.value = emp.id;
                    hidden.dispatchEvent(new Event('change'));
                };
                container.appendChild(div);
            });
        } else {
            container.innerHTML = '<p style="color:#c62828; font-size:0.9rem; padding: 10px;">Nenhum barbeiro ativo encontrado.</p>';
            document.getElementById(inputId).value = '';
        }
    } catch (e) { console.error(e); }
}

async function loadServicesCheckboxes(employeeId, containerId, preSelectedIds = [], isEdit = false) {
    const container = document.getElementById(containerId);
    if (!container || !employeeId || employeeId === 'null') return;
    container.innerHTML = '<p style="color:#7f8c8d; font-size:0.9rem; padding: 10px;"><i class="fas fa-spinner fa-spin"></i> Buscando serviços do barbeiro...</p>';
    
    try {
        const response = await fetch(`${API_SERVICES_URL}?employee_id=${employeeId}`);
        const data = await response.json();
        container.innerHTML = '';
        
        if (data.services && data.services.length > 0) {
            data.services.forEach(svc => {
                const isChecked = preSelectedIds.includes(svc.id.toString());
                const iconClass = svc.icon || 'fas fa-cut';
                const html = `
                    <label class="saas-service-card ${isChecked ? 'selected' : ''}">
                        <input type="checkbox" name="service_id" value="${svc.id}" data-duration="${svc.duration}" class="hidden-checkbox" ${isChecked ? 'checked' : ''} onchange="toggleServiceCard(this); ${isEdit ? 'triggerEditSlotFetch()' : 'triggerSlotFetch()'}">
                        <div class="saas-service-icon"><i class="${iconClass}"></i></div>
                        <div class="saas-service-details">
                            <span class="saas-service-title">${svc.name}</span>
                            <span class="saas-service-price">R$ ${svc.price.toFixed(2)}</span>
                            <span class="saas-service-duration"><i class="far fa-clock"></i> ${svc.duration} min</span>
                        </div>
                    </label>
                `;
                container.innerHTML += html;
            });
        } else {
            container.innerHTML = '<p style="color:#c62828; font-size:0.9rem; padding: 10px;">O barbeiro não possui serviços cadastrados.</p>';
        }
    } catch (e) { console.error(e); }
}

function toggleServiceCard(checkbox) {
    const card = checkbox.closest('.saas-service-card');
    if (checkbox.checked) card.classList.add('selected');
    else card.classList.remove('selected');
}

function triggerSlotFetch() { fetchSlots('hiddenBarberId', 'appointmentDate', '#serviceCheckboxGrid input[type="checkbox"]:checked', 'appointmentTime', 'timeLoader'); }
function triggerEditSlotFetch() { fetchSlots('editHiddenBarberId', 'editAppointmentDate', '#editServiceCheckboxGrid input[type="checkbox"]:checked', 'editAppointmentTime', 'editTimeLoader', document.getElementById('editAppointmentId').value, document.getElementById('originalTime').value); }

async function fetchSlots(empInputId, dateInputId, checkboxSelector, selectId, loaderId, excludeAppId = null, presetTime = null) {
    const empId = document.getElementById(empInputId).value;
    const dateStr = document.getElementById(dateInputId).value;
    const checkedSvcs = document.querySelectorAll(checkboxSelector);
    const selectEl = document.getElementById(selectId);
    const loader = document.getElementById(loaderId);

    resetTimeSelect(selectId);
    
    if (!empId || empId === 'null' || !dateStr || checkedSvcs.length === 0) return;

    let totalDuration = 0;
    checkedSvcs.forEach(cb => totalDuration += parseInt(cb.getAttribute('data-duration') || 30));

    loader.style.display = 'inline';

    try {
        let url = `${API_SLOTS_URL}?employee_id=${empId}&date=${dateStr}&duration=${totalDuration}&allow_past=true`;
        if (excludeAppId) url += `&exclude_app_id=${excludeAppId}`;

        const response = await fetch(url);
        const data = await response.json();
        
        loader.style.display = 'none';
        selectEl.classList.remove('disabled-look');
        selectEl.innerHTML = '<option value="">Selecione o horário desejado...</option>';

        let slots = data.slots || [];
        const editDateEl = document.getElementById('editAppointmentDate');
        const initialEditDate = editDateEl ? editDateEl.defaultValue : null;

        if (presetTime && dateStr === initialEditDate && !slots.includes(presetTime)) {
            slots.push(presetTime);
            slots.sort(); 
        }

        if (slots.length > 0) {
            slots.forEach(slot => {
                const isSelected = (presetTime === slot && dateStr === initialEditDate) ? 'selected' : '';
                selectEl.innerHTML += `<option value="${slot}" ${isSelected}>${slot}</option>`;
            });
            selectEl.disabled = false;
            
            const isEdit = selectId === 'editAppointmentTime';
            enforcePastStatusRule(isEdit ? 'editAppointmentDate' : 'appointmentDate', selectId, isEdit ? 'editStatusSelect' : 'newStatusSelect');
        } else {
            selectEl.innerHTML = '<option value="">S/ Horário P/ Esta Duração</option>';
            selectEl.classList.add('disabled-look');
        }
    } catch (e) { 
        console.error(e); 
        loader.style.display = 'none'; 
    }
}

function openNewAppointmentModal() {
    const appointmentModal = document.getElementById('appointmentModalContainer');
    if (appointmentModal) {
        document.getElementById('appointmentForm').reset();
        
        const barberGrid = document.getElementById('barberVisualGrid');
        if (barberGrid) barberGrid.innerHTML = '';
        document.getElementById('serviceCheckboxGrid').innerHTML = '';
        resetTimeSelect('appointmentTime');
        
        const unitSel = document.getElementById('unitSelect');
        const hiddenBarberId = document.getElementById('hiddenBarberId');

        if (!barberGrid && hiddenBarberId && hiddenBarberId.value) {
            loadServicesCheckboxes(hiddenBarberId.value, 'serviceCheckboxGrid');
        } else if (unitSel && unitSel.value) {
            unitSel.dispatchEvent(new Event('change'));
        }

        appointmentModal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
}

function closeNewAppointmentModal() {
    const appointmentModal = document.getElementById('appointmentModalContainer');
    if (appointmentModal) { appointmentModal.style.display = 'none'; document.body.style.overflow = ''; }
}

async function openEditAppointmentModal(btn) {
    const editModal = document.getElementById('editAppointmentModalContainer');
    if (!editModal) return;

    document.getElementById('editAppointmentForm').reset();

    const id = btn.getAttribute('data-id');
    const clientId = btn.getAttribute('data-client-id');
    const unitId = btn.getAttribute('data-unit-id');
    const barberId = btn.getAttribute('data-barber-id');
    
    const servicesStr = btn.getAttribute('data-services');
    const preSelectedSvcIds = servicesStr ? JSON.parse(servicesStr).map(String) : [];

    const date = btn.getAttribute('data-date');
    const time = btn.getAttribute('data-time');
    const status = btn.getAttribute('data-status');
    const payment = btn.getAttribute('data-payment');
    const notes = btn.getAttribute('data-notes');

    document.getElementById('editAppointmentId').value = id;
    
    const clientSelect = document.getElementById('editClientSelect');
    if(clientSelect) clientSelect.value = clientId;
    
    const hiddenClient = document.getElementById('hiddenClientId');
    if(hiddenClient) hiddenClient.value = clientId;

    const dateInput = document.getElementById('editAppointmentDate');
    dateInput.value = date;
    dateInput.defaultValue = date; 
    
    const statusSelect = document.getElementById('editStatusSelect');
    statusSelect.value = status;
    
    const editPaymentSelect = document.getElementById('editPaymentSelect');
    if(editPaymentSelect) editPaymentSelect.value = payment || 'cash';
    statusSelect.dispatchEvent(new Event('change')); 

    document.getElementById('editAppointmentNotes').value = notes || ''; 
    document.getElementById('editHiddenBarberId').value = barberId;
    document.getElementById('originalTime').value = time;

    const unitSelect = document.getElementById('editUnitSelect');
    if (unitSelect) unitSelect.value = unitId;

    const barberGrid = document.getElementById('editBarberVisualGrid');
    if (barberGrid) {
        await loadBarbersVisual(unitId, 'editBarberVisualGrid', 'editHiddenBarberId', barberId);
    }
    
    await loadServicesCheckboxes(barberId, 'editServiceCheckboxGrid', preSelectedSvcIds, true);
    triggerEditSlotFetch();

    enforcePastStatusRule('editAppointmentDate', 'editAppointmentTime', 'editStatusSelect');

    editModal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function closeEditModal() {
    const editModal = document.getElementById('editAppointmentModalContainer');
    if (editModal) { editModal.style.display = 'none'; document.body.style.overflow = ''; }
}