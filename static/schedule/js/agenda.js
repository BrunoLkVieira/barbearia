document.addEventListener('DOMContentLoaded', function() {
    initBarberFilter();

    const dateInput = document.getElementById('agendaDateFilter');
    if (dateInput) {
        dateInput.addEventListener('change', function() {
            const baseUrl = window.location.href.split('?')[0];
            window.location.href = `${baseUrl}?date=${this.value}`;
        });
    }

    const unitSelectFilter = document.getElementById('unitSelectFilter');
    if (unitSelectFilter) {
        unitSelectFilter.addEventListener('change', function() {
            const unitSlug = this.value;
            const urlParams = new URLSearchParams(window.location.search);
            const dateParam = urlParams.get('date');
            let newUrl = unitSlug === "geral" ? URL_AGENDA_GENERAL : URL_AGENDA_GENERAL.replace('/agenda/', `/${unitSlug}/agenda/`);
            if (dateParam) newUrl += `?date=${dateParam}`;
            window.location.href = newUrl;
        });
    }

    // Modal Create Events
    const unitSelect = document.getElementById('unitSelect');
    const hiddenBarberId = document.getElementById('hiddenBarberId');
    const appointmentDate = document.getElementById('appointmentDate');

    if (unitSelect) {
        unitSelect.addEventListener('change', async (e) => {
            await loadBarbersVisual(e.target.value, 'barberVisualGrid', 'hiddenBarberId');
            document.getElementById('serviceCheckboxGrid').innerHTML = '';
            resetTimeSelect('appointmentTime');
        });
    }
    if (hiddenBarberId) {
        hiddenBarberId.addEventListener('change', async (e) => {
            await loadServicesCheckboxes(e.target.value, 'serviceCheckboxGrid');
            triggerSlotFetch();
        });
    }
    if (appointmentDate) {
        appointmentDate.addEventListener('change', triggerSlotFetch);
    }

    // Modal Edit Events
    const editUnitSelect = document.getElementById('editUnitSelect');
    const editHiddenBarberId = document.getElementById('editHiddenBarberId');
    const editAppointmentDate = document.getElementById('editAppointmentDate');

    if (editUnitSelect) {
        editUnitSelect.addEventListener('change', async (e) => {
            await loadBarbersVisual(e.target.value, 'editBarberVisualGrid', 'editHiddenBarberId');
            document.getElementById('editServiceCheckboxGrid').innerHTML = '';
            resetTimeSelect('editAppointmentTime');
        });
    }
    if (editHiddenBarberId) {
        editHiddenBarberId.addEventListener('change', async (e) => {
            await loadServicesCheckboxes(e.target.value, 'editServiceCheckboxGrid', [], true);
            triggerEditSlotFetch();
        });
    }
    if (editAppointmentDate) {
        editAppointmentDate.addEventListener('change', triggerEditSlotFetch);
    }

    // Checkbox Extra no Finalizar
    const extraCheck = document.getElementById('addExtraServiceCheck');
    const extraSelectWrapper = document.getElementById('extraServiceWrapper');
    if (extraCheck) {
        extraCheck.addEventListener('change', function() {
            extraSelectWrapper.style.display = this.checked ? 'block' : 'none';
            calculateFinishTotal();
        });
    }
});

// ====================== UTILITÁRIOS ======================
function resetTimeSelect(selectId) {
    const sel = document.getElementById(selectId);
    sel.innerHTML = '<option value="">Preencha Barbeiro, Data e Serviço antes</option>';
    sel.classList.add('disabled-look');
}

// ====================== GERAÇÃO DA MALHA DO BARBEIRO ======================
async function loadBarbersVisual(unitId, containerId, inputId, preSelectedId = null) {
    const container = document.getElementById(containerId);
    if (!unitId) { container.innerHTML = ''; return; }
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
        }
    } catch (e) { console.error(e); }
}

