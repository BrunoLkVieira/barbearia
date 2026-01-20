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
        document.getElementById('unitNeighborhood').value = editData.neighborhood;
        document.getElementById('unitCity').value = editData.city;
        document.getElementById('unitState').value = editData.state;
        document.getElementById('unitWhatsapp').value = editData.whatsapp;
        document.getElementById('unitInstagram').value = editData.instagram;
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

// --- BLOCO ADICIONADO PARA ACEITAR JSON E MOSTRAR ERROS CENTRALIZADOS ---
if (unitForm) {
    unitForm.addEventListener('submit', function(e) {
        e.preventDefault(); // Impede o recarregamento da página

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
                // SUCESSO: Fecha modal e mostra notificação rápida
                closeUnitModal();
                Swal.fire({
                    icon: 'success',
                    title: data.message,
                    timer: 1500,
                    showConfirmButton: false,
                    toast: true,
                    position: 'top-end'
                });
                // Recarrega para atualizar a lista de unidades
                setTimeout(() => window.location.reload(), 1500);
            } else {
                // ERRO: Mostra a lista centralizada (O modal de fundo NÃO fecha)
                let errorHtml = '<ul style="text-align: left; list-style-position: inside; padding-left: 10px;">';
                data.errors.forEach(err => {
                    errorHtml += `<li>${err}</li>`;
                });
                errorHtml += '</ul>';

                Swal.fire({
                    icon: 'error',
                    title: 'Erros Encontrados',
                    html: errorHtml,
                    confirmButtonText: 'OK',
                    confirmButtonColor: '#7066e0'
                });
            }
        })
        .catch(error => {
            console.error('Erro na requisição:', error);
            Swal.fire('Erro!', 'Ocorreu um erro de comunicação com o servidor.', 'error');
        });
    });
}
// -----------------------------------------------------------------------

// Botão Salvar Unidade
const saveUnit = document.getElementById('saveUnit');

saveUnit.addEventListener('click', function() {
    // Verificando se o formulário é válido antes de enviar
    if (unitForm.checkValidity()) {
        console.log("Formulário válido, enviando...");
        // O formulário será enviado pelo listener de 'submit' adicionado acima
    } else {
        console.log("Formulário inválido, verifique os campos.");
    }
});

// Botões de Editar
const editButtons = document.querySelectorAll('.action-btn.edit');

editButtons.forEach(button => {
    button.addEventListener('click', function() {
        const unitData = {
            id: this.dataset.id,
            name: this.dataset.name,
            cep: this.dataset.cep,
            street: this.dataset.street,
            number: this.dataset.number,
            neighborhood: this.dataset.neighborhood,
            city: this.dataset.city,
            state: this.dataset.state,
            whatsapp: this.dataset.whatsapp,
            instagram: this.dataset.instagram,
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

const cepInput = document.getElementById('unitCep');

cepInput.addEventListener('input', function() {
    // Limita o valor a 8 dígitos
    if (this.value.length > 8) {
        this.value = this.value.slice(0, 8);
    }
});