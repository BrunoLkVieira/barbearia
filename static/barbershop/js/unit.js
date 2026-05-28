const newUnitBtn = document.getElementById('newUnitBtn');
const unitModal = document.getElementById('unitModal');
const closeModal = document.getElementById('closeModal');
const cancelUnit = document.getElementById('cancelUnit');
const modalTitleHeader = document.getElementById('modalTitleHeader');
const unitForm = document.getElementById('unitForm');
const limitBanner = document.getElementById('limitWarningBanner');
const saveUnitBtn = document.getElementById('saveUnit');

function openUnitModal(editData = null) {
    if (editData) {
        modalTitleHeader.textContent = 'Editar Unidade';
        document.getElementById('unitId').value = editData.id;
        document.getElementById('unitName').value = editData.name;
        document.getElementById('unitCep').value = editData.cep;
        document.getElementById('unitStreet').value = editData.street;
        document.getElementById('unitNumber').value = editData.number;
        document.getElementById('unitNeighborhood').value = editData.neighborhood;
        document.getElementById('unitCity').value = editData.city;
        document.getElementById('unitState').value = editData.state;
        document.getElementById('unitWhatsapp').value = editData.whatsapp;
        document.getElementById('unitInstagram').value = editData.instagram;
        document.getElementById('unitActive').value = editData.active;
        document.getElementById('formAction').value = "edit";
        
        limitBanner.style.display = 'none';
        saveUnitBtn.disabled = false;
        saveUnitBtn.style.opacity = "1";
        saveUnitBtn.style.cursor = "pointer";
    } else {
        modalTitleHeader.textContent = 'Nova Unidade';
        unitForm.reset();
        document.getElementById('unitId').value = "";
        document.getElementById('formAction').value = "create";
        
        // Trava Visual UI - Limite de Unidades
        if(newUnitBtn) {
            const consumed = parseInt(newUnitBtn.dataset.consumed);
            const max = parseInt(newUnitBtn.dataset.max);
            if (consumed >= max) {
                limitBanner.style.display = 'block';
                saveUnitBtn.disabled = true;
                saveUnitBtn.style.opacity = "0.5";
                saveUnitBtn.style.cursor = "not-allowed";
            } else { 
                limitBanner.style.display = 'none'; 
                saveUnitBtn.disabled = false;
                saveUnitBtn.style.opacity = "1";
                saveUnitBtn.style.cursor = "pointer";
            }
        }
    }

    unitModal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

if(newUnitBtn) newUnitBtn.addEventListener('click', () => openUnitModal());

function closeUnitModal() {
    unitModal.classList.remove('active');
    document.body.style.overflow = 'auto';
}

if(closeModal) closeModal.addEventListener('click', closeUnitModal);
if(cancelUnit) cancelUnit.addEventListener('click', closeUnitModal);


if (unitForm) {
    unitForm.addEventListener('submit', function(e) {
        e.preventDefault(); 
        const formData = new FormData(this);
        const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]').value;

        fetch(window.location.href, {
            method: 'POST',
            body: formData,
            headers: { 'X-CSRFToken': csrfToken }
        })
        .then(response => response.json())
        .then(data => {
            if (data.is_valid) {
                closeUnitModal();
                Swal.fire({ icon: 'success', title: data.message, timer: 1500, showConfirmButton: false, toast: true, position: 'top-end' });
                setTimeout(() => window.location.reload(), 1500);
            } else {
                let errorHtml = '<ul style="text-align: left; list-style-position: inside; padding-left: 10px;">';
                data.errors.forEach(err => { errorHtml += `<li>${err}</li>`; });
                errorHtml += '</ul>';

                Swal.fire({ icon: 'error', title: 'Ação Bloqueada', html: errorHtml, confirmButtonText: 'Entendi', confirmButtonColor: '#c53030' });
            }
        })
        .catch(error => {
            console.error('Erro na requisição:', error);
            Swal.fire('Erro!', 'Ocorreu um erro de comunicação com o servidor.', 'error');
        });
    });
}

const editButtons = document.querySelectorAll('.action-btn.edit');
editButtons.forEach(button => {
    button.addEventListener('click', function() {
        const unitData = {
            id: this.dataset.id, name: this.dataset.name, cep: this.dataset.cep, street: this.dataset.street,
            number: this.dataset.number, neighborhood: this.dataset.neighborhood, city: this.dataset.city,
            state: this.dataset.state, whatsapp: this.dataset.whatsapp, instagram: this.dataset.instagram, active: this.dataset.active
        };
        openUnitModal(unitData);
    });
});

const cepInput = document.getElementById('unitCep');
if(cepInput) {
    cepInput.addEventListener('input', function() {
        if (this.value.length > 8) this.value = this.value.slice(0, 8);
    });
}