let draggedItem = null;

function initDragAndDrop() {
    const containers = document.querySelectorAll('.banner-images');

    containers.forEach(container => {
        const items = container.querySelectorAll('.banner-image-container');
        
        items.forEach(item => {
            item.setAttribute('draggable', 'true');

            item.addEventListener('dragstart', (e) => {
                draggedItem = item;
                item.classList.add('dragging');
                // Evita problemas com imagens fantasmas
                e.dataTransfer.effectAllowed = 'move';
            });

            item.addEventListener('dragend', () => {
                item.classList.remove('dragging');
                draggedItem = null;
                updateImageOrder(container);
            });

            // ESTA É A LÓGICA PARA GRID (COLUNAS)
            item.addEventListener('dragover', (e) => {
                e.preventDefault();
                if (item === draggedItem) return;

                const rect = item.getBoundingClientRect();
                // Calcula o meio do item (vertical e horizontal para ser preciso no grid)
                const midX = rect.left + rect.width / 2;
                const midY = rect.top + rect.height / 2;

                // Se o mouse estiver depois da metade do item alvo, insere depois
                if (e.clientX > midX || e.clientY > midY) {
                    item.after(draggedItem);
                } else {
                    item.before(draggedItem);
                }

                updateNumbers(container);
            });
        });

        // BLOQUEIO PARA O BOTÃO ADICIONAR (Sempre ficar no final)
        const addBtn = container.querySelector('.add-banner-btn');
        if (addBtn) {
            addBtn.addEventListener('dragover', (e) => {
                e.preventDefault();
                // Se arrastar qualquer coisa por cima do botão de add, 
                // a foto é jogada para antes do botão.
                addBtn.before(draggedItem);
                updateNumbers(container);
            });
        }
    });
}

// Atualiza os números (1, 2, 3...) ignorando o botão de adicionar
function updateNumbers(container) {
    const displays = container.querySelectorAll('.number-display');
    displays.forEach((display, index) => {
        display.textContent = index + 1;
    });
}

// Função para salvar no console (depois usaremos para o Banco de Dados)
function updateImageOrder(container) {
    // Pega apenas as fotos, ignora o botão de adicionar
    const items = container.querySelectorAll('.banner-image-container');
    const order = Array.from(items).map((item, index) => {
        return {
            id: item.getAttribute('data-image-id'),
            position: index + 1
        };
    });
    console.log('Nova Ordem do Grid:', order);
}

document.addEventListener('DOMContentLoaded', initDragAndDrop);