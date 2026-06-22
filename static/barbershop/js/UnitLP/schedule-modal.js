document.addEventListener('DOMContentLoaded', function() {
    const scheduleModal = document.getElementById('scheduleModal');
    const authPromptModal = document.getElementById('authPromptModal');
    const appointmentsModal = document.getElementById('appointmentsModal');
    const scheduleBtn = document.getElementById('heroScheduleBtn');
    const floatScheduleBtn = document.getElementById('floatScheduleButton');

    const locationSelect = document.getElementById('locationSelect');
    const barberGrid = document.getElementById('dynamicBarberGrid');
    const serviceGrid = document.getElementById('serviceGrid');
    const dateInput = document.getElementById('appointmentDate');
    const timeSlotsGrid = document.getElementById('timeSlotsGrid');

    const BARBERSHOP_SLUG = window.location.pathname.split('/')[1];

    let bookingCache = {
        unit_id: null,
        barber_id: null,
        service_id: [],
        total_duration: 0,
        service_names: [],
        date: null,
        time: null
    };

    const stepsOrder = ['location', 'barber', 'service', 'datetime', 'confirm'];
    stepsOrder.forEach(step => {
        const el = document.getElementById(`step${step.charAt(0).toUpperCase() + step.slice(1)}`);
        if (el) el.style.display = 'none';
    });

    function openScheduleFlow() {
        if (typeof IS_AUTHENTICATED !== 'undefined' && !IS_AUTHENTICATED) {
            if(authPromptModal) {
                authPromptModal.style.display = 'flex';
                document.body.style.overflow = 'hidden';
            }
            return; 
        }

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

    if (locationSelect) locationSelect.addEventListener('change', triggerUnitChange);

    // 1. Busca Barbeiros
    async function triggerUnitChange() {
        const unitId = locationSelect.value;
        if (!unitId) return;
        
        bookingCache.unit_id = unitId;
        if(barberGrid) barberGrid.innerHTML = '<p style="text-align: center; width: 100%;"><i class="fas fa-spinner fa-spin"></i> Buscando barbeiros...</p>';
        if(serviceGrid) serviceGrid.innerHTML = '<p style="text-align: center; width: 100%; color: #7f8c8d;">Selecione um barbeiro primeiro.</p>';
        bookingCache.barber_id = null;

        try {
            const response = await fetch(`/${BARBERSHOP_SLUG}/api/barbers/?unit_id=${unitId}`);
            const data = await response.json();
            barberGrid.innerHTML = ''; 

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
                    <button type="button" class="select-barber-btn" data-id="${barber.id}">Selecionar</button>
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

    // 2. Busca Serviços (Transformado em Cards Customizados baseados no Banco de Dados)
    async function loadServices(barberId) {
        if(!serviceGrid) return;
        serviceGrid.innerHTML = '<p style="text-align: center; width: 100%;"><i class="fas fa-spinner fa-spin"></i> Buscando serviços...</p>';
        bookingCache.service_id = [];
        bookingCache.service_names = [];
        bookingCache.total_duration = 0;

        try {
            const response = await fetch(`/${BARBERSHOP_SLUG}/api/services/?barber_id=${barberId}`);
            const data = await response.json();
            serviceGrid.innerHTML = '';
            
            if (!data.services || data.services.length === 0) {
                serviceGrid.innerHTML = '<p style="text-align: center; width: 100%; color: #e74c3c;">Nenhum serviço cadastrado para este profissional.</p>';
                return;
            }

            data.services.forEach(service => {
                const card = document.createElement('div');
                card.className = 'service-card';
                card.dataset.id = service.id;
                card.dataset.duration = service.duration;
                card.dataset.name = service.name;
                card.innerHTML = `
                    <i class="${service.icon}"></i>
                    <h4 style="margin:0; font-size: 0.95rem;">${service.name}</h4>
                    <span class="service-price">R$ ${service.price.toFixed(2).replace('.', ',')}</span>
                    <span class="service-duration"><i class="far fa-clock"></i> ${service.duration} min</span>
                `;
                
                card.addEventListener('click', function() {
                    this.classList.toggle('selected');
                    const sId = this.dataset.id;
                    
                    if (this.classList.contains('selected')) {
                        bookingCache.service_id.push(sId);
                        bookingCache.service_names.push(this.dataset.name);
                        bookingCache.total_duration += parseInt(this.dataset.duration);
                    } else {
                        bookingCache.service_id = bookingCache.service_id.filter(id => id !== sId);
                        bookingCache.service_names = bookingCache.service_names.filter(name => name !== this.dataset.name);
                        bookingCache.total_duration -= parseInt(this.dataset.duration);
                    }
                });
                serviceGrid.appendChild(card);
            });
        } catch (error) {
            serviceGrid.innerHTML = '<p style="text-align: center; width: 100%; color: #e74c3c;">Erro ao carregar serviços.</p>';
        }
    }

    // 3. Listener do Calendário -> Consulta Horários
    if (dateInput) {
        dateInput.addEventListener('change', async function() {
            bookingCache.date = this.value;
            bookingCache.time = null; 
            
            if (!bookingCache.date) return;
            
            timeSlotsGrid.innerHTML = '<p style="grid-column: 1 / -1; text-align:center;"><i class="fas fa-spinner fa-spin"></i> Verificando agenda do barbeiro...</p>';
            
            try {
                const url = `/${BARBERSHOP_SLUG}/api/available-times/?barber_id=${bookingCache.barber_id}&date=${bookingCache.date}&duration=${bookingCache.total_duration}`;
                const response = await fetch(url);
                const data = await response.json();
                
                timeSlotsGrid.innerHTML = '';
                
                if (!data.slots || data.slots.length === 0) {
                    timeSlotsGrid.innerHTML = '<p style="grid-column: 1 / -1; text-align:center; color:#e53e3e; font-weight: bold;"><i class="fas fa-exclamation-triangle"></i> Profissional indisponível ou sem horário suficiente para os serviços selecionados neste dia.</p>';
                    return;
                }

                data.slots.forEach(time => {
                    const btn = document.createElement('button');
                    btn.type = 'button';
                    btn.className = 'time-slot-btn';
                    btn.innerHTML = `<i class="far fa-clock" style="margin-right: 5px;"></i> ${time}`;
                    
                    btn.addEventListener('click', function() {
                        document.querySelectorAll('.time-slot-btn').forEach(b => b.classList.remove('selected'));
                        this.classList.add('selected');
                        bookingCache.time = time;
                    });
                    timeSlotsGrid.appendChild(btn);
                });
                
            } catch(e) {
                timeSlotsGrid.innerHTML = '<p style="grid-column: 1 / -1; text-align:center; color:#e53e3e;">Erro de comunicação ao buscar horários.</p>';
            }
        });
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
            nextBtn.innerHTML = stepId === 'confirm' ? '<i class="fas fa-check-circle"></i> Confirmar Agendamento' : 'Próximo <i class="fas fa-arrow-right"></i>';
        }

        if(stepId === 'datetime') {
            if(dateInput.value) {
                dateInput.dispatchEvent(new Event('change'));
            }
        }

        if(stepId === 'confirm') captureState();
    }

    function captureState() {
        document.getElementById('summaryService').textContent = bookingCache.service_names.join(', ');
        document.getElementById('summaryLocation').textContent = locationSelect?.options[locationSelect.selectedIndex]?.text || '';
        document.getElementById('summaryBarber').textContent = document.querySelector('.barber-card.selected h4')?.textContent || '';
        
        const dataFormatada = bookingCache.date.split('-').reverse().join('/');
        document.getElementById('summaryDatetime').textContent = `${dataFormatada} às ${bookingCache.time}`;
    }

    // Transição de Passos e Validação
    document.querySelectorAll('#scheduleModal .next').forEach(btn => {
        btn.addEventListener('click', async function(e) {
            e.preventDefault();
            const currentStep = document.querySelector('.progress-step.active').dataset.step;
            const currentIndex = stepsOrder.indexOf(currentStep);

            if (currentStep === 'location' && (!bookingCache.unit_id || bookingCache.unit_id === "")) return window.alert("Selecione uma unidade para continuar.");
            if (currentStep === 'barber' && !bookingCache.barber_id) return window.alert("Selecione o profissional de sua preferência.");
            if (currentStep === 'service' && bookingCache.service_id.length === 0) return window.alert("Clique em pelo menos um serviço que deseja realizar.");
            
            if (currentStep === 'datetime') {
                if (!bookingCache.date) return window.alert("Por favor, selecione uma data no calendário.");
                if (!bookingCache.time) return window.alert("Por favor, selecione um dos horários disponíveis.");
            }

            if (currentStep === 'confirm') {
                if (!document.getElementById('acceptPolicy').checked) return window.alert("É necessário aceitar as políticas de cancelamento para prosseguir.");

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
                    
                    if (res.ok && result.status === 'success') {
                        window.Toast.fire({ icon: 'success', title: 'Agendamento confirmado com sucesso! Te esperamos lá.' });
                        setTimeout(() => window.location.reload(), 2000); 
                    } else {
                        window.Toast.fire({ icon: 'error', title: result.message || 'Erro ao agendar' });
                        btn.disabled = false;
                        btn.innerHTML = '<i class="fas fa-check-circle"></i> Confirmar Agendamento';
                    }
                } catch (err) {
                    window.Toast.fire({ icon: 'error', title: 'Falha de comunicação com o servidor.' });
                    btn.disabled = false;
                    btn.innerHTML = '<i class="fas fa-check-circle"></i> Confirmar Agendamento';
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