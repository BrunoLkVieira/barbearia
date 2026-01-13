// ===================================================================
// ARQUIVO JAVASCRIPT COMPLETO E CORRIGIDO
// ===================================================================

// --- Declaração de constantes dos modais ---
const editModal = document.getElementById('editModal');
const editWorkdayForm = document.getElementById('editWorkdayForm');
const vacationModal = document.getElementById('vacationModal');
const editVacationModal = document.getElementById('editVacationModal');
const createHolidayModal = document.getElementById('createHolidayModal');
const editHolidayModalEl = document.getElementById('editHolidayModal');
const editHolidayForm = document.getElementById('editHolidayForm');


// --- Lógica a ser executada quando a página carregar ---
document.addEventListener('DOMContentLoaded', function () {
    
    // 1. Definição do TOAST (para o sucesso, igual ao employee.html)
    const Toast = Swal.mixin({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3500,
        timerProgressBar: true,
        didOpen: (toast) => {
            toast.addEventListener('mouseenter', Swal.stopTimer)
            toast.addEventListener('mouseleave', Swal.resumeTimer)
        }
    });

    // Lógica do botão "Salvar Alterações" do modal de edição de disponibilidade
    // ===================================================================
    // ⬇️ INÍCIO DA MODIFICAÇÃO PRINCIPAL ⬇️
    // ===================================================================
    
    if (editModal) {
        const saveButton = editModal.querySelector('.edit-modal-footer .btn-primary');
        if (saveButton && editWorkdayForm) {
            
            saveButton.addEventListener('click', function() {
                
                const formData = new FormData(editWorkdayForm);
                const csrfToken = editWorkdayForm.querySelector('[name=csrfmiddlewaretoken]').value;

                // 2. Envia os dados via fetch
                fetch(window.location.href, { 
                    method: 'POST',
                    body: formData,
                    headers: { 'X-CSRFToken': csrfToken }
                })
                .then(response => {
                    if (!response.ok) {
                        return response.json().then(errData => {
                            throw errData; 
                        });
                    }
                    return response.json(); 
                }) 
                .then(data => {
                    if (data.status === 'success') {
                        
                        // ==================================
                        // ⬇️ CORREÇÃO DE TIMING ⬇️
                        // ==================================
                        
                        // 1. FECHA O MODAL
                        closeEditModal();
                        
                        // 2. RODA O TOAST NO PRÓXIMO "FRAME" DE RENDERIZAÇÃO
                        requestAnimationFrame(() => {
                            // Damos 1ms de garantia extra
                            setTimeout(() => {
                                // 2a. MOSTRA O TOAST
                                Toast.fire({
                                    icon: 'success',
                                    title: data.message || 'Disponibilidade atualizada!'
                                });
                            
                                // 2b. AGENDA O RELOAD
                                setTimeout(() => {
                                    window.location.reload();
                                }, 1500); 
                            }, 1); 
                        });
                        
                        // ==================================
                        // ⬆️ FIM DA CORREÇÃO ⬆️
                        // ==================================

                    } else {
                        // ERRO (Req 2) - vindo da view com status 200
                        let errorHtml = '<ul style="text-align: left; list-style-position: inside; padding-left: 10px;">';
                        if (data.errors && Array.isArray(data.errors)) {
                            data.errors.forEach(error => {
                                errorHtml += `<li>${error}</li>`;
                            });
                        } else {
                            errorHtml += `<li>Erro desconhecido.</li>`;
                        }
                        errorHtml += '</ul>';

                        Swal.fire({
                            icon: 'error',
                            title: 'Erros Encontrados',
                            html: errorHtml,
                            confirmButtonText: 'OK' 
                        });
                    }
                })
                .catch(errorDataOrNetworkError => {
                    // ERRO (Req 2) - vindo de um status 4xx, 5xx ou erro de rede
                    console.error('Erro no fetch:', errorDataOrNetworkError);
                    
                    let errorHtml = '<ul style="text-align: left; list-style-position: inside; padding-left: 10px;">';
                    
                    if (errorDataOrNetworkError && errorDataOrNetworkError.errors && Array.isArray(errorDataOrNetworkError.errors)) {
                        errorDataOrNetworkError.errors.forEach(error => {
                            errorHtml += `<li>${error}</li>`;
                        });
                    } else if (errorDataOrNetworkError && errorDataOrNetworkError.message) {
                        errorHtml += `<li>${errorDataOrNetworkError.message}</li>`;
                    } else {
                        errorHtml += `<li>Ocorreu um erro de conexão. Tente novamente.</li>`;
                    }
                    errorHtml += '</ul>';

                    // Mostra o alerta centralizado e NÃO fecha o modal
                    Swal.fire({
                        icon: 'error',
                        title: 'Erro ao Salvar',
                        html: errorHtml,
                        confirmButtonText: 'OK'
                    });
                });
            });
        }
    }
    // ===================================================================
    // ⬆️ FIM DA MODIFICAÇÃO PRINCIPAL ⬆️
    // ===================================================================


    // Inicializa a aba "Manhã" como ativa por padrão
    const morningSelector = document.querySelector('.barber-selector-item:first-child');
    if (morningSelector) {
        morningSelector.click();
    } else {
        document.querySelectorAll('.day-edit.morning').forEach(day => day.style.display = 'flex');
        document.querySelectorAll('.day-edit.afternoon').forEach(day => day.style.display = 'none');
    }

    // Lógica do modal de edição de feriados (código original preservado e corrigido)
    if (editHolidayModalEl && editHolidayForm) {
        window.editHolidayModal = function(holidayId, name, date) {
            document.getElementById('editHolidayId').value = holidayId;
            editHolidayModalEl.querySelector('input[name="name"]').value = name;
            editHolidayModalEl.querySelector('input[name="date"]').value = date;
            
            editHolidayModalEl.style.display = 'flex';
            document.body.style.overflow = 'hidden';
        };
    
        window.closeEditHolidayModal = function() {
            editHolidayModalEl.style.display = 'none';
            document.body.style.overflow = '';
        };
    
        editHolidayForm.addEventListener('submit', async function(e) {
            e.preventDefault();
    
            const formData = new FormData(this);
            const csrfToken = this.querySelector('[name=csrfmiddlewaretoken]').value;
    
            try {
                const response = await fetch(window.location.href, {
                    method: 'POST',
                    headers: {
                        'X-CSRFToken': csrfToken
                    },
                    body: formData
                });
    
                if (response.ok) {
                    
                    // ==================================
                    // ⬇️ CORREÇÃO DE BUG E TIMING ⬇️
                    // ==================================

                    // 1. FECHA O MODAL
                    closeEditHolidayModal();

                    // 2. RODA O TOAST NO PRÓXIMO "FRAME"
                    requestAnimationFrame(() => {
                        setTimeout(() => {
                            // 2a. MOSTRA O TOAST
                            Toast.fire({
                                icon: 'success',
                                title: 'Dia atualizado!'
                            });
                            // 2b. AGENDA O RELOAD
                            setTimeout(() => window.location.reload(), 1500);
                        }, 1);
                    });

                    // ==================================
                    // ⬆️ FIM DA CORREÇÃO ⬆️
                    // ==================================

                } else {
                    // Erro centralizado (não fecha o modal)
                    const errorData = await response.json();
                    let errorHtml = '<ul>';
                    if (errorData.errors && Array.isArray(errorData.errors)) {
                        errorData.errors.forEach(e => errorHtml += `<li>${e}</li>`);
                    } else {
                        errorHtml += '<li>Erro ao salvar.</li>';
                    }
                    errorHtml += '</ul>';
                    Swal.fire({
                        icon: 'error',
                        title: 'Erros Encontrados',
                        html: errorHtml
                    });
                }
            } catch (error) {
                Swal.fire({
                    icon: 'error',
                    title: 'Erro de conexão',
                    text: error.message
                });
            }
        });
    }
});


