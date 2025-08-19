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

window.addEventListener('click', function (e) {
    if (e.target === editModal) {
        closeEditModal();
    }
});

function saveAvailability() {
    alert('Disponibilidade salva com sucesso!');
    closeEditModal();
}


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

