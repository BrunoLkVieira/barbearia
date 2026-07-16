document.addEventListener('DOMContentLoaded', function() {
    const loginModal = document.getElementById('loginModal');
    const registerModal = document.getElementById('registerModal');
    const authPromptModal = document.getElementById('authPromptModal');
    const appointmentsModal = document.getElementById('appointmentsModal');
    
    const loginHeaderLink = document.getElementById('loginHeaderLink');
    const showRegisterLink = document.getElementById('showRegister');
    const profileBtn = document.getElementById('profileDropdownBtn');
    const profileContent = document.getElementById('profileDropdownContent');

    const BARBERSHOP_SLUG = window.location.pathname.split('/')[1];

    // ==========================================
    // CONTROLES GLOBAIS DE MODAIS E UI
    // ==========================================
    
    // Fechar modais ao clicar no 'X'
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            const modal = this.closest('.modal');
            if (modal) {
                modal.style.display = 'none';
                document.body.style.overflow = 'auto';
            }
        });
    });

    // Apenas fecha o Dropdown do Perfil se clicar fora (Sem afetar modais)
    window.addEventListener('click', function(e) {
        if (profileContent && profileBtn && !profileBtn.contains(e.target) && !profileContent.contains(e.target)) {
            profileContent.style.display = 'none';
        }
    });

    // Dropdown Header Toggle
    if (profileBtn) {
        profileBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            profileContent.style.display = profileContent.style.display === 'block' ? 'none' : 'block';
        });
    }

    // Revelar Senha
    window.togglePassword = function(inputId) {
        const input = document.getElementById(inputId);
        const icon = input.nextElementSibling.querySelector('i');
        if (input.type === 'password') {
            input.type = 'text';
            icon.classList.remove('fa-eye');
            icon.classList.add('fa-eye-slash');
        } else {
            input.type = 'password';
            icon.classList.remove('fa-eye-slash');
            icon.classList.add('fa-eye');
        }
    };

    // ==========================================
    // FLUXO DE LOGIN E REGISTRO (ATUALIZADOS LGPD)
    // ==========================================

    window.openLoginFromPrompt = function() {
        if (authPromptModal) authPromptModal.style.display = 'none';
        if (loginModal) {
            loginModal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
        }
    };
    
    window.openAppointmentsModal = function() {
        if (profileContent) profileContent.style.display = 'none';
        if (appointmentsModal) {
            appointmentsModal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
        }
    };

    if (loginHeaderLink) {
        loginHeaderLink.addEventListener('click', (e) => {
            e.preventDefault();
            loginModal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
        });
    }

    if (showRegisterLink) {
        showRegisterLink.addEventListener('click', (e) => {
            e.preventDefault();
            loginModal.style.display = 'none';
            registerModal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
        });
    }

    // LOGIN API - MUDANÇA: Agora usa o ID loginEmail
    document.getElementById('loginForm')?.addEventListener('submit', async function(e) {
        e.preventDefault();
        const btn = this.querySelector('button[type="submit"]');
        const originalText = btn.textContent;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Entrando...';
        btn.disabled = true;

        try {
            const response = await fetch(`/${BARBERSHOP_SLUG}/api/login/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCookie('csrftoken') 
                },
                body: JSON.stringify({
                    email: document.getElementById('loginEmail').value, 
                    password: document.getElementById('loginPassword').value
                })
            });
            const data = await response.json();
            
            if (response.ok) {
                window.location.reload(); 
            } else {
                alert(data.message);
                btn.disabled = false;
                btn.textContent = originalText;
            }
        } catch (error) {
            alert('Erro de conexão ao tentar fazer login.');
            btn.disabled = false;
            btn.textContent = originalText;
        }
    });

    // REGISTER API - MUDANÇA: Agora usa os IDs registerDocument e registerEmail
    // REGISTER API
    document.getElementById('registerForm')?.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const pass = document.getElementById('registerPassword').value;
        const confirmPass = document.getElementById('registerConfirmPassword').value;
        
        if (pass !== confirmPass) {
            alert('As senhas não coincidem!');
            return;
        }

        const btn = this.querySelector('button[type="submit"]');
        const originalText = btn.textContent;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Criando conta...';
        btn.disabled = true;

        const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]').value;
        const barbershopSlug = window.location.pathname.split('/')[1];

        try {
            const response = await fetch(`/${barbershopSlug}/api/register/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': csrfToken 
                },
                body: JSON.stringify({
                    name: document.getElementById('registerName').value,
                    email: document.getElementById('registerEmail').value,
                    phone: document.getElementById('registerPhone').value,
                    password: pass
                })
            });
            const data = await response.json();
            
            if (response.ok) {
                window.location.reload(); 
            } else {
                alert(data.message);
                btn.disabled = false;
                btn.textContent = originalText;
            }
        } catch (error) {
            alert('Erro de conexão ao tentar registrar.');
            btn.disabled = false;
            btn.textContent = originalText;
        }
    });

    // LOGOUT API
    window.logoutUser = async function() {
        try {
            const res = await fetch(`/${BARBERSHOP_SLUG}/api/logout/`, {
                method: 'POST',
                headers: { 'X-CSRFToken': getCookie('csrftoken') }
            });
            if (res.ok) window.location.reload();
        } catch (error) {
            alert("Erro ao sair.");
        }
    };

    // CANCEL APPOINTMENT API (Pode manter o do arquivo principal ou deixar aqui)
    window.cancelAppointment = async function(appointmentId) {
        if(!confirm("Tem certeza que deseja cancelar este agendamento?")) return;
        
        try {
            const res = await fetch(`/${BARBERSHOP_SLUG}/api/appointment/cancel/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCookie('csrftoken')
                },
                body: JSON.stringify({ appointment_id: appointmentId })
            });
            const data = await res.json();
            if (res.ok) {
                alert("Agendamento cancelado com sucesso.");
                window.location.reload();
            } else {
                alert(data.message);
            }
        } catch (error) {
            alert("Erro de conexão ao cancelar agendamento.");
        }
    };

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