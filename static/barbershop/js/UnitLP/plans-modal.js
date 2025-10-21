// plans-modal.js

// Função para abrir o modal de planos
function openPlansModal(planCard) {
    const planId = planCard.dataset.planId;
    const planName = planCard.querySelector('h3').textContent;
    const planPrice = planCard.querySelector('.price').textContent;
    const planFeatures = planCard.querySelectorAll('li');
    
    // Atualizar modal com os dados do plano
    document.getElementById('selectedPlanName').textContent = planName;
    document.getElementById('selectedPlanPrice').textContent = planPrice;
    
    const featuresList = document.getElementById('selectedPlanFeatures');
    featuresList.innerHTML = '';
    
    planFeatures.forEach(feature => {
        const li = document.createElement('li');
        li.textContent = feature.textContent;
        featuresList.appendChild(li);
    });
    
    // Mostrar o modal usando o ModalManager
    modalManager.openModal('plansModal');
}

// Adicionar event listeners quando o DOM carregar
document.addEventListener('DOMContentLoaded', function() {
    // Botões "Assinar" dos planos
    const scheduleButtons = document.querySelectorAll('.schedule-btn');
    
    scheduleButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            const planCard = this.closest('.plan-card');
            openPlansModal(planCard);
        });
    });
});