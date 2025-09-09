// Função para carregar modais (você pode remover essa se não estiver mais carregando por fetch)
function loadModal(modalFile, containerId) {
    return fetch(modalFile)
        .then(response => response.text())
        .then(html => {
            if (!document.getElementById('modal-container')) {
                const modalContainer = document.createElement('div');
                modalContainer.id = 'modal-container';
                document.body.appendChild(modalContainer);
            }

            const container = document.getElementById('modal-container');
            const modalDiv = document.createElement('div');
            modalDiv.id = containerId;
            modalDiv.innerHTML = html;
            container.appendChild(modalDiv);

            return modalDiv;
        });
}

// Quando a página estiver pronta
document.addEventListener('DOMContentLoaded', function () {
    setupEditModalEvents();
    setupVacationModalEvents();
});

// ========== MODAL DE EDIÇÃO ==========
const editModal = document.getElementById('editModal');

function openEditModal() {
    editModal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function closeEditModal() {
    editModal.style.display = 'none';
    document.body.style.overflow = '';
}

// Alternar entre dias ativos/inativos
function toggleDay(checkbox) {
    const dayEdit = checkbox.closest('.day-edit');
    const timeInputs = dayEdit.querySelectorAll('.time-input');
    
    if (checkbox.checked) {
        dayEdit.classList.remove('off');
        dayEdit.classList.add('active');
        timeInputs.forEach(input => input.disabled = false);
    } else {
        dayEdit.classList.remove('active');
        dayEdit.classList.add('off');
        timeInputs.forEach(input => input.disabled = true);
    }
}


// Alternar entre os períodos (Manhã/Tarde)
document.querySelectorAll('.barber-selector-item').forEach(item => {
    item.addEventListener('click', function() {
        document.querySelectorAll('.barber-selector-item').forEach(i => i.classList.remove('active'));
        this.classList.add('active');
        
        // Determinar qual período está ativo
        const isMorning = this.textContent.includes('Manhã');
        
        // Esconder todos os períodos primeiro
        document.querySelectorAll('.day-edit').forEach(day => {
            day.style.display = 'none';
        });
        
        // Mostrar apenas o período ativo
        if (isMorning) {
            document.querySelectorAll('.day-edit.morning').forEach(day => {
                day.style.display = 'flex';
            });
        } else {
            document.querySelectorAll('.day-edit.afternoon').forEach(day => {
                day.style.display = 'flex';
            });
        }
    });
});

// Inicializar mostrando apenas o período da manhã
document.querySelectorAll('.day-edit.afternoon').forEach(day => {
    day.style.display = 'none';
});



// ========== MODAL DE FÉRIAS ==========
const vacationModal = document.getElementById('vacationModal');

function openVacationModal() {
    vacationModal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function closeVacationModal() {
    vacationModal.style.display = 'none';
    document.body.style.overflow = '';
}

window.addEventListener('click', function (e) {
    if (e.target === vacationModal) {
        closeVacationModal();
    }
});

// function markVacation() {
//     // Aqui você pode capturar os dados, se quiser usar depois
//     const selectedBarbers = Array.from(document.querySelectorAll('#vacationBarbersList input:checked'))
//         .map(input => input.nextElementSibling.textContent.trim());

//     const startDate = document.getElementById('vacationStart').value;
//     const endDate = document.getElementById('vacationEnd').value;

//     console.log('Férias marcadas para:', selectedBarbers, 'de', startDate, 'até', endDate);

//     alert('Férias marcadas com sucesso!');
//     closeVacationModal();
// }

