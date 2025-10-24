document.addEventListener('DOMContentLoaded', function() {
    // Elementos do modal
    const scheduleModal = document.getElementById('scheduleModal');
    const scheduleBtn = document.getElementById('heroScheduleBtn');
    const floatScheduleBtn = document.getElementById('floatScheduleButton');
    const closeScheduleModal = scheduleModal?.querySelector('.close-modal');


    // Verificação inicial dos elementos
    if (!scheduleModal || !closeScheduleModal || !scheduleBtn) {
        console.error('Elementos não encontrados');
        return;
    }

    // Controle do modal
    function openModal() {
        scheduleModal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }

    function closeModal() {
        scheduleModal.style.display = 'none';
        document.body.style.overflow = 'auto';
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
        const nextBtn = document.querySelector('.next');
        
        if (prevBtn) prevBtn.style.display = currentIndex > 0 ? 'flex' : 'none';
        if (nextBtn) nextBtn.style.display = currentIndex < stepsOrder.length - 1 ? 'flex' : 'none';
    }

    function handleNextStep(e) {
        e.preventDefault();
        const currentStep = document.querySelector('.progress-step.active').dataset.step;
        const stepsOrder = ['location', 'barber', 'service', 'datetime', 'confirm'];
        const currentIndex = stepsOrder.indexOf(currentStep);
        const nextStep = stepsOrder[currentIndex + 1];
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

    // Função para seleção de barbeiros
    function setupBarberSelection() {
        const barberCards = document.querySelectorAll('.barber-card');
        
        barberCards.forEach(card => {
            card.addEventListener('click', function() {
                // Remove a classe 'selected' de todos os barbeiros
                barberCards.forEach(c => c.classList.remove('selected'));
                
                // Adiciona a classe 'selected' apenas ao barbeiro clicado
                this.classList.add('selected');
            });
        });
    }

    // Configuração dos listeners de eventos
    function setupEventListeners() {
        // Eventos de abertura do modal
        scheduleBtn.addEventListener('click', openModal);
        floatScheduleBtn.addEventListener('click', openModal);

        // Eventos de fechamento do modal
        closeScheduleModal.addEventListener('click', closeModal);
        window.addEventListener('click', e => e.target === scheduleModal && closeModal());

        // Navegação entre passos
        document.querySelectorAll('.next').forEach(btn => {
            btn.addEventListener('click', handleNextStep);
        });

        document.querySelectorAll('.prev-step').forEach(btn => {
            btn.addEventListener('click', handlePrevStep);
        });

        // Seleção de barbeiros
        setupBarberSelection();
    }

    // Inicialização
    function init() {
        setupEventListeners();
        showStep('location'); // Inicia no primeiro passo
    }

    init();
});