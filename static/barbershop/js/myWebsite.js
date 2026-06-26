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

// DELETE GALERIA (Padronizado igual Agenda e Clientes)
function deleteMedia(id) {
    Swal.fire({
        title: 'Confirmar Exclusão',
        text: "Esta ação apagará a imagem definitivamente do seu site.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#e74c3c',
        cancelButtonColor: '#a0aec0',
        confirmButtonText: 'Sim, excluir!',
        cancelButtonText: 'Cancelar',
        background: '#ffffff',
        customClass: { container: 'swal2-container-high-z' }
    }).then((result) => {
        if (result.isConfirmed) {
            // Desativa a trava de 'alterações não salvas' pois isso é um submit programático
            isFormDirty = false;
            sessionStorage.setItem('myWebsiteScroll', window.scrollY);
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

// ============================================================
// SISTEMA "UNSAVED CHANGES" COM INDICADOR VISUAL
// ============================================================
let isFormDirty = false;

function setFormDirty() {
    if (!isFormDirty) {
        isFormDirty = true;
        
        // 1. Mostra a Tag de "Alterações pendentes"
        const badge = document.getElementById('unsavedBadge');
        if (badge) badge.style.display = 'inline-block';
        
        // 2. Exibe o Botão "Salvar Agora" no Topo da tela (Ação imediata)
        const topSaveBtn = document.getElementById('topSaveBtn');
        if (topSaveBtn) {
            topSaveBtn.style.display = 'inline-flex';
            topSaveBtn.style.alignItems = 'center';
            topSaveBtn.style.gap = '8px';
        }
        
        // 3. Muda o botão do rodapé para vermelho chamativo
        const saveBtn = document.getElementById('saveChangesBtn');
        if (saveBtn) {
            saveBtn.innerHTML = '<i class="fas fa-exclamation-circle"></i> Salvar Alterações';
            saveBtn.style.background = '#e74c3c';
            saveBtn.style.border = 'none';
            saveBtn.style.boxShadow = '0 4px 12px rgba(231, 76, 60, 0.4)';
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initDragAndDrop();

    // RESTAURAÇÃO DE SCROLL
    const savedScroll = sessionStorage.getItem('myWebsiteScroll');
    if (savedScroll !== null) {
        window.scrollTo({ top: parseInt(savedScroll), behavior: 'instant' });
        sessionStorage.removeItem('myWebsiteScroll');
    }
    
    // Escuta qualquer digitação ou envio de foto e ativa o visual de alerta!
    const formInputs = document.querySelectorAll('#websiteFormInfo input, #websiteFormInfo textarea, #fileInput');
    formInputs.forEach(input => {
        input.addEventListener('change', setFormDirty);
        input.addEventListener('input', setFormDirty);
    });

    const mainForm = document.getElementById('websiteFormInfo');
    if (mainForm) {
        mainForm.addEventListener('submit', () => {
            isFormDirty = false; // Desarma a trava ao salvar
            sessionStorage.setItem('myWebsiteScroll', window.scrollY);
        });
    }

    // Trava Nativa Anti-Fuga (Exibe o aviso nativo se tentar fechar a guia)
    window.addEventListener('beforeunload', (e) => {
        if (isFormDirty) {
            e.preventDefault();
            e.returnValue = '';
        }
    });
});