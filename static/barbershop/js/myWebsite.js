        // Simular upload de imagens
        document.querySelectorAll('.image-upload-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                alert('Seletor de arquivos será aberto para upload de imagem');
            });
        });
        

        // Simular adição de banner
        document.querySelector('.add-banner-btn').addEventListener('click', function() {
            alert('Seletor de arquivos será aberto para adicionar nova imagem ao banner');
        });
        

        // Simular reordenamento de banners
        document.querySelectorAll('.move-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const container = this.closest('.banner-image-container');
                const prev = container.previousElementSibling;
                
                if (prev) {
                    prev.parentNode.insertBefore(container, prev);
                    showNotification('Banner movido com sucesso!');
                }
            });
        });
        

        // Simular exclusão de banner
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                if (confirm('Tem certeza que deseja remover este banner?')) {
                    const container = this.closest('.banner-image-container');
                    container.style.opacity = '0.5';
                    setTimeout(() => {
                        container.remove();
                        showNotification('Banner removido com sucesso!');
                    }, 300);
                }
            });
        });
        
        
        // Simular salvamento
        document.querySelector('.btn-primary').addEventListener('click', function() {
            this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';
            this.disabled = true;
            
            setTimeout(() => {
                this.innerHTML = '<i class="fas fa-save"></i> Salvar Alterações';
                this.disabled = false;
                showNotification('Alterações salvas com sucesso!');
            }, 1500);
        });

// Função para inicializar o drag & drop
function initDragAndDrop() {
    const containers = document.querySelectorAll('.banner-images');
    
    containers.forEach(container => {
        // Adiciona os event listeners para cada container
        container.addEventListener('dragover', handleDragOver);
        container.addEventListener('dragenter', handleDragEnter);
        container.addEventListener('dragleave', handleDragLeave);
        container.addEventListener('drop', handleDrop);
        
        // Torna os itens arrastáveis
        const items = container.querySelectorAll('.banner-image-container');
        items.forEach(item => {
            item.setAttribute('draggable', 'true');
            item.addEventListener('dragstart', handleDragStart);
            item.addEventListener('dragend', handleDragEnd);
        });
    });
}

// Variáveis globais para o drag & drop
let draggedItem = null;

function handleDragStart(e) {
    draggedItem = this;
    this.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', this.innerHTML);
}

function handleDragEnd(e) {
    this.classList.remove('dragging');
    
    // Remove a classe de todos os itens
    const items = document.querySelectorAll('.banner-image-container');
    items.forEach(item => {
        item.classList.remove('drag-over');
    });
    
    draggedItem = null;
}

function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    return false;
}

function handleDragEnter(e) {
    this.classList.add('drag-over');
}

function handleDragLeave(e) {
    this.classList.remove('drag-over');
}

function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    
    if (draggedItem !== this && draggedItem) {
        // Remove a classe de drag-over de todos os itens
        const allItems = this.parentElement.querySelectorAll('.banner-image-container');
        allItems.forEach(item => {
            item.classList.remove('drag-over');
        });
        
        // Insere o item arrastado antes do item de destino
        if (e.target.closest('.banner-image-container')) {
            const targetItem = e.target.closest('.banner-image-container');
            if (targetItem !== draggedItem) {
                targetItem.parentNode.insertBefore(draggedItem, targetItem);
            }
        } else {
            // Se soltar no container, adiciona no final
            this.appendChild(draggedItem);
        }
        
        // Atualiza a ordem no backend (se necessário)
        updateImageOrder(this);
    }
    
    return false;
}

// Função para atualizar a ordem no backend
function updateImageOrder(container) {
    const items = container.querySelectorAll('.banner-image-container');
    const order = Array.from(items).map((item, index) => {
        // Aqui você pode extrair o ID da imagem se tiver
        return {
            position: index,
            // id: item.getAttribute('data-image-id') // se tiver IDs
        };
    });
    
    console.log('Nova ordem:', order);
    // Aqui você pode fazer uma requisição AJAX para salvar a ordem
    // saveImageOrder(order);
}

// Função para salvar a ordem via AJAX (exemplo)
function saveImageOrder(order) {
    // Exemplo de como salvar a ordem
    /*
    fetch('/api/update-image-order/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCSRFToken(),
        },
        body: JSON.stringify({ order: order })
    })
    .then(response => response.json())
    .then(data => {
        console.log('Ordem salva com sucesso:', data);
    })
    .catch(error => {
        console.error('Erro ao salvar ordem:', error);
    });
    */
}

// Inicializa o drag & drop quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', function() {
    initDragAndDrop();
});