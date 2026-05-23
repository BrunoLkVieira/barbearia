document.addEventListener('DOMContentLoaded', function() {
    const scheduleModal = document.getElementById('scheduleModal');
    const authPromptModal = document.getElementById('authPromptModal');
    const appointmentsModal = document.getElementById('appointmentsModal');
    const scheduleBtn = document.getElementById('heroScheduleBtn');
    const floatScheduleBtn = document.getElementById('floatScheduleButton');

    const locationSelect = document.getElementById('locationSelect');
    const barberGrid = document.getElementById('dynamicBarberGrid');
    const serviceSelect = document.getElementById('serviceSelect');

    const BARBERSHOP_SLUG = window.location.pathname.split('/')[1];

    let bookingCache = {
        unit_id: null,
        barber_id: null,
        service_id: [],
        date: null,
        time: null
    };

    // Inicializa todos os steps escondidos para evitar bug visual
    const stepsOrder = ['location', 'barber', 'service', 'datetime', 'confirm'];
    stepsOrder.forEach(step => {
        const el = document.getElementById(`step${step.charAt(0).toUpperCase() + step.slice(1)}`);
        if (el) el.style.display = 'none';
    });

    function openScheduleFlow() {
        // Trava 1: Se não tiver logado (Variável global gerada no HTML do Django)
        if (typeof IS_AUTHENTICATED !== 'undefined' && !IS_AUTHENTICATED) {
            if(authPromptModal) {
                authPromptModal.style.display = 'flex';
                document.body.style.overflow = 'hidden';
            }
            return; 
        }

        // Trava 2: Limite de 1 agendamento por vez. Direciona para o modal de resumo
        if (typeof HAS_ACTIVE_APPOINTMENT !== 'undefined' && HAS_ACTIVE_APPOINTMENT) {
            if(appointmentsModal) {
                appointmentsModal.style.display = 'flex';
                document.body.style.overflow = 'hidden';
            }
            return;
        }
        
        if(scheduleModal) {
            scheduleModal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
            showStep('location'); 
            
            if (locationSelect && locationSelect.value && locationSelect.value !== "") {
                triggerUnitChange();
            }
        }
    }

    scheduleBtn?.addEventListener('click', (e) => { e.preventDefault(); openScheduleFlow(); });
    floatScheduleBtn?.addEventListener('click', (e) => { e.preventDefault(); openScheduleFlow(); });

    if (locationSelect) {
        locationSelect.addEventListener('change', triggerUnitChange);
    }

    // 1. Unidade -> Busca Barbeiros
    async function triggerUnitChange() {
        const unitId = locationSelect.value;
        if (!unitId) return;
        
        bookingCache.unit_id = unitId;
        if(barberGrid) barberGrid.innerHTML = '<p style="text-align: center; width: 100%;"><i class="fas fa-spinner fa-spin"></i> Buscando barbeiros...</p>';
        if(serviceSelect) serviceSelect.innerHTML = '<option value="" disabled selected>Selecione um barbeiro primeiro</option>';
        bookingCache.barber_id = null;

        try {
            const response = await fetch(`/${BARBERSHOP_SLUG}/api/barbers/?unit_id=${unitId}`);
            const data = await response.json();
            barberGrid.innerHTML = ''; 

            if (!data.barbers || data.barbers.length === 0) {
                barberGrid.innerHTML = '<p style="text-align: center; width: 100%; color: #e74c3c;">Nenhum barbeiro disponível.</p>';
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
            barberGrid.innerHTML = '<p style="text-align: center; width: 100%; color: #e74c3c;">Erro ao carregar barbeiros.</p>';
        }
    }

    // 2. Barbeiro -> Busca Serviços Precificados
    async function loadServices(barberId) {
        if(!serviceSelect) return;
        serviceSelect.innerHTML = '<option value="" disabled selected>Buscando serviços...</option>';
        try {
            const response = await fetch(`/${BARBERSHOP_SLUG}/api/services/?barber_id=${barberId}`);
            const data = await response.json();
            serviceSelect.innerHTML = '';
            
            if (!data.services || data.services.length === 0) {
                serviceSelect.innerHTML = '<option value="" disabled>Nenhum serviço cadastrado.</option>';
                return;
            }

            data.services.forEach(service => {
                const option = document.createElement('option');
                option.value = service.id;
                option.textContent = `${service.name} - R$ ${service.price.toFixed(2).replace('.', ',')} (${service.duration} min)`;
                serviceSelect.appendChild(option);
            });
        } catch (error) {
            serviceSelect.innerHTML = '<option value="" disabled>Erro ao carregar serviços.</option>';
        }
    }

    function showStep(stepId) {
        stepsOrder.forEach(step => {
            const el = document.getElementById(`step${step.charAt(0).toUpperCase() + step.slice(1)}`);
            if (el) el.style.display = step === stepId ? 'block' : 'none';
        });

        document.querySelectorAll('.progress-step').forEach((step, index) => {
            step.classList.toggle('completed', index < stepsOrder.indexOf(stepId));
            step.classList.toggle('active', index === stepsOrder.indexOf(stepId));
        });

        const prevBtn = document.querySelector('.prev-step');
        const nextBtn = document.querySelector('#scheduleModal .next');
        
        if (prevBtn) prevBtn.style.display = stepsOrder.indexOf(stepId) > 0 ? 'flex' : 'none';
        if (nextBtn) {
            nextBtn.textContent = stepId === 'confirm' ? 'Confirmar Agendamento' : 'Próximo';
        }

        if(stepId === 'confirm') captureState();
    }

    function captureState() {
        if (serviceSelect) {
            const opts = Array.from(serviceSelect.selectedOptions);
            bookingCache.service_id = opts.map(opt => opt.value);
            document.getElementById('summaryService').textContent = opts.map(opt => opt.text).join(', ');
        }
        
        bookingCache.date = document.getElementById('appointmentDate')?.value;
        bookingCache.time = document.getElementById('appointmentTime')?.value;
        
        document.getElementById('summaryLocation').textContent = locationSelect?.options[locationSelect.selectedIndex]?.text || '';
        document.getElementById('summaryBarber').textContent = document.querySelector('.barber-card.selected h4')?.textContent || '';
        document.getElementById('summaryDatetime').textContent = `${bookingCache.date} às ${bookingCache.time}`;
    }

    // Transição de Passos e POST
    document.querySelectorAll('#scheduleModal .next').forEach(btn => {
        btn.addEventListener('click', async function(e) {
            e.preventDefault();
            const currentStep = document.querySelector('.progress-step.active').dataset.step;
            const currentIndex = stepsOrder.indexOf(currentStep);

            if (currentStep === 'location' && (!bookingCache.unit_id || bookingCache.unit_id === "")) return alert("Selecione uma unidade.");
            if (currentStep === 'barber' && !bookingCache.barber_id) return alert("Selecione um barbeiro.");
            
            if (currentStep === 'service') {
                const selectedOptions = Array.from(serviceSelect.selectedOptions);
                if (selectedOptions.length === 0 || selectedOptions[0].value === "") {
                    return alert("Selecione pelo menos um serviço.");
                }
                bookingCache.service_id = selectedOptions.map(opt => opt.value);
            }

            if (currentStep === 'datetime') {
                bookingCache.date = document.getElementById('appointmentDate').value;
                bookingCache.time = document.getElementById('appointmentTime').value;
                if (!bookingCache.date || !bookingCache.time) return alert("Selecione a data e o horário desejado.");
            }

            if (currentStep === 'confirm') {
                if (!document.getElementById('acceptPolicy').checked) return alert("Aceite a política de cancelamento para prosseguir.");

                const payload = {
                    unit_id: bookingCache.unit_id,
                    barber_id: bookingCache.barber_id,
                    service_id: bookingCache.service_id, 
                    date: bookingCache.date,
                    time: bookingCache.time
                };

                btn.disabled = true;
                btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processando...';

                try {
                    const res = await fetch(`/${BARBERSHOP_SLUG}/api/process-booking/`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-CSRFToken': getCookie('csrftoken')
                        },
                        body: JSON.stringify(payload)
                    });
                    const result = await res.json();
                    
                    if (res.ok) {
                        alert('Agendamento confirmado com sucesso!');
                        window.location.reload(); 
                    } else {
                        alert(result.message);
                        btn.disabled = false;
                        btn.textContent = 'Confirmar Agendamento';
                    }
                } catch (err) {
                    alert("Falha de comunicação com o servidor.");
                    btn.disabled = false;
                    btn.textContent = 'Confirmar Agendamento';
                }
            } else {
                showStep(stepsOrder[currentIndex + 1]);
            }
        });
    });

    document.querySelectorAll('.prev-step').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const currentStep = document.querySelector('.progress-step.active').dataset.step;
            showStep(stepsOrder[stepsOrder.indexOf(currentStep) - 1]);
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
});