// ===================================================================
// BLOCO DE CÓDIGO DO MODAL "EDITAR DISPONIBILIDADE" (VERSÃO FINAL)
// ===================================================================

/**
 * Função Central: Atualiza o visual de um TURNO específico (manhã ou tarde).
 */
function updatePeriodVisuals(weekday, period, isAvailable) {
    const periodDiv = document.querySelector(`.day-edit[data-weekday="${weekday}"][data-period="${period}"]`);
    if (!periodDiv) return;

    const checkbox = periodDiv.querySelector('input[type="checkbox"]');
    if (checkbox) checkbox.checked = isAvailable;

    const timeInputs = periodDiv.querySelectorAll('.time-input');
    if (isAvailable) {
        periodDiv.classList.remove('off');
        periodDiv.classList.add('active');
        timeInputs.forEach(input => input.disabled = false);
    } else {
        periodDiv.classList.remove('active');
        periodDiv.classList.add('off');
        timeInputs.forEach(input => input.disabled = true);
    }
}

/**
 * Lida com o clique em qualquer checkbox de turno (manhã/tarde).
 */
function handleToggleClick(checkboxElement) {
    const dayDiv = checkboxElement.closest('.day-edit');
    if (!dayDiv) return;

    const weekday = dayDiv.getAttribute('data-weekday');
    const period = dayDiv.getAttribute('data-period');
    const isNowAvailable = checkboxElement.checked;
    
    // Atualiza o visual do período que foi clicado
    updatePeriodVisuals(weekday, period, isNowAvailable);
}


