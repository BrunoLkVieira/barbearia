// plans-modal.js

document.addEventListener('DOMContentLoaded', function() {
    // Elementos do modal
    const plansModal = document.getElementById('plansModal');
    const planButtons = document.querySelectorAll('[data-plan-id]');
    const closePlansModal = plansModal.querySelector('.close-modal');
    const confirmPlanBtn = document.getElementById('confirmPlanBtn');
    
    // Dados dos planos
    const plansData = {
        'corte-unico': {
            name: 'Corte Único',
            price: 49.90,
            period: 'único',
            features: [
                'Corte de cabelo completo',
                'Estilo personalizado',
                'Finalização com produtos premium',
                'Penteado final'
            ]
        },
        'mensal': {
            name: 'Corte Mensal',
            price: 120.00,
            period: 'mensal',
            features: [
                '2 cortes por mês',
                'Design de barba incluso',
                'Produtos exclusivos',
                'Horários prioritários',
                '10% de desconto em outros serviços'
            ]
        },
        'completo': {
            name: 'Corte + Barba',
            price: 79.90,
            period: 'único',
            features: [
                'Corte de cabelo completo',
                'Design e tratamento de barba',
                'Hidratação capilar',
                'Massagem relaxante',
                'Produtos exclusivos'
            ]
        }
    };
    
    let selectedPlanId = null;
    
    // Abrir modal de planos
    function openPlansModal(planId) {
        selectedPlanId = planId;
        updatePlanDetails(planId);
        resetPaymentForms();
        plansModal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    }
    
    // Fechar modal
    function closePlansModalFunc() {
        plansModal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
    
    // Atualizar detalhes do plano
    function updatePlanDetails(planId) {
        const plan = plansData[planId];
        
        document.getElementById('selectedPlanName').textContent = plan.name;
        document.getElementById('selectedPlanPrice').textContent = 
            `R$${plan.price.toFixed(2)}${plan.period === 'mensal' ? '/mês' : ''}`;
        
        const featuresList = document.getElementById('selectedPlanFeatures');
        featuresList.innerHTML = '';
        
        plan.features.forEach(feature => {
            const li = document.createElement('li');
            li.textContent = feature;
            featuresList.appendChild(li);
        });
    }
    
    // Resetar formulários de pagamento
    function resetPaymentForms() {
        const creditOption = document.querySelector('.payment-option[data-method="credit"]');
        if (creditOption) {
            document.querySelectorAll('.payment-option').forEach(opt => {
                opt.classList.remove('selected');
            });
            
            creditOption.classList.add('selected');
            document.getElementById('creditCardForm').style.display = 'block';
            document.getElementById('pixInfo').style.display = 'none';
        }
    }
    
    // Configurar métodos de pagamento
    function setupPaymentMethods() {
        const paymentOptions = document.querySelectorAll('.payment-option');
        
        paymentOptions.forEach(option => {
            option.addEventListener('click', function() {
                paymentOptions.forEach(opt => opt.classList.remove('selected'));
                this.classList.add('selected');
                
                const method = this.dataset.method;
                document.getElementById('creditCardForm').style.display = 
                    method === 'credit' ? 'block' : 'none';
                document.getElementById('pixInfo').style.display = 
                    method === 'pix' ? 'block' : 'none';
            });
        });
    }
    
    // Validar formulário de cartão
    function validateCardForm() {
        const cardNumber = document.getElementById('cardNumber').value;
        const cardName = document.getElementById('cardName').value;
        const cardExpiry = document.getElementById('cardExpiry').value;
        const cardCvv = document.getElementById('cardCvv').value;
        
        if (!cardNumber || !cardName || !cardExpiry || !cardCvv) {
            alert('Por favor, preencha todos os campos do cartão');
            return false;
        }
        
        if (cardNumber.replace(/\s/g, '').length !== 16) {
            alert('Número do cartão inválido');
            return false;
        }
        
        if (!/^\d{2}\/\d{2}$/.test(cardExpiry)) {
            alert('Formato de validade inválido. Use MM/AA');
            return false;
        }
        
        if (cardCvv.length !== 3) {
            alert('CVV inválido. Deve conter 3 dígitos');
            return false;
        }
        
        return true;
    }
    
    // Configurar máscaras
    function setupMasks() {
        // Máscara para número do cartão
        const cardNumber = document.getElementById('cardNumber');
        if (cardNumber) {
            cardNumber.addEventListener('input', function(e) {
                let value = this.value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
                let formatted = '';
                
                for (let i = 0; i < value.length; i++) {
                    if (i > 0 && i % 4 === 0) formatted += ' ';
                    formatted += value[i];
                }
                
                this.value = formatted.substring(0, 19);
            });
        }
        
        // Máscara para validade
        const cardExpiry = document.getElementById('cardExpiry');
        if (cardExpiry) {
            cardExpiry.addEventListener('input', function(e) {
                let value = this.value.replace(/\D/g, '');
                
                if (value.length > 2) {
                    this.value = `${value.substring(0, 2)}/${value.substring(2, 4)}`;
                } else {
                    this.value = value;
                }
            });
        }
        
        // Máscara para CVV
        const cardCvv = document.getElementById('cardCvv');
        if (cardCvv) {
            cardCvv.addEventListener('input', function(e) {
                this.value = this.value.replace(/\D/g, '').substring(0, 3);
            });
        }
    }
    
    // Event listeners
    planButtons.forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            const planId = this.dataset.planId;
            openPlansModal(planId);
        });
    });
    
    closePlansModal.addEventListener('click', closePlansModalFunc);
    
    window.addEventListener('click', function(e) {
        if (e.target === plansModal) {
            closePlansModalFunc();
        }
    });
    
    confirmPlanBtn.addEventListener('click', function(e) {
        e.preventDefault();
        
        const selectedMethod = document.querySelector('.payment-option.selected');
        if (!selectedMethod) {
            alert('Por favor, selecione um método de pagamento');
            return;
        }
        
        const method = selectedMethod.dataset.method;
        
        if (method === 'credit' && !validateCardForm()) {
            return;
        }
        
        console.log('Assinatura confirmada:', {
            plan: selectedPlanId,
            paymentMethod: method,
            cardInfo: method === 'credit' ? {
                number: document.getElementById('cardNumber').value,
                name: document.getElementById('cardName').value,
                expiry: document.getElementById('cardExpiry').value,
                cvv: document.getElementById('cardCvv').value
            } : null
        });
        
        alert('Plano assinado com sucesso!');
        closePlansModalFunc();
    });
    
    // Inicialização
    setupPaymentMethods();
    setupMasks();
});