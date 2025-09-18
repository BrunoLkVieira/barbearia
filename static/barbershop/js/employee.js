document.addEventListener('DOMContentLoaded', function() {
    
    // ================================================================
    //  COLE TODO O SEU CÓDIGO JAVASCRIPT ATUAL AQUI DENTRO
    // ================================================================

    // Funções para o modal de funcionário
    const modal = document.getElementById('employeeModal');
    // Checagem de segurança: só continua se o modal existir na página
    if (!modal) {
        console.error("Elemento do modal não encontrado. Verifique o ID 'employeeModal'.");
        return; 
    }

    const modalTitle = document.getElementById('modalTitle');
    const employeeForm = modal.querySelector('form');
    const addEmployeeBtn = document.querySelector('.add-employee-btn');
    const employeeTableBody = document.querySelector('.employees-table tbody');

    function openEmployeeModal(employeeData = null) {
        if (employeeData) {
            // --- MODO EDIÇÃO ---
            modalTitle.innerHTML = '<i class="fas fa-user-edit"></i> Editar Funcionário';
            
            employeeForm.querySelector('input[name="action"]').value = 'edit';
            employeeForm.querySelector('#employeeId').value = employeeData.id;
            employeeForm.querySelector('#employeeCPF').value = employeeData.cpf;
            employeeForm.querySelector('#employeeName').value = employeeData.name;
            employeeForm.querySelector('#employeeLastName').value = employeeData.lastname;
            employeeForm.querySelector('#employeeEmail').value = employeeData.email;
            employeeForm.querySelector('#employeePhone').value = employeeData.phone;
            employeeForm.querySelector('#employeeUnit').value = employeeData.unit;
            employeeForm.querySelector('#serviceCommission').value = employeeData.serviceCommission || '';
            employeeForm.querySelector('#productCommission').value = employeeData.productCommission || '';

            employeeForm.querySelector('input[name="commission_percentage"]').checked = employeeData.commissionPercentage === 'true';
            employeeForm.querySelector('input[name="can_manage_cashbox"]').checked = employeeData.canCashbox === 'true';
            employeeForm.querySelector('input[name="can_register_sell"]').checked = employeeData.canSell === 'true';
            employeeForm.querySelector('input[name="can_create_appointments"]').checked = employeeData.canAppointments === 'true';
            employeeForm.querySelector('input[name="system_access"]').checked = employeeData.systemAccess === 'true';

        } else {
            // --- MODO CRIAÇÃO ---
            modalTitle.innerHTML = '<i class="fas fa-user-plus"></i> Novo Funcionário';
            employeeForm.reset();
            employeeForm.querySelector('input[name="action"]').value = 'create';
            employeeForm.querySelector('#employeeId').value = '';
        }

        modal.style.display = 'flex';
        document.body.classList.add('modal-open');
    }

    function closeEmployeeModal() {
        modal.style.display = 'none';
        document.body.classList.remove('modal-open');
    }

    // --- LÓGICA DE EVENTOS ---

    // Botão "Novo Funcionário"
    if (addEmployeeBtn) {
        addEmployeeBtn.addEventListener('click', () => {
            openEmployeeModal();
        });
    }

    // Botões de Edição (usando delegação de eventos)
    if (employeeTableBody) {
        employeeTableBody.addEventListener('click', function(event) {
            const editButton = event.target.closest('.edit-btn');
            if (!editButton) return;

            const employeeData = {
                id: editButton.dataset.id,
                name: editButton.dataset.name,
                lastname: editButton.dataset.lastname,
                email: editButton.dataset.email,
                phone: editButton.dataset.phone,
                cpf: editButton.dataset.cpf,
                active: editButton.dataset.active,
                unit: editButton.dataset.unit,
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

    // Botões de fechar o modal
    const closeButton = modal.querySelector('.close-btn');
    if(closeButton) {
        // Seu HTML tem um onclick="", mas vamos garantir que funcione
        closeButton.addEventListener('click', closeEmployeeModal);
    }
    
    const cancelButton = modal.querySelector('.btn-outline');
    if(cancelButton) {
        // Seu HTML também tem um onclick="", garantindo aqui
        cancelButton.addEventListener('click', closeEmployeeModal);
    }

    // Fechar modal ao clicar fora
    window.addEventListener('click', function(event) {
        if (event.target === modal) {
            closeEmployeeModal();
        }
    });

    // O resto do seu JS (máscara de telefone, delete, etc.) pode continuar aqui...
    // ...

}); // <-- NÃO ESQUEÇA DE FECHAR O EVENT LISTENER