// Arquivo: static/barbershop/js/employee.js - VERSÃO CORRIGIDA

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

    // --- FUNÇÕES DE CONTROLE DO MODAL ---
    
    function openEmployeeModal(employeeData = null) {
        console.log('Abrindo modal com dados:', employeeData);
        
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
            employeeForm.querySelector('#employeeCPF').value = employeeData.cpf || '';
            employeeForm.querySelector('#employeeName').value = employeeData.name || '';
            employeeForm.querySelector('#employeeLastName').value = employeeData.lastname || '';
            employeeForm.querySelector('#employeeEmail').value = employeeData.email || '';
            employeeForm.querySelector('#employeePhone').value = employeeData.phone || '';
            employeeForm.querySelector('#employeeUnit').value = employeeData.unit || '';
            
            // Preenche comissões e permissões
            employeeForm.querySelector('#serviceCommission').value = employeeData.serviceCommission || '';
            employeeForm.querySelector('#productCommission').value = employeeData.productCommission || '';
            
            employeeForm.querySelector('input[name="commission_percentage"]').checked = employeeData.commissionPercentage === 'true';
            employeeForm.querySelector('input[name="can_manage_cashbox"]').checked = employeeData.canCashbox === 'true';
            employeeForm.querySelector('input[name="can_register_sell"]').checked = employeeData.canSell === 'true';
            employeeForm.querySelector('input[name="can_create_appointments"]').checked = employeeData.canAppointments === 'true';
            employeeForm.querySelector('input[name="system_access"]').checked = employeeData.systemAccess === 'true';
            
            // Preenche os cargos (roles)
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

    window.closeEmployeeModal = function() {
        modal.style.display = 'none';
        document.body.classList.remove('modal-open');
    }

    // Botão "Adicionar Funcionário"
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
            
            console.log('Dados do funcionário (desktop):', employeeData);
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
            
            console.log('Dados do funcionário (mobile):', employeeData);
            openEmployeeModal(employeeData);
        });
    }
});

// Funções auxiliares para validação de inputs
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

    // Estilizar cada cargo
    const roleElements = document.querySelectorAll('.employee-type');
    
    roleElements.forEach(element => {
        const text = element.textContent.trim().toLowerCase();
        
        if (text.includes('barbeiro')) {
            element.classList.add('type-barber');
        } else if (text.includes('gerente')) {
            element.classList.add('type-manager');
        } else if (text.includes('caixa')) {
            element.classList.add('type-cashier');
        } else {
            element.classList.add('type-none');
        }
    });
});

// nao liberar escrever sem o checkbox ligado
const serviceCommission = document.getElementById('serviceCommission');
if(serviceCommission) {
    serviceCommission.addEventListener('input', function() {
        if (this.value.length > 3) {
            this.value = this.value.slice(0, 3);
        }
    });
}

document.addEventListener('DOMContentLoaded', function() {
    const commissionCheckbox = document.querySelector('input[name="commission_percentage"]');
    const serviceInput = document.getElementById('serviceCommission');
    const productInput = document.getElementById('productCommission');
    
    function updateInputsState() {
        if (commissionCheckbox && serviceInput && productInput) {
            if (commissionCheckbox.checked) {
                serviceInput.disabled = false;
                productInput.disabled = false;
            } else {
                serviceInput.disabled = true;
                productInput.disabled = true;
            }
        }
    }
    
    const modal = document.getElementById('employeeModal');
    if (modal) {
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                    if (modal.style.display === 'flex') {
                        updateInputsState();
                    }
                }
            });
        });
        observer.observe(modal, { attributes: true });
    }
    
    if (commissionCheckbox) {
        commissionCheckbox.addEventListener('change', updateInputsState);
    }
});

// Regra de negocio de cargos
document.addEventListener('DOMContentLoaded', function() {
    // Seleciona todos os checkboxes de cargo
    const roleCheckboxes = document.querySelectorAll('input[name="roles"]');
    const systemAccess = document.querySelector('input[name="system_access"]');
    const canManageCashbox = document.querySelector('input[name="can_manage_cashbox"]');
    const canRegisterSell = document.querySelector('input[name="can_register_sell"]');
    const canCreateAppointments = document.querySelector('input[name="can_create_appointments"]');
    
    // Função para atualizar as permissões baseadas nos cargos selecionados
    function updatePermissions() {
        // Verifica quais cargos estão selecionados
        const selectedRoles = Array.from(roleCheckboxes)
            .filter(checkbox => checkbox.checked)
            .map(checkbox => checkbox.value);
        
        // Se nenhum cargo estiver selecionado, desabilita tudo
        if (selectedRoles.length === 0) {
            systemAccess.disabled = true;
            canManageCashbox.disabled = true;
            canRegisterSell.disabled = true;
            canCreateAppointments.disabled = true;
            
            systemAccess.checked = false;
            canManageCashbox.checked = false;
            canRegisterSell.checked = false;
            canCreateAppointments.checked = false;
            return;
        }
        
        // Habilita todos os checkboxes de permissão se algum cargo estiver selecionado
        systemAccess.disabled = false;
        canManageCashbox.disabled = false;
        canRegisterSell.disabled = false;
        canCreateAppointments.disabled = false;
        
        // Aplica as regras específicas para cada cargo
        if (selectedRoles.includes('gerente')) {
            systemAccess.checked = true;
            canManageCashbox.checked = true;
            canRegisterSell.checked = true;
            canCreateAppointments.checked = true;
        }
        
        else if(selectedRoles.includes('caixa')) {
            systemAccess.checked = true;
            canManageCashbox.checked = true;
            canRegisterSell.checked = true;
            canCreateAppointments.checked = false;
        }
        else if(selectedRoles.includes('barbeiro')){
            systemAccess.checked = false;
            canManageCashbox.checked = false;
            canRegisterSell.checked = false;
            canCreateAppointments.checked = false;
        }
    }
    
    roleCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', updatePermissions);
    });
    
    // Executa uma vez ao carregar para definir o estado inicial
    updatePermissions();
});