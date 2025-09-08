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
        
        // Função para mostrar notificação
        function showNotification(message) {
            const notification = document.createElement('div');
            notification.textContent = message;
            notification.style.position = 'fixed';
            notification.style.bottom = '20px';
            notification.style.right = '20px';
            notification.style.backgroundColor = '#2c3e50';
            notification.style.color = 'white';
            notification.style.padding = '15px 25px';
            notification.style.borderRadius = '6px';
            notification.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
            notification.style.zIndex = '1000';
            notification.style.transition = 'all 0.3s ease';
            
            document.body.appendChild(notification);
            
            setTimeout(() => {
                notification.style.opacity = '0';
                setTimeout(() => {
                    document.body.removeChild(notification);
                }, 300);
            }, 3000);
        }
        
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