/**
 * Função Principal: Abre o modal e o preenche com os dados corretos do banco de dados.
 */
function openEditModal(employeeId) {
    if (!editWorkdayForm || typeof workdaysData === 'undefined') {
        console.error("Formulário ou dados de horários não encontrados!");
        return;
    }

    // Preenche o ID do funcionário no campo hidden do formulário
    document.getElementById('formEmployeeId').value = employeeId;
    const employeeWorkdays = workdaysData[employeeId];

    // Itera por todos os dias da semana (0=Dom a 6=Sáb)
    for (let i = 0; i < 7; i++) {
        const dayData = employeeWorkdays ? employeeWorkdays[i] : null;
        
        const morningDiv = document.querySelector(`.day-edit[data-weekday="${i}"][data-period="morning"]`);
        const afternoonDiv = document.querySelector(`.day-edit[data-weekday="${i}"][data-period="afternoon"]`);
        
        if (dayData) {
            // Atualiza o visual e os horários para o turno da MANHÃ
            updatePeriodVisuals(i, 'morning', dayData.morning_available);
            if (morningDiv) {
                morningDiv.querySelector('[name^="start_morning_work"]').value = dayData.start_morning_work || '';
                morningDiv.querySelector('[name^="end_morning_work"]').value = dayData.end_morning_work || '';
            }
            
            // Atualiza o visual e os horários para o turno da TARDE
            updatePeriodVisuals(i, 'afternoon', dayData.afternoon_available);
            if (afternoonDiv) {
                afternoonDiv.querySelector('[name^="start_afternoon_work"]').value = dayData.start_afternoon_work || '';
                afternoonDiv.querySelector('[name^="end_afternoon_work"]').value = dayData.end_afternoon_work || '';
            }
        } else {
            // Se, por algum motivo, não houver dados para o dia, desativa ambos os turnos
            updatePeriodVisuals(i, 'morning', false);
            updatePeriodVisuals(i, 'afternoon', false);
        }
    }
    
    // Exibe o modal
    editModal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function closeEditModal() {
    if(editModal) {
        editModal.style.display = 'none';
        document.body.style.overflow = '';
    }
}

// Lógica para alternar entre as abas "Manhã" e "Tarde" (código original)
document.querySelectorAll('.barber-selector-item').forEach(item => {
    item.addEventListener('click', function() {
        document.querySelectorAll('.barber-selector-item').forEach(i => i.classList.remove('active'));
        this.classList.add('active');
        
        const isMorning = this.textContent.trim() === 'Manhã';
        
        if (isMorning) {
            document.querySelectorAll('.day-edit.morning').forEach(day => day.style.display = 'flex');
            document.querySelectorAll('.day-edit.afternoon').forEach(day => day.style.display = 'none');
        } else {
            document.querySelectorAll('.day-edit.morning').forEach(day => day.style.display = 'none');
            document.querySelectorAll('.day-edit.afternoon').forEach(day => day.style.display = 'flex');
        }
    });
});




// ============================================================
// CÓDIGO ORIGINAL PARA OS OUTROS MODAIS (PRESERVADO)
// ============================================================

// ========== MODAL DE FÉRIAS ==========
function openVacationModal() {
    if (vacationModal) {
        vacationModal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
}

function closeVacationModal() {
    if (vacationModal) {
        vacationModal.style.display = 'none';
        document.body.style.overflow = '';
    }
}

// ========== EDITAR MODAL DE FÉRIAS ==========
function openEditVacationModal() {
    if (editVacationModal) {
        editVacationModal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
}

function closeEditVacationModal() {
    if (editVacationModal) {
        editVacationModal.style.display = 'none';
        document.body.style.overflow = '';
    }
}

// ========== MODAL DE FERIADO DA BARBEARIA ==========
function openHolidayModal() {
    if (createHolidayModal) {
        createHolidayModal.style.display = 'flex';
    }
}

function closeHolidayModal() {
    if (createHolidayModal) {
        createHolidayModal.style.display = 'none';
    }
}