document.addEventListener('DOMContentLoaded', function() {
    initBarberFilter();

    const dateInput = document.getElementById('agendaDateFilter');
    if (dateInput) {
        dateInput.addEventListener('change', function() {
            const baseUrl = window.location.pathname;
            window.location.href = `${baseUrl}?date=${this.value}`;
        });
    }

    const unitSelectFilter = document.getElementById('unitSelectFilter');
    if (unitSelectFilter) {
        unitSelectFilter.addEventListener('change', function() {
            sessionStorage.removeItem('activeBarberId'); 
            
            const unitSlug = this.value;
            const urlParams = new URLSearchParams(window.location.search);
            const dateParam = urlParams.get('date');
            
            let newUrl = URL_AGENDA_GENERAL;
            if (unitSlug !== "geral") {
                newUrl = URL_AGENDA_UNIT.replace('__unit__', unitSlug);
            }
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
    if (appointmentDate) {
        appointmentDate.addEventListener('change', triggerSlotFetch);
    }

    // Modal Edit Events
    const editUnitSelect = document.getElementById('editUnitSelect');
    const editHiddenBarberId = document.getElementById('editHiddenBarberId');
    const editAppointmentDate = document.getElementById('editAppointmentDate');

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

    // Inicializa Dropdowns
    setupSearchableDropdown('clientSearchInput', 'hiddenClientId', 'clientList', 'dropdownNewApp');
    setupSearchableDropdown('editClientSearchInput', 'editHiddenClientId', 'editClientList', 'dropdownEditApp');
});

// ====================== UTILITÁRIOS ======================
function resetTimeSelect(selectId) {
    const sel = document.getElementById(selectId);
    if(sel) {
        sel.innerHTML = '<option value="">Preencha Barbeiro, Data e Serviço antes</option>';
        sel.classList.add('disabled-look');
    }
}

function setupSearchableDropdown(inputId, hiddenId, listId, wrapperId) {
    const input = document.getElementById(inputId);
    const hidden = document.getElementById(hiddenId);
    const list = document.getElementById(listId);
    if (!input || !list) return;
    const items = list.querySelectorAll('li');

    input.addEventListener('focus', () => list.classList.add('active'));

    input.addEventListener('input', function() {
        const term = this.value.toLowerCase();
        items.forEach(item => {
            const searchText = item.getAttribute('data-search');
            item.style.display = searchText.includes(term) ? 'block' : 'none';
        });
    });

    items.forEach(item => {
        item.addEventListener('click', function() {
            input.value = this.childNodes[0].nodeValue.trim(); 
            hidden.value = this.getAttribute('data-id');
            list.classList.remove('active');
        });
    });

    document.addEventListener('click', function(e) {
        const wrapper = document.getElementById(wrapperId);
        if (wrapper && !wrapper.contains(e.target)) {
            list.classList.remove('active');
            if(!hidden.value) input.value = ''; 
        }
    });
}

function initBarberFilter() {
    const barberCards = document.querySelectorAll(".barbers .barber-card");
    const timeSlots = document.querySelectorAll(".time-slot");
    const titleName = document.querySelector(".agenda-barber-name");
    const mobileSelect = document.getElementById('mobileBarberSelect');
    
    const desktopStatVals = document.querySelectorAll(".nav-bar .stats .stat-box .stat-value"); 
    const mobileStatVals = document.querySelectorAll(".mobile-stats-grid .m-stat-card .m-stat-val"); 
    const footerStatVals = document.querySelectorAll(".schedule-footer .footer-stat .footer-value"); 

    const scheduleContainer = document.querySelector('.schedule-container');
    let jsEmptyMsg = document.getElementById('js-empty-msg');
    
    const djangoEmptyMsg = scheduleContainer ? Array.from(scheduleContainer.children).find(el => !el.classList.contains('time-slot') && el.id !== 'js-empty-msg') : null;

    if (!djangoEmptyMsg && !jsEmptyMsg && scheduleContainer) {
        jsEmptyMsg = document.createElement('div');
        jsEmptyMsg.id = 'js-empty-msg';
        jsEmptyMsg.style.cssText = "text-align: center; padding: 40px; color: #7f8c8d; display: none; background: #fff; border-radius: 12px; margin-top: 10px; border: 1px solid #edf2f7; font-weight: 600;";
        jsEmptyMsg.innerHTML = '<i class="fas fa-calendar-xmark" style="font-size: 2.5rem; margin-bottom: 10px; display: block; color: #cbd5e0;"></i>Nenhum agendamento para este barbeiro.';
        scheduleContainer.appendChild(jsEmptyMsg);
    }

    function applyFilter(selectedId) {
        let totalCount = 0; let totalRev = 0.0;
        let compCount = 0; let compRev = 0.0;
        let visualOrder = 1; let visibleSlots = 0;

        timeSlots.forEach(slot => {
            const slotBarberId = slot.getAttribute("data-barber");
            const slotStatus = slot.getAttribute("data-status"); 
            
            if (selectedId === "all" || slotBarberId === selectedId) {
                slot.style.display = ""; 
                visibleSlots++;
                
                const orderElement = slot.querySelector('.order');
                if (orderElement) orderElement.innerText = visualOrder++;
                
                let priceStr = "0";
                const priceAttr = slot.getAttribute('data-price-raw');
                if (priceAttr) {
                    priceStr = priceAttr;
                } else {
                    const priceText = slot.querySelector('.total-price');
                    if (priceText) {
                        let match = priceText.innerText.match(/R\$\s*([\d\.,]+)/);
                        if(match) priceStr = match[1];
                    }
                }
                
                const price = parseFloat(priceStr.replace(/\./g, '').replace(',', '.'));
                
                if (slotStatus !== 'cancelled') {
                    totalCount++;
                    if (!isNaN(price)) totalRev += price;
                }

                if (slotStatus === 'completed') {
                    compCount++;
                    if (!isNaN(price)) compRev += price;
                }
            } else {
                slot.style.display = "none"; 
            }
        });

        if (jsEmptyMsg && timeSlots.length > 0) {
            jsEmptyMsg.style.display = visibleSlots === 0 ? 'block' : 'none';
        }

        const formatMoney = (val) => `R$ ${val.toFixed(2).replace('.', ',')}`;

        if (desktopStatVals.length >= 2) {
            desktopStatVals[0].innerText = totalCount;
            desktopStatVals[1].innerText = formatMoney(totalRev);
        }

        if (mobileStatVals.length >= 4) {
            mobileStatVals[0].innerText = totalCount;
            mobileStatVals[1].innerText = formatMoney(totalRev);
            mobileStatVals[2].innerText = compCount;
            mobileStatVals[3].innerText = formatMoney(compRev);
        }

        footerStatVals.forEach((val, idx) => {
            if(idx % 2 === 0) val.innerText = compCount; 
            else val.innerText = formatMoney(compRev);
        });
    }

    barberCards.forEach(card => {
        card.addEventListener("click", () => {
            barberCards.forEach(c => c.classList.remove("active"));
            card.classList.add("active");
            
            if (titleName) titleName.innerText = card.querySelector(".barber-name").innerText;

            const selectedId = card.getAttribute("data-barber-id");
            sessionStorage.setItem('activeBarberId', selectedId);
            
            if(mobileSelect) mobileSelect.value = selectedId;
            
            applyFilter(selectedId);
        });
    });

    if (mobileSelect) {
        const newSelect = mobileSelect.cloneNode(true);
        mobileSelect.parentNode.replaceChild(newSelect, mobileSelect);
        
        newSelect.addEventListener('change', function() {
            const selectedId = this.value;
            sessionStorage.setItem('activeBarberId', selectedId);
            
            barberCards.forEach(c => c.classList.remove("active"));
            const targetCard = document.querySelector(`.barbers .barber-card[data-barber-id="${selectedId}"]`);
            if (targetCard) {
                targetCard.classList.add("active");
                if (titleName) titleName.innerText = targetCard.querySelector(".barber-name").innerText;
            }

            applyFilter(selectedId);
        });
    }

    const savedBarberId = sessionStorage.getItem('activeBarberId') || "all";
    const currentSelect = document.getElementById('mobileBarberSelect');
    
    if (currentSelect) currentSelect.value = savedBarberId;
    
    barberCards.forEach(c => c.classList.remove("active"));
    const initialCard = document.querySelector(`.barbers .barber-card[data-barber-id="${savedBarberId}"]`);
    if (initialCard) {
        initialCard.classList.add("active");
        if (titleName) titleName.innerText = initialCard.querySelector(".barber-name").innerText;
    }

    applyFilter(savedBarberId);
}

// ====================== GERAÇÃO DA MALHA DO BARBEIRO ======================
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

// ====================== GERAÇÃO DOS CARDS DE SERVIÇOS ======================
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
    const card = checkbox.closest('.saas-service-card') || checkbox.closest('.custom-service-card');
    if (checkbox.checked) {
        card.classList.add('selected');
    } else {
        card.classList.remove('selected');
    }
}

// ====================== GERAÇÃO DINÂMICA DE HORÁRIOS ======================
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
            slots.sort(); // Mantém em ordem cronológica
        }

        if (slots.length > 0) {
            slots.forEach(slot => {
                const isSelected = (presetTime === slot && dateStr === initialEditDate) ? 'selected' : '';
                selectEl.innerHTML += `<option value="${slot}" ${isSelected}>${slot}</option>`;
            });
            selectEl.disabled = false;
        } else {
            selectEl.innerHTML = '<option value="">S/ Horário P/ Esta Duração</option>';
            selectEl.classList.add('disabled-look');
        }
    } catch (e) { 
        console.error(e); 
        loader.style.display = 'none'; 
    }
}

