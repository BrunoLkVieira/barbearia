// Abrir modal de nova unidade
const newUnitBtn = document.getElementById('newUnitBtn');
const unitModal = document.getElementById('unitModal');
const closeModal = document.getElementById('closeModal');
const cancelUnit = document.getElementById('cancelUnit');
const modalTitleHeader = document.getElementById('modalTitleHeader');

newUnitBtn.addEventListener('click', function() {
    modalTitleHeader.textContent = 'Nova Unidade';
    document.getElementById('unitName').value = '';
    document.getElementById('unitAddress').value = '';
    unitModal.classList.add('active');
    document.body.style.overflow = 'hidden';
});

// Fechar modal
function closeUnitModal() {
    unitModal.classList.remove('active');
    document.body.style.overflow = 'auto';
}

closeModal.addEventListener('click', closeUnitModal);
cancelUnit.addEventListener('click', closeUnitModal);

// Fechar ao clicar fora do modal
unitModal.addEventListener('click', function(e) {
    if (e.target === unitModal) {
        closeUnitModal();
    }
});

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