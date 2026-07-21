const newUnitBtn = document.getElementById('newUnitBtn');
const unitModal = document.getElementById('unitModal');
const closeModal = document.getElementById('closeModal');
const cancelUnit = document.getElementById('cancelUnit');
const modalTitleHeader = document.getElementById('modalTitleHeader');
const unitForm = document.getElementById('unitForm');
const saveUnitBtn = document.getElementById('saveUnit');

// 1. TRAVA VISUAL DE LIMITE DE SAAS NO CARREGAMENTO
if (newUnitBtn) {
    const consumed = parseInt(newUnitBtn.dataset.consumed);
    const max = parseInt(newUnitBtn.dataset.max);
    if (consumed >= max) {
        newUnitBtn.classList.add('disabled-limit');
        newUnitBtn.title = `Limite atingido! Máximo de ${max} unidade(s) no plano.`;
    }
}

// 2. CONTROLE DE ABERTURA DO MODAL (Com Trava Funcional)
if (newUnitBtn) {
    newUnitBtn.addEventListener('click', (e) => {
        const consumed = parseInt(newUnitBtn.dataset.consumed);
        const max = parseInt(newUnitBtn.dataset.max);
        
        // Bloqueia e avisa via SweetAlert sem abrir o Modal
        if (consumed >= max) {
            e.preventDefault();
            e.stopPropagation();
            Swal.fire({
                icon: 'warning',
                title: 'Limite Atingido',
                text: `Seu plano atual permite gerenciar até ${max} filial(is). Faça um upgrade para expandir a barbearia.`,
                confirmButtonColor: '#FF7A00'
            });
        } else {
            openUnitModal(); // Abre normalmente se tiver vaga
        }
    });
}

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

function closeUnitModal() {
    unitModal.classList.remove('active');
    document.body.style.overflow = 'auto';
}

if(closeModal) closeModal.addEventListener('click', closeUnitModal);
if(cancelUnit) cancelUnit.addEventListener('click', closeUnitModal);

// 3. SUBMISSÃO DO FORMULÁRIO (Fetch)
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

// 4. INTEGRAÇÃO VIACEP E MÁSCARA INTELIGENTE (Corrigida com Regex Dinâmica)
const cepInput = document.getElementById('unitCep');
if (cepInput) {
    cepInput.addEventListener('input', function(e) {
        let value = e.target.value.replace(/\D/g, ''); // Mantém apenas números puros
        if (value.length > 8) value = value.slice(0, 8); // Trava limite lógico de 8 números
        
        // Aplica o hífen sem bloquear a digitação em tempo real
        if (value.length > 5) {
            value = value.replace(/^(\d{5})(\d{1,3})/, '$1-$2'); 
        }
        
        e.target.value = value; 
    });

    cepInput.addEventListener('blur', async function() {
        const cepClean = this.value.replace(/\D/g, ''); // Envia limpo pra API
        if (cepClean.length === 8) {
            try {
                const response = await fetch(`https://viacep.com.br/ws/${cepClean}/json/`);
                const data = await response.json();
                
                if (!data.erro) {
                    document.getElementById('unitStreet').value = data.logradouro || '';
                    document.getElementById('unitNeighborhood').value = data.bairro || '';
                    document.getElementById('unitCity').value = data.localidade || '';
                    document.getElementById('unitState').value = data.uf || '';
                    
                    document.getElementById('unitNumber').focus();
                } else {
                    console.warn("ViaCEP: CEP não encontrado na base.");
                }
            } catch (error) {
                console.error("ViaCEP Falha de comunicação:", error);
            }
        }
    });
}