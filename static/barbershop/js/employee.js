document.addEventListener('DOMContentLoaded', function() {
    const modal = document.getElementById('employeeModal');
    if (!modal) return;
    
    const modalTitle = document.getElementById('modalTitle');
    const employeeForm = document.getElementById('employeeForm');
    const unitField = document.getElementById('employeeUnit');
    const unitFilter = document.getElementById('unitFilterSelect');
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

    function preventSelectClick(e) { e.preventDefault(); this.blur(); return false; }

    // ===============================================
    // LÓGICA DE SAAS - TRAVA VISUAL E FUNCIONAL DE BOTÕES
    // ===============================================
    function applySaaSLimits() {
        const addBtns = document.querySelectorAll('.add-employee-btn');
        addBtns.forEach(btn => {
            const canAny = btn.dataset.canAny === 'true';
            
            btn.removeAttribute('onclick'); // Controle exclusivo via JS
            
            if (!canAny) {
                btn.classList.add('disabled-limit');
                btn.style.opacity = '0.5';
                btn.style.cursor = 'not-allowed';
                btn.title = 'Limite total da barbearia atingido.';
                
                btn.addEventListener('click', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    Swal.fire({
                        icon: 'warning',
                        title: 'Limite Total Atingido',
                        text: 'Você atingiu o limite de barbeiros do plano e já utilizou todas as vagas administrativas gratuitas. Faça um upgrade no plano para expandir a equipe.',
                        confirmButtonColor: '#FF7A00'
                    });
                }, true);
            } else {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    openEmployeeModal();
                });
            }
        });
    }
    applySaaSLimits();

    function updateCheckboxLocks() {
        const selectedUnitId = unitField.value;
        if (!selectedUnitId) return;

        const isEdit = employeeForm.querySelector('input[name="action"]').value === 'edit';
        if (isEdit) return; // As travas visuais intensas de checkbox ocorrem apenas na criação

        let unitLimits = {};
        try { unitLimits = JSON.parse(document.getElementById('unitLimitsData').textContent); } 
        catch (e) { console.error("Falha ao carregar limites."); return; }

        const limits = unitLimits[selectedUnitId];
        if (!limits || !newBtnData) return;

        const canAddRegular = newBtnData.dataset.canRegular === 'true';

        // 1. Trava Gerente (1 por Unidade)
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

        // 2. Trava Barbeiro (Limite do Plano)
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

        // 3. Trava Caixa
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
    }

    if (unitField) {
        unitField.addEventListener('change', updateCheckboxLocks);
    }

    // ===============================================
    // AUTO-PREENCHIMENTO VIA E-MAIL (GET API NATIVA)
    // ===============================================
    if (emailField) {
        emailField.addEventListener('blur', function() {
            const val = this.value.trim();
            // Dispara apenas se não for edição (employeeId vazio)
            if (val.includes('@') && !employeeForm.querySelector('#employeeId').value) {
                
                // Fetch nativo apontando para a URL relativa da página
                fetch(`${window.location.pathname}?email=${encodeURIComponent(val)}`, {
                    headers: { 'X-Requested-With': 'XMLHttpRequest' }
                })
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
                            
                            cpfStatusMessage.innerHTML = '<i class="fas fa-lock"></i> Conta encontrada! Digite a <b>Data de Nascimento</b> correta para vincular.';
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
                })
                .catch(err => console.error("Erro na busca de email:", err));
            }
        });
    }

    // ===============================================
    // ENVIO SEGURO DO FORMULÁRIO (Nativo) E VALIDAÇÃO DE CARGO
    // ===============================================
    if (employeeForm) {
        employeeForm.addEventListener('submit', function(event) {
            event.preventDefault(); 
            
            // Trava Frontend: OBRIGATÓRIO ter 1 cargo selecionado se não for dono
            const isOwner = document.getElementById('isOwnerInput').value === "True";
            if (!isOwner) {
                const checkedRoles = employeeForm.querySelectorAll('input[name="roles"]:checked');
                if (checkedRoles.length === 0) {
                    Swal.fire({
                        icon: 'warning', title: 'Atenção',
                        text: 'Você precisa selecionar pelo menos 1 Cargo para este funcionário.',
                        confirmButtonColor: '#FF7A00'
                    });
                    return; // Aborta a submissão
                }
            }

            // Destrava campos bloqueados pelo JS para que o Django os receba no POST
            employeeForm.querySelectorAll('input, select, textarea').forEach(el => { 
                el.disabled = false; 
                el.readOnly = false;
            });
            HTMLFormElement.prototype.submit.call(employeeForm);
        });
    }

    // ===============================================
    // ORBLY FINANCE: Lógica visual do Tipo de Contrato
    // ===============================================
    window.toggleContractFields = function() {
        const contractType = document.getElementById('contractType');
        if (!contractType) return;
        
        const type = contractType.value;
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

    window.openEmployeeModal = function(employeeData = null) {
        const isActiveField = employeeForm.querySelector('#employeeIsActive');
        const isOwnerInput = document.getElementById('isOwnerInput');
        const limitBanner = document.getElementById('limitWarningBanner');
        const newBtnData = document.getElementById('newEmployeeBtn');
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
            if(linkInfoText) linkInfoText.style.display = 'none'; // Esconde a dica de vínculo na edição

            document.getElementById('passwordGroup').style.display = 'none';
            passwordField.required = false;
            
            // TRAVA DA CAMADA DE USUÁRIO NA EDIÇÃO (NOME, EMAIL, ETC)
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
                    document.getElementById('ownerIsBarber').checked = true;
                }
            } else {
                document.querySelectorAll('.regular-field').forEach(el => el.style.display = 'block');
                document.querySelectorAll('.owner-field').forEach(el => el.style.display = 'none');
                if(isActiveField) isActiveField.checked = employeeData.active === 'true'; 
            }

            unitField.value = employeeData.unit;
            
            const contractTypeSelect = employeeForm.querySelector('#contractType');
            if(contractTypeSelect) contractTypeSelect.value = employeeData.contractType || 'commission';
            const fixedSalaryInput = employeeForm.querySelector('#fixedSalary');
            if(fixedSalaryInput) fixedSalaryInput.value = (employeeData.fixedSalary || '').toString().replace(',', '.');
            const chairRentalInput = employeeForm.querySelector('#chairRentalFee');
            if(chairRentalInput) chairRentalInput.value = (employeeData.chairRental || '').toString().replace(',', '.');
            const serviceCommInput = employeeForm.querySelector('#serviceCommission');
            if(serviceCommInput) serviceCommInput.value = (employeeData.serviceCommission || '').toString().replace(',', '.');
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
            if(linkInfoText) linkInfoText.style.display = 'block'; // Mostra a dica de vínculo
            
            if (newBtnData) {
                const canRegular = newBtnData.dataset.canRegular === 'true';
                const canAdmin = newBtnData.dataset.canAdmin === 'true';
                
                if (!canRegular && canAdmin) {
                    limitBanner.innerHTML = `<span style="color: #dd6b20; font-weight: bold;"><i class="fas fa-info-circle"></i> Vaga Gratuita Administrativa</span>
                                             <p style="font-size: 0.85rem; color: #7b341e; margin-top: 5px;">Você atingiu o limite de barbeiros do plano. Liberação apenas para a vaga gratuita de Gerente ou Caixa.</p>`;
                    limitBanner.style.display = 'block';
                } else {
                    limitBanner.style.display = 'none';
                }
            }

            if (employeeForm) {
                employeeForm.reset();
                employeeForm.querySelector('input[name="action"]').value = 'create';
                employeeForm.querySelector('#employeeId').value = '';
                isOwnerInput.value = "False";
                
                if(employeeForm.querySelector('#contractType')) employeeForm.querySelector('#contractType').value = 'commission';
                if(employeeForm.querySelector('#fixedSalary')) employeeForm.querySelector('#fixedSalary').value = '';
                if(employeeForm.querySelector('#chairRentalFee')) employeeForm.querySelector('#chairRentalFee').value = '';
                if(employeeForm.querySelector('#serviceCommission')) employeeForm.querySelector('#serviceCommission').value = '';
                
                document.getElementById('passwordGroup').style.display = 'block';
                passwordField.required = true;
                emailField.required = true;
                saveEmployeeBtn.disabled = false;
                
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
                updateCheckboxLocks(); // Dispara as travas reativas
            }
        }
        
        if(typeof window.toggleContractFields === 'function') window.toggleContractFields();
        
        modal.style.display = 'flex';
        document.body.classList.add('modal-open');
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
        if (btn) openEmployeeModal({...btn.dataset});
    });

    const roleCheckboxes = document.querySelectorAll('input[name="roles"]');
    const sysAccess = document.getElementById('systemAccessCheckbox');
    
    function updatePermissions(isOwner = false) {
        if (gerenteCheckbox && caixaCheckbox) {
            if (gerenteCheckbox.checked) {
                caixaCheckbox.checked = false;
                caixaCheckbox.disabled = true;
                if(document.getElementById('label-role-caixa')) {
                    document.getElementById('label-role-caixa').style.opacity = "0.4";
                }
            } else {
                // Checagem segura via JSON (não deixa habilitar o Caixa se a vaga grátis já foi gasta E plano acabou)
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