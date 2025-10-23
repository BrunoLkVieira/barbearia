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
            
            // Vamos interceptar o envio APENAS se for uma "criação"
            const action = employeeForm.querySelector('input[name="action"]').value;
            
            if (action === 'create') {
                
                // 1. IMPEDE A PÁGINA DE RECARREGAR (e fechar o modal)
                event.preventDefault(); 
                
                const formData = new FormData(employeeForm);

                // 2. Envia os dados do formulário para a sua view de validação
                fetch(checkUrl, {
                    method: 'POST',
                    body: formData,
                    headers: { 'X-CSRFToken': csrfToken }
                })
                .then(response => response.json())
                .then(data => {
                    
                    if (data.is_valid) {
                        // 3. SE VÁLIDO:
                        
                        if (data.user_exists) {
                            // 3a. Usuário já existe, pede confirmação
                            Swal.fire({
                                title: 'Usuário Encontrado!',
                                text: `O usuário ${data.user_name} já existe. Deseja adicioná-lo?`,
                                icon: 'info',
                                showCancelButton: true,
                                confirmButtonText: 'Sim, adicionar',
                                cancelButtonText: 'Cancelar'
                            }).then((result) => {
                                if (result.isConfirmed) {
                                    // Se confirmar, envia o formulário de verdade
                                    employeeForm.submit(); 
                                }
                            });
                        } else {
                            // 3b. Usuário novo, envia o formulário de verdade
                            employeeForm.submit();
                        }

                    } else {
                        // 4. SE INVÁLIDO (O SEU ALERTA "PERFEITO")
                        
                        // Formata a lista de erros
                        let errorHtml = '<ul style="text-align: left; list-style-position: inside; padding-left: 10px;">';
                        data.errors.forEach(error => {
                            errorHtml += `<li>${error}</li>`;
                        });
                        errorHtml += '</ul>';

                        // Mostra o alerta "perfeito":
                        // - Centralizado
                        // - Sem temporizador
                        // - Listando os erros
                        // - E O MODAL NÃO FECHA!
                        Swal.fire({
                            icon: 'error',
                            title: 'Erros Encontrados',
                            html: errorHtml,
                            confirmButtonText: 'OK'
                        });
                    }
                })
                .catch(error => {
                    console.error('Erro no fetch:', error);
                    Swal.fire('Erro!', 'Ocorreu um erro de conexão. Tente novamente.', 'error');
                });
            }
            
            // Se a 'action' for 'edit', este script não faz nada
            // e deixa o formulário ser enviado normalmente.
        });
    }

    // --- FUNÇÕES DE CONTROLE DO MODAL ---
    
    // A sua função (correta) de abrir o modal
    function openEmployeeModal(employeeData = null) {
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
            employeeForm.reset(); 
            employeeForm.querySelector('input[name="action"]').value = 'create';
            employeeForm.querySelector('#employeeId').value = '';
        }
        modal.style.display = 'flex';
        document.body.classList.add('modal-open');
    }

    // A sua função (correta) de fechar o modal
    window.closeEmployeeModal = function() {
        modal.style.display = 'none';
        document.body.classList.remove('modal-open');
    }

    // O seu código (correto) para os botões
    if (addEmployeeBtn) {
        addEmployeeBtn.addEventListener('click', () => {
            openEmployeeModal();
        });
    }

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

// Funções auxiliares (corretas)
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