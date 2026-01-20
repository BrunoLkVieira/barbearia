// Arquivo: static/barbershop/js/employee.js
// VERSÃO FINAL CORRIGIDA COM CURSOR DE BLOQUEIO

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
    const unitField = document.getElementById('employeeUnit');
    const unitFilter = document.getElementById('unitFilterSelect');

    // Função para impedir a abertura do select mantendo o cursor ativo
    function preventSelectClick(e) {
        e.preventDefault();
        this.blur();
        return false;
    }

    // --- CONFIGURAÇÃO DA VERIFICAÇÃO ---
    if (employeeForm) {
        const checkUrl = employeeForm.dataset.checkUrl;
        const csrfToken = employeeForm.querySelector('[name=csrfmiddlewaretoken]').value;

        employeeForm.addEventListener('submit', function(event) {
            const action = employeeForm.querySelector('input[name="action"]').value;
            event.preventDefault(); 
            
            const formData = new FormData(employeeForm);

            fetch(checkUrl, {
                method: 'POST',
                body: formData,
                headers: { 'X-CSRFToken': csrfToken }
            })
            .then(response => response.json())
            .then(data => {
                if (data.is_valid) {
                    if (action === 'create' && data.user_exists) {
                        Swal.fire({
                            title: 'Usuário Encontrado!',
                            text: `O usuário ${data.user_name} já existe. Deseja adicioná-lo?`,
                            icon: 'info',
                            showCancelButton: true,
                            confirmButtonText: 'Sim, adicionar',
                            cancelButtonText: 'Cancelar',
                            confirmButtonColor: '#7066e0'
                        }).then((result) => {
                            if (result.isConfirmed) {
                                employeeForm.submit(); 
                            }
                        });
                    } else {
                        employeeForm.submit();
                    }
                } else {
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
        const cpfField = employeeForm.querySelector('#employeeCPF');
       
        // Reset de interações da unidade (limpa travas anteriores)
        unitField.removeEventListener('mousedown', preventSelectClick);
        unitField.style.backgroundColor = "";
        unitField.style.cursor = "default";

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
            
            cpfField.value = employeeData.cpf;
            cpfField.readOnly = true; 
            cpfField.style.backgroundColor = "#e9ecef"; 
            cpfField.style.cursor = "not-allowed";

            employeeForm.querySelector('#employeeName').value = employeeData.name;
            employeeForm.querySelector('#employeeLastName').value = employeeData.lastname;
            employeeForm.querySelector('#employeeEmail').value = employeeData.email;
            employeeForm.querySelector('#employeePhone').value = employeeData.phone;
            unitField.value = employeeData.unit;
            
            // Preenchimento de comissão e roles permanece igual...
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
                    if (checkbox) checkbox.checked = true;
                });
            }

        } else {
            // MODO CRIAÇÃO
            modalTitle.innerHTML = '<i class="fas fa-user-plus"></i> Novo Funcionário';
            cpfField.readOnly = false;
            cpfField.style.backgroundColor = ""; 
            cpfField.style.cursor = "text";

            if (employeeForm) {
                employeeForm.reset();
                employeeForm.querySelector('input[name="action"]').value = 'create';
                employeeForm.querySelector('#employeeId').value = '';

                // --- LÓGICA DE TRAVA COM CURSOR DE BLOQUEIO ---
                if (unitFilter && unitFilter.value !== 'geral') {
                    const selectedOption = unitFilter.options[unitFilter.selectedIndex];
                    const filteredUnitId = selectedOption.dataset.unitId;

                    if (filteredUnitId) {
                        unitField.value = filteredUnitId;
                        unitField.style.backgroundColor = "#e9ecef"; 
                        unitField.style.cursor = "not-allowed";
                        // Intercepta o clique para não abrir a lista, mas mantém o cursor ativo
                        unitField.addEventListener('mousedown', preventSelectClick);
                    }
                }
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

    if (addEmployeeBtn) {
        addEmployeeBtn.addEventListener('click', () => openEmployeeModal());
    }

    const tableSelectors = ['.employees-table tbody', '.employees-table-container'];
    tableSelectors.forEach(selector => {
        const el = document.querySelector(selector);
        if (el) {
            el.addEventListener('click', function(e) {
                const btn = e.target.closest('.edit-btn') || e.target.closest('.edit');
                if (btn) openEmployeeModal({...btn.dataset});
            });
        }
    });
});

// --- VALIDAÇÕES DE INPUT (MANTIDAS INTACTAS) ---

document.addEventListener('DOMContentLoaded', function() {
    const cpfInput = document.getElementById('employeeCPF');
    if(cpfInput) {
        cpfInput.addEventListener('input', function() {
            if (this.value.length > 11) this.value = this.value.slice(0, 11);
        });
    }

    const cellInput = document.getElementById('employeePhone');
    if(cellInput) {
        cellInput.addEventListener('input', function() {
            if (this.value.length > 11) this.value = this.value.slice(0, 11);
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