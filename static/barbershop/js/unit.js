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
    // Verificando se o formulário é válido antes de enviar
    if (unitForm.checkValidity()) {
        console.log("Formulário válido, enviando...");
        // O formulário será enviado pelo clique no botão type="submit" no HTML
    } else {
        console.log("Formulário inválido, verifique os campos.");
    }
});

// Botões de Editar
const editButtons = document.querySelectorAll('.action-btn.edit');

editButtons.forEach(button => {
    button.addEventListener('click', function() {
        // 'this' é o botão que foi clicado
        const unitData = {
            id: this.dataset.id,
            name: this.dataset.name,
            cep: this.dataset.cep,
            street: this.dataset.street,
            number: this.dataset.number,
            active: this.dataset.active
        };
        
        // Chama a função principal do modal com os dados para edição
        openUnitModal(unitData);
    });
});
// Botões de Excluir
const deleteButtons = document.querySelectorAll('.action-btn.delete');

deleteButtons.forEach(button => {
    button.addEventListener('click', function() {
        const row = this.closest('.table-row');
        const unitName = row.querySelector('.unit-name').textContent;
        
       
    });
});