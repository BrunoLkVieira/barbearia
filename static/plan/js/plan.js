        // Abrir modal de confirmação
        document.getElementById('savePlanBtn').addEventListener('click', function() {
            document.getElementById('confirmationModal').style.display = 'block';
        });
        
        // Fechar modal
        document.querySelector('.close').addEventListener('click', function() {
            document.getElementById('confirmationModal').style.display = 'none';
        });
        
        document.getElementById('modalCloseBtn').addEventListener('click', function() {
            document.getElementById('confirmationModal').style.display = 'none';
        });
        
        // Botão "Ver Planos" no modal
        document.getElementById('modalViewBtn').addEventListener('click', function() {
            document.getElementById('confirmationModal').style.display = 'none';
            // Scroll para a seção de planos existentes
            document.querySelector('.existing-plans').scrollIntoView({ behavior: 'smooth' });
        });
        
        // Botão "Novo Plano" no footer
        document.getElementById('newPlanBtn').addEventListener('click', function() {
            // Resetar formulário
            document.getElementById('planName').value = '';
            document.getElementById('planPrice').value = '';
            document.getElementById('planDuration').value = '';
            document.getElementById('planFrequency').selectedIndex = 0;
            document.getElementById('planDescription').value = '';
            
            // Desmarcar todos os checkboxes
            const checkboxes = document.querySelectorAll('input[type="checkbox"]');
            checkboxes.forEach(checkbox => checkbox.checked = false);
            
            // Scroll para o topo do formulário
            document.querySelector('.plan-form').scrollIntoView({ behavior: 'smooth' });
        });
        
        // Botões de edição nos cards
        const editButtons = document.querySelectorAll('.edit-btn');
        editButtons.forEach(button => {
            button.addEventListener('click', function() {
                const card = this.closest('.plan-card');
                const title = card.querySelector('.plan-title').textContent;
                const price = card.querySelector('.plan-price').textContent.split(' ')[0].replace('R$', '').replace(',', '');
                
                // Preencher formulário com dados do plano
                document.getElementById('planName').value = title;
                document.getElementById('planPrice').value = price;
                
                // Scroll para o topo do formulário
                document.querySelector('.plan-form').scrollIntoView({ behavior: 'smooth' });
            });
        });
        
        // Botões de exclusão nos cards
        const deleteButtons = document.querySelectorAll('.delete-btn');
        deleteButtons.forEach(button => {
            button.addEventListener('click', function() {
                const card = this.closest('.plan-card');
                const title = card.querySelector('.plan-title').textContent;
                
                if(confirm(`Tem certeza que deseja excluir o plano "${title}"? Esta ação não pode ser desfeita.`)) {
                    card.style.opacity = '0';
                    card.style.transform = 'translateX(100px)';
                    setTimeout(() => {
                        card.remove();
                    }, 300);
                }
            });
        });