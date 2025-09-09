// Abrir modal de Nova Unidade
const newUnitBtn = document.getElementById('newUnitBtn');
const unitModal = document.getElementById('unitModal');
const closeModal = document.getElementById('closeModal');
const cancelUnit = document.getElementById('cancelUnit');
const modalTitleHeader = document.getElementById('modalTitleHeader');
const unitForm = document.getElementById('unitForm');

function openUnitModal(editData = null) {
    if (editData) {
        modalTitleHeader.textContent = 'Editar Unidade';
        document.getElementById('unitId').value = editData.id;
        document.getElementById('unitName').value = editData.name;
        document.getElementById('unitCep').value = editData.cep;
        document.getElementById('unitStreet').value = editData.street;
        document.getElementById('unitNumber').value = editData.number;
        document.getElementById('unitActive').value = editData.active;
        document.getElementById('formAction').value = "edit";
    } else {
        modalTitleHeader.textContent = 'Nova Unidade';
        unitForm.reset();
        document.getElementById('unitId').value = "";
        document.getElementById('formAction').value = "create";
    }

    unitModal.classList.add('active');
    document.body.style.overflow = 'hidden';
}
newUnitBtn.addEventListener('click', () => openUnitModal());

// Fechar modal
function closeUnitModal() {
    unitModal.classList.remove('active');
    document.body.style.overflow = 'auto';
}
closeModal.addEventListener('click', closeUnitModal);
cancelUnit.addEventListener('click', closeUnitModal);

unitModal.addEventListener('click', (e) => {
    if (e.target === unitModal) closeUnitModal();
});

// Botões de Editar
document.querySelectorAll('.action-btn.edit').forEach(button => {
    button.addEventListener('click', function() {
        const row = this.closest('.table-row');
        const editData = {
            id: row.dataset.id,
            name: row.querySelector('.unit-name').textContent.trim(),
            cep: row.dataset.cep,
            street: row.dataset.street,
            number: row.dataset.number,
            active: row.dataset.active
        };
        openUnitModal(editData);
    });
});
