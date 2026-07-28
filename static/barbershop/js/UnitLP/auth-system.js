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
    
    window.Toast = Swal.mixin({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 4000,
        timerProgressBar: true,
        background: '#2D3748',
        color: '#F7FAFC',
        customClass: { container: 'swal2-container-high-z' }
    });

    window.alert = function(message) {
        if (!message) return;
        let msgStr = String(message).toLowerCase(); 
        let iconType = 'warning';
        if(msgStr.includes('sucesso') || msgStr.includes('concluído') || msgStr.includes('criada')) {
            iconType = 'success';
        } else if (msgStr.includes('erro') || msgStr.includes('falha') || msgStr.includes('inválido')) {
            iconType = 'error';
        }
        window.Toast.fire({ icon: iconType, title: String(message) });
    };

    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            const modal = this.closest('.modal') || this.closest('.modal-overlay');
            if (modal) {
                modal.style.display = 'none';
                document.body.style.overflow = 'auto';
            }
        });
    });

    window.addEventListener('click', function(e) {
        if (profileContent && profileBtn && !profileBtn.contains(e.target) && !profileContent.contains(e.target)) {
            profileContent.style.display = 'none';
        }
    });

    if (profileBtn) {
        profileBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            profileContent.style.display = profileContent.style.display === 'block' ? 'none' : 'block';
        });
    }

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
    // FLUXO DE MODAIS
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

    // ==========================================
    // API: LOGIN
    // ==========================================
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
                alert(data.message || 'Erro ao efetuar login.');
                btn.disabled = false;
                btn.textContent = originalText;
            }
        } catch (error) {
            alert('Erro de conexão ao tentar fazer login.');
            btn.disabled = false;
            btn.textContent = originalText;
        }
    });

    // ==========================================
    // API: REGISTRO (ENVIANDO SOBRENOME E DATA)
    // ==========================================
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

        // Trata a data para não enviar string vazia
        let bDate = document.getElementById('registerBirthDate').value;
        if (bDate === "") bDate = null;

        // A MÁGICA ACONTECE AQUI: Payload atualizado com last_name e birth_date
        const payload = {
            name: document.getElementById('registerName').value.trim(),
            last_name: document.getElementById('registerLastName').value.trim(),
            email: document.getElementById('registerEmail').value.trim(),
            phone: document.getElementById('registerPhone').value.trim(),
            birth_date: bDate,
            password: pass
        };

        try {
            const response = await fetch(`/${BARBERSHOP_SLUG}/api/register/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': csrfToken 
                },
                body: JSON.stringify(payload)
            });
            const data = await response.json();
            
            if (response.ok || data.status === 'success') {
                window.location.reload(); 
            } else {
                alert(data.message || 'Erro ao registrar.');
                btn.disabled = false;
                btn.textContent = originalText;
            }
        } catch (error) {
            alert('Erro de conexão ao tentar registrar.');
            btn.disabled = false;
            btn.textContent = originalText;
        }
    });

    // ==========================================
    // API: LOGOUT
    // ==========================================
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

    // ==========================================
    // API: CANCELAMENTO DE AGENDAMENTO
    // ==========================================
    window.appointmentToCancel = null;

    window.openCancelModal = function(id) {
        window.appointmentToCancel = id;
        const appModal = document.getElementById('appointmentsModal');
        const cancelModal = document.getElementById('cancelConfirmModal');
        if(appModal) appModal.style.display = 'none';
        if(cancelModal) {
            cancelModal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
        }
    };

    window.executeCancel = async function() {
        if (!window.appointmentToCancel) return;
        
        const btn = document.getElementById('confirmCancelBtn');
        const originalText = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Cancelando...';

        try {
            const res = await fetch(`/${BARBERSHOP_SLUG}/api/appointment/cancel/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCookie('csrftoken')
                },
                body: JSON.stringify({ appointment_id: window.appointmentToCancel })
            });
            const data = await res.json();
            
            if (res.ok && data.status === 'success') {
                window.Toast.fire({ icon: 'success', title: 'Agendamento cancelado com sucesso!' });
                setTimeout(() => window.location.reload(), 1500);
            } else {
                window.Toast.fire({ icon: 'error', title: data.message || 'Erro ao cancelar.' });
                btn.disabled = false;
                btn.innerHTML = originalText;
            }
        } catch (error) {
            window.Toast.fire({ icon: 'error', title: 'Erro de conexão com o servidor.' });
            btn.disabled = false;
            btn.innerHTML = originalText;
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