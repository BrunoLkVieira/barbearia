/* --- client.js --- */

const modal = document.getElementById('clientModal');
const clientForm = document.getElementById('clientForm');
const modalTitleText = document.getElementById('modalTitleText');
const modalAction = document.getElementById('modalAction');
const modalClientId = document.getElementById('modalClientId');

function openModal() {
    clientForm.reset();
    document.getElementById('isBlocked').checked = false;
    
    modalTitleText.innerText = 'Novo Cliente';
    modalAction.value = 'create';
    modalClientId.value = '';

    modal.style.display = 'flex';
}

function closeModal() {
    if(modal) modal.style.display = 'none';
}

function editClient(id, firstName, lastName, phone, email, isBlockedStr) {
    modalTitleText.innerText = 'Editar Cliente';
    modalAction.value = 'update';
    modalClientId.value = id;

    document.getElementById('firstName').value = firstName;
    document.getElementById('lastName').value = lastName;
    document.getElementById('clientPhone').value = phone;
    document.getElementById('clientEmail').value = email !== 'None' && email !== '---' ? email : '';
    
    document.getElementById('isBlocked').checked = (isBlockedStr === 'true');

    modal.style.display = 'flex';
}

document.addEventListener('DOMContentLoaded', function() {
    // Busca ao vivo inteligente nativa da UI (Client-side fallback rápido)
    const searchInput = document.getElementById('clientSearch');
    if (searchInput && searchInput.value === '') {
        searchInput.addEventListener('keyup', function() {
            let filter = this.value.toLowerCase();
            let rows = document.querySelectorAll('.clients-tbody .table-row');
            
            rows.forEach(row => {
                let name = row.querySelector('.client-name').textContent.toLowerCase();
                let phone = row.querySelector('.client-phone').textContent.toLowerCase();
                if(name.includes(filter) || phone.includes(filter)) {
                    row.style.display = '';
                } else {
                    row.style.display = 'none';
                }
            });
        });
    }
});