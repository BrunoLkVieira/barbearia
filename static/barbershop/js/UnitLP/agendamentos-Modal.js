// agendamentos-Modal.js - Controle do modal de agendamentos
document.addEventListener('DOMContentLoaded', function() {
    console.log('Modal de agendamentos carregado');
    
    const appointmentsModal = document.getElementById('appointmentsModal');
    const scheduleModal = document.getElementById('scheduleModal');

    // Função para abrir o modal de agendamentos
    window.openAppointmentsModal = function() {
        console.log('Abrindo modal de agendamentos');
        appointmentsModal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    };

    // Função para fechar o modal de agendamentos
    function closeAppointmentsModal() {
        appointmentsModal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }

    // Função para abrir novo agendamento
    window.openNewAppointment = function() {
        console.log('Abrindo novo agendamento');
        
        // Fechar modal de agendamentos
        closeAppointmentsModal();
        
        // Abrir modal de agendamento
        if (typeof modalManager !== 'undefined') {
            modalManager.openModal('scheduleModal');
        } else if (scheduleModal) {
            scheduleModal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
        } else {
            console.error('Modal de agendamento não encontrado');
        }
    };

    // Fechar modal clicando fora
    appointmentsModal.addEventListener('click', function(e) {
        if (e.target === appointmentsModal) {
            closeAppointmentsModal();
        }
    });

    
});