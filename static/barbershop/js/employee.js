// Arquivo: static/barbershop/js/employee.js
// VERSÃO CORRIGIDA

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
    // Removi a lógica de verificação AJAX para simplificar, já que a validação principal está na view.
    // O formulário agora será enviado diretamente.
    if (employeeForm) {
        employeeForm.addEventListener('submit', function(event) {
            // Este listener agora apenas permite o envio. A validação real está na view.
            // Se você tinha uma view AJAX /check-employee-data/, pode restaurar a lógica anterior.
            // Mas para o problema de salvar, a view principal é o que importa.
        });
    }

    // --- FUNÇÕES DE CONTROLE DO MODAL ---
    
    function openEmployeeModal(employeeData = null) {
        // Limpa todos os checkboxes de cargo sempre que o modal abrir.
        employeeForm.querySelectorAll('input[name="roles"]').forEach(checkbox => {
            checkbox.checked = false;
        });
        
        if (employeeData) {
            // MODO EDIÇÃO
            modalTitle.innerHTML = '<i class="fas fa-user-edit"></i> Editar Funcionário';
            employeeForm.querySelector('input[name="action"]').value = 'edit';
            employeeForm.querySelector('#employeeId').value = employeeData.id;
            employeeForm.querySelector('#employeeCPF').value = employeeData.cpf;
            employeeForm.querySelector('#employeeName').value = employeeData.name;
            employeeForm.querySelector('#employeeLastName').value = employeeData.lastname;
            employeeForm.querySelector('#employeeEmail').value = employeeData.email;
            employeeForm.querySelector('#employeePhone').value = employeeData.phone;
            employeeForm.querySelector('#employeeUnit').value = employeeData.unit;
            
            const serviceComm = employeeData.serviceCommission || '';
            const productComm = employeeData.productCommission || '';

            // Preenche comissões e permissões
            employeeForm.querySelector('#serviceCommission').value = serviceComm.toString().replace(',', '.');
            employeeForm.querySelector('#productCommission').value = productComm.toString().replace(',', '.');           
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
            employeeForm.reset(); // Limpa todos os campos
            employeeForm.querySelector('input[name="action"]').value = 'create';
            employeeForm.querySelector('#employeeId').value = '';
        }
        modal.style.display = 'flex';
        document.body.classList.add('modal-open');
    }

    window.closeEmployeeModal = function() {
        modal.style.display = 'none';
        document.body.classList.remove('modal-open');
    }

    if (addEmployeeBtn) {
        addEmployeeBtn.addEventListener('click', () => {
            openEmployeeModal();
        });
    }

    if (employeeTableBody) {
        employeeTableBody.addEventListener('click', function(event) {
            const editButton = event.target.closest('.edit-btn');
            if (!editButton) return;

            // ---> PONTO CRÍTICO CORRIGIDO <---
            // Monta o objeto com os nomes EXATOS (camelCase) que correspondem aos data-atributos.
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


// Funções auxiliares no final (sem alterações)
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