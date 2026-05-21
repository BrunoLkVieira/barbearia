document.addEventListener('DOMContentLoaded', function() {
    console.log("JS da Agenda carregado com sucesso!");
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
            let newUrl = "";
            
            if (unitSlug === "geral") {
                newUrl = URL_AGENDA_GENERAL; 
            } else {
                newUrl = URL_AGENDA_GENERAL.replace('/agenda/', `/${unitSlug}/agenda/`);
            }
            if (dateParam) {
                newUrl += `?date=${dateParam}`;
            }
            window.location.href = newUrl;
        });
    }

    const unitSelect = document.getElementById('unitSelect');
    const barberSelect = document.getElementById('barberSelect');
    const serviceSelect = document.getElementById('serviceSelect');

    if (unitSelect) {
        unitSelect.addEventListener('change', async (e) => {
            await loadBarbers(e.target.value, barberSelect, serviceSelect);
        });
    }
    if (barberSelect) {
        barberSelect.addEventListener('change', async (e) => {
            await loadServices(e.target.value, serviceSelect);
        });
    }

    const editUnitSelect = document.getElementById('editUnitSelect');
    const editBarberSelect = document.getElementById('editBarberSelect');
    const editServiceSelect = document.getElementById('editServiceSelect');

    if (editUnitSelect) {
        editUnitSelect.addEventListener('change', async (e) => {
            await loadBarbers(e.target.value, editBarberSelect, editServiceSelect);
        });
    }
    if (editBarberSelect) {
        editBarberSelect.addEventListener('change', async (e) => {
            await loadServices(e.target.value, editServiceSelect);
        });
    }
});

async function loadBarbers(unitId, barberSel, serviceSel) {
    resetSelects([barberSel, serviceSel]);
    if (!unitId) return;
    try {
        const response = await fetch(`${API_EMPLOYEES_URL}?unit_id=${unitId}`);
        const data = await response.json();
        if (data.employees && data.employees.length > 0) {
            populateSelect(barberSel, data.employees, 'Selecione um barbeiro');
            barberSel.disabled = false;
        }
    } catch (error) { console.error("Erro ao carregar barbeiros:", error); }
}

async function loadServices(employeeId, serviceSel) {
    resetSelects([serviceSel]);
    if (!employeeId) return;
    try {
        const response = await fetch(`${API_SERVICES_URL}?employee_id=${employeeId}`);
        const data = await response.json();
        if (data.services && data.services.length > 0) {
            populateSelect(serviceSel, data.services, 'Selecione um serviço');
            serviceSel.disabled = false;
        }
    } catch (error) { console.error("Erro ao carregar serviços:", error); }
}

function initBarberFilter() {
    const barberCards = document.querySelectorAll(".barber-card");
    const timeSlots = document.querySelectorAll(".time-slot");
    const titleName = document.querySelector(".agenda-barber-name");
    
    const totalCountEl = document.querySelector(".schedule-footer .footer-stat:nth-child(1) .footer-value");
    const totalRevenueEl = document.querySelector(".schedule-footer .footer-stat:nth-child(2) .footer-value");

    barberCards.forEach(card => {
        card.addEventListener("click", () => {
            barberCards.forEach(c => c.classList.remove("active"));
            card.classList.add("active");
            
            if (titleName) {
                titleName.innerText = card.querySelector(".barber-name").innerText;
            }

            const clickedBarberId = card.getAttribute("data-barber-id");
            sessionStorage.setItem('activeBarberId', clickedBarberId);

            let completedCount = 0;
            let completedRevenue = 0;
            // NOVO: Contador dinâmico visual
            let visualOrder = 1;

            timeSlots.forEach(slot => {
                const slotBarberId = slot.getAttribute("data-barber");
                const slotStatus = slot.getAttribute("data-status"); 
                
                if (clickedBarberId === "all" || slotBarberId === clickedBarberId) {
                    slot.style.display = "";
                    
                    // Atualiza o texto do ".order" dinamicamente (1, 2, 3...)
                    const orderElement = slot.querySelector('.order');
                    if (orderElement) {
                        orderElement.innerText = visualOrder++;
                    }
                    
                    if (slotStatus === 'completed') {
                        completedCount++;
                        const priceText = slot.querySelector('.detail-value[style*="color: #27ae60"]').innerText;
                        const price = parseFloat(priceText.replace('R$ ', '').replace(',', '.'));
                        completedRevenue += price;
                    }
                } else {
                    slot.style.display = "none";
                }
            });

            if (totalCountEl) totalCountEl.innerText = completedCount;
            if (totalRevenueEl) totalRevenueEl.innerText = `R$ ${completedRevenue.toFixed(2).replace('.', ',')}`;
        });
    });

    const savedBarberId = sessionStorage.getItem('activeBarberId');
    if (savedBarberId) {
        const cardToActivate = document.querySelector(`.barber-card[data-barber-id="${savedBarberId}"]`);
        if (cardToActivate) {
            cardToActivate.click(); 
        }
    }
}

