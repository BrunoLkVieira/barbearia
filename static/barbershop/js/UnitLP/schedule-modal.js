document.addEventListener('DOMContentLoaded', function() {
    const scheduleModal = document.getElementById('scheduleModal');
    const scheduleBtn = document.getElementById('heroScheduleBtn');
    const floatScheduleBtn = document.getElementById('floatScheduleButton');
    const closeScheduleModal = scheduleModal?.querySelector('.close-modal');

    // Elementos do DOM (Cascata)
    const locationSelect = document.getElementById('locationSelect');
    const barberGrid = document.querySelector('.barber-grid');
    const serviceSelect = document.getElementById('serviceSelect');

    // Variáveis de estado do Agendamento (Cache)
    let bookingCache = {
        unit_id: null,
        barber_id: null,
        service_id: null,
        date: null,
        time: null,
        is_existing_client: false
    };

    // Extrai o slug da barbearia da URL. Ex: /barbershop_slug/unit_slug/
    const pathParts = window.location.pathname.split('/').filter(p => p);
    const BARBERSHOP_SLUG = pathParts[0] || '';

    if (!scheduleModal || !scheduleBtn) return;

    function openModal() {
        scheduleModal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        
        // Se a unidade já vier pré-selecionada (ex: LP de uma unidade específica), dispara a busca de barbeiros
        if (locationSelect && locationSelect.value && locationSelect.value !== "none") {
            triggerUnitChange();
        }
    }

    function closeModal() {
        scheduleModal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }

    // ==========================================
    // LÓGICA DINÂMICA (CASCATA: Unidade -> Barbeiro -> Serviço)
    // ==========================================

    if (locationSelect) {
        locationSelect.addEventListener('change', triggerUnitChange);
    }

    // 1. Busca Barbeiros da Unidade
    async function triggerUnitChange() {
        const unitId = locationSelect.value;
        if (!unitId || unitId === "none") return;
        
        bookingCache.unit_id = unitId;
        
        // Estado de Loading
        if(barberGrid) barberGrid.innerHTML = '<p style="text-align: center; width: 100%;"><i class="fas fa-spinner fa-spin"></i> Buscando barbeiros...</p>';
        if(serviceSelect) serviceSelect.innerHTML = '<option value="none">Selecione um barbeiro primeiro</option>';
        bookingCache.barber_id = null;
        bookingCache.service_id = null;

        try {
            const response = await fetch(`/${BARBERSHOP_SLUG}/api/barbers/?unit_id=${unitId}`);
            const data = await response.json();
            
            barberGrid.innerHTML = ''; // Limpa o grid

            if (!data.barbers || data.barbers.length === 0) {
                barberGrid.innerHTML = '<p style="text-align: center; width: 100%; color: #e74c3c;">Nenhum barbeiro disponível nesta unidade.</p>';
                return;
            }

            data.barbers.forEach(barber => {
                const card = document.createElement('div');
                card.className = 'barber-card';
                card.innerHTML = `
                    <div class="barber-info">
                        <div class="employee-avatar" style="background-color: #1a2a3a; color: white; display: flex; align-items: center; justify-content: center; font-weight: bold; border-radius: 50%; width: 50px; height: 50px;">
                            ${barber.initials}
                        </div>
                        <h4>${barber.name}</h4>
                    </div>
                    <button type="button" class="select-barber-btn" data-id="${barber.id}">
                        <i class="fas fa-check"></i> Selecionar
                    </button>
                `;
                
                card.addEventListener('click', function() {
                    document.querySelectorAll('.barber-card').forEach(c => c.classList.remove('selected'));
                    this.classList.add('selected');
                    bookingCache.barber_id = barber.id;
                    
                    loadServices(barber.id);
                });
                
                barberGrid.appendChild(card);
            });
        } catch (error) {
            console.error('Erro:', error);
            barberGrid.innerHTML = '<p style="text-align: center; width: 100%; color: #e74c3c;">Erro ao carregar barbeiros.</p>';
        }
    }

    // 2. Busca Serviços do Barbeiro
    async function loadServices(barberId) {
        if(!serviceSelect) return;
        serviceSelect.innerHTML = '<option value="none" disabled selected>Buscando serviços...</option>';
        
        try {
            const response = await fetch(`/${BARBERSHOP_SLUG}/api/services/?barber_id=${barberId}`);
            const data = await response.json();
            
            serviceSelect.innerHTML = '';
            
            if (!data.services || data.services.length === 0) {
                serviceSelect.innerHTML = '<option value="none" disabled>Nenhum serviço cadastrado.</option>';
                return;
            }

            data.services.forEach(service => {
                const option = document.createElement('option');
                option.value = service.id;
                option.textContent = `${service.name} - R$ ${service.price.toFixed(2).replace('.', ',')} (${service.duration} min)`;
                serviceSelect.appendChild(option);
            });
        } catch (error) {
            console.error('Erro:', error);
            serviceSelect.innerHTML = '<option value="none" disabled>Erro ao carregar serviços.</option>';
        }
    }

    // ==========================================
    // NAVEGAÇÃO ENTRE PASSOS (STEPS)
    // ==========================================

    function showStep(stepId) {
        const steps = ['location', 'barber', 'service', 'datetime', 'confirm'];
        steps.forEach(step => {
            const stepElement = document.getElementById(`step${step.charAt(0).toUpperCase() + step.slice(1)}`);
            if (stepElement) stepElement.style.display = step === stepId ? 'block' : 'none';
        });
        updateProgress(stepId);
        updateNavigationButtons(stepId);
        captureState();
    }

    function captureState() {
        if (serviceSelect) {
            // Suporta seleção múltipla
            const selectedOptions = Array.from(serviceSelect.selectedOptions);
            if (selectedOptions.length > 0 && selectedOptions[0].value !== "none") {
                bookingCache.service_id = selectedOptions.map(opt => opt.value);
            }
        }
        
        bookingCache.date = document.getElementById('appointmentDate')?.value;
        bookingCache.time = document.getElementById('appointmentTime')?.value;
        
        // Renderiza o resumo no passo Confirm
        const summaryLoc = document.getElementById('summaryLocation');
        const summaryBarber = document.getElementById('summaryBarber');
        const summarySvc = document.getElementById('summaryService');
        const summaryDate = document.getElementById('summaryDatetime');

        if(summaryLoc) summaryLoc.textContent = locationSelect?.options[locationSelect.selectedIndex]?.text || 'N/A';
        if(summaryBarber) {
            const barberName = document.querySelector('.barber-card.selected h4')?.textContent;
            summaryBarber.textContent = barberName || 'N/A';
        }
        if(summarySvc && serviceSelect) {
            const selectedText = Array.from(serviceSelect.selectedOptions).map(opt => opt.text).join(', ');
            summarySvc.textContent = selectedText || 'N/A';
        }
        if(summaryDate) summaryDate.textContent = `${bookingCache.date || ''} às ${bookingCache.time || ''}`;
    }

    function updateProgress(currentStep) {
        const stepsOrder = ['location', 'barber', 'service', 'datetime', 'confirm'];
        const currentIndex = stepsOrder.indexOf(currentStep);

        document.querySelectorAll('.progress-step').forEach((step, index) => {
            step.classList.toggle('completed', index < currentIndex);
            step.classList.toggle('active', index === currentIndex);
        });
    }

    function updateNavigationButtons(currentStep) {
        const stepsOrder = ['location', 'barber', 'service', 'datetime', 'confirm'];
        const currentIndex = stepsOrder.indexOf(currentStep);
        const prevBtn = document.querySelector('.prev-step');
        const nextBtn = document.querySelector('#scheduleModal .next');
        
        if (prevBtn) prevBtn.style.display = currentIndex > 0 ? 'flex' : 'none';
        if (nextBtn) {
            nextBtn.style.display = 'flex';
            nextBtn.textContent = currentIndex === stepsOrder.length - 1 ? 'Confirmar Agendamento' : 'Próximo';
        }
    }

    // ==========================================
    // LAZY REGISTRATION & AUTH
    // ==========================================

    const phoneInput = document.getElementById('bookingPhone');
    const newClientFields = document.getElementById('newClientFields');
    const passwordField = document.getElementById('passwordField');
    const passwordLabel = document.getElementById('passwordLabel');

    if (phoneInput) {
        phoneInput.addEventListener('blur', async function() {
            const phone = this.value.replace(/\D/g, '');
            if (phone.length >= 10) {
                try {
                    const response = await fetch(`/${BARBERSHOP_SLUG}/api/check-phone/?phone=${phone}`);
                    const data = await response.json();
                    
                    passwordField.style.display = 'block';
                    
                    if (data.exists) {
                        bookingCache.is_existing_client = true;
                        newClientFields.style.display = 'none';
                        passwordLabel.textContent = 'Sua senha *';
                        document.getElementById('bookingName').removeAttribute('required');
                    } else {
                        bookingCache.is_existing_client = false;
                        newClientFields.style.display = 'block';
                        passwordLabel.textContent = 'Crie uma senha de acesso *';
                        document.getElementById('bookingName').setAttribute('required', 'required');
                    }
                } catch (error) {
                    console.error("Erro ao verificar telefone:", error);
                }
            }
        });
    }

    // ==========================================
    // CONTROLES DE BOTÃO
    // ==========================================

    document.querySelectorAll('#scheduleModal .next').forEach(btn => {
        btn.addEventListener('click', async function(e) {
            e.preventDefault();
            const currentStep = document.querySelector('.progress-step.active').dataset.step;
            const stepsOrder = ['location', 'barber', 'service', 'datetime', 'confirm'];
            const currentIndex = stepsOrder.indexOf(currentStep);

            captureState();

            // Validações por passo
            if (currentStep === 'location' && (!bookingCache.unit_id || bookingCache.unit_id === "none")) {
                alert("Selecione uma unidade."); return;
            }
            if (currentStep === 'barber' && !bookingCache.barber_id) {
                alert("Selecione um barbeiro."); return;
            }
            if (currentStep === 'service' && (!bookingCache.service_id || bookingCache.service_id.length === 0)) {
                alert("Selecione pelo menos um serviço."); return;
            }
            if (currentStep === 'datetime' && (!bookingCache.date || !bookingCache.time)) {
                alert("Selecione a data e o horário."); return;
            }

            if (currentStep === 'confirm') {
                const policyCheckbox = document.getElementById('acceptPolicy');
                if (!policyCheckbox?.checked) {
                    alert("Você precisa aceitar a política de cancelamento.");
                    return;
                }

                if (!phoneInput.value || !document.getElementById('bookingPassword').value) {
                    alert("Por favor, preencha seu celular e senha.");
                    return;
                }

                const payload = {
                    phone: phoneInput.value.replace(/\D/g, ''),
                    password: document.getElementById('bookingPassword').value,
                    name: document.getElementById('bookingName')?.value || '',
                    email: document.getElementById('bookingEmail')?.value || '',
                    cpf: document.getElementById('bookingCpf')?.value.replace(/\D/g, '') || '',
                    barber_id: bookingCache.barber_id,
                    service_id: bookingCache.service_id, 
                    date: bookingCache.date,
                    time: bookingCache.time
                };

                try {
                    btn.disabled = true;
                    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processando...';

                    const response = await fetch(`/${BARBERSHOP_SLUG}/api/process-booking/`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-CSRFToken': getCookie('csrftoken')
                        },
                        body: JSON.stringify(payload)
                    });
                    
                    const result = await response.json();
                    
                    if (response.ok) {
                        alert('Agendamento confirmado com sucesso!');
                        window.location.reload(); 
                    } else {
                        alert(result.message || 'Erro ao processar agendamento.');
                        btn.disabled = false;
                        btn.textContent = 'Confirmar Agendamento';
                    }
                } catch (error) {
                    console.error("Erro na transação:", error);
                    alert("Falha de comunicação com o servidor.");
                    btn.disabled = false;
                    btn.textContent = 'Confirmar Agendamento';
                }
            } else {
                const nextStep = stepsOrder[currentIndex + 1];
                showStep(nextStep);
            }
        });
    });

    document.querySelectorAll('.prev-step').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            const currentStep = document.querySelector('.progress-step.active').dataset.step;
            const stepsOrder = ['location', 'barber', 'service', 'datetime', 'confirm'];
            const currentIndex = stepsOrder.indexOf(currentStep);
            showStep(stepsOrder[currentIndex - 1]);
        });
    });

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

    scheduleBtn?.addEventListener('click', openModal);
    floatScheduleBtn?.addEventListener('click', openModal);
    closeScheduleModal?.addEventListener('click', closeModal);
    window.addEventListener('click', e => e.target === scheduleModal && closeModal());

    showStep('location');
});