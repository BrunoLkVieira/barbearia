// auth-system.js - Versão apenas visual (sem backend)

document.addEventListener('DOMContentLoaded', function() {
    // Elementos do DOM
    const loginHeaderLink = document.getElementById('loginHeaderLink');
    const userWelcome = document.querySelector('.user-welcome');
    const loginModal = document.getElementById('loginModal');
    const registerModal = document.getElementById('registerModal');
    const logoutBtn = document.getElementById('logoutBtn');
    const closeModalButtons = document.querySelectorAll('.close-modal');
    const loginForm = document.getElementById('loginForm');
    const showRegisterLink = document.getElementById('showRegister');
    const showLoginLink = document.getElementById('showLogin');

    // Estado visual de login (false = deslogado, true = logado)
    let isLoggedIn = false;

    // Event Listeners
    if (loginHeaderLink) {
        loginHeaderLink.addEventListener('click', function(e) {
            e.preventDefault();
            openModal(loginModal);
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            isLoggedIn = false;
            updateAuthUI();
            alert('Você foi deslogado (apenas visual)');
        });
    }

    // Simula login (aceita qualquer dado)
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            isLoggedIn = true;
            updateAuthUI();
            closeModal(loginModal);
        });
    }

    // Alternar entre modais de login e registro
    if (showRegisterLink) {
        showRegisterLink.addEventListener('click', function(e) {
            e.preventDefault();
            closeModal(loginModal);
            openModal(registerModal);
        });
    }

    if (showLoginLink) {
        showLoginLink.addEventListener('click', function(e) {
            e.preventDefault();
            closeModal(registerModal);
            openModal(loginModal);
        });
    }

    // Fechar modais com botão X
    closeModalButtons.forEach(button => {
        button.addEventListener('click', function() {
            const modal = this.closest('.modal');
            closeModal(modal);
        });
    });

    // *** REMOVIDO: Fechar modais clicando fora ***
    // *** REMOVIDO: Fechar modais com tecla Escape ***

    // Atualiza a interface conforme estado
    function updateAuthUI() {
        if (isLoggedIn) {
            loginHeaderLink.style.display = 'none';
            if (userWelcome) userWelcome.style.display = 'block';
        } else {
            loginHeaderLink.style.display = 'block';
            if (userWelcome) userWelcome.style.display = 'none';
        }
    }

    // Funções auxiliares
    function openModal(modal) {
        if (modal) {
            modal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
        }
    }

    function closeModal(modal) {
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
        }
    }

    // Alternar visibilidade da senha (opcional)
    window.togglePassword = function(inputId) {
        const input = document.getElementById(inputId);
        const icon = input.nextElementSibling.querySelector('i');
        
        if (input.type === 'password') {
            input.type = 'text';
            icon.classList.replace('fa-eye', 'fa-eye-slash');
        } else {
            input.type = 'password';
            icon.classList.replace('fa-eye-slash', 'fa-eye');
        }
    };
});