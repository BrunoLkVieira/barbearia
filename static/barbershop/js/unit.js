// Abrir modal de nova unidade
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

// Botão Salvar Unidade
const saveUnit = document.getElementById('saveUnit');

saveUnit.addEventListener('click', function() {
    const unitName = document.getElementById('unitName').value;
    const unitAddress = document.getElementById('unitAddress').value;
    
    if(!unitName || !unitAddress) {
        alert('Por favor, preencha todos os campos');
        return;
    }
    
    // Aqui você pode adicionar a lógica para salvar a unidade
    alert(`Unidade "${unitName}" salva com sucesso!`);
    closeUnitModal();
});

// Botões de Editar
const editButtons = document.querySelectorAll('.action-btn.edit');

editButtons.forEach(button => {
    button.addEventListener('click', function() {
        const row = this.closest('.table-row');
        const unitName = row.querySelector('.unit-name').textContent;
        
        modalTitleHeader.textContent = 'Editar Unidade';
        document.getElementById('unitName').value = unitName;
        unitModal.classList.add('active');
        document.body.style.overflow = 'hidden';
    });
});

// Botões de Excluir
const deleteButtons = document.querySelectorAll('.action-btn.delete');

deleteButtons.forEach(button => {
    button.addEventListener('click', function() {
        const row = this.closest('.table-row');
        const unitName = row.querySelector('.unit-name').textContent;
        
        if(confirm(`Tem certeza que deseja excluir a unidade "${unitName}"?`)) {
            // Aqui você pode adicionar a lógica para excluir a unidade
            alert(`Unidade "${unitName}" excluída com sucesso!`);
            row.remove();
        }
    });
});