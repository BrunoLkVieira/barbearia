document.addEventListener('DOMContentLoaded', function() {
    const modal = document.getElementById('employeeModal');
    if (!modal) return;
    
    const modalTitle = document.getElementById('modalTitle');
    const employeeForm = document.getElementById('employeeForm');
    const unitField = document.getElementById('employeeUnit');
    const saveEmployeeBtn = document.getElementById('saveEmployeeBtn');

    const nameField = employeeForm.querySelector('#employeeName');
    const lastNameField = employeeForm.querySelector('#employeeLastName');
    const emailField = employeeForm.querySelector('#employeeEmail');
    const phoneField = employeeForm.querySelector('#employeePhone');
    const birthField = employeeForm.querySelector('#employeeBirth');
    const passwordField = employeeForm.querySelector('#employeePassword');
    const cpfStatusMessage = document.getElementById('cpfStatusMessage');

    const barbeiroCheckbox = employeeForm.querySelector('input[name="roles"][value="barbeiro"]');
    const gerenteCheckbox = employeeForm.querySelector('input[name="roles"][value="gerente"]');
    const caixaCheckbox = employeeForm.querySelector('input[name="roles"][value="caixa"]');
    const newBtnData = document.getElementById('newEmployeeBtn');
    
    const roleCheckboxes = document.querySelectorAll('input[name="roles"]');
    const sysAccess = document.getElementById('systemAccessCheckbox');
    const contractTypeSelect = document.getElementById('contractType');
    const ownerIsBarberChk = document.getElementById('ownerIsBarber');

    function preventSelectClick(e) { e.preventDefault(); this.blur(); return false; }

    // ===============================================
    // MOSTRAR/OCULTAR SENHA
    // ===============================================
    const togglePasswordBtn = document.getElementById('togglePasswordBtn');
    const togglePasswordIcon = document.getElementById('togglePasswordIcon');
    if (togglePasswordBtn && passwordField) {
        togglePasswordBtn.addEventListener('click', function(e) {
            e.preventDefault();
            const type = passwordField.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordField.setAttribute('type', type);
            if(type === 'text') {
                togglePasswordIcon.classList.remove('fa-eye');
                togglePasswordIcon.classList.add('fa-eye-slash');
            } else {
                togglePasswordIcon.classList.remove('fa-eye-slash');
                togglePasswordIcon.classList.add('fa-eye');
            }
        });
    }

    // ===============================================
    // LÓGICA DE CONTRATOS DINÂMICOS (TITULAR VS CAIXA VS BARBEIRO)
    // ===============================================
    const allContractOptions = [
        { value: 'commission', text: 'Comissionado (100% Produtividade)' },
        { value: 'fixed_salary', text: 'Salário Fixo (+ Comissão)' },
        { value: 'fixed_only', text: 'Apenas Salário Fixo (ou Sem Remuneração)' },
        { value: 'chair_rental', text: 'Aluguel de Cadeira (Coworking)' }
    ];

    window.updateContractOptions = function() {
        if(!contractTypeSelect) return;
        const isOwner = document.getElementById('isOwnerInput').value === "True";
        let isBarber = false;

        if (isOwner) {
            isBarber = ownerIsBarberChk && ownerIsBarberChk.checked;
        } else {
            isBarber = barbeiroCheckbox && barbeiroCheckbox.checked;
        }

        const currentValue = contractTypeSelect.value;
        contractTypeSelect.innerHTML = '';

        allContractOptions.forEach(opt => {
            let shouldAdd = true;
            
            if (!isBarber) {
                // Se NÃO for barbeiro (Dono, Gerente, Caixa isolado), obriga a ser só salário fixo/sem comissão
                if (opt.value !== 'fixed_only') shouldAdd = false;
            } else if (isOwner && isBarber) {
                // Dono atuando como barbeiro não paga aluguel pra si mesmo
                if (opt.value === 'chair_rental') shouldAdd = false;
            }

            if (shouldAdd) {
                const option = document.createElement('option');
                option.value = opt.value;
                option.textContent = opt.text;
                contractTypeSelect.appendChild(option);
            }
        });

        if (Array.from(contractTypeSelect.options).some(o => o.value === currentValue)) {
            contractTypeSelect.value = currentValue;
        } else {
            contractTypeSelect.selectedIndex = 0;
        }
        if(typeof window.toggleContractFields === 'function') window.toggleContractFields();
    };

    window.toggleContractFields = function() {
        if (!contractTypeSelect) return;
        const type = contractTypeSelect.value;
        const fixedSalaryGroup = document.getElementById('fixedSalaryGroup');
        const chairRentalGroup = document.getElementById('chairRentalGroup');
        const serviceCommissionGroup = document.getElementById('serviceCommissionGroup');
        
        if (type === 'commission') {
            if(fixedSalaryGroup) fixedSalaryGroup.style.display = 'none';
            if(chairRentalGroup) chairRentalGroup.style.display = 'none';
            if(serviceCommissionGroup) serviceCommissionGroup.style.display = 'block';
        } else if (type === 'fixed_salary') {
            if(fixedSalaryGroup) fixedSalaryGroup.style.display = 'block';
            if(chairRentalGroup) chairRentalGroup.style.display = 'none';
            if(serviceCommissionGroup) serviceCommissionGroup.style.display = 'block';
        } else if (type === 'fixed_only') {
            if(fixedSalaryGroup) fixedSalaryGroup.style.display = 'block';
            if(chairRentalGroup) chairRentalGroup.style.display = 'none';
            if(serviceCommissionGroup) serviceCommissionGroup.style.display = 'none';
        } else if (type === 'chair_rental') {
            if(fixedSalaryGroup) fixedSalaryGroup.style.display = 'none';
            if(chairRentalGroup) chairRentalGroup.style.display = 'block';
            if(serviceCommissionGroup) serviceCommissionGroup.style.display = 'none';
        }
    };

    // ===============================================
    // FUNÇÃO GLOBAL DECLARADA NO INÍCIO PARA EVITAR BUG DE CLIQUE
    // ===============================================
    window.openEmployeeModal = function(employeeData = null) {
        try {
            const isActiveField = employeeForm.querySelector('#employeeIsActive');
            const isOwnerInput = document.getElementById('isOwnerInput');
            const limitBanner = document.getElementById('limitWarningBanner');
            const linkInfoText = document.getElementById('linkInfoText');
            
            if(cpfStatusMessage) cpfStatusMessage.style.display = 'none';
            document.getElementById('emailGroup').style.display = 'block';
            document.getElementById('phoneGroup').style.display = 'block';
           
            unitField.removeEventListener('mousedown', preventSelectClick);
            unitField.style.backgroundColor = ""; unitField.style.cursor = "default";
            
            [nameField, lastNameField, emailField, phoneField, birthField, isActiveField].forEach(el => {
                if(el) { el.readOnly = false; el.disabled = false; el.style.backgroundColor = ""; el.style.cursor = "text"; }
            });

            if (employeeForm) {
                employeeForm.querySelectorAll('input[name="roles"]').forEach(checkbox => { checkbox.checked = false; checkbox.disabled = false; });
                if(document.getElementById('label-role-barbeiro')) { 
                    document.getElementById('label-role-barbeiro').style.opacity = "1"; 
                    document.getElementById('label-role-barbeiro').style.cursor = "pointer"; 
                }
                if (ownerIsBarberChk) ownerIsBarberChk.checked = false;
            }
            
            if (employeeData && employeeData.id) {
                // EDIÇÃO
                const isOwner = employeeData.isOwner === 'true';
                modalTitle.innerHTML = isOwner ? '<i class="fas fa-crown" style="color:#c53030;"></i> Editar Dados do Titular' : '<i class="fas fa-user-edit"></i> Editar Funcionário';
                employeeForm.querySelector('input[name="action"]').value = 'edit';
                employeeForm.querySelector('#employeeId').value = employeeData.id;
                isOwnerInput.value = isOwner ? "True" : "False";
                if(limitBanner) limitBanner.style.display = 'none'; 
                if(linkInfoText) linkInfoText.style.display = 'none';

                document.getElementById('passwordGroup').style.display = 'none';
                passwordField.required = false;
                
                [nameField, lastNameField, emailField, phoneField, birthField].forEach(el => {
                    if(el) { el.readOnly = true; el.style.backgroundColor = "#e9ecef"; el.style.cursor = "not-allowed"; }
                });

                nameField.value = employeeData.name;
                lastNameField.value = employeeData.lastname;
                emailField.value = employeeData.email;
                phoneField.value = employeeData.phone;
                birthField.value = employeeData.birth;
                
                if (isOwner) {
                    if(isActiveField) { isActiveField.checked = true; isActiveField.disabled = true; }
                    document.querySelectorAll('.regular-field').forEach(el => el.style.display = 'none');
                    document.querySelectorAll('.owner-field').forEach(el => el.style.display = 'block');
                    
                    if (employeeData.roles && employeeData.roles.includes('barbeiro')) {
                        if (ownerIsBarberChk) ownerIsBarberChk.checked = true;
                    }
                } else {
                    document.querySelectorAll('.regular-field').forEach(el => el.style.display = 'block');
                    document.querySelectorAll('.owner-field').forEach(el => el.style.display = 'none');
                    if(isActiveField) isActiveField.checked = employeeData.active === 'true'; 
                    
                    if (employeeData.roles) {
                        const rolesArray = employeeData.roles.split(','); 
                        rolesArray.forEach(roleValue => {
                            const checkbox = employeeForm.querySelector(`input[name="roles"][value="${roleValue.trim()}"]`);
                            if (checkbox) checkbox.checked = true;
                        });
                    }
                }

                // ATUALIZA AS REGRAS E CONTRATOS ANTES DE PREENCHER
                updatePermissions(isOwner);
                updateContractOptions();

                unitField.value = employeeData.unit;
                if(contractTypeSelect) contractTypeSelect.value = employeeData.contractType || 'fixed_only';
                
                const fixedSalaryInput = employeeForm.querySelector('#fixedSalary');
                if(fixedSalaryInput) fixedSalaryInput.value = (employeeData.fixedSalary || '').toString().replace(',', '.');
                const chairRentalInput = employeeForm.querySelector('#chairRentalFee');
                if(chairRentalInput) chairRentalInput.value = (employeeData.chairRental || '').toString().replace(',', '.');
                const serviceCommInput = employeeForm.querySelector('#serviceCommission');
                if(serviceCommInput) serviceCommInput.value = (employeeData.serviceCommission || '').toString().replace(',', '.');
                const sysAccessChk = document.getElementById('systemAccessCheckbox');
                if(sysAccessChk) sysAccessChk.checked = employeeData.systemAccess === 'true';
                
            } else {
                // CRIAÇÃO NOVA
                modalTitle.innerHTML = '<i class="fas fa-user-plus"></i> Novo Funcionário';
                if(linkInfoText) linkInfoText.style.display = 'block';
                
                if (newBtnData) {
                    const canRegular = newBtnData.dataset.canRegular === 'true';
                    const canAdmin = newBtnData.dataset.canAdmin === 'true';
                    if (!canRegular && canAdmin) {
                        if(limitBanner) {
                            limitBanner.innerHTML = `<span style="color: #dd6b20; font-weight: bold;"><i class="fas fa-info-circle"></i> Vaga Gratuita Administrativa</span>
                                                     <p style="font-size: 0.85rem; color: #7b341e; margin-top: 5px;">Você atingiu o limite de barbeiros do plano. Liberação apenas para a vaga gratuita de Gerente ou Caixa.</p>`;
                            limitBanner.style.display = 'block';
                        }
                    } else {
                        if(limitBanner) limitBanner.style.display = 'none';
                    }
                }

                if (employeeForm) {
                    employeeForm.reset();
                    employeeForm.querySelector('input[name="action"]').value = 'create';
                    employeeForm.querySelector('#employeeId').value = '';
                    isOwnerInput.value = "False";
                    
                    updateContractOptions();
                    if(contractTypeSelect) contractTypeSelect.value = 'fixed_only';
                    
                    document.getElementById('passwordGroup').style.display = 'block';
                    passwordField.required = true;
                    emailField.required = true;
                    saveEmployeeBtn.disabled = false;
                    
                    document.querySelectorAll('.regular-field').forEach(el => el.style.display = 'block');
                    document.querySelectorAll('.owner-field').forEach(el => el.style.display = 'none');
                    if(isActiveField) isActiveField.checked = true;

                    const unitFilter = document.getElementById('unitFilterSelect');
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
                    updateCheckboxLocks(); 
                }
            }
            
            if(typeof window.toggleContractFields === 'function') window.toggleContractFields();
            modal.style.display = 'flex';
            document.body.classList.add('modal-open');
        } catch (error) {
            console.error(error);
        }
    };

    if (ownerIsBarberChk) ownerIsBarberChk.addEventListener('change', updateContractOptions);
    roleCheckboxes.forEach(cb => cb.addEventListener('change', updateContractOptions));

    // ===============================================
    // LÓGICA DE SAAS E BINDING DE BOTÕES
    // ===============================================
    function applySaaSLimits() {
        const addBtns = document.querySelectorAll('.add-employee-btn');
        addBtns.forEach(btn => {
            const canAny = btn.dataset.canAny === 'true';
            btn.removeAttribute('onclick');
            
            if (!canAny) {
                btn.classList.add('disabled-limit');
                btn.style.opacity = '0.5';
                btn.style.cursor = 'not-allowed';
                btn.title = 'Limite total da barbearia atingido.';
                
                btn.addEventListener('click', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    Swal.fire({
                        icon: 'warning', title: 'Limite Total Atingido',
                        text: 'Você atingiu o limite de barbeiros do plano e já utilizou todas as vagas administrativas gratuitas. Faça um upgrade no plano para expandir a equipe.',
                        confirmButtonColor: '#FF7A00'
                    });
                }, true);
            } else {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    if(typeof window.openEmployeeModal === 'function') window.openEmployeeModal();
                });
            }
        });
    }
    applySaaSLimits();

    function updateCheckboxLocks() {
        const selectedUnitId = unitField.value;
        if (!selectedUnitId) return;

        const isEdit = employeeForm.querySelector('input[name="action"]').value === 'edit';
        if (isEdit) return;

        let unitLimits = {};
        try { unitLimits = JSON.parse(document.getElementById('unitLimitsData').textContent); } 
        catch (e) { return; }

        const limits = unitLimits[selectedUnitId];
        if (!limits || !newBtnData) return;

        const canAddRegular = newBtnData.dataset.canRegular === 'true';

        if (limits.has_manager && gerenteCheckbox) {
            gerenteCheckbox.disabled = true;
            gerenteCheckbox.checked = false;
            if(document.getElementById('label-role-gerente')) {
                document.getElementById('label-role-gerente').style.opacity = '0.4';
                document.getElementById('label-role-gerente').title = 'Já existe 1 gerente operando nesta unidade.';
            }
        } else if (gerenteCheckbox) {
            gerenteCheckbox.disabled = false;
            if(document.getElementById('label-role-gerente')) {
                document.getElementById('label-role-gerente').style.opacity = '1';
                document.getElementById('label-role-gerente').title = '';
            }
        }

        if (!canAddRegular && barbeiroCheckbox) {
            barbeiroCheckbox.disabled = true;
            barbeiroCheckbox.checked = false;
            if(document.getElementById('label-role-barbeiro')) {
                document.getElementById('label-role-barbeiro').style.opacity = '0.4';
                document.getElementById('label-role-barbeiro').title = 'Limite de barbeiros do plano atingido.';
            }
        } else if (barbeiroCheckbox) {
            barbeiroCheckbox.disabled = false;
            if(document.getElementById('label-role-barbeiro')) {
                document.getElementById('label-role-barbeiro').style.opacity = '1';
                document.getElementById('label-role-barbeiro').title = '';
            }
        }

        if (!canAddRegular && limits.free_admin_used && caixaCheckbox) {
            caixaCheckbox.disabled = true;
            caixaCheckbox.checked = false;
            if(document.getElementById('label-role-caixa')) {
                document.getElementById('label-role-caixa').style.opacity = '0.4';
                document.getElementById('label-role-caixa').title = 'Vaga administrativa gratuita já utilizada.';
            }
        } else if (caixaCheckbox && !(gerenteCheckbox && gerenteCheckbox.checked)) {
            caixaCheckbox.disabled = false;
            if(document.getElementById('label-role-caixa')) {
                document.getElementById('label-role-caixa').style.opacity = '1';
                document.getElementById('label-role-caixa').title = '';
            }
        }
        updatePermissions(document.getElementById('isOwnerInput').value === "True");
        updateContractOptions();
    }

    if (unitField) { unitField.addEventListener('change', updateCheckboxLocks); }

    // ===============================================
    // AUTO-PREENCHIMENTO VIA E-MAIL (GET API NATIVA)
    // ===============================================
    if (emailField) {
        emailField.addEventListener('blur', function() {
            const val = this.value.trim();
            if (val.includes('@') && !employeeForm.querySelector('#employeeId').value) {
                fetch(`${window.location.pathname}?email=${encodeURIComponent(val)}`, { headers: { 'X-Requested-With': 'XMLHttpRequest' } })
                .then(res => res.json())
                .then(data => {
                    if (data.found) {
                        if (data.in_barbershop) {
                            cpfStatusMessage.innerHTML = '<i class="fas fa-exclamation-circle"></i> Este e-mail já atua nesta barbearia.';
                            cpfStatusMessage.style.color = '#e53e3e';
                            cpfStatusMessage.style.display = 'block';
                            saveEmployeeBtn.disabled = true;
                        } else {
                            nameField.value = data.name;
                            lastNameField.value = data.last_name;
                            if(phoneField) phoneField.value = data.phone || '';
                            
                            document.getElementById('passwordGroup').style.display = 'none';
                            passwordField.required = false;
                            
                            [nameField, lastNameField, phoneField].forEach(el => {
                                if(el) { el.readOnly = true; el.style.backgroundColor = "#e9ecef"; el.style.cursor = "not-allowed"; }
                            });
                            
                            cpfStatusMessage.innerHTML = '<i class="fas fa-lock"></i> Conta encontrada! Digite a <b>Data de Nascimento</b> para vincular.';
                            cpfStatusMessage.style.color = '#48bb78';
                            cpfStatusMessage.style.display = 'block';
                            saveEmployeeBtn.disabled = false;
                        }
                    } else {
                        cpfStatusMessage.style.display = 'none';
                        document.getElementById('passwordGroup').style.display = 'block';
                        passwordField.required = true;
                        
                        [nameField, lastNameField, phoneField].forEach(el => {
                            if(el && !el.value) { el.readOnly = false; el.style.backgroundColor = ""; el.style.cursor = "text"; }
                        });
                        saveEmployeeBtn.disabled = false;
                    }
                }).catch(err => console.error(err));
            }
        });
    }

    if (employeeForm) {
        employeeForm.addEventListener('submit', function(event) {
            event.preventDefault(); 
            const isOwner = document.getElementById('isOwnerInput').value === "True";
            if (!isOwner) {
                const checkedRoles = employeeForm.querySelectorAll('input[name="roles"]:checked');
                if (checkedRoles.length === 0) {
                    Swal.fire({
                        icon: 'warning', title: 'Atenção',
                        text: 'Você precisa selecionar pelo menos 1 Cargo para este funcionário.',
                        confirmButtonColor: '#FF7A00'
                    });
                    return;
                }
            }

            employeeForm.querySelectorAll('input, select, textarea').forEach(el => { 
                el.disabled = false; 
                el.readOnly = false;
            });
            HTMLFormElement.prototype.submit.call(employeeForm);
        });
    }

    const closeBtns = [document.getElementById('closeModal'), document.getElementById('cancelEmployee')];
    closeBtns.forEach(btn => {
        if(btn) btn.addEventListener('click', function() {
            modal.style.display = 'none';
            document.body.classList.remove('modal-open');
        });
    });

    document.addEventListener('click', function(e) {
        const btn = e.target.closest('.edit-btn') || e.target.closest('.edit');
        if (btn && typeof window.openEmployeeModal === 'function') {
            window.openEmployeeModal({...btn.dataset});
        }
    });
    
    function updatePermissions(isOwner = false) {
        if (gerenteCheckbox && caixaCheckbox) {
            if (gerenteCheckbox.checked) {
                caixaCheckbox.checked = false;
                caixaCheckbox.disabled = true;
                if(document.getElementById('label-role-caixa')) {
                    document.getElementById('label-role-caixa').style.opacity = "0.4";
                }
            } else {
                let canCheckCaixa = true;
                if (employeeForm.querySelector('input[name="action"]').value === 'create') {
                    const selectedUnitId = unitField.value;
                    let unitLimits = {};
                    try { unitLimits = JSON.parse(document.getElementById('unitLimitsData').textContent); } catch (e) {}
                    
                    if (unitLimits[selectedUnitId] && unitLimits[selectedUnitId].free_admin_used && newBtnData && newBtnData.dataset.canRegular === 'false') {
                        canCheckCaixa = false;
                    }
                }
                if (canCheckCaixa) {
                    caixaCheckbox.disabled = false;
                    if(document.getElementById('label-role-caixa')) {
                        document.getElementById('label-role-caixa').style.opacity = "1";
                    }
                }
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