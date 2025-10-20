document.addEventListener('DOMContentLoaded', function() {
    // Elementos do modal
    const scheduleModal = document.getElementById('scheduleModal');
    const scheduleBtns = [
        document.getElementById('heroScheduleBtn'),
        document.getElementById('floatingScheduleBtn')
    ].filter(Boolean);
    const closeScheduleModal = scheduleModal?.querySelector('.close-modal');
    
    // Verificação inicial dos elementos
    if (!scheduleModal || !closeScheduleModal) {
        console.error('Elementos essenciais do modal não encontrados');
        return;
    }

    // Salvar conteúdo original para reset
    const originalModalContent = scheduleModal.querySelector('.modal-content').innerHTML;

    // Dados da aplicação
    const locations = [
        { id: 'tribobo', name: 'Tribobó - São Gonçalo' },
        { id: 'centro', name: 'Centro - São Gonçalo' }
    ];
    
    const services = [
        { id: 'corte', name: 'Corte de Cabelo', price: 49.90 },
        { id: 'barba', name: 'Design de Barba', price: 35.00 },
        { id: 'completo', name: 'Corte + Barba', price: 79.90 }
    ];
    
    const barbers = [
        { id: 'raphael', name: 'Raphael Matias', photo: './assets/img/barbeiro1.jpg' },
        { id: 'marcos', name: 'Marcos Silva', photo: './assets/img/barbeiro2.jpg' }
    ];

    // Estado do agendamento
    const appointment = {
        location: null,
        service: null,
        barber: null,
        date: null,
        time: null
    };

    // Inicialização do sistema
    function init() {
        setupEventListeners();
        populateDropdowns();
        setDateLimits();
        populateBarbers();
    }

    // Configuração dos listeners de eventos
    function setupEventListeners() {
        // Eventos de abertura do modal
        scheduleBtns.forEach(btn => {
            btn.addEventListener('click', openModal);
        });

        // Eventos de fechamento do modal
        closeScheduleModal.addEventListener('click', closeModal);
        window.addEventListener('click', e => e.target === scheduleModal && closeModal());

        // Navegação entre passos
        document.querySelectorAll('.next-step').forEach(btn => {
            btn.addEventListener('click', handleNextStep);
        });

        document.querySelectorAll('.prev-step').forEach(btn => {
            btn.addEventListener('click', handlePrevStep);
        });

        // Eventos de formulário
        setupFormEventListeners();
    }

    function setupFormEventListeners() {
        document.getElementById('locationSelect')?.addEventListener('change', e => {
            appointment.location = e.target.value;
            hideWarning('locationSelect');
        });

        document.getElementById('serviceSelect')?.addEventListener('change', e => {
            appointment.service = e.target.value;
            hideWarning('serviceSelect');
        });

        document.getElementById('appointmentDate')?.addEventListener('change', e => {
            appointment.date = e.target.value;
            hideWarning('appointmentDate');
            updateAvailableTimes();
        });

        document.getElementById('appointmentTime')?.addEventListener('change', e => {
            appointment.time = e.target.value;
            hideWarning('appointmentTime');
        });
    }

    // Funções de manipulação de UI
    function showWarning(fieldId, message = 'Este campo é obrigatório') {
        const field = document.getElementById(fieldId);
        if (!field) return;
        
        hideWarning(fieldId);
        
        const warning = document.createElement('div');
        warning.className = 'field-warning';
        warning.textContent = message;
        warning.id = `${fieldId}-warning`;
        
        field.parentNode.insertBefore(warning, field.nextSibling);
        field.classList.add('field-error');
        field.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    function hideWarning(fieldId) {
        const warning = document.getElementById(`${fieldId}-warning`);
        if (warning) warning.remove();
        
        const field = document.getElementById(fieldId);
        if (field) field.classList.remove('field-error');
    }

    // Funções de população de dados
    function populateDropdowns() {
        populateSelect('locationSelect', locations, 'Selecione uma unidade');
        populateSelect('serviceSelect', services, 'Selecione um serviço');
    }

    function populateSelect(id, items, placeholder) {
        const select = document.getElementById(id);
        if (!select) return;

        select.innerHTML = `<option value="">${placeholder}</option>`;
        items.forEach(item => {
            const option = document.createElement('option');
            option.value = item.id;
            option.textContent = item.name + (item.price ? ` - R$ ${item.price.toFixed(2)}` : '');
            select.appendChild(option);
        });
    }

    function populateBarbers() {
        const container = document.getElementById('barberCardsContainer');
        if (!container) return;

        container.innerHTML = '<h3 class="barber-selection-title">Escolha seu barbeiro</h3>';
        
        if (barbers.length === 0) {
            container.innerHTML += '<p class="no-barbers">Nenhum barbeiro disponível</p>';
            return;
        }

        const barbersGrid = document.createElement('div');
        barbersGrid.className = 'barbers-grid';
        
        barbers.forEach(barber => {
            const barberCard = document.createElement('div');
            barberCard.className = 'barber-card';
            barberCard.innerHTML = `
                <div class="barber-card-inner">
                    <img src="${barber.photo}" alt="${barber.name}" class="barber-photo">
                    <div class="barber-info">
                        <h4>${barber.name}</h4>
                        <button class="select-barber-btn" data-id="${barber.id}">
                            <i class="fas fa-check"></i> Selecionar
                        </button>
                    </div>
                </div>
            `;
            barbersGrid.appendChild(barberCard);
        });

        container.appendChild(barbersGrid);

        // Configura seleção dos barbeiros
        setupBarberSelection();
    }

    function setupBarberSelection() {
        document.querySelectorAll('.select-barber-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const selectedBarberId = this.getAttribute('data-id');
                appointment.barber = selectedBarberId;
                
                document.querySelectorAll('.barber-card').forEach(card => {
                    card.classList.remove('selected');
                });
                
                this.closest('.barber-card').classList.add('selected');
                hideWarning('barberCardsContainer');
            });
        });
    }

    // Controle do modal
    function openModal() {
        resetAppointment();
        showStep('location');
        scheduleModal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    }

    function closeModal() {
        scheduleModal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }

    function resetAppointment() {
        Object.keys(appointment).forEach(key => {
            appointment[key] = null;
        });
        
        document.querySelectorAll('.barber-card').forEach(card => {
            card.classList.remove('selected');
        });
    }

    // Navegação entre passos
    function showStep(stepId) {
        const steps = ['location', 'barber', 'service', 'datetime', 'confirm'];
        steps.forEach(step => {
            const stepElement = document.getElementById(`step${step.charAt(0).toUpperCase() + step.slice(1)}`);
            if (stepElement) {
                stepElement.style.display = step === stepId ? 'block' : 'none';
            }
        });
        
        updateProgress(stepId);
        updateNavigationButtons(stepId);
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
        const nextBtn = document.querySelector('.next-step');
        
        if (prevBtn) prevBtn.style.display = currentIndex > 0 ? 'inline-block' : 'none';
        if (nextBtn) nextBtn.style.display = currentIndex < stepsOrder.length - 1 ? 'inline-block' : 'none';
        
        if (currentIndex === stepsOrder.length - 1) {
            setupConfirmationButton();
        } else {
            removeConfirmationButton();
        }
    }

    function setupConfirmationButton() {
        if (!document.getElementById('confirmAppointmentBtn')) {
            const confirmBtn = document.createElement('button');
            confirmBtn.id = 'confirmAppointmentBtn';
            confirmBtn.className = 'btn confirm-btn';
            confirmBtn.textContent = 'Confirmar Agendamento';
            confirmBtn.addEventListener('click', confirmAppointment);
            
            const footer = document.querySelector('.modal-footer');
            if (footer) footer.appendChild(confirmBtn);
        }
    }

    function removeConfirmationButton() {
        const confirmBtn = document.getElementById('confirmAppointmentBtn');
        if (confirmBtn) confirmBtn.remove();
    }

    function handleNextStep(e) {
        e.preventDefault();
        const currentStep = document.querySelector('.progress-step.active').dataset.step;
        const stepsOrder = ['location', 'barber', 'service', 'datetime', 'confirm'];
        const currentIndex = stepsOrder.indexOf(currentStep);
        const nextStep = stepsOrder[currentIndex + 1];

        if (!validateStep(currentStep)) {
            return;
        }

        if (nextStep === 'confirm') {
            updateSummary();
        }

        showStep(nextStep);
    }

    function handlePrevStep(e) {
        e.preventDefault();
        const currentStep = document.querySelector('.progress-step.active').dataset.step;
        const stepsOrder = ['location', 'barber', 'service', 'datetime', 'confirm'];
        const currentIndex = stepsOrder.indexOf(currentStep);
        const prevStep = stepsOrder[currentIndex - 1];
        showStep(prevStep);
    }

    // Validações
    function validateStep(step) {
        const validations = {
            location: () => validateField('location', 'locationSelect'),
            barber: () => validateField('barber', 'barberCardsContainer', 'Selecione um barbeiro'),
            service: () => validateField('service', 'serviceSelect'),
            datetime: () => validateDateTime()
        };
        
        return validations[step] ? validations[step]() : true;
    }

    function validateField(field, elementId, message = 'Este campo é obrigatório') {
        if (!appointment[field]) {
            showWarning(elementId, message);
            return false;
        }
        return true;
    }

    function validateDateTime() {
        let isValid = true;
        
        if (!appointment.date) {
            showWarning('appointmentDate');
            isValid = false;
        }
        
        if (!appointment.time) {
            showWarning('appointmentTime');
            isValid = false;
        } else {
            const hour = parseInt(appointment.time.split(':')[0]);
            if (hour < 9 || hour >= 19) {
                showWarning('appointmentTime', 'Horário deve ser entre 09:00 e 19:00');
                isValid = false;
            }
        }
        
        return isValid;
    }

    function validatePolicyAcceptance() {
        const policyCheckbox = document.getElementById('acceptPolicy');
        
        if (policyCheckbox && !policyCheckbox.checked) {
            return false;
        }
        
        return true;
    }

    // Resumo e confirmação
    function updateSummary() {
        const fields = {
            location: locations.find(l => l.id === appointment.location)?.name,
            barber: barbers.find(b => b.id === appointment.barber)?.name,
            service: services.find(s => s.id === appointment.service)?.name,
            datetime: formatAppointmentDateTime()
        };

        Object.entries(fields).forEach(([key, value]) => {
            const element = document.getElementById(`summary${key.charAt(0).toUpperCase() + key.slice(1)}`);
            if (element) element.textContent = value || 'Não selecionado';
        });
    }

    function formatAppointmentDateTime() {
        if (!appointment.date || !appointment.time) return 'Não selecionado';
        
        const date = new Date(appointment.date);
        const formattedDate = date.toLocaleDateString('pt-BR', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
        
        return `${formattedDate} às ${appointment.time}`;
    }

    function confirmAppointment() {
        if (!validatePolicyAcceptance()) {
            return;
        }

        showConfirmation();
    }

    function showConfirmation() {
        const modalContent = scheduleModal.querySelector('.modal-content');
        
        modalContent.innerHTML = `
            <div class="confirmation-container">
                <div class="confirmation-header">
                    <i class="fas fa-check-circle confirmation-icon"></i>
                    <h2>Agendamento Confirmado!</h2>
                </div>
                <div class="confirmation-body">
                    ${generateConfirmationDetails()}
                    <div class="confirmation-note">
                        <p>Você receberá um e-mail de confirmação com os detalhes.</p>
                    </div>
                </div>
                <div class="confirmation-footer">
                    <button id="closeConfirmation" class="btn confirmation-btn">Fechar</button>
                </div>
            </div>
        `;

        document.getElementById('closeConfirmation').addEventListener('click', () => {
            closeModal();
            resetModalContent();
        });
    }

    function generateConfirmationDetails() {
        const details = {
            Local: locations.find(l => l.id === appointment.location)?.name,
            Barbeiro: barbers.find(b => b.id === appointment.barber)?.name,
            Serviço: services.find(s => s.id === appointment.service)?.name,
            'Data e Hora': formatAppointmentDateTime()
        };

        return Object.entries(details)
            .filter(([_, value]) => value)
            .map(([label, value]) => `
                <div class="confirmation-detail">
                    <span class="detail-label">${label}:</span>
                    <span class="detail-value">${value}</span>
                </div>
            `).join('');
    }

    function resetModalContent() {
        setTimeout(() => {
            scheduleModal.querySelector('.modal-content').innerHTML = originalModalContent;
            init();
        }, 300);
    }

    // Funções para controle de datas e horários
    function setDateLimits() {
        const today = new Date();
        const maxDate = new Date();
        maxDate.setDate(today.getDate() + 7); // 7 dias no futuro
        
        const dateInput = document.getElementById('appointmentDate');
        if (dateInput) {
            dateInput.setAttribute('min', today.toISOString().split('T')[0]);
            dateInput.setAttribute('max', maxDate.toISOString().split('T')[0]);
        }
    }

    function updateAvailableTimes() {
        if (!appointment.date) return;
        
        const timeSelect = document.getElementById('appointmentTime');
        if (!timeSelect) return;
        
        // Limpa opções existentes
        timeSelect.innerHTML = '<option value="">Selecione um horário</option>';
        
        // Horários disponíveis (das 9h às 19h, a cada 30 minutos)
        const availableTimes = [];
        for (let hour = 9; hour < 19; hour++) {
            availableTimes.push(`${hour.toString().padStart(2, '0')}:00`);
            availableTimes.push(`${hour.toString().padStart(2, '0')}:30`);
        }
        
        // Adiciona opções ao select
        availableTimes.forEach(time => {
            const option = document.createElement('option');
            option.value = time;
            option.textContent = time;
            timeSelect.appendChild(option);
        });
    }

    // Inicializar
    init();
});