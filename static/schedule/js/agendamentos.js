document.addEventListener('DOMContentLoaded', function() {
    // Filtros
    const dateFilter = document.getElementById('dateFilter');
    const barberFilter = document.getElementById('barberFilter');
    const serviceFilter = document.getElementById('serviceFilter');
    const statusFilter = document.getElementById('statusFilter');
    
    // Definir data atual como padrão
    const today = new Date().toISOString().split('T')[0];
    dateFilter.value = today;
    
    // Botões de ação
    const editButtons = document.querySelectorAll('.action-btn.edit');
    const deleteButtons = document.querySelectorAll('.action-btn.delete');
    
    editButtons.forEach(button => {
        button.addEventListener('click', function() {
            const row = this.closest('tr');
            const client = row.querySelector('.client-cell div:last-child').textContent;
            alert(`Editar agendamento de ${client}`);
        });
    });
    
    deleteButtons.forEach(button => {
        button.addEventListener('click', function() {
            const row = this.closest('tr');
            const client = row.querySelector('.client-cell div:last-child').textContent;
            
            if (confirm(`Tem certeza que deseja excluir o agendamento de ${client}?`)) {
                row.style.opacity = '0';
                row.style.transform = 'translateX(100px)';
                setTimeout(() => {
                    row.remove();
                }, 300);
            }
        });
    });
    
    // Paginação
    const paginationBtns = document.querySelectorAll('.pagination-btn');
    paginationBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            paginationBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            // Aqui você carregaria a página correspondente
        });
    });
});