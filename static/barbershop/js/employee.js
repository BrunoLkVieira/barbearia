// Arquivo: static/barbershop/js/employee.js
// VERSÃO FINAL CORRIGIDA

document.addEventListener('DOMContentLoaded', function() {
    // --- SELETORES DE ELEMENTOS ---
    const modal = document.getElementById('employeeModal');
    if (!modal) {
        console.error("Elemento do modal não encontrado. Verifique o ID 'employeeModal'.");
        return;
    }
    
    const modalTitle = document.getElementById('modalTitle');
    const employeeForm = document.getElementById('employeeForm');
    const addEmployeeBtn = document.querySelector('.add-employee-btn');
    const employeeTableBody = document.querySelector('.employees-table tbody');

    // --- CONFIGURAÇÃO DA VERIFICAÇÃO ---
    if (employeeForm) {
        
        // Pega a URL e o Token do formulário no HTML
        const checkUrl = employeeForm.dataset.checkUrl;
        const csrfToken = employeeForm.querySelector('[name=csrfmiddlewaretoken]').value;

        employeeForm.addEventListener('submit', function(event) {
            
            // --- MODIFICAÇÃO: Intercepta o envio para QUALQUER ação (create ou edit) ---
            const action = employeeForm.querySelector('input[name="action"]').value;
            
            // 1. IMPEDE A PÁGINA DE RECARREGAR (garante que o modal não feche se houver erro)
            event.preventDefault(); 
            
            const formData = new FormData(employeeForm);

            // 2. Envia os dados para a sua view de validação (independente de ser create ou edit)
            fetch(checkUrl, {
                method: 'POST',
                body: formData,
                headers: { 'X-CSRFToken': csrfToken }
            })
            .then(response => response.json())
            .then(data => {
                
                if (data.is_valid) {
                    // 3. SE VÁLIDO:
                    
                    if (action === 'create' && data.user_exists) {
                        // 3a. Caso de criação onde o usuário já existe no sistema global
                        Swal.fire({
                            title: 'Usuário Encontrado!',
                            text: `O usuário ${data.user_name} já existe. Deseja adicioná-lo?`,
                            icon: 'info',
                            showCancelButton: true,
                            confirmButtonText: 'Sim, adicionar',
                            cancelButtonText: 'Cancelar',
                            confirmButtonColor: '#7066e0' // Mantendo seu padrão de cores
                        }).then((result) => {
                            if (result.isConfirmed) {
                                employeeForm.submit(); 
                            }
                        });
                    } else {
                        // 3b. Caso de edição ou criação de novo usuário
                        employeeForm.submit();
                    }

                } else {
                    // 4. SE INVÁLIDO (O SEU ALERTA "PERFEITO" - PADRONIZADO PARA AMBOS)
                    
                    let errorHtml = '<ul style="text-align: left; list-style-position: inside; padding-left: 10px;">';
                    data.errors.forEach(error => {
                        errorHtml += `<li>${error}</li>`;
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
                console.error('Erro no fetch:', error);
                Swal.fire({
                    icon: 'error',
                    title: 'Erro!',
                    text: 'Ocorreu um erro de conexão. Tente novamente.',
                    confirmButtonColor: '#7066e0'
                });
            });
        });
    }

    // --- FUNÇÕES DE CONTROLE DO MODAL ---
    
    function openEmployeeModal(employeeData = null) {
        console.log('Abrindo modal com dados:', employeeData);
        
        const cpfField = employeeForm.querySelector('#employeeCPF');
       
        // Limpa todos os checkboxes de cargo sempre que o modal abrir
        if (employeeForm) {
            employeeForm.querySelectorAll('input[name="roles"]').forEach(checkbox => {
                checkbox.checked = false;
            });
        }
        
        if (employeeData && employeeData.id) {
            // MODO EDIÇÃO
            modalTitle.innerHTML = '<i class="fas fa-user-edit"></i> Editar Funcionário';
            employeeForm.querySelector('input[name="action"]').value = 'edit';
            employeeForm.querySelector('#employeeId').value = employeeData.id;
            
            // --- MODIFICAÇÃO: BLOQUEIA O CPF NA EDIÇÃO ---
            cpfField.value = employeeData.cpf;
            cpfField.readOnly = true; 
            cpfField.style.backgroundColor = "#e9ecef"; // Visual de desabilitado
            cpfField.style.cursor = "not-allowed";

            employeeForm.querySelector('#employeeName').value = employeeData.name;
            employeeForm.querySelector('#employeeLastName').value = employeeData.lastname;
            employeeForm.querySelector('#employeeEmail').value = employeeData.email;
            employeeForm.querySelector('#employeePhone').value = employeeData.phone;
            employeeForm.querySelector('#employeeUnit').value = employeeData.unit;
            
            const serviceComm = employeeData.serviceCommission || '';
            const productComm = employeeData.productCommission || '';

            employeeForm.querySelector('#serviceCommission').value = serviceComm.toString().replace(',', '.');
            employeeForm.querySelector('#productCommission').value = productComm.toString().replace(',', '.');          
            employeeForm.querySelector('input[name="commission_percentage"]').checked = employeeData.commissionPercentage === 'true';
            employeeForm.querySelector('input[name="can_manage_cashbox"]').checked = employeeData.canCashbox === 'true';
            employeeForm.querySelector('input[name="can_register_sell"]').checked = employeeData.canSell === 'true';
            employeeForm.querySelector('input[name="can_create_appointments"]').checked = employeeData.canAppointments === 'true';
            employeeForm.querySelector('input[name="system_access"]').checked = employeeData.systemAccess === 'true';
            
            if (employeeData.roles) {
                const rolesArray = employeeData.roles.split(','); 
                rolesArray.forEach(roleValue => {
                    const checkbox = employeeForm.querySelector(`input[name="roles"][value="${roleValue.trim()}"]`);
                    if (checkbox) {
                        checkbox.checked = true;
                    }
                });
            }

        } else {
            // MODO CRIAÇÃO
            modalTitle.innerHTML = '<i class="fas fa-user-plus"></i> Novo Funcionário';
            
            // --- MODIFICAÇÃO: LIBERA O CPF NA CRIAÇÃO ---
            cpfField.readOnly = false;
            cpfField.style.backgroundColor = ""; 
            cpfField.style.cursor = "text";

            if (employeeForm) {
                employeeForm.reset();
                employeeForm.querySelector('input[name="action"]').value = 'create';
                employeeForm.querySelector('#employeeId').value = '';
            }
        }
        
        modal.style.display = 'flex';
        document.body.classList.add('modal-open');
    }

    window.openEmployeeModal = openEmployeeModal;

    // A sua função (correta) de fechar o modal
    window.closeEmployeeModal = function() {
        modal.style.display = 'none';
        document.body.classList.remove('modal-open');
    }

    if (addEmployeeBtn) {
        addEmployeeBtn.addEventListener('click', () => {
            openEmployeeModal();
        });
    }

    // Event delegation para botões de edição na tabela DESKTOP
    const desktopTable = document.querySelector('.employees-table tbody');
    if (desktopTable) {
        desktopTable.addEventListener('click', function(event) {
            const editButton = event.target.closest('.edit-btn');
            if (!editButton) return;

            const employeeData = {
                id: editButton.dataset.id,
                name: editButton.dataset.name,
                lastname: editButton.dataset.lastname,
                email: editButton.dataset.email,
                phone: editButton.dataset.phone,
                cpf: editButton.dataset.cpf,
                unit: editButton.dataset.unit,
                roles: editButton.dataset.roles,
                commissionPercentage: editButton.dataset.commissionPercentage,
                serviceCommission: editButton.dataset.serviceCommission,
                productCommission: editButton.dataset.productCommission,
                canCashbox: editButton.dataset.canCashbox,
                canSell: editButton.dataset.canSell,
                canAppointments: editButton.dataset.canAppointments,
                systemAccess: editButton.dataset.systemAccess,
            };
            
            openEmployeeModal(employeeData);
        });
    }

    // Event delegation para botões de edição na tabela MOBILE
    const mobileTable = document.querySelector('.employees-table-container');
    if (mobileTable) {
        mobileTable.addEventListener('click', function(event) {
            const editButton = event.target.closest('.edit');
            if (!editButton) return;

            const employeeData = {
                id: editButton.dataset.id,
                name: editButton.dataset.name,
                lastname: editButton.dataset.lastname,
                email: editButton.dataset.email,
                phone: editButton.dataset.phone,
                cpf: editButton.dataset.cpf,
                unit: editButton.dataset.unit,
                roles: editButton.dataset.roles,
                commissionPercentage: editButton.dataset.commissionPercentage,
                serviceCommission: editButton.dataset.serviceCommission,
                productCommission: editButton.dataset.productCommission,
                canCashbox: editButton.dataset.canCashbox,
                canSell: editButton.dataset.canSell,
                canAppointments: editButton.dataset.canAppointments,
                systemAccess: editButton.dataset.systemAccess,
            };
            
            openEmployeeModal(employeeData);
        });
    }
});

// --- RESTANTE DAS SUAS FUNÇÕES ORIGINAIS (MANTIDAS INTACTAS) ---

document.addEventListener('DOMContentLoaded', function() {
    const cpfInput = document.getElementById('employeeCPF');
    if(cpfInput) {
        cpfInput.addEventListener('input', function() {
            if (this.value.length > 11) {
                this.value = this.value.slice(0, 11);
            }
        });
    }

    const cellInput = document.getElementById('employeePhone');
    if(cellInput) {
        cellInput.addEventListener('input', function() {
            if (this.value.length > 11) {
                this.value = this.value.slice(0, 11);
            }
        });
    }

    const roleElements = document.querySelectorAll('.employee-type');
    roleElements.forEach(element => {
        const text = element.textContent.trim().toLowerCase();
        if (text.includes('barbeiro')) element.classList.add('type-barber');
        else if (text.includes('gerente')) element.classList.add('type-manager');
        else if (text.includes('caixa')) element.classList.add('type-cashier');
        else element.classList.add('type-none');
    });
});

const serviceCommissionInput = document.getElementById('serviceCommission');
if(serviceCommissionInput) {
    serviceCommissionInput.addEventListener('input', function() {
        if (this.value.length > 3) this.value = this.value.slice(0, 3);
    });
}

document.addEventListener('DOMContentLoaded', function() {
    const commissionCheckbox = document.querySelector('input[name="commission_percentage"]');
    const serviceInput = document.getElementById('serviceCommission');
    const productInput = document.getElementById('productCommission');
    
    function updateInputsState() {
        if (commissionCheckbox && serviceInput && productInput) {
            const isDisabled = !commissionCheckbox.checked;
            serviceInput.disabled = isDisabled;
            productInput.disabled = isDisabled;
        }
    }
    
    const modal = document.getElementById('employeeModal');
    if (modal) {
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.type === 'attributes' && mutation.attributeName === 'style' && modal.style.display === 'flex') {
                    updateInputsState();
                }
            });
        });
        observer.observe(modal, { attributes: true });
    }
    
    if (commissionCheckbox) commissionCheckbox.addEventListener('change', updateInputsState);
});

