// Funções para o modal de funcionário
function openEmployeeModal(action = 'create') {
    const modal = document.getElementById('employeeModal');
    const modalTitle = document.getElementById('modalTitle');

    if (action === 'create') {
        modalTitle.innerHTML = '<i class="fas fa-user-plus"></i> Novo Funcionário';
    } else {
        modalTitle.innerHTML = '<i class="fas fa-user-edit"></i> Editar Funcionário';
    }

    modal.style.display = 'flex';
    document.body.classList.add('modal-open'); // Impede scroll do fundo
}

function closeEmployeeModal() {
    document.getElementById('employeeModal').style.display = 'none';
    document.body.classList.remove('modal-open'); // Libera scroll do fundo
}

function saveEmployee() {
    alert('Funcionário salvo com sucesso!');
    closeEmployeeModal();
}

// Fechar modal ao clicar fora
window.addEventListener('click', function(event) {
    const modal = document.getElementById('employeeModal');
    if (event.target === modal) {
        closeEmployeeModal();
    }
});

// Configurar máscara de telefone
document.getElementById('employeePhone').addEventListener('input', function(e) {
    let value = e.target.value.replace(/\D/g, '');

    if (value.length > 11) {
        value = value.slice(0, 11);
    }

    if (value.length > 10) {
        value = value.replace(/^(\d{2})(\d{5})(\d{4})$/, "($1) $2-$3");
    } else if (value.length > 6) {
        value = value.replace(/^(\d{2})(\d{4})(\d{0,4})$/, "($1) $2-$3");
    } else if (value.length > 2) {
        value = value.replace(/^(\d{2})(\d{0,5})$/, "($1) $2");
    } else if (value.length > 0) {
        value = value.replace(/^(\d*)$/, "($1");
    }

    e.target.value = value;
});

// Função para deletar funcionário
document.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        if (confirm('Tem certeza que deseja excluir este funcionário?')) {
            const row = this.closest('tr');
            row.style.opacity = '0.5';
            setTimeout(() => {
                row.remove();
                updateFooterStats();
            }, 300);
        }
    });
});

// Atualizar estatísticas no footer
function updateFooterStats() {
    const totalEmployees = document.querySelectorAll('.employees-table tbody tr').length;
    const activeEmployees = Array.from(document.querySelectorAll('.employees-table tbody tr'))
        .filter(row => row.cells[3].textContent === 'Ativo').length;

    document.querySelector('.total-display').innerHTML = 
        `Total de funcionários: <strong>${totalEmployees}</strong> | Ativos: <strong>${activeEmployees}</strong>`;
}