// ====================== ABERTURA DO MODAL NOVO ======================
function openNewAppointmentModal() {
    const appointmentModal = document.getElementById('appointmentModalContainer');
    if (appointmentModal) {
        document.getElementById('appointmentForm').reset();
        document.getElementById('clientSearchInput').value = '';
        
        const barberGrid = document.getElementById('barberVisualGrid');
        if (barberGrid) barberGrid.innerHTML = '';
        document.getElementById('serviceCheckboxGrid').innerHTML = '';
        resetTimeSelect('appointmentTime');
        
        const unitSel = document.getElementById('unitSelect');
        const managerUnit = document.getElementById('managerUnitId');
        const hiddenBarberId = document.getElementById('hiddenBarberId');

        if (!barberGrid && hiddenBarberId && hiddenBarberId.value) {
            loadServicesCheckboxes(hiddenBarberId.value, 'serviceCheckboxGrid');
        } else if (unitSel && unitSel.value) {
            unitSel.dispatchEvent(new Event('change'));
        } else if (managerUnit && managerUnit.value) {
            loadBarbersVisual(managerUnit.value, 'barberVisualGrid', 'hiddenBarberId');
        }

        appointmentModal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
}
function closeNewAppointmentModal() {
    const appointmentModal = document.getElementById('appointmentModalContainer');
    if (appointmentModal) { appointmentModal.style.display = 'none'; document.body.style.overflow = ''; }
}

// ====================== ABERTURA DO MODAL EDITAR ======================
window.openEditAppointmentModal = async function(btn) {
    const editModal = document.getElementById('editAppointmentModalContainer');
    if (!editModal) return;

    document.getElementById('editAppointmentForm').reset();

    const id = btn.getAttribute('data-id');
    const clientId = btn.getAttribute('data-client-id');
    const clientName = btn.getAttribute('data-client-name');
    const unitId = btn.getAttribute('data-unit-id');
    const barberId = btn.getAttribute('data-barber-id');
    
    const servicesStr = btn.getAttribute('data-services');
    const preSelectedSvcIds = servicesStr ? servicesStr.split(',').map(String) : [];

    const date = btn.getAttribute('data-date');
    const time = btn.getAttribute('data-time');
    const status = btn.getAttribute('data-status');
    const notes = btn.getAttribute('data-notes');

    document.getElementById('editAppointmentId').value = id;
    
    if (clientId && clientName) {
        document.getElementById('editHiddenClientId').value = clientId;
        document.getElementById('editClientSearchInput').value = clientName;
    }

    const dateInput = document.getElementById('editAppointmentDate');
    dateInput.value = date;
    dateInput.defaultValue = date; 
    
    document.getElementById('editStatusSelect').value = status;
    document.getElementById('editAppointmentNotes').value = notes || ''; 
    document.getElementById('editHiddenBarberId').value = barberId;
    document.getElementById('originalTime').value = time;

    const payment = btn.getAttribute('data-payment');
    if (payment) document.getElementById('editPaymentSelect').value = payment;
    toggleEditPaymentField();

    const unitSelect = document.getElementById('editUnitSelect');
    if (unitSelect) unitSelect.value = unitId;

    const barberGrid = document.getElementById('editBarberVisualGrid');
    if (barberGrid) {
        await loadBarbersVisual(unitId, 'editBarberVisualGrid', 'editHiddenBarberId', barberId);
    }
    
    await loadServicesCheckboxes(barberId, 'editServiceCheckboxGrid', preSelectedSvcIds, true);
    triggerEditSlotFetch();

    editModal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
};

function closeEditModal() {
    const editModal = document.getElementById('editAppointmentModalContainer');
    if (editModal) { editModal.style.display = 'none'; document.body.style.overflow = ''; }
}

// ====================== MODAL FINALIZAR (CAIXA COM EXTRAS) ======================
async function loadExtraServicesCheckboxes(employeeId, containerId, excludeIdsArray) {
    const container = document.getElementById(containerId);
    if (!container || !employeeId || employeeId === 'null') return;
    
    container.innerHTML = '<p style="font-size:0.85rem; color:#7f8c8d; padding: 10px;"><i class="fas fa-spinner fa-spin"></i> Buscando serviços do barbeiro...</p>';
    
    try {
        const response = await fetch(`${API_SERVICES_URL}?employee_id=${employeeId}`);
        const data = await response.json();
        container.innerHTML = '';
        
        if (data.services && data.services.length > 0) {
            let renderedCards = 0;
            data.services.forEach(svc => {
                if (!excludeIdsArray.includes(svc.id.toString())) {
                    renderedCards++;
                    const iconClass = svc.icon || 'fas fa-cut';
                    const html = `
                        <label class="custom-service-card" style="padding: 10px 15px; margin-bottom: 8px;">
                            <input type="checkbox" name="extra_service_id" value="${svc.id}" data-price="${svc.price}" class="hidden-checkbox" onchange="toggleServiceCard(this); calculateFinishTotal();">
                            <div class="svc-info">
                                <span class="svc-name" style="font-size: 1rem; margin-bottom:0; font-weight:700;">${svc.name}</span>
                            </div>
                            <div class="svc-meta" style="color: #27ae60; font-weight: 800; font-size:1.1rem; margin-top:5px;">
                                + R$ ${svc.price.toFixed(2)}
                            </div>
                            <div class="svc-check-icon" style="top:5px; right:5px; font-size:1.2rem;"><i class="${iconClass}"></i></div>
                        </label>
                    `;
                    container.innerHTML += html;
                }
            });
            if(renderedCards === 0) {
                container.innerHTML = '<p style="color:#7f8c8d; font-size:0.85rem;">Todos os serviços disponíveis já foram realizados pelo cliente.</p>';
            }
        } else {
            container.innerHTML = '<p style="color:#7f8c8d; font-size:0.85rem;">Nenhum serviço extra disponível.</p>';
        }
    } catch (e) { console.error(e); }
}

function calculateFinishTotal() {
    let finalTotal = baseFinishTotal;
    const isAddingExtra = document.getElementById('addExtraServiceCheck').checked;
    
    if(isAddingExtra) {
        const extraChecks = document.querySelectorAll('#extraServiceGrid input[type="checkbox"]:checked');
        extraChecks.forEach(cb => {
            finalTotal += parseFloat(cb.getAttribute('data-price'));
        });
    }
    
    document.getElementById('fTotalPrice').textContent = `R$ ${finalTotal.toFixed(2).replace('.', ',')}`;
}

function openFinishModal(btn) {
    const finishModal = document.getElementById('finishModal');
    if (finishModal) {
        document.getElementById('finishAppointmentId').value = btn.getAttribute('data-id');
        document.getElementById('fClientName').textContent = btn.getAttribute('data-client-name');
        document.getElementById('fBarberName').textContent = btn.getAttribute('data-barber-name');
        document.getElementById('fPhone').textContent = btn.getAttribute('data-phone');
        document.getElementById('fDateTime').textContent = btn.getAttribute('data-datetime');
        
        let rawTotal = btn.getAttribute('data-total') || "0";
        baseFinishTotal = parseFloat(rawTotal.replace(',', '.'));
        calculateFinishTotal();
        
        const servicesRawStr = btn.getAttribute('data-services') || '[]';
        let servicesRaw = [];
        try {
            servicesRaw = JSON.parse(servicesRawStr);
        } catch(e) {
            console.error("Erro ao parsear os serviços", e);
        }
        
        let serviceHTML = '';
        let bookedServiceIds = [];
        
        servicesRaw.forEach(s => {
            bookedServiceIds.push(s.id.toString());
            serviceHTML += `
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 0.95rem; color: #4a5568;">
                    <span><i class="fas fa-check" style="color: #27ae60; margin-right: 5px;"></i> ${s.name}</span>
                    <span>R$ ${s.price}</span>
                </div>
            `;
        });
        document.getElementById('fServicesList').innerHTML = serviceHTML;

        const barberId = btn.getAttribute('data-barber-id');
        loadExtraServicesCheckboxes(barberId, 'extraServiceGrid', bookedServiceIds);
        
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


function toggleEditPaymentField() {
    const statusVal = document.getElementById('editStatusSelect').value;
    const paymentGroup = document.getElementById('editPaymentGroup');
    const paymentSelect = document.getElementById('editPaymentSelect');
    
    if (statusVal === 'completed') {
        paymentGroup.style.display = 'block';
        paymentSelect.setAttribute('required', 'required');
    } else {
        paymentGroup.style.display = 'none';
        paymentSelect.removeAttribute('required');
    }
}

// ====================== CONTROLE DO BOTTOM SHEET MOBILE ======================
window.openMobileSheet = function(appId, event) {
    // Evita abrir se clicar direto nos botões de ação que já existem na versão desktop
    if (event && event.target.closest('.action-btn')) return;

    const overlay = document.getElementById(`bs-overlay-${appId}`);
    const sheet = document.getElementById(`bs-sheet-${appId}`);
    if (overlay && sheet) {
        overlay.classList.add('active');
        sheet.classList.add('active');
        document.body.style.overflow = 'hidden'; // trava scroll do fundo
    }
};

window.closeMobileSheet = function(appId) {
    const overlay = document.getElementById(`bs-overlay-${appId}`);
    const sheet = document.getElementById(`bs-sheet-${appId}`);
    if (overlay && sheet) {
        overlay.classList.remove('active');
        sheet.classList.remove('active');
        document.body.style.overflow = ''; // devolve o scroll
    }
};