// ====================== GERAÇÃO DOS CARDS DE SERVIÇOS ======================
async function loadServicesCheckboxes(employeeId, containerId, preSelectedIds = [], isEdit = false) {
    const container = document.getElementById(containerId);
    if (!employeeId) { container.innerHTML = ''; return; }
    container.innerHTML = '<p style="color:#7f8c8d; font-size:0.9rem; padding: 10px;"><i class="fas fa-spinner fa-spin"></i> Buscando serviços do barbeiro...</p>';
    
    try {
        const response = await fetch(`${API_SERVICES_URL}?employee_id=${employeeId}`);
        const data = await response.json();
        container.innerHTML = '';
        
        if (data.services && data.services.length > 0) {
            data.services.forEach(svc => {
                const isChecked = preSelectedIds.includes(svc.id.toString());
                const html = `
                    <label class="saas-service-card ${isChecked ? 'selected' : ''}">
                        <input type="checkbox" name="service_id" value="${svc.id}" data-duration="${svc.duration}" class="hidden-checkbox" ${isChecked ? 'checked' : ''} onchange="toggleServiceCard(this); ${isEdit ? 'triggerEditSlotFetch()' : 'triggerSlotFetch()'}">
                        <div class="saas-service-icon"><i class="fas fa-cut"></i></div>
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
    const card = checkbox.closest('.saas-service-card') || checkbox.closest('.custom-service-card');
    if (checkbox.checked) {
        card.classList.add('selected');
    } else {
        card.classList.remove('selected');
    }
}

// ====================== GERAÇÃO DINÂMICA DE HORÁRIOS (DROPDOWN) ======================
function triggerSlotFetch() { fetchSlots('hiddenBarberId', 'appointmentDate', '#serviceCheckboxGrid input[type="checkbox"]:checked', 'appointmentTime', 'timeLoader'); }
function triggerEditSlotFetch() { fetchSlots('editHiddenBarberId', 'editAppointmentDate', '#editServiceCheckboxGrid input[type="checkbox"]:checked', 'editAppointmentTime', 'editTimeLoader', document.getElementById('editAppointmentId').value, document.getElementById('editAppointmentTime').getAttribute('data-preset')); }

async function fetchSlots(empInputId, dateInputId, checkboxSelector, selectId, loaderId, excludeAppId = null, presetTime = null) {
    const empId = document.getElementById(empInputId).value;
    const dateStr = document.getElementById(dateInputId).value;
    const checkedSvcs = document.querySelectorAll(checkboxSelector);
    const selectEl = document.getElementById(selectId);
    const loader = document.getElementById(loaderId);

    resetTimeSelect(selectId);
    
    if (!empId || !dateStr || checkedSvcs.length === 0) return;

    let totalDuration = 0;
    checkedSvcs.forEach(cb => totalDuration += parseInt(cb.getAttribute('data-duration') || 30));

    loader.style.display = 'inline';

    try {
        let url = `${API_SLOTS_URL}?employee_id=${empId}&date=${dateStr}&duration=${totalDuration}`;
        if (excludeAppId) url += `&exclude_app_id=${excludeAppId}`;

        const response = await fetch(url);
        const data = await response.json();
        
        loader.style.display = 'none';
        selectEl.classList.remove('disabled-look');
        selectEl.innerHTML = '<option value="">Selecione o horário desejado...</option>';

        if (data.slots && data.slots.length > 0) {
            let hasPreset = false;
            data.slots.forEach(slot => {
                const isSelected = (presetTime === slot) ? 'selected' : '';
                if(isSelected) hasPreset = true;
                selectEl.innerHTML += `<option value="${slot}" ${isSelected}>${slot}</option>`;
            });
            
            if(presetTime && !hasPreset && dateStr === document.getElementById('editAppointmentDate').defaultValue){
                 selectEl.innerHTML += `<option value="${presetTime}" selected>${presetTime}</option>`;
            }
        } else {
            selectEl.innerHTML = '<option value="">S/ Horário P/ Esta Duração</option>';
            selectEl.classList.add('disabled-look');
        }
    } catch (e) { console.error(e); loader.style.display = 'none'; }
}

// ====================== MODAL FINALIZAR (CAIXA COM EXTRAS) ======================
async function loadExtraServicesCheckboxes(employeeId, containerId) {
    const container = document.getElementById(containerId);
    container.innerHTML = '<p style="font-size:0.85rem; color:#7f8c8d; padding: 10px;"><i class="fas fa-spinner fa-spin"></i> Buscando serviços do barbeiro...</p>';
    
    try {
        const response = await fetch(`${API_SERVICES_URL}?employee_id=${employeeId}`);
        const data = await response.json();
        container.innerHTML = '';
        
        if (data.services && data.services.length > 0) {
            data.services.forEach(svc => {
                const html = `
                    <label class="custom-service-card" style="padding: 10px 15px; margin-bottom: 8px;">
                        <input type="checkbox" name="extra_service_id" value="${svc.id}" data-price="${svc.price}" class="hidden-checkbox" onchange="toggleServiceCard(this); calculateFinishTotal();">
                        <div class="svc-info">
                            <span class="svc-name" style="font-size: 1rem; margin-bottom:0; font-weight:700;">${svc.name}</span>
                        </div>
                        <div class="svc-meta" style="color: #27ae60; font-weight: 800; font-size:1.1rem; margin-top:5px;">
                            + R$ ${svc.price.toFixed(2)}
                        </div>
                        <div class="svc-check-icon" style="top:5px; right:5px; font-size:1.2rem;"><i class="fas fa-check-circle"></i></div>
                    </label>
                `;
                container.innerHTML += html;
            });
        } else {
            container.innerHTML = '<p style="color:#7f8c8d; font-size:0.85rem;">O barbeiro não possui outros serviços disponíveis para venda extra.</p>';
        }
    } catch (e) { console.error(e); }
}

let baseFinishTotal = 0;
function calculateFinishTotal() {
    let finalTotal = baseFinishTotal;
    const isAddingExtra = document.getElementById('addExtraServiceCheck').checked;
    
    if(isAddingExtra) {
        const extraChecks = document.querySelectorAll('#extraServiceGrid input[type="checkbox"]:checked');
        extraChecks.forEach(cb => {
            finalTotal += parseFloat(cb.getAttribute('data-price'));
        });
    }
    
    document.getElementById('finishTotalPrice').textContent = `R$ ${finalTotal.toFixed(2).replace('.', ',')}`;
}

function openFinishModal(btn) {
    const finishModal = document.getElementById('finishModal');
    if (finishModal) {
        document.getElementById('finishAppointmentId').value = btn.getAttribute('data-id');
        document.getElementById('finishClientName').textContent = btn.getAttribute('data-client-name');
        document.getElementById('finishBarberName').textContent = btn.getAttribute('data-barber-name');
        
        baseFinishTotal = parseFloat(btn.getAttribute('data-total').replace(',', '.'));
        calculateFinishTotal();
        
        const servicesRaw = btn.getAttribute('data-services');
        document.getElementById('finishServicesList').innerHTML = servicesRaw ? servicesRaw.split('|').join('<br>') : 'Nenhum';

        loadExtraServicesCheckboxes(btn.getAttribute('data-barber-id'), 'extraServiceGrid');
        
        document.getElementById('addExtraServiceCheck').checked = false;
        document.getElementById('extraServiceWrapper').style.display = 'none';

        finishModal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
}
function closeFinishModal() {
    const finishModal = document.getElementById('finishModal');
    if (finishModal) { finishModal.style.display = 'none'; document.body.style.overflow = ''; }
}

// ====================== CÓDIGO DA TELA PRINCIPAL ======================
function initBarberFilter() {
    const barberCards = document.querySelectorAll(".barbers .barber-card");
    const timeSlots = document.querySelectorAll(".time-slot");
    const titleName = document.querySelector(".agenda-barber-name");
    const totalCountEl = document.querySelector(".schedule-footer .footer-stat:nth-child(1) .footer-value");
    const totalRevenueEl = document.querySelector(".schedule-footer .footer-stat:nth-child(2) .footer-value");

    barberCards.forEach(card => {
        card.addEventListener("click", () => {
            barberCards.forEach(c => c.classList.remove("active"));
            card.classList.add("active");
            if (titleName) titleName.innerText = card.querySelector(".barber-name").innerText;

            const clickedBarberId = card.getAttribute("data-barber-id");
            sessionStorage.setItem('activeBarberId', clickedBarberId);

            let completedCount = 0; let completedRevenue = 0; let visualOrder = 1;

            timeSlots.forEach(slot => {
                const slotBarberId = slot.getAttribute("data-barber");
                const slotStatus = slot.getAttribute("data-status"); 
                
                if (clickedBarberId === "all" || slotBarberId === clickedBarberId) {
                    slot.style.display = "";
                    const orderElement = slot.querySelector('.order');
                    if (orderElement) orderElement.innerText = visualOrder++;
                    
                    if (slotStatus === 'completed') {
                        completedCount++;
                        const priceText = slot.querySelector('.detail-value[style*="color: #27ae60"]').innerText;
                        const price = parseFloat(priceText.replace('R$ ', '').replace(',', '.'));
                        completedRevenue += price;
                    }
                } else { slot.style.display = "none"; }
            });

            if (totalCountEl) totalCountEl.innerText = completedCount;
            if (totalRevenueEl) totalRevenueEl.innerText = `R$ ${completedRevenue.toFixed(2).replace('.', ',')}`;
        });
    });

    const savedBarberId = sessionStorage.getItem('activeBarberId');
    if (savedBarberId) {
        const cardToActivate = document.querySelector(`.barbers .barber-card[data-barber-id="${savedBarberId}"]`);
        if (cardToActivate) cardToActivate.click();
    } else {
        const autoCard = document.querySelector(".barbers .barber-card.active");
        if(autoCard) autoCard.click();
    }
}

const appointmentModal = document.getElementById('appointmentModalContainer');
function openNewAppointmentModal() {
    if (appointmentModal) {
        document.getElementById('appointmentForm').reset();
        document.getElementById('barberVisualGrid').innerHTML = '';
        document.getElementById('serviceCheckboxGrid').innerHTML = '';
        resetTimeSelect('appointmentTime');
        
        const unitSel = document.getElementById('unitSelect');
        if (unitSel && unitSel.value) unitSel.dispatchEvent(new Event('change'));

        appointmentModal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
}
function closeNewAppointmentModal() {
    if (appointmentModal) { appointmentModal.style.display = 'none'; document.body.style.overflow = ''; }
}

async function openEditAppointmentModal(btn) {
    const editModal = document.getElementById('editAppointmentModalContainer');
    if (!editModal) return;

    document.getElementById('editAppointmentForm').reset();

    const id = btn.getAttribute('data-id');
    const clientId = btn.getAttribute('data-client');
    const unitId = btn.getAttribute('data-unit');
    const barberId = btn.getAttribute('data-barber');
    const servicesStr = btn.getAttribute('data-services');
    const date = btn.getAttribute('data-date');
    const time = btn.getAttribute('data-time');
    const status = btn.getAttribute('data-status');
    const notes = btn.getAttribute('data-notes');

    document.getElementById('editAppointmentId').value = id;
    document.getElementById('editClientSelect').value = clientId;
    
    const dateInput = document.getElementById('editAppointmentDate');
    dateInput.value = date;
    dateInput.defaultValue = date; 
    
    document.getElementById('editStatusSelect').value = status;
    document.getElementById('editAppointmentNotes').value = notes || ''; 
    document.getElementById('editHiddenBarberId').value = barberId;
    
    const timeSelect = document.getElementById('editAppointmentTime');
    timeSelect.setAttribute('data-preset', time);

    const unitSelect = document.getElementById('editUnitSelect');
    if (unitSelect) unitSelect.value = unitId;

    await loadBarbersVisual(unitId, 'editBarberVisualGrid', 'editHiddenBarberId', barberId);
    
    const preSelectedSvcIds = servicesStr ? servicesStr.split(',') : [];
    await loadServicesCheckboxes(barberId, 'editServiceCheckboxGrid', preSelectedSvcIds, true);
    triggerEditSlotFetch();

    editModal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}
function closeEditModal() {
    const editModal = document.getElementById('editAppointmentModalContainer');
    if (editModal) { editModal.style.display = 'none'; document.body.style.overflow = ''; }
}