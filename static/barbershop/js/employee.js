document.addEventListener('DOMContentLoaded', function() {
    const modal = document.getElementById('employeeModal');
    if (!modal) return;
    
    const modalTitle = document.getElementById('modalTitle');
    const employeeForm = document.getElementById('employeeForm');
    const unitField = document.getElementById('employeeUnit');
    const unitFilter = document.getElementById('unitFilterSelect');
    const addEmployeeBtn = document.querySelector('.add-employee-btn');

    const cpfField = employeeForm.querySelector('#employeeCPF');
    const nameField = employeeForm.querySelector('#employeeName');
    const lastNameField = employeeForm.querySelector('#employeeLastName');
    const emailField = employeeForm.querySelector('#employeeEmail');
    const phoneField = employeeForm.querySelector('#employeePhone');
    const birthField = employeeForm.querySelector('#employeeBirth');
    const passwordField = employeeForm.querySelector('#employeePassword');
    const cpfStatusMessage = document.getElementById('cpfStatusMessage');

    function preventSelectClick(e) { e.preventDefault(); this.blur(); return false; }

    // ===============================================
    // LÓGICA DE AUTO-PREENCHIMENTO COM PRIVACIDADE
    // ===============================================
    if (cpfField) {
        cpfField.addEventListener('input', function() {
            if (this.value.length > 11) this.value = this.value.slice(0, 11);
            
            if (this.value.length === 11 && !employeeForm.querySelector('#employeeId').value) {
                const apiCpf = employeeForm.dataset.cpfApi;
                fetch(`${apiCpf}?cpf=${this.value}`)
                .then(res => res.json())
                .then(data => {
                    if (data.found) {
                        if (data.in_barbershop) {
                            cpfStatusMessage.innerHTML = '<i class="fas fa-exclamation-circle"></i> Este CPF já atua nesta barbearia.';
                            cpfStatusMessage.style.color = '#e53e3e';
                            cpfStatusMessage.style.display = 'block';
                        } else {
                            nameField.value = data.name;
                            lastNameField.value = data.last_name;
                            
                            // BUGFIX: Tira obrigatoriedade da senha se o usuario já tem conta na Orbly
                            document.getElementById('emailGroup').style.display = 'none';
                            document.getElementById('phoneGroup').style.display = 'none';
                            document.getElementById('passwordGroup').style.display = 'none';
                            emailField.required = false;
                            passwordField.required = false;
                            
                            [nameField, lastNameField].forEach(el => {
                                el.readOnly = true; el.style.backgroundColor = "#e9ecef"; el.style.cursor = "not-allowed";
                            });
                            
                            cpfStatusMessage.innerHTML = '<i class="fas fa-lock"></i> Usuário Encontrado! Digite a Data de Nascimento para confirmar o vínculo.';
                            cpfStatusMessage.style.color = '#48bb78';
                            cpfStatusMessage.style.display = 'block';
                        }
                    } else {
                        cpfStatusMessage.style.display = 'none';
                        document.getElementById('emailGroup').style.display = 'block';
                        document.getElementById('phoneGroup').style.display = 'block';
                        document.getElementById('passwordGroup').style.display = 'block';
                        emailField.required = true;
                        passwordField.required = true;
                        
                        [nameField, lastNameField].forEach(el => {
                            if(!el.value) { el.readOnly = false; el.style.backgroundColor = ""; el.style.cursor = "text"; }
                        });
                    }
                });
            } else if (this.value.length < 11) {
                cpfStatusMessage.style.display = 'none';
                document.getElementById('emailGroup').style.display = 'block';
                document.getElementById('phoneGroup').style.display = 'block';
                document.getElementById('passwordGroup').style.display = 'block';
                
                if (!employeeForm.querySelector('#employeeId').value) {
                    emailField.required = true;
                    passwordField.required = true;
                    [nameField, lastNameField].forEach(el => {
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
            
            // Destrava campos bloqueados para enviar no form POST
            employeeForm.querySelectorAll('input, select').forEach(el => { el.disabled = false; });
            const formData = new FormData(employeeForm);

            fetch(checkUrl, {
                method: 'POST', body: formData, headers: { 'X-CSRFToken': csrfToken }
            })
            .then(response => response.json())
            .then(data => {
                if (data.is_valid) {
                    if (employeeForm.querySelector('input[name="action"]').value === 'create' && data.user_exists) {
                        Swal.fire({
                            title: 'Vínculo Confirmado!',
                            text: `A conta de ${data.user_name} foi validada através da data de nascimento. Ele agora é funcionário da sua unidade.`,
                            icon: 'success', showConfirmButton: false, timer: 2000
                        }).then(() => { HTMLFormElement.prototype.submit.call(employeeForm); });
                    } else {
                        HTMLFormElement.prototype.submit.call(employeeForm);
                    }
                } else {
                    let errorHtml = '<ul style="text-align: left; list-style-position: inside; padding-left: 10px;">';
                    data.errors.forEach(error => { errorHtml += `<li>${error}</li>`; });
                    errorHtml += '</ul>';

                    Swal.fire({ icon: 'error', title: 'Ação Bloqueada', html: errorHtml, confirmButtonText: 'Entendi', confirmButtonColor: '#c53030' });
                    updatePermissions(document.getElementById('isOwnerInput').value === "True");
                }
            })
            .catch(error => {
                Swal.fire({ icon: 'error', title: 'Erro de Servidor', text: 'Não foi possível se comunicar com o banco de dados.', confirmButtonColor: '#c53030' });
            });
        });
    }

    window.openEmployeeModal = function(employeeData = null) {
        const isActiveField = employeeForm.querySelector('#employeeIsActive');
        const isOwnerInput = document.getElementById('isOwnerInput');
        const limitBanner = document.getElementById('limitWarningBanner');
        const barbeiroCheckbox = employeeForm.querySelector('input[name="roles"][value="barbeiro"]');
        const labelBarbeiro = document.getElementById('label-role-barbeiro');
        
        if(cpfStatusMessage) cpfStatusMessage.style.display = 'none';
        document.getElementById('emailGroup').style.display = 'block';
        document.getElementById('phoneGroup').style.display = 'block';
       
        unitField.removeEventListener('mousedown', preventSelectClick);
        unitField.style.backgroundColor = ""; unitField.style.cursor = "default";
        
        [cpfField, nameField, lastNameField, emailField, phoneField, birthField, isActiveField].forEach(el => {
            if(el) { el.readOnly = false; el.disabled = false; el.style.backgroundColor = ""; el.style.cursor = "text"; }
        });

        if (employeeForm) {
            employeeForm.querySelectorAll('input[name="roles"]').forEach(checkbox => { checkbox.checked = false; checkbox.disabled = false; });
            if(labelBarbeiro) { labelBarbeiro.style.opacity = "1"; labelBarbeiro.style.cursor = "pointer"; }
            const ownerBarberChk = document.getElementById('ownerIsBarber');
            if (ownerBarberChk) ownerBarberChk.checked = false;
        }
        
        if (employeeData && employeeData.id) {
            // EDIÇÃO
            const isOwner = employeeData.isOwner === 'true';
            modalTitle.innerHTML = isOwner ? '<i class="fas fa-crown" style="color:#c53030;"></i> Editar Dados do Titular' : '<i class="fas fa-user-edit"></i> Editar Funcionário';
            employeeForm.querySelector('input[name="action"]').value = 'edit';
            employeeForm.querySelector('#employeeId').value = employeeData.id;
            isOwnerInput.value = isOwner ? "True" : "False";
            limitBanner.style.display = 'none'; 

            // Na edição a senha NUNCA é pedida
            document.getElementById('passwordGroup').style.display = 'none';
            passwordField.required = false;
            
            cpfField.value = employeeData.cpf;
            cpfField.readOnly = true; cpfField.style.backgroundColor = "#e9ecef"; cpfField.style.cursor = "not-allowed";

            nameField.value = employeeData.name;
            lastNameField.value = employeeData.lastname;
            emailField.value = employeeData.email;
            phoneField.value = employeeData.phone;
            birthField.value = employeeData.birth;
            
            if (isOwner) {
                [nameField, lastNameField, emailField, phoneField, birthField].forEach(el => {
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
            // CRIAÇÃO NOVA
            modalTitle.innerHTML = '<i class="fas fa-user-plus"></i> Novo Funcionário';
            
            if (addEmployeeBtn) {
                const consumed = parseInt(addEmployeeBtn.dataset.consumed);
                const max = parseInt(addEmployeeBtn.dataset.max);
                if (consumed >= max) {
                    limitBanner.style.display = 'block';
                    if(barbeiroCheckbox) { barbeiroCheckbox.disabled = true; labelBarbeiro.style.opacity = "0.4"; labelBarbeiro.style.cursor = "not-allowed"; }
                } else { limitBanner.style.display = 'none'; }
            }

            if (employeeForm) {
                employeeForm.reset();
                employeeForm.querySelector('input[name="action"]').value = 'create';
                employeeForm.querySelector('#employeeId').value = '';
                isOwnerInput.value = "False";
                
                // Senha ligada por padrão, a API do CPF desliga depois se não precisar
                document.getElementById('passwordGroup').style.display = 'block';
                passwordField.required = true;
                emailField.required = true;
                
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
    const gerenteCheckbox = document.querySelector('input[name="roles"][value="gerente"]');
    const caixaCheckbox = document.querySelector('input[name="roles"][value="caixa"]');
    const sysAccess = document.getElementById('systemAccessCheckbox');
    
    function updatePermissions(isOwner = false) {
        if (gerenteCheckbox && caixaCheckbox) {
            if (gerenteCheckbox.checked) {
                caixaCheckbox.checked = false;
                caixaCheckbox.disabled = true;
                const lbl = document.getElementById('label-role-caixa');
                if(lbl) lbl.style.opacity = "0.4";
            } else {
                caixaCheckbox.disabled = false;
                const lbl = document.getElementById('label-role-caixa');
                if(lbl) lbl.style.opacity = "1";
            }
        }
        
        const selectedRoles = Array.from(roleCheckboxes).filter(cb => cb.checked).map(cb => cb.value);
        if(sysAccess) sysAccess.disabled = false;

        if (selectedRoles.includes('gerente') || selectedRoles.includes('caixa') || isOwner) {
            if(sysAccess) { sysAccess.checked = true; sysAccess.disabled = true; }
        } 
    }
    roleCheckboxes.forEach(checkbox => checkbox.addEventListener('change', () => updatePermissions(false)));
});