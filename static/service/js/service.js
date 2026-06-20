document.addEventListener('DOMContentLoaded', function() {
    const unitFilter = document.getElementById('unitSelectFilter');
    if (unitFilter) {
        unitFilter.addEventListener('change', function() {
            const selectedValue = this.value;
            if (selectedValue === 'geral') {
                window.location.href = this.dataset.generalUrl;
            } else {
                const urlTemplate = this.dataset.unitUrlTemplate;
                window.location.href = urlTemplate.replace('__SLUG__', selectedValue);
            }
        });
    }

    const serviceForm = document.getElementById('serviceForm');
    if(serviceForm) {
        serviceForm.addEventListener('submit', function(e) {
            const checkedBoxes = document.querySelectorAll('.barber-checkbox:checked');
            if (checkedBoxes.length === 0) {
                e.preventDefault();
                Swal.fire({
                    title: 'Atenção',
                    text: 'Você deve vincular este serviço a pelo menos um barbeiro!',
                    icon: 'warning',
                    confirmButtonColor: '#FF7A00'
                });
            }
        });
    }
});

function filterServicesTable() {
    let input = document.getElementById('serviceSearch').value.toLowerCase();
    let rows = document.querySelectorAll('.service-row');

    rows.forEach(row => {
        let textContent = row.textContent.toLowerCase();
        if (textContent.includes(input)) {
            row.style.display = 'grid';
        } else {
            row.style.display = 'none';
        }
    });
}

const modal = document.getElementById('serviceModal');

function openModal() {
    const form = document.getElementById('serviceForm');
    if(!form) return;
    form.reset();

    document.querySelectorAll('.saas-barber-card').forEach(card => {
        card.style.display = 'flex';
        card.querySelector('input').checked = false;
    });

    document.getElementById('modalTitleText').innerText = 'Novo Serviço no Catálogo';
    document.getElementById('modalAction').value = 'create';
    document.getElementById('modalServiceId').value = '';
    document.getElementById('editUnitWarning').style.display = 'none';
    
    modal.style.display = 'flex';
}

function closeModal() {
    if(modal) modal.style.display = 'none';
}

window.onclick = e => { 
    if (e.target === modal) {
        closeModal();
    }
};

function editService(group_ids, name, price, duration, base_service_id, unit_id, employee_ids_str) {
    if(!modal) return;
    
    document.getElementById('modalTitleText').innerText = 'Sincronizar/Editar Serviço';
    document.getElementById('modalAction').value = 'update';
    document.getElementById('modalServiceId').value = group_ids; 
    document.getElementById('editUnitWarning').style.display = 'block';

    document.getElementById('serviceName').value = name;
    document.getElementById('servicePrice').value = price.replace(',', '.'); 
    document.getElementById('serviceDuration').value = duration;
    document.getElementById('baseService').value = base_service_id;

    const employeeIdsArray = employee_ids_str ? employee_ids_str.split(',') : [];

    document.querySelectorAll('.saas-barber-card').forEach(card => {
        const input = card.querySelector('input');
        
        if (card.getAttribute('data-unit-id') === unit_id) {
            card.style.display = 'flex'; 
            input.checked = employeeIdsArray.includes(input.value);
        } else {
            card.style.display = 'none'; 
            input.checked = false;
        }
    });

    modal.style.display = 'flex';
}