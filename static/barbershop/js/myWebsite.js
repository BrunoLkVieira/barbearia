// ATUALIZAR DATA NO HEADER
function updateHeaderDate() {
    const dateEl = document.getElementById('currentDate');
    if (dateEl) {
        const now = new Date();
        const options = { weekday: 'long', day: 'numeric', month: 'long' };
        dateEl.textContent = now.toLocaleDateString('pt-BR', options);
    }
}

// DRAG & DROP
let draggedItem = null;

function initDragAndDrop() {
    const containers = document.querySelectorAll('.banner-images');
    containers.forEach(container => {
        const items = container.querySelectorAll('.banner-image-container');
        
        items.forEach(item => {
            item.setAttribute('draggable', 'true');
            item.addEventListener('dragstart', () => {
                draggedItem = item;
                setTimeout(() => item.classList.add('dragging'), 0);
            });
            item.addEventListener('dragend', () => {
                item.classList.remove('dragging');
                saveNewOrder(container);
                draggedItem = null;
            });
            item.addEventListener('dragover', (e) => {
                e.preventDefault();
                if (item === draggedItem) return;
                const rect = item.getBoundingClientRect();
                if (e.clientX > rect.left + rect.width / 2 || e.clientY > rect.top + rect.height / 2) {
                    item.after(draggedItem);
                } else {
                    item.before(draggedItem);
                }
                updateNumbers(container);
            });
        });

        const addBtn = container.querySelector('.add-banner-btn');
        if (addBtn) {
            addBtn.addEventListener('dragover', (e) => {
                e.preventDefault();
                addBtn.before(draggedItem);
                updateNumbers(container);
            });
        }
        updateNumbers(container);
    });
}

function updateNumbers(container) {
    container.querySelectorAll('.number-display').forEach((display, index) => {
        display.textContent = index + 1;
    });
}

// UPLOAD GALERIA
function triggerUpload(type) {
    document.getElementById('uploadMediaType').value = type;
    document.getElementById('fileInput').click();
}

// DELETE GALERIA
function deleteMedia(id) {
    Swal.fire({
        title: 'Remover imagem?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#FF7A00',
        confirmButtonText: 'Sim, deletar'
    }).then((result) => {
        if (result.isConfirmed) {
            document.getElementById('deleteMediaId').value = id;
            document.getElementById('deleteForm').submit();
        }
    });
}

// SALVAR ORDEM AJAX
function saveNewOrder(container) {
    const orderData = Array.from(container.querySelectorAll('.banner-image-container')).map((item, index) => ({
        id: item.getAttribute('data-image-id'),
        position: index + 1
    }));
    fetch(window.location.href, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value },
        body: JSON.stringify({ 'action': 'update_order', 'order': orderData })
    });
}

document.addEventListener('DOMContentLoaded', () => {
    initDragAndDrop();
    updateHeaderDate();
});