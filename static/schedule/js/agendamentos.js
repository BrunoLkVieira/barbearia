document.addEventListener('DOMContentLoaded', function() {
    // 1. Redirecionamento da Unidade Global
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

    // 2. Eventos do Modal de Edição (Cascata)
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

function changePage(pageNum) {
    document.getElementById('pageInput').value = pageNum;
    document.getElementById('filterForm').submit();
}

async function loadBarbers(unitId, barberSel, serviceSel) {
    if (!barberSel) return;
    resetSelects([barberSel]);
    if (serviceSel) resetSelects([serviceSel]);
    
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
    if (!serviceSel) return;
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
    
    const clientSelect = document.getElementById('editClientSelect');
    if(clientSelect) clientSelect.value = clientId;
    
    const hiddenClient = document.getElementById('hiddenClientId');
    if(hiddenClient) hiddenClient.value = clientId;

    document.getElementById('editAppointmentDate').value = date;
    document.getElementById('editAppointmentTime').value = time;
    document.getElementById('editStatusSelect').value = status;
    document.getElementById('editAppointmentNotes').value = notes || ''; 

    const unitSelect = document.getElementById('editUnitSelect');
    const barberSelect = document.getElementById('editBarberSelect');
    const serviceSelect = document.getElementById('editServiceSelect');

    // MÁGICA: Proteção contra null para os cargos que não tem o input no HTML
    if (unitSelect) {
        unitSelect.value = unitId;
    }
    
    if (barberSelect) {
        await loadBarbers(unitId, barberSelect, serviceSelect);
        barberSelect.value = barberId;
        
        await loadServices(barberId, serviceSelect);
        if(serviceSelect) serviceSelect.value = serviceId;
    } else if (serviceSelect) {
        // Se for o barbeiro comum, a lista de serviços já veio do HTML, é só selecionar
        serviceSelect.value = serviceId;
    }

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

function resetSelects(elements) {
    elements.forEach(el => {
        if(el) {
            el.innerHTML = '<option value="">Selecione...</option>';
            el.disabled = true;
        }
    });
}

function populateSelect(selectEl, items, placeholder) {
    if(!selectEl) return;
    selectEl.innerHTML = `<option value="">${placeholder}</option>`;
    items.forEach(item => {
        const option = document.createElement('option');
        option.value = item.id;
        option.textContent = item.name + (item.price !== undefined ? ` - R$ ${item.price.toFixed(2)}` : '');
        selectEl.appendChild(option);
    });
}