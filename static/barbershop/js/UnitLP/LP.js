// Variável para armazenar usuário logado
let loggedInUser = null;

// Elementos DOM realmente necessários
const DOM = {
    loginHeaderLink: document.getElementById('loginHeaderLink'),
    // Remova todas as outras referências a elementos de modal
};

// Configurações iniciais
function init() {
    // Event listeners
    setupEventListeners();
    
    // Inicializar header
    updateHeader();
}

// Configurar todos os event listeners
function setupEventListeners() {
    // Scroll suave para links internos
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', smoothScroll);
    });
    
    // Efeito de rolagem no cabeçalho
    window.addEventListener('scroll', headerScrollEffect);
}

// Scroll suave
function smoothScroll(e) {
    if(this.getAttribute('href') !== '#') {
        e.preventDefault();
        const targetId = this.getAttribute('href');
        const targetElement = document.querySelector(targetId);
        
        window.scrollTo({
            top: targetElement.offsetTop - 80,
            behavior: 'smooth'
        });
    }
}

// Efeito de rolagem no cabeçalho
function headerScrollEffect() {
    const header = document.querySelector('header');
    if (window.scrollY > 100) {
        header.style.background = 'var(--white)';
        header.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
    } else {
        header.style.background = 'var(--white)';
        header.style.boxShadow = '0 2px 10px rgba(0,0,0,0.1)';
    }
}

// Atualizar header com status de login (simplificado)
function updateHeader() {
    if(loggedInUser) {
        DOM.loginHeaderLink.innerHTML = `<i class="fas fa-user-circle"></i> Minha Conta`;
        DOM.loginHeaderLink.classList.add('logged-in');
    } else {
        DOM.loginHeaderLink.innerHTML = '<i class="fas fa-user"></i> Faça o Login';
        DOM.loginHeaderLink.classList.remove('logged-in');
    }
}

// Mostrar alerta
function showAlert(message, type = 'success') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.innerHTML = message;
    alertDiv.style.position = 'fixed';
    alertDiv.style.top = '20px';
    alertDiv.style.right = '20px';
    alertDiv.style.padding = '15px 20px';
    alertDiv.style.background = type === 'error' ? '#ff6b6b' : '#51cf66';
    alertDiv.style.color = 'white';
    alertDiv.style.borderRadius = '5px';
    alertDiv.style.boxShadow = '0 3px 10px rgba(0,0,0,0.2)';
    alertDiv.style.zIndex = '10000';
    alertDiv.style.animation = 'fadeIn 0.3s';
    
    document.body.appendChild(alertDiv);
    
    setTimeout(() => {
        alertDiv.style.animation = 'fadeOut 0.3s';
        setTimeout(() => {
            alertDiv.remove();
        }, 300);
    }, 3000);
}

// Inicializar
document.addEventListener('DOMContentLoaded', init);