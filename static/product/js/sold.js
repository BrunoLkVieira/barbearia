
const modal = document.querySelector('.modal');

function openModal() {
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    modal.style.display = 'none';
    document.body.style.overflow = '';
}

function cancelModal(){
    modal.style.display = 'none';
    document.body.style.overflow = '';
}

window.addEventListener('click', function (e) {
    if (e.target === modal) {
        closeModal();
    }
});



// Carregar o modal quando a página estiver pronta
document.addEventListener('DOMContentLoaded', function() {

    // Botão de exclusão
    document.querySelectorAll('.action-btn.delete').forEach(btn => {
        btn.addEventListener('click', function() {
            if (confirm('Tem certeza que deseja excluir este registro de venda?')) {
                const row = this.closest('tr');
                row.style.opacity = '0';
                setTimeout(() => {
                    row.remove();
                    // Atualizar contadores
                    const totalSales = document.querySelectorAll('.history-table tbody tr').length;
                    document.querySelector('.total-display strong:first-child').textContent = totalSales;
                    
                    // Recalcular valor total
                    let totalValue = 0;
                    document.querySelectorAll('.history-table tbody td:nth-child(4)').forEach(td => {
                        const value = parseFloat(td.textContent.replace('R$', '').replace(',', '.').trim());
                        totalValue += value;
                    });
                    
                    document.querySelector('.total-display strong:last-child').textContent = 
                        `R$ ${totalValue.toFixed(2).replace('.', ',')}`;
                }, 300);
            }
        });
    });
    
    // Filtro de data padrão para hoje
    const today = new Date();
    const formattedDate = today.toISOString().split('T')[0];
    document.getElementById('dateFilter').value = formattedDate;
});