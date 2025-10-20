class ModalManager {
    constructor() {
        this.activeModal = null;
        this.modals = [];
        this.currentStep = null;
        
        this.stepSizes = {
            'location': '500px',
            'payment': '600px',
            'service': '500px',
            'barber': '500px',
            'datetime': '550px',
            'confirm': '700px'
        };

        // Dados de exemplo para validação
        this.appointmentData = {
            location: null,
            paymentMethod: null,
            service: null,
            barber: null,
            date: null,
            time: null
        };
    }
    

    registerModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            this.modals.push(modalId);
            
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeModal(modalId);
                }
            });

            if (modalId === 'scheduleModal') {
                this.setupStepNavigation(modal);
                this.setupFormListeners();
            }
        }
    }

    setupFormListeners() {
        // Listeners para atualizar os dados do agendamento
        document.getElementById('locationSelect')?.addEventListener('change', (e) => {
            this.appointmentData.location = e.target.value;
            this.hideWarning('locationSelect');
        });

        document.getElementById('usePlanToggle')?.addEventListener('change', (e) => {
            document.getElementById('paymentMethods').style.display = 
                e.target.checked ? 'none' : 'block';
            this.appointmentData.paymentMethod = e.target.checked ? 'plan' : null;
            if (e.target.checked) this.hideWarning('paymentMethods');
        });

        document.querySelectorAll('input[name="paymentMethod"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                if (e.target.checked) {
                    this.appointmentData.paymentMethod = e.target.value;
                    this.hideWarning('paymentMethods');
                }
            });
        });

        document.getElementById('serviceSelect')?.addEventListener('change', (e) => {
            this.appointmentData.service = e.target.value;
            this.hideWarning('serviceSelect');
            this.populateBarbers(e.target.value);
        });

        document.getElementById('barberSelect')?.addEventListener('change', (e) => {
            this.appointmentData.barber = e.target.value;
            this.hideWarning('barberSelect');
        });

        document.getElementById('appointmentDate')?.addEventListener('change', (e) => {
            this.appointmentData.date = e.target.value;
            this.hideWarning('appointmentDate');
        });

        document.getElementById('appointmentTime')?.addEventListener('change', (e) => {
            this.appointmentData.time = e.target.value;
            this.hideWarning('appointmentTime');
        });

        // Listener para o botão de confirmar agendamento
        document.addEventListener('click', (e) => {
            if (e.target.id === 'confirmAppointmentBtn') {
                this.confirmAppointment();
            }
        });
    }

    populateBarbers(serviceId) {
        const barbers = [
            { id: 'raphael', name: 'Raphael Matias', specialties: ['corte', 'completo'] },
            { id: 'lucas', name: 'Lucas Lopes', specialties: ['barba'] }
        ];

        const select = document.getElementById('barberSelect');
        if (!select) return;

        select.innerHTML = '<option value="">Selecione um barbeiro</option>';
        const availableBarbers = barbers.filter(b => b.specialties.includes(serviceId));

        if (availableBarbers.length === 0) {
            const option = document.createElement('option');
            option.textContent = 'Nenhum barbeiro disponível';
            option.disabled = true;
            select.appendChild(option);
            return;
        }

        availableBarbers.forEach(barber => {
            const option = document.createElement('option');
            option.value = barber.id;
            option.textContent = barber.name;
            select.appendChild(option);
        });
    }

    setupStepNavigation(modal) {
        const modalContent = modal.querySelector('.modal-content');
        
        modal.addEventListener('click', (e) => {
            if (e.target.classList.contains('next-step') || e.target.classList.contains('prev-step')) {
                const currentStep = this.currentStep;
                let nextStep;
                
                if (e.target.classList.contains('next-step')) {
                    // Validar antes de avançar
                    if (!this.validateStep(currentStep)) {
                        return;
                    }
                    
                    nextStep = e.target.getAttribute('data-next') || 
                              this.getNextStep(currentStep);
                } else {
                    nextStep = e.target.getAttribute('data-prev') || 
                              this.getPrevStep(currentStep);
                }
                
                if (nextStep) {
                    this.showStep(currentStep, nextStep);
                    this.updateFooterButtons(nextStep);
                    this.adjustModalSize(modalContent, nextStep);
                    
                    // Atualizar resumo se for para a etapa de confirmação
                    if (nextStep === 'confirm') {
                        this.updateSummary();
                    }
                }
            }
        });

        // Inicializar
        this.showStep(null, 'location');
        this.updateFooterButtons('location');
        this.adjustModalSize(modalContent, 'location');
    }

    validateStep(step) {
        const validations = {
            location: () => {
                if (!this.appointmentData.location) {
                    this.showWarning('locationSelect', 'Selecione uma unidade');
                    return false;
                }
                return true;
            },
            payment: () => {
                const usePlan = document.getElementById('usePlanToggle')?.checked;
                if (!usePlan && !this.appointmentData.paymentMethod) {
                    this.showWarning('paymentMethods', 'Selecione uma forma de pagamento');
                    return false;
                }
                return true;
            },
            service: () => {
                if (!this.appointmentData.service) {
                    this.showWarning('serviceSelect', 'Selecione um serviço');
                    return false;
                }
                return true;
            },
            barber: () => {
                if (!this.appointmentData.barber) {
                    this.showWarning('barberSelect', 'Selecione um barbeiro');
                    return false;
                }
                return true;
            },
            datetime: () => {
                let isValid = true;
                if (!this.appointmentData.date) {
                    this.showWarning('appointmentDate', 'Selecione uma data');
                    isValid = false;
                }
                if (!this.appointmentData.time) {
                    this.showWarning('appointmentTime', 'Selecione um horário');
                    isValid = false;
                }
                return isValid;
            }
        };
        
        return validations[step] ? validations[step]() : true;
    }

    showWarning(fieldId, message = 'Este campo é obrigatório') {
        const field = document.getElementById(fieldId);
        if (!field) return;
        
        // Remove avisos existentes
        this.hideWarning(fieldId);
        
        // Cria elemento de aviso
        const warning = document.createElement('div');
        warning.className = 'field-warning';
        warning.textContent = message;
        warning.id = `${fieldId}-warning`;
        
        // Insere após o campo
        field.parentNode.insertBefore(warning, field.nextSibling);
        
        // Adiciona classe de erro ao campo
        field.classList.add('field-error');
        
        // Rolagem suave para o campo com erro
        field.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    hideWarning(fieldId) {
        const warning = document.getElementById(`${fieldId}-warning`);
        if (warning) warning.remove();
        
        const field = document.getElementById(fieldId);
        if (field) field.classList.remove('field-error');
    }

    updateSummary() {
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
            { id: 'raphael', name: 'Raphael Matias' },
            { id: 'lucas', name: 'Lucas Lopes' }
        ];

        const fields = {
            location: locations.find(l => l.id === this.appointmentData.location)?.name,
            payment: this.getPaymentMethodName(this.appointmentData.paymentMethod),
            service: services.find(s => s.id === this.appointmentData.service)?.name,
            barber: barbers.find(b => b.id === this.appointmentData.barber)?.name,
            datetime: this.appointmentData.date && this.appointmentData.time 
                ? `${this.formatDate(this.appointmentData.date)} às ${this.appointmentData.time}`
                : 'Não selecionado'
        };

        Object.entries(fields).forEach(([key, value]) => {
            const element = document.getElementById(`summary${key.charAt(0).toUpperCase() + key.slice(1)}`);
            if (element) element.textContent = value || 'Não selecionado';
        });
    }

    getPaymentMethodName(method) {
        const methods = {
            credit: 'Cartão de crédito',
            pix: 'PIX',
            cash: 'Dinheiro',
            plan: 'Plano ativo'
        };
        return methods[method] || 'Não selecionado';
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('pt-BR');
    }

    confirmAppointment() {
        // Validar política de cancelamento
        if (!document.getElementById('acceptPolicy')?.checked) {
            alert('Por favor, aceite a política de cancelamento para continuar');
            return;
        }

        // Validar horário
        if (!this.validateAppointmentTime()) {
            alert('Selecione um horário entre 09:00 e 19:00');
            this.showStep('confirm', 'datetime');
            this.updateFooterButtons('datetime');
            this.adjustModalSize(document.querySelector('#scheduleModal .modal-content'), 'datetime');
            return;
        }

        // Mostrar confirmação
        this.showConfirmation();
    }

    validateAppointmentTime() {
        if (!this.appointmentData.time) return false;
        const hour = parseInt(this.appointmentData.time.split(':')[0]);
        return hour >= 9 && hour < 19;
    }

    showConfirmation() {
        const modal = document.getElementById('scheduleModal');
        if (!modal) return;

        const modalContent = modal.querySelector('.modal-content');
        const hasFontAwesome = document.fonts?.check('1em "Font Awesome 6 Free"');
        
        modalContent.innerHTML = `
            <div class="confirmation-container">
                <button class="close-modal" aria-label="Fechar modal">&times;</button>
                <div class="confirmation-header">
                    ${hasFontAwesome 
                        ? '<i class="fas fa-check-circle confirmation-icon"></i>' 
                        : '<div class="confirmation-icon">✓</div>'}
                    <h2>Agendamento Confirmado!</h2>
                </div>
                <div class="confirmation-body">
                    <p>Seu agendamento foi realizado com sucesso!</p>
                    <div class="confirmation-details">
                        <p>Você receberá um e-mail de confirmação com todos os detalhes.</p>
                    </div>
                </div>
                <div class="confirmation-footer">
                    <button id="closeConfirmation" class="btn confirmation-btn">Fechar</button>
                </div>
            </div>
        `;

        // Adicionar listener para fechar a confirmação
        document.getElementById('closeConfirmation').addEventListener('click', () => {
            this.closeModal('scheduleModal');
            this.resetAppointmentData();
        });

        // Ajustar tamanho do modal
        modalContent.style.width = '500px';
    }

    resetAppointmentData() {
        this.appointmentData = {
            location: null,
            paymentMethod: null,
            service: null,
            barber: null,
            date: null,
            time: null
        };
    }

    showStep(currentStep, nextStep) {
        if (currentStep) {
            document.getElementById(`step${this.capitalize(currentStep)}`).classList.remove('active');
            document.querySelector(`.progress-step[data-step="${currentStep}"]`).classList.remove('active');
        }
        
        document.getElementById(`step${this.capitalize(nextStep)}`).classList.add('active');
        document.querySelector(`.progress-step[data-step="${nextStep}"]`).classList.add('active');
        this.currentStep = nextStep;
    }

    updateFooterButtons(step) {
        const footer = document.querySelector('#scheduleModal .modal-footer');
        if (!footer) return;
        
        const prevBtn = footer.querySelector('.prev-step');
        const nextBtn = footer.querySelector('.next-step');
        
        // Atualizar botão Voltar
        const prevStep = this.getPrevStep(step);
        if (prevStep) {
            prevBtn.style.display = 'block';
            prevBtn.setAttribute('data-prev', prevStep);
        } else {
            prevBtn.style.display = 'none';
        }
        
        // Atualizar botão Próximo/Confirmar
        const nextStep = this.getNextStep(step);
        if (nextStep) {
            nextBtn.textContent = 'Próximo';
            nextBtn.className = 'btn next-step';
            nextBtn.setAttribute('data-next', nextStep);
            nextBtn.removeAttribute('id');
        } else {
            nextBtn.textContent = 'Confirmar Agendamento';
            nextBtn.className = 'btn confirm-btn';
            nextBtn.id = 'confirmAppointmentBtn';
        }
    }

    adjustModalSize(modalContent, step) {
        if (this.stepSizes[step]) {
            modalContent.style.width = this.stepSizes[step];
        }
    }

    getNextStep(current) {
        const steps = ['location', 'payment', 'service', 'barber', 'datetime', 'confirm'];
        const index = steps.indexOf(current);
        return index < steps.length - 1 ? steps[index + 1] : null;
    }

    getPrevStep(current) {
        const steps = ['location', 'payment', 'service', 'barber', 'datetime', 'confirm'];
        const index = steps.indexOf(current);
        return index > 0 ? steps[index - 1] : null;
    }

    capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    openModal(modalId, initialStep = null) {
        if (this.activeModal) {
            this.closeModal(this.activeModal);
        }
        
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
            this.activeModal = modalId;

            if (modalId === 'scheduleModal' && initialStep) {
                const modalContent = modal.querySelector('.modal-content');
                this.showStep(null, initialStep);
                this.updateFooterButtons(initialStep);
                this.adjustModalSize(modalContent, initialStep);
            }
        }
    }

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
            this.activeModal = null;
            this.currentStep = null;
        }
    }
}

// Inicialização
const modalManager = new ModalManager();
document.addEventListener('DOMContentLoaded', () => {
    modalManager.registerModal('loginModal');
    modalManager.registerModal('registerModal');
    modalManager.registerModal('scheduleModal');
    modalManager.registerModal('plansModal');
    modalManager.registerModal('appointmentsModal');
    modalManager.registerModal('profileModal');
    modalManager.registerModal('userPlansModal');
});