const appointmentModal = document.getElementById('appointmentModalContainer');
function openNewAppointmentModal() {
    if (appointmentModal) {
        const form = document.getElementById('appointmentForm');
        if (form) form.reset();
        
        const barberSelect = document.getElementById('barberSelect');
        const serviceSelect = document.getElementById('serviceSelect');
        if(barberSelect && serviceSelect) resetSelects([barberSelect, serviceSelect]);

        appointmentModal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
}
function closeNewAppointmentModal() {
    if (appointmentModal) {
        appointmentModal.style.display = 'none';
        document.body.style.overflow = '';
    }
}

async function openEditAppointmentModal(btn) {
    const editModal = document.getElementById('editAppointmentModalContainer');
    if (!editModal) return;

    const form = document.getElementById('editAppointmentForm');
    if (form) form.reset();

    const id = btn.getAttribute('data-id');
    const clientId = btn.getAttribute('data-client');
    const unitId = btn.getAttribute('data-unit');
    const barberId = btn.getAttribute('data-barber');
    const serviceId = btn.getAttribute('data-service');
    const date = btn.getAttribute('data-date');
    const time = btn.getAttribute('data-time');
    const status = btn.getAttribute('data-status');
    const notes = btn.getAttribute('data-notes');

    document.getElementById('editAppointmentId').value = id;
    document.getElementById('editClientSelect').value = clientId;
    document.getElementById('editAppointmentDate').value = date;
    document.getElementById('editAppointmentTime').value = time;
    document.getElementById('editStatusSelect').value = status;
    document.getElementById('editAppointmentNotes').value = notes || ''; 

    const unitSelect = document.getElementById('editUnitSelect');
    const barberSelect = document.getElementById('editBarberSelect');
    const serviceSelect = document.getElementById('editServiceSelect');

    unitSelect.value = unitId;

    await loadBarbers(unitId, barberSelect, serviceSelect);
    barberSelect.value = barberId;

    await loadServices(barberId, serviceSelect);
    serviceSelect.value = serviceId;

    editModal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function closeEditModal() {
    const editModal = document.getElementById('editAppointmentModalContainer');
    if (editModal) {
        editModal.style.display = 'none';
        document.body.style.overflow = '';
    }
}

const finishModal = document.getElementById('finishModal');
function openFinishModal(appointmentId, clientName) {
    if (finishModal) {
        document.getElementById('finishAppointmentId').value = appointmentId;
        document.getElementById('finishClientName').textContent = clientName;
        finishModal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
}
function closeFinishModal() {
    if (finishModal) {
        finishModal.style.display = 'none';
        document.body.style.overflow = '';
    }
}

function resetSelects(elements) {
    elements.forEach(el => {
        el.innerHTML = '<option value="">Selecione...</option>';
        el.disabled = true;
    });
}
function populateSelect(selectEl, items, placeholder) {
    selectEl.innerHTML = `<option value="">${placeholder}</option>`;
    items.forEach(item => {
        const option = document.createElement('option');
        option.value = item.id;
        option.textContent = item.name + (item.price !== undefined ? ` - R$ ${item.price.toFixed(2)}` : '');
        selectEl.appendChild(option);
    });
}