document.addEventListener('DOMContentLoaded', function() {
    const roleCheckboxes = document.querySelectorAll('input[name="roles"]');
    const systemAccess = document.querySelector('input[name="system_access"]');
    const canManageCashbox = document.querySelector('input[name="can_manage_cashbox"]');
    const canRegisterSell = document.querySelector('input[name="can_register_sell"]');
    const canCreateAppointments = document.querySelector('input[name="can_create_appointments"]');
    
    function updatePermissions() {
        const selectedRoles = Array.from(roleCheckboxes).filter(cb => cb.checked).map(cb => cb.value);
        
        if (selectedRoles.length === 0) {
            [systemAccess, canManageCashbox, canRegisterSell, canCreateAppointments].forEach(el => {
                el.disabled = true;
                el.checked = false;
            });
            return;
        }
        
        [systemAccess, canManageCashbox, canRegisterSell, canCreateAppointments].forEach(el => el.disabled = false);
        
        if (selectedRoles.includes('gerente')) {
            [systemAccess, canManageCashbox, canRegisterSell, canCreateAppointments].forEach(el => el.checked = true);
        } else if(selectedRoles.includes('caixa')) {
            systemAccess.checked = true;
            canManageCashbox.checked = true;
            canRegisterSell.checked = true;
            canCreateAppointments.checked = false;
        } else if(selectedRoles.includes('barbeiro')){
            [systemAccess, canManageCashbox, canRegisterSell, canCreateAppointments].forEach(el => el.checked = false);
        }
    }
    
    roleCheckboxes.forEach(checkbox => checkbox.addEventListener('change', updatePermissions));
    updatePermissions();
});