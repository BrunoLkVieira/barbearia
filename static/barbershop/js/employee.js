document.addEventListener('DOMContentLoaded', function() {
    const modal = document.getElementById('employeeModal');
    if (!modal) return;
    
    const modalTitle = document.getElementById('modalTitle');
    const employeeForm = document.getElementById('employeeForm');
    const unitField = document.getElementById('employeeUnit');
    const unitFilter = document.getElementById('unitFilterSelect');

    const cpfField = employeeForm.querySelector('#employeeCPF');
    const nameField = employeeForm.querySelector('#employeeName');
    const lastNameField = employeeForm.querySelector('#employeeLastName');
    const emailField = employeeForm.querySelector('#employeeEmail');
    const phoneField = employeeForm.querySelector('#employeePhone');
    const cpfStatusMessage = document.getElementById('cpfStatusMessage');

    function preventSelectClick(e) { e.preventDefault(); this.blur(); return false; }

    // ===============================================
    // LÓGICA DE AUTO-PREENCHIMENTO DE CPF
    // ===============================================
    if (cpfField) {
        cpfField.addEventListener('input', function() {
            if (this.value.length > 11) this.value = this.value.slice(0, 11);
            
            // Se chegou em 11 digitos e estamos em modo de criação
            if (this.value.length === 11 && !employeeForm.querySelector('#employeeId').value) {
                const apiCpf = employeeForm.dataset.cpfApi;
                fetch(`${apiCpf}?cpf=${this.value}`)
                .then(res => res.json())
                .then(data => {
                    if (data.found) {
                        if (data.in_barbershop) {
                            cpfStatusMessage.innerHTML = '<i class="fas fa-exclamation-circle"></i> Este CPF já é um funcionário desta barbearia.';
                            cpfStatusMessage.style.color = '#e53e3e';
                            cpfStatusMessage.style.display = 'block';
                        } else {
                            nameField.value = data.name;
                            lastNameField.value = data.last_name;
                            emailField.value = data.email;
                            phoneField.value = data.phone;
                            
                            [nameField, lastNameField, emailField, phoneField].forEach(el => {
                                el.readOnly = true; el.style.backgroundColor = "#e9ecef"; el.style.cursor = "not-allowed";
                            });
                            
                            cpfStatusMessage.innerHTML = '<i class="fas fa-check-circle"></i> Usuário encontrado! Dados preenchidos.';
                            cpfStatusMessage.style.color = '#48bb78';
                            cpfStatusMessage.style.display = 'block';
                        }
                    } else {
                        // Reseta se não achou (caso o cara apague e digite outro)
                        cpfStatusMessage.style.display = 'none';
                        [nameField, lastNameField, emailField, phoneField].forEach(el => {
                            if(!el.value) { el.readOnly = false; el.style.backgroundColor = ""; el.style.cursor = "text"; }
                        });
                    }
                });
            } else if (this.value.length < 11) {
                cpfStatusMessage.style.display = 'none';
                if (!employeeForm.querySelector('#employeeId').value) {
                    [nameField, lastNameField, emailField, phoneField].forEach(el => {
                        el.readOnly = false; el.style.backgroundColor = ""; el.style.cursor = "text";
                    });
                }
            }
        });
    }

    if (employeeForm) {
        const checkUrl = employeeForm.dataset.checkUrl;
        const csrfToken = employeeForm.querySelector('[name=csrfmiddlewaretoken]').value;

        employeeForm.addEventListener('submit', function(event) {
            event.preventDefault(); 
            
            // Destrava campos para enviar no form POST
            employeeForm.querySelectorAll('input, select').forEach(el => { el.disabled = false; });
            const formData = new FormData(employeeForm);

            fetch(checkUrl, {
                method: 'POST', body: formData, headers: { 'X-CSRFToken': csrfToken }
            })
            .then(response => response.json())
            .then(data => {
                if (data.is_valid) {
                    employeeForm.submit();
                } else {
                    let errorHtml = '<ul style="text-align: left; list-style-position: inside; padding-left: 10px;">';
                    data.errors.forEach(error => { errorHtml += `<li>${error}</li>`; });
                    errorHtml += '</ul>';

                    Swal.fire({ icon: 'error', title: 'Ação Bloqueada', html: errorHtml, confirmButtonText: 'Entendi', confirmButtonColor: '#c53030' });
                    updatePermissions(document.getElementById('isOwnerInput').value === "True");
                }
            })
            .catch(error => {
                Swal.fire({ icon: 'error', title: 'Erro de Servidor', text: 'Tente novamente.', confirmButtonColor: '#c53030' });
            });
        });
    }

    function openEmployeeModal(employeeData = null) {
        const isActiveField = employeeForm.querySelector('#employeeIsActive');
        const isOwnerInput = document.getElementById('isOwnerInput');
        if(cpfStatusMessage) cpfStatusMessage.style.display = 'none';
       
        unitField.removeEventListener('mousedown', preventSelectClick);
        unitField.style.backgroundColor = "";
        unitField.style.cursor = "default";
        
        [cpfField, nameField, lastNameField, emailField, phoneField, isActiveField].forEach(el => {
            if(el) { el.readOnly = false; el.disabled = false; el.style.backgroundColor = ""; el.style.cursor = "text"; }
        });

        if (employeeForm) {
            employeeForm.querySelectorAll('input[name="roles"]').forEach(checkbox => checkbox.checked = false);
            const ownerBarberChk = document.getElementById('ownerIsBarber');
            if (ownerBarberChk) ownerBarberChk.checked = false;
        }
        
        if (employeeData && employeeData.id) {
            const isOwner = employeeData.isOwner === 'true';
            modalTitle.innerHTML = isOwner ? '<i class="fas fa-crown" style="color:#c53030;"></i> Editar Perfil do Titular' : '<i class="fas fa-user-edit"></i> Editar Funcionário';
            employeeForm.querySelector('input[name="action"]').value = 'edit';
            employeeForm.querySelector('#employeeId').value = employeeData.id;
            isOwnerInput.value = isOwner ? "True" : "False";
            
            cpfField.value = employeeData.cpf;
            cpfField.readOnly = true; cpfField.style.backgroundColor = "#e9ecef"; cpfField.style.cursor = "not-allowed";

            nameField.value = employeeData.name;
            lastNameField.value = employeeData.lastname;
            emailField.value = employeeData.email;
            phoneField.value = employeeData.phone;
            
            if (isOwner) {
                [nameField, lastNameField, emailField, phoneField].forEach(el => {
                    el.readOnly = true; el.style.backgroundColor = "#e9ecef"; el.style.cursor = "not-allowed";
                });
                if(isActiveField) { isActiveField.checked = true; isActiveField.disabled = true; }
                
                document.querySelectorAll('.regular-field').forEach(el => el.style.display = 'none');
                document.querySelectorAll('.owner-field').forEach(el => el.style.display = 'block');
                
                if (employeeData.roles && employeeData.roles.includes('barbeiro')) {
                    document.getElementById('ownerIsBarber').checked = true;
                }
            } else {
                document.querySelectorAll('.regular-field').forEach(el => el.style.display = 'block');
                document.querySelectorAll('.owner-field').forEach(el => el.style.display = 'none');
                if(isActiveField) isActiveField.checked = employeeData.active === 'true'; 
            }

            employeeForm.querySelector('#employeeSpecialty').value = employeeData.specialty || '';
            employeeForm.querySelector('#employeeBio').value = employeeData.bio || '';
            unitField.value = employeeData.unit;
            
            employeeForm.querySelector('#serviceCommission').value = (employeeData.serviceCommission || '').toString().replace(',', '.');
            employeeForm.querySelector('#productCommission').value = (employeeData.productCommission || '').toString().replace(',', '.');         
            employeeForm.querySelector('input[name="commission_percentage"]').checked = employeeData.commissionPercentage === 'true';
            
            const sysAccessChk = document.getElementById('systemAccessCheckbox');
            if(sysAccessChk) sysAccessChk.checked = employeeData.systemAccess === 'true';
            
            if (employeeData.roles && !isOwner) {
                const rolesArray = employeeData.roles.split(','); 
                rolesArray.forEach(roleValue => {
                    const checkbox = employeeForm.querySelector(`input[name="roles"][value="${roleValue.trim()}"]`);
                    if (checkbox) checkbox.checked = true;
                });
            }
            updatePermissions(isOwner);

        } else {
            modalTitle.innerHTML = '<i class="fas fa-user-plus"></i> Novo Funcionário';
            if (employeeForm) {
                employeeForm.reset();
                employeeForm.querySelector('input[name="action"]').value = 'create';
                employeeForm.querySelector('#employeeId').value = '';
                isOwnerInput.value = "False";
                
                document.querySelectorAll('.regular-field').forEach(el => el.style.display = 'block');
                document.querySelectorAll('.owner-field').forEach(el => el.style.display = 'none');

                if(isActiveField) isActiveField.checked = true;

                if (unitFilter && unitFilter.value !== 'geral') {
                    const selectedOption = unitFilter.options[unitFilter.selectedIndex];
                    const filteredUnitId = selectedOption.dataset.unitId;
                    if (filteredUnitId) {
                        unitField.value = filteredUnitId;
                        unitField.style.backgroundColor = "#e9ecef"; unitField.style.cursor = "not-allowed";
                        unitField.addEventListener('mousedown', preventSelectClick);
                    }
                }
                updatePermissions(false);
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

    const cellInput = document.getElementById('employeePhone');
    if(cellInput) cellInput.addEventListener('input', function() { if (this.value.length > 11) this.value = this.value.slice(0, 11); });

    const roleElements = document.querySelectorAll('.employee-type');
    roleElements.forEach(element => {
        const text = element.textContent.trim().toLowerCase();
        if (text.includes('barbeiro')) element.classList.add('type-barber');
        else if (text.includes('gerente')) element.classList.add('type-manager');
        else if (text.includes('caixa')) element.classList.add('type-cashier');
        else if (!text.includes('titular')) element.classList.add('type-none'); 
    });

    const commissionCheckbox = document.querySelector('input[name="commission_percentage"]');
    const serviceInput = document.getElementById('serviceCommission');
    const productInput = document.getElementById('productCommission');
    
    function updateInputsState() {
        if (commissionCheckbox && serviceInput && productInput) {
            const isDisabled = !commissionCheckbox.checked;
            serviceInput.disabled = isDisabled; productInput.disabled = isDisabled;
        }
    }
    
    if (modal) {
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.type === 'attributes' && mutation.attributeName === 'style' && modal.style.display === 'flex') updateInputsState();
            });
        });
        observer.observe(modal, { attributes: true });
    }
    if (commissionCheckbox) commissionCheckbox.addEventListener('change', updateInputsState);

    const roleCheckboxes = document.querySelectorAll('input[name="roles"]');
    const sysAccess = document.getElementById('systemAccessCheckbox');
    const cashbox = document.getElementById('canManageCashboxCheckbox');
    const registerSell = document.getElementById('canRegisterSellCheckbox');
    const createAppt = document.getElementById('canCreateAppointmentsCheckbox');
    
    function updatePermissions(isOwner = false) {
        const selectedRoles = Array.from(roleCheckboxes).filter(cb => cb.checked).map(cb => cb.value);
        
        if(sysAccess) sysAccess.disabled = false;
        if(cashbox) cashbox.checked = false; 
        if(registerSell) registerSell.checked = false; 
        if(createAppt) createAppt.checked = false;

        if (selectedRoles.includes('gerente') || selectedRoles.includes('caixa') || isOwner) {
            if(sysAccess) { sysAccess.checked = true; sysAccess.disabled = true; }
            if(cashbox) cashbox.checked = true; 
            if(registerSell) registerSell.checked = true; 
            if(createAppt) createAppt.checked = true;
        } 
    }
    roleCheckboxes.forEach(checkbox => checkbox.addEventListener('change', () => updatePermissions(false)));
});