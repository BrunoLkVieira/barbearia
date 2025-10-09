// Arquivo: static/barbershop/js/employee.js
// VERSÃO FINAL - Valida tanto na criação quanto na edição

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
    const checkEmployeeUrl = '/check-employee-data/';

    // Função padrão para pegar o CSRF Token do Django
    function getCookie(name) {
        let cookieValue = null;
        if (document.cookie && document.cookie !== '') {
            const cookies = document.cookie.split(';');
            for (let i = 0; i < cookies.length; i++) {
                const cookie = cookies[i].trim();
                if (cookie.substring(0, name.length + 1) === (name + '=')) {
                    cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                    break;
                }
            }
        }
        return cookieValue;
    }
    const csrftoken = getCookie('csrftoken');


    // --- LÓGICA PRINCIPAL DO FORMULÁRIO ---
    if (employeeForm) {
        employeeForm.addEventListener('submit', function(event) {
            // Impede o envio padrão para que possamos fazer a validação primeiro
            event.preventDefault();

            const formData = new FormData(employeeForm);
            const action = formData.get('action'); // Pega a ação ('create' ou 'edit')

            fetch(checkEmployeeUrl, {
                    method: 'POST',
                    headers: { 'X-CSRFToken': csrftoken },
                    body: formData
                })
                .then(response => response.json())
                .then(data => {
                    if (!data.is_valid) {
                        // CASO 1: A VIEW RETORNOU ERROS DE VALIDAÇÃO
                        // Mostra todos os erros em um único pop-up (funciona para create e edit)
                        let errorHtml = '<ul style="text-align: left; list-style-position: inside; padding-left: 10px;">';
                        data.errors.forEach(error => {
                            errorHtml += `<li>${error}</li>`;
                        });
                        errorHtml += '</ul>';
                        Swal.fire({
                            title: 'Dados Inválidos!',
                            html: errorHtml,
                            icon: 'error'
                        });
                    } else {
                        // CASO 2: OS DADOS SÃO VÁLIDOS...
                        // Verifica se é uma criação de um usuário que já existe
                        if (action === 'create' && data.user_exists) {
                            // Mostra o pop-up de CONFIRMAÇÃO (só na criação)
                            Swal.fire({
                                title: 'CPF já cadastrado!',
                                html: `O CPF informado pertence a <strong>${data.user_name}</strong>.<br><br>Deseja adicionar este usuário como funcionário?`,
                                icon: 'warning',
                                showCancelButton: true,
                                confirmButtonText: 'Sim, adicionar!',
                                cancelButtonText: 'Cancelar'
                            }).then((result) => {
                                if (result.isConfirmed) {
                                    employeeForm.submit(); // Envia o formulário
                                }
                            });
                        } else {
                            // Se for uma EDIÇÃO válida ou a CRIAÇÃO de um usuário novo, envia o formulário direto
                            employeeForm.submit();
                        }
                    }
                })
                .catch(error => {
                    console.error('Erro na requisição:', error);
                    Swal.fire('Erro de Comunicação', 'Não foi possível se conectar ao servidor.', 'error');
                });
        });
    }


    // --- SUAS FUNÇÕES ORIGINAIS PARA CONTROLE DO MODAL ---
    
    function openEmployeeModal(employeeData = null) {
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
            employeeForm.querySelector('#serviceCommission').value = employeeData.serviceCommission || '';
            employeeForm.querySelector('#productCommission').value = employeeData.productCommission || '';

            employeeForm.querySelector('input[name="commission_percentage"]').checked = employeeData.commissionPercentage === 'true';
            employeeForm.querySelector('input[name="can_manage_cashbox"]').checked = employeeData.canCashbox === 'true';
            employeeForm.querySelector('input[name="can_register_sell"]').checked = employeeData.canSell === 'true';
            employeeForm.querySelector('input[name="can_create_appointments"]').checked = employeeData.canAppointments === 'true';
            employeeForm.querySelector('input[name="system_access"]').checked = employeeData.systemAccess === 'true';
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

            const employeeData = {
                id: editButton.dataset.id,
                name: editButton.dataset.name,
                lastname: editButton.dataset.lastname,
                email: editButton.dataset.email,
                phone: editButton.dataset.phone,
                cpf: editButton.dataset.cpf,
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

});

// Limite no campo cpf
const cpfInput = document.getElementById('employeeCPF');

cpfInput.addEventListener('input', function() {
    if (this.value.length > 11) {
    this.value = this.value.slice(0, 11);
    }
});

// Limite campo telefone
const cellInput = document.getElementById('employeePhone');

cellInput.addEventListener('input', function() {
    if (this.value.length > 11) {
    this.value = this.value.slice(0, 11);